import { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react'
import { Tldraw, useEditor, createShapeId, toRichText, AssetRecordType } from 'tldraw'
import 'tldraw/tldraw.css'
import { useAIAnalysis } from '../hooks/useAIAnalysis'
import { Brain } from 'lucide-react'
import { AnnotationBubble } from './AnnotationBubble'
import { Calculator } from './Calculator'
import { AIToolsPanel } from './AIToolsPanel'


import { generateSolution } from '../services/openai'

// Inner component to access the editor context
const EditorContent = forwardRef(({ exerciseStatement, onOpenChat }: { exerciseStatement: string, onOpenChat: () => void }, ref) => {
    // Enable manual trigger only for the "Detecta errores" button
    const { isAnalyzing, triggerAnalysis, captureCanvas } = useAIAnalysis(exerciseStatement, { manualTriggerOnly: true })
    const editor = useEditor()
    const [isGeneratingSolution, setIsGeneratingSolution] = useState(false)
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)

    const [selectedAnnotation, setSelectedAnnotation] = useState<{
        x: number
        y: number
        text: string
        explanation: string
        type: 'warning' | 'info'
    } | null>(null)

    useImperativeHandle(ref, () => ({
        triggerAnalysis,
        getCanvasImage: captureCanvas
    }), [triggerAnalysis, captureCanvas])

    const renderMath = async (latex: string, x: number, y: number) => {
        if (!editor) return 0

        // Use Codecogs to generate image
        // \dpi{300} for high res, \bg{white} for background
        const url = `https://latex.codecogs.com/png.image?\\dpi{300}\\bg{white}${encodeURIComponent(latex)}`

        try {
            // Load image to get dimensions
            const img = new Image()
            img.crossOrigin = "anonymous"
            img.src = url

            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
            })

            // Scale down (300dpi is 3x standard roughly, let's scale by 3)
            const scale = 3
            const w = img.naturalWidth / scale
            const h = img.naturalHeight / scale

            const assetId = AssetRecordType.createId()

            editor.createAssets([{
                id: assetId,
                typeName: 'asset',
                type: 'image',
                meta: {},
                props: {
                    w,
                    h,
                    mimeType: 'image/png',
                    src: url,
                    name: 'math.png',
                    isAnimated: false
                }
            }])

            editor.createShape({
                type: 'image',
                x,
                y,
                props: {
                    assetId,
                    w,
                    h
                }
            })

            return h
        } catch (e) {
            console.error("Failed to render math image", e)
            // Fallback to text
            editor.createShape({
                type: 'text',
                x,
                y,
                props: {
                    text: latex,
                    color: 'grey',
                    size: 's',
                    font: 'mono'
                }
            })
            return 30
        }
    }

    const handleShowSolution = async () => {
        console.log("handleShowSolution called")
        if (!editor || isGeneratingSolution) {
            console.log("Editor not ready or already generating", { editor: !!editor, isGeneratingSolution })
            return
        }
        setIsGeneratingSolution(true)

        try {
            console.log("Calling generateSolution with:", exerciseStatement)

            // Generate solution based on exercise statement only, not canvas
            const steps = await generateSolution(exerciseStatement, null)
            console.log("Received steps:", steps)

            if (steps.length > 0) {
                // Find a clear spot to start writing (e.g., to the right of existing content)
                const bounds = editor.getCurrentPageBounds()
                console.log("Current bounds:", bounds)
                let startX = bounds ? bounds.maxX + 50 : 100
                let startY = bounds ? bounds.minY : 100

                // If empty canvas, start at top left
                if (!bounds) {
                    startX = 100
                    startY = 100
                }

                console.log("Starting to render at:", { startX, startY })

                // Create a header
                const headerId = createShapeId()
                console.log("Creating header shape", headerId)
                editor.createShape({
                    id: headerId,
                    type: 'text',
                    x: startX,
                    y: startY,
                    props: {
                        richText: toRichText('Solución Paso a Paso:'),
                        color: 'blue',
                        size: 'm',
                        font: 'draw',
                        w: 600, // Set a fixed width to force wrapping if needed, though header usually short
                        autoSize: false // Disable autoSize to respect width if we set it, or keep true for header
                    }
                })

                // Wait a tick for the shape to be created and measured
                await new Promise(resolve => setTimeout(resolve, 50))
                const headerBounds = editor.getShapePageBounds(headerId)
                startY += (headerBounds?.h || 40) + 20

                // We can't use forEach with async/await nicely for sequential layout
                // Use for...of loop
                for (const [index, step] of steps.entries()) {
                    console.log("Creating step shape", index)
                    // Explanation
                    const stepId = createShapeId()
                    editor.createShape({
                        id: stepId,
                        type: 'text',
                        x: startX,
                        y: startY,
                        props: {
                            richText: toRichText(`${index + 1}. ${step.explanation}`),
                            color: 'black',
                            size: 's',
                            font: 'sans',
                            w: 800, // Set a max width for the text to wrap
                            autoSize: false // Important: disable autoSize so it wraps at 'w'
                        }
                    })

                    // Wait for measurement
                    await new Promise(resolve => setTimeout(resolve, 50))
                    const stepBounds = editor.getShapePageBounds(stepId)
                    startY += (stepBounds?.h || 30) + 10

                    // Math/Latex
                    if (step.latex) {
                        const height = await renderMath(step.latex, startX + 20, startY)
                        startY += height + 20 // Add height of math image + 20 for spacing
                    }

                    startY += 20 // Spacing between steps
                }
                console.log("Creation finished")
            } else {
                console.warn("No steps returned from API")
            }
        } catch (error) {
            console.error("Failed to generate solution", error)
        } finally {
            setIsGeneratingSolution(false)
        }
    }

    useEffect(() => {
        if (!editor) return

        const handleEvent = (e: any) => {
            if (e.name === 'pointer_up') {
                const selectedShapes = editor.getSelectedShapes()
                if (selectedShapes.length === 1) {
                    const shape = selectedShapes[0]
                    // Check if it's an annotation (has explanation in meta)
                    if (shape.meta && shape.meta.explanation) {
                        // Get screen coordinates for the bubble
                        const pagePoint = { x: shape.x + 60, y: shape.y + 60 } // Center of ellipse
                        const screenPoint = editor.pageToViewport(pagePoint)

                        setSelectedAnnotation({
                            x: screenPoint.x,
                            y: screenPoint.y,
                            text: (shape.props as any).richText?.text || 'Annotation',
                            explanation: shape.meta.explanation as string,
                            type: (shape.props as any).color === 'red' ? 'warning' : 'info'
                        })
                        return
                    }
                }
                // If clicking elsewhere, close bubble
                setSelectedAnnotation(null)
            }
        }

        editor.on('event', handleEvent)
        return () => {
            editor.off('event', handleEvent)
        }
    }, [editor])

    return (
        <>
            {/* AI Status Indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none">
                {(isAnalyzing || isGeneratingSolution) && (
                    <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                        <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span className="text-sm font-medium text-blue-800">
                            {isGeneratingSolution ? 'Generando solución...' : 'AI Analizando...'}
                        </span>
                    </div>
                )}
            </div>

            {/* Annotation Bubble */}
            {selectedAnnotation && (
                <AnnotationBubble
                    {...selectedAnnotation}
                    onClose={() => setSelectedAnnotation(null)}
                    onAskAI={() => onOpenChat(`Explícame más sobre este error: ${selectedAnnotation.text}`)}
                />
            )}


            <Calculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />

            {/* Floating AI Tools Panel */}
            <AIToolsPanel
                onCalculatorClick={() => setIsCalculatorOpen(true)}
                onAnalyzeClick={() => triggerAnalysis()}
                onChatClick={() => onOpenChat()}
                onSolutionClick={handleShowSolution}
                isGeneratingSolution={isGeneratingSolution}
            />
        </>
    )
})

export interface EditorRef {
    getSnapshot: () => any
    loadSnapshot: (snapshot: any) => void
    triggerAnalysis: () => void
    getCanvasImage: () => Promise<string | null>
}

const Editor = forwardRef<EditorRef, { exerciseStatement: string, onOpenChat: () => void }>(({ exerciseStatement, onOpenChat }, ref) => {
    const [editor, setEditor] = useState<any>(null)
    // We need to access triggerAnalysis from the inner component or lift the hook up.
    // Since the hook is inside EditorContent, we can't access it easily here without context or another ref.
    // Let's lift the hook up to Editor.

    // Wait, useAIAnalysis uses useEditor(), so it must be inside Tldraw context.
    // So we can't lift it up to Editor easily because Editor renders Tldraw.
    // We need a way to communicate from Editor (outside Tldraw) to EditorContent (inside Tldraw).
    // We can use a ref passed to EditorContent.

    const contentRef = useRef<{ triggerAnalysis: () => void, getCanvasImage: () => Promise<string | null> }>(null)

    useImperativeHandle(ref, () => ({
        getSnapshot: () => {
            if (editor) {
                return editor.store.getSnapshot()
            }
            return null
        },
        loadSnapshot: (snapshot: any) => {
            if (editor && snapshot) {
                editor.store.loadSnapshot(snapshot)
            }
        },
        triggerAnalysis: () => {
            contentRef.current?.triggerAnalysis()
        },
        getCanvasImage: async () => {
            if (contentRef.current?.getCanvasImage) {
                return await contentRef.current.getCanvasImage()
            }
            return null
        }
    }), [editor])

    return (
        <div className="w-full h-full relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Tldraw
                hideUi={false}
                persistenceKey="smart-draft-canvas"
                onMount={(editor) => setEditor(editor)}
            >
                <EditorContent ref={contentRef} exerciseStatement={exerciseStatement} onOpenChat={onOpenChat} />
            </Tldraw>
        </div>
    )
})

export default Editor
