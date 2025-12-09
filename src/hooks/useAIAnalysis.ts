import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, createShapeId, toRichText, Box } from 'tldraw'
import { analyzeCanvas, type AIAnnotation } from '../services/openai'
import { formatMathText } from '../utils/latex'

const MIN_BOX_RATIO = 0.02
const MIN_BOX_PIXEL = 40
const ANNOTATION_META_FLAG = 'smartDraftAnnotation'

export const useAIAnalysis = (exerciseStatement: string, options: { manualTriggerOnly?: boolean } = {}) => {
    const editor = useEditor()
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const lastActivityRef = useRef<number>(Date.now())
    const labelSlotsRef = useRef<Record<string, number>>({})

    const clearPreviousAnnotations = useCallback(() => {
        if (!editor) return
        const annotationShapes = editor.getCurrentPageShapes().filter(shape => shape.meta?.[ANNOTATION_META_FLAG])
        if (annotationShapes.length > 0) {
            editor.deleteShapes(annotationShapes.map(shape => shape.id))
        }
    }, [editor])

    // Helper to inject annotation (Marker Style)
    const injectAnnotation = useCallback((annotation: AIAnnotation, commonBounds: Box) => {
        if (!editor) return

        const { text, explanation, type, x: xPct, y: yPct, id } = annotation
        const formattedExplanation = formatMathText(explanation)
        const wPct = Math.max(annotation.width ?? MIN_BOX_RATIO, MIN_BOX_RATIO)
        const hPct = Math.max(annotation.height ?? MIN_BOX_RATIO, MIN_BOX_RATIO)

        const baseWidth = Number.isFinite(commonBounds.width) && commonBounds.width > 0 ? commonBounds.width : 500
        const baseHeight = Number.isFinite(commonBounds.height) && commonBounds.height > 0 ? commonBounds.height : 500
        const baseX = Number.isFinite(commonBounds.minX) ? commonBounds.minX : 0
        const baseY = Number.isFinite(commonBounds.minY) ? commonBounds.minY : 0

        // Special case: success badge
        if (type === 'success') {
            const widthForSuccess = Math.max(baseWidth, 200)
            let successX = baseX + widthForSuccess / 2 - 60
            let successY = baseY - 60
            if (!Number.isFinite(successX)) successX = 0
            if (!Number.isFinite(successY) || successY < 0) successY = baseY + 40

            const successId = createShapeId()
            editor.createShape({
                id: successId,
                type: 'text',
                x: successX,
                y: successY,
                props: {
                    richText: toRichText(`✔ ${text}`),
                    color: 'green',
                    size: 'm',
                    font: 'sans'
                },
                meta: {
                    explanation: formattedExplanation,
                    annotationId: id ?? successId,
                    [ANNOTATION_META_FLAG]: true
                }
            })
            return
        }

        const boxX = baseX + (xPct * baseWidth)
        const boxY = baseY + (yPct * baseHeight)
        const boxW = Math.max(wPct * baseWidth, MIN_BOX_PIXEL)
        const boxH = Math.max(hPct * baseHeight, MIN_BOX_PIXEL)

        // Calculate center for deduplication and arrow target
        const centerX = boxX + boxW / 2
        const centerY = boxY + boxH / 2

        // 2. Deduplication (Zone Memory)
        const existingShapes = editor.getCurrentPageShapes()
        const isDuplicate = existingShapes.some(shape => {
            if (!shape.meta || !shape.meta.explanation) return false
            const dist = Math.hypot(shape.x - centerX, shape.y - centerY) // Approx check
            return dist < 100 // Reduced radius since we might have close errors
        })

        if (isDuplicate) {
            return
        }

        const circleId = createShapeId()
        const arrowId = createShapeId()
        const textId = createShapeId()
        const color = (() => {
            switch (type) {
                case 'warning':
                    return 'red'
                case 'suggestion':
                    return 'yellow'
                case 'reference':
                    return 'grey'
                default:
                    return 'blue'
            }
        })()

        // 3. Create Circle (Ellipse) around the error
        // Add padding (e.g., 20% of the max dimension) to make it "generous"
        const padding = Math.max(boxW, boxH) * 0.2
        const finalW = boxW + padding * 2
        const finalH = boxH + padding * 2
        const finalX = boxX - padding
        const finalY = boxY - padding

        if (type !== 'reference') {
            editor.createShape({
                id: circleId,
                type: 'geo',
                x: finalX,
                y: finalY,
                props: {
                    geo: 'ellipse',
                    w: finalW,
                    h: finalH,
                    color,
                    fill: 'none',
                    dash: 'draw', // Hand-drawn style
                    size: 'm',
                },
                meta: {
                    explanation: formattedExplanation,
                    annotationId: id ?? circleId,
                    [ANNOTATION_META_FLAG]: true
                }
            })
        }

        // 4. Create Label (Title)
        // Position it to the right of the box
        const labelX = finalX + finalW + 20
        const columnKey = `${Math.round(labelX / 200)}`
        const stackIndex = labelSlotsRef.current[columnKey] ?? 0
        labelSlotsRef.current[columnKey] = stackIndex + 1
        const labelY = finalY + stackIndex * 60

        editor.createShape({
            id: textId,
            type: 'text',
            x: labelX,
            y: labelY,
            props: {
                richText: toRichText(text), // The keyword/title
                color,
                size: 'm',
                font: 'sans',
            },
            meta: {
                explanation: formattedExplanation, // Store explanation so clicking triggers the bubble
                annotationId: id ?? textId,
                [ANNOTATION_META_FLAG]: true
            }
        })

        // 5. Create Arrow connecting Circle to Label
        if (type !== 'reference') {
            editor.createShape({
                id: arrowId,
                type: 'arrow',
                x: finalX + finalW, // Start at the right edge of the ellipse
                y: centerY, // Vertically centered
                props: {
                    start: { x: 0, y: 0 },
                    end: { x: labelX - (finalX + finalW), y: labelY - centerY + 15 }, // Point to the label
                    color,
                    size: 's',
                    arrowheadStart: 'none',
                    arrowheadEnd: 'arrow',
                },
                meta: {
                    explanation: formattedExplanation,
                    annotationId: id ?? arrowId,
                    [ANNOTATION_META_FLAG]: true
                }
            })
        }

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

        setIsAnalyzing(true)

        try {
            const shapeIds = editor.getCurrentPageShapeIds()
            if (shapeIds.size === 0) {
                setIsAnalyzing(false)
                return
            }


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

            // @ts-ignore - toImage likely exists based on grep results
            const result = await (editor as any).toImage([...shapeIds], {
                format: 'png',
                scale: 1,
                background: true,
                bounds: commonBounds // Capture exactly this area
            })

            if (!result || !result.blob) {
                setIsAnalyzing(false)
                return
            }


            // 2. Convert Blob to Base64
            const reader = new FileReader()
            reader.readAsDataURL(result.blob)
            reader.onloadend = async () => {
                const base64data = reader.result as string

                try {
                    const annotations = await analyzeCanvas(base64data, mode, exerciseStatement)
                    labelSlotsRef.current = {}
                    clearPreviousAnnotations()

                    annotations.forEach(ann => {
                        injectAnnotation(ann, commonBounds)
                    })

                    if (isIdle && annotations.length > 0) {
                        lastActivityRef.current = Date.now()
                    }
                } catch (apiError) {
                    window.alert("Error al conectar con la IA. Por favor verifica tu conexión o la configuración.")
                }
                setIsAnalyzing(false)
            }
            reader.onerror = () => {
                setIsAnalyzing(false)
            }

        } catch (error: any) {
            setIsAnalyzing(false)
        }
    }, [editor, injectAnnotation, exerciseStatement, options.manualTriggerOnly, clearPreviousAnnotations])

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
