import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, createShapeId, toRichText, Box } from 'tldraw'
import { analyzeCanvas } from '../services/openai'
import { logDebug } from '../components/DebugConsole'

export const useAIAnalysis = (exerciseStatement: string, options: { manualTriggerOnly?: boolean } = {}) => {
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
        const existingShapes = editor.getCurrentPageShapes()
        const isDuplicate = existingShapes.some(shape => {
            if (!shape.meta || !shape.meta.explanation) return false
            const dist = Math.hypot(shape.x - x, shape.y - y)
            return dist < 150
        })

        if (isDuplicate) {
            logDebug("Skipping annotation (Zone Memory active)", { x, y })
            return
        }

        const underlineId = createShapeId()
        const arrowId = createShapeId()
        const textId = createShapeId()
        const color = type === 'warning' ? 'red' : 'blue'

        // 3. Create Underline (Draw shape simulating a line/scribble under the error)
        // We simulate a small wave or line under the point
        editor.createShape({
            id: underlineId,
            type: 'draw',
            x: x - 20,
            y: y + 10,
            props: {
                segments: [{
                    type: 'free',
                    points: [
                        { x: 0, y: 0, z: 0.5 },
                        { x: 10, y: 2, z: 0.5 },
                        { x: 20, y: -1, z: 0.5 },
                        { x: 30, y: 1, z: 0.5 },
                        { x: 40, y: 0, z: 0.5 }
                    ]
                }],
                color,
                size: 's',
                isComplete: true
            }
        })

        // 4. Create Label (Title)
        // Position it to the right and slightly up
        const labelX = x + 60
        const labelY = y - 20

        editor.createShape({
            id: textId,
            type: 'text',
            x: labelX,
            y: labelY,
            props: {
                richText: toRichText(text), // The keyword/title
                color,
                size: 's',
                font: 'sans',
            },
            meta: {
                explanation // Store explanation here so clicking the text triggers the bubble
            }
        })

        // 5. Create Arrow connecting Underline to Label
        editor.createShape({
            id: arrowId,
            type: 'arrow',
            x: x, // Start at the error point
            y: y + 10,
            props: {
                start: { x: 0, y: 0 },
                end: { x: labelX - x, y: labelY - y + 10 }, // Point to the label
                color,
                size: 's',
                arrowheadStart: 'none',
                arrowheadEnd: 'arrow',
            }
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

    const runAnalysis = useCallback(async (force = false) => {
        if (!editor) return

        const now = Date.now()
        const timeSinceLastActivity = now - lastActivityRef.current
        const isIdle = timeSinceLastActivity > 60000 // 1 minute

        // Determine Mode
        const mode = isIdle ? 'idle' : 'active'

        if (!force && options.manualTriggerOnly) return

        logDebug("Starting Analysis Loop", { mode, force })
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
    }, [editor, injectAnnotation, exerciseStatement, options.manualTriggerOnly])

    // Analysis Loop
    useEffect(() => {
        if (!editor || options.manualTriggerOnly) return

        // Run check every 10 seconds
        intervalRef.current = setInterval(() => runAnalysis(), 10000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [editor, runAnalysis, options.manualTriggerOnly])

    // Helper to capture canvas
    const captureCanvas = useCallback(async (): Promise<string | null> => {
        if (!editor) return null

        try {
            const shapeIds = editor.getCurrentPageShapeIds()
            if (shapeIds.size === 0) return null

            // Calculate Common Bounds
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

            const padding = 20 // Add some context
            const commonBounds = new Box(
                minX - padding,
                minY - padding,
                (maxX - minX) + (padding * 2),
                (maxY - minY) + (padding * 2)
            )

            // @ts-ignore
            const result = await (editor as any).toImage([...shapeIds], {
                format: 'png',
                scale: 1,
                background: true,
                bounds: commonBounds
            })

            if (!result || !result.blob) return null

            return new Promise((resolve) => {
                const reader = new FileReader()
                reader.readAsDataURL(result.blob)
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = () => resolve(null)
            })
        } catch (e) {
            console.error("Capture failed", e)
            return null
        }
    }, [editor])

    return {
        isAnalyzing,
        triggerAnalysis: () => runAnalysis(true),
        injectAnnotation,
        captureCanvas // Export this
    }
}
