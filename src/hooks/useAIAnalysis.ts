import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, createShapeId, toRichText, Box } from 'tldraw'
import { analyzeCanvas } from '../services/openai'
import { logDebug } from '../components/DebugConsole'

export const useAIAnalysis = (exerciseStatement: string) => {
    const editor = useEditor()
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    // Helper to inject annotation (Marker Style)
    const injectAnnotation = useCallback((text: string, explanation: string, type: 'warning' | 'info', xPct: number, yPct: number, commonBounds: any) => {
        if (!editor) return

        // 1. Calculate Absolute Position based on Common Bounds
        const x = commonBounds.minX + (xPct * commonBounds.width)
        const y = commonBounds.minY + (yPct * commonBounds.height)

        // 2. Deduplication (Zone Memory)
        // Check if ANY annotation exists nearby (150px radius), regardless of text.
        // This prevents the AI from spamming the same area.
        const existingShapes = editor.getCurrentPageShapes()
        const isDuplicate = existingShapes.some(shape => {
            // Check if it's an AI annotation (has explanation meta)
            if (!shape.meta || !shape.meta.explanation) return false

            const dist = Math.hypot(shape.x - x, shape.y - y)
            return dist < 150 // Increased radius for "Zone Memory"
        })

        if (isDuplicate) {
            logDebug("Skipping annotation (Zone Memory active)", { x, y })
            return
        }

        const circleId = createShapeId()
        const textId = createShapeId()
        const color = type === 'warning' ? 'red' : 'light-blue'

        // 3. Dynamic Sizing & Natural Feel
        // Estimate text width (approx 12px per char) + padding
        const estimatedWidth = Math.max(120, text.length * 14)
        const rotation = (Math.random() - 0.5) * 0.2 // Subtle random tilt (-0.1 to 0.1 rad)

        editor.createShape({
            id: circleId,
            type: 'geo',
            x,
            y,
            rotation,
            props: {
                geo: 'ellipse',
                w: estimatedWidth,
                h: 60,
                fill: 'none',
                dash: 'draw',
                color,
                size: 'm',
            },
            meta: {
                explanation // Store explanation in metadata
            }
        })

        editor.createShape({
            id: textId,
            type: 'text',
            x: x + (estimatedWidth / 2) - (text.length * 4), // Roughly center text
            y: y + 10,
            rotation,
            props: {
                richText: toRichText(text),
                color,
                size: 's',
                font: 'draw',
            },
        })
    }, [editor])

    // Track Activity
    useEffect(() => {
        if (!editor) return
        const cleanup = editor.store.listen((entry) => {
            if (entry.source === 'user') {
                lastActivityRef.current = Date.now()
            }
        })
        return () => cleanup()
    }, [editor])

    // Analysis Loop
    useEffect(() => {
        if (!editor) return

        const runAnalysis = async () => {
            const now = Date.now()
            const timeSinceLastActivity = now - lastActivityRef.current
            const isIdle = timeSinceLastActivity > 60000 // 1 minute

            // Determine Mode
            const mode = isIdle ? 'idle' : 'active'

            // Active Mode: 20% chance to check. Idle Mode: 50% chance.
            // const chance = isIdle ? 0.5 : 0.8
            // logDebug("Checking analysis trigger...", { mode, timeSinceLastActivity })
            // if (Math.random() <= chance) return // Skip this cycle

            logDebug("Starting Analysis Loop (Forced)", { mode })
            setIsAnalyzing(true)

            try {
                const shapeIds = editor.getCurrentPageShapeIds()
                if (shapeIds.size === 0) {
                    logDebug("No shapes found on canvas")
                    setIsAnalyzing(false)
                    return
                }

                logDebug(`Found ${shapeIds.size} shapes. Capturing SVG...`)

                // Calculate Common Bounds of the captured shapes
                // We need this to map the 0-1 coordinates back to the canvas
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                const shapes = Array.from(shapeIds).map(id => editor.getShape(id)).filter(s => s)

                shapes.forEach((shape: any) => {
                    const bounds = editor.getShapePageBounds(shape)
                    if (bounds) {
                        minX = Math.min(minX, bounds.minX)
                        minY = Math.min(minY, bounds.minY)
                        maxX = Math.max(maxX, bounds.maxX)
                        maxY = Math.max(maxY, bounds.maxY)
                    }
                })

                // Add some padding to the bounds (0 for exact mapping)
                const padding = 0
                const commonBounds = new Box(
                    minX - padding,
                    minY - padding,
                    (maxX - minX) + (padding * 2),
                    (maxY - minY) + (padding * 2)
                )

                // 1. Capture Canvas as Image (Blob)
                logDebug("Attempting editor.toImage...")

                // @ts-ignore - toImage likely exists based on grep results
                const result = await (editor as any).toImage([...shapeIds], {
                    format: 'png',
                    scale: 1,
                    background: true,
                    bounds: commonBounds // Capture exactly this area
                })

                if (!result || !result.blob) {
                    logDebug("Failed to generate image blob", result)
                    setIsAnalyzing(false)
                    return
                }

                logDebug("Image blob generated. Converting to Base64...")

                // 2. Convert Blob to Base64
                const reader = new FileReader()
                reader.readAsDataURL(result.blob)
                reader.onloadend = async () => {
                    const base64data = reader.result as string
                    logDebug("Base64 generated. Calling OpenAI...")

                    try {
                        const annotations = await analyzeCanvas(base64data, mode, exerciseStatement)
                        logDebug("OpenAI Response received", annotations)

                        annotations.forEach(ann => {
                            injectAnnotation(ann.text, ann.explanation, ann.type, ann.x, ann.y, commonBounds)
                        })

                        if (isIdle && annotations.length > 0) {
                            lastActivityRef.current = Date.now()
                        }
                    } catch (apiError) {
                        logDebug("OpenAI API Error", apiError)
                    }
                    setIsAnalyzing(false)
                }
                reader.onerror = (e) => {
                    logDebug("Failed to convert blob to base64", e)
                    setIsAnalyzing(false)
                }

            } catch (error: any) {
                logDebug("Analysis failed with exception", {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                })
                setIsAnalyzing(false)
            }
        }

        // Run check every 10 seconds
        intervalRef.current = setInterval(runAnalysis, 10000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [editor, injectAnnotation, exerciseStatement])

    return {
        isAnalyzing,
        triggerAnalysis: () => { },
        injectAnnotation
    }
}
