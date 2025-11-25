import { useEffect, useState } from 'react'
import { Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import { useAIAnalysis } from '../hooks/useAIAnalysis'
import { Brain } from 'lucide-react'
import { AnnotationBubble } from './AnnotationBubble'

// Inner component to access the editor context
const EditorContent = ({ exerciseStatement }: { exerciseStatement: string }) => {
    const { isAnalyzing, triggerAnalysis } = useAIAnalysis(exerciseStatement)
    const editor = useEditor()
    const [selectedAnnotation, setSelectedAnnotation] = useState<{
        x: number
        y: number
        text: string
        explanation: string
        type: 'warning' | 'info'
    } | null>(null)

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
                {isAnalyzing && (
                    <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-blue-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                        <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span className="text-sm font-medium text-blue-800">AI Analizando...</span>
                    </div>
                )}
            </div>

            {/* Annotation Bubble */}
            {selectedAnnotation && (
                <AnnotationBubble
                    {...selectedAnnotation}
                    onClose={() => setSelectedAnnotation(null)}
                />
            )}

            {/* Debug Controls (Bottom Right) */}
            <div className="absolute bottom-4 right-4 z-[200] flex flex-col gap-2">
                <button
                    onClick={() => triggerAnalysis()}
                    className="bg-white p-3 rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors group tooltip"
                    title="Simular Análisis"
                >
                    <Brain className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </button>
            </div>
        </>
    )
}

const Editor = ({ exerciseStatement }: { exerciseStatement: string }) => {
    return (
        <div className="w-full h-full relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Tldraw
                hideUi={false}
                persistenceKey="smart-draft-canvas"
            >
                <EditorContent exerciseStatement={exerciseStatement} />
            </Tldraw>
        </div>
    )
}

export default Editor
