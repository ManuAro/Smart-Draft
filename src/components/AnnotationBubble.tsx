import { X, Lightbulb, AlertTriangle, MessageCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

interface AnnotationBubbleProps {
    x: number
    y: number
    text: string
    explanation: string
    type: 'warning' | 'info'
    onClose: () => void
    onAskAI: () => void
}

export const AnnotationBubble = ({ x, y, text, explanation, type, onClose, onAskAI }: AnnotationBubbleProps) => {
    const ref = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    const isWarning = type === 'warning'
    const Icon = isWarning ? AlertTriangle : Lightbulb
    const borderColor = isWarning ? 'border-red-200' : 'border-blue-200'
    const bgColor = isWarning ? 'bg-red-50' : 'bg-blue-50'
    const iconColor = isWarning ? 'text-red-500' : 'text-blue-500'

    return (
        <div
            ref={ref}
            className={clsx(
                "absolute z-[300] w-72 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border p-4 animate-in zoom-in-95 fade-in duration-200",
                borderColor
            )}
            style={{
                left: x,
                top: y,
                transform: 'translate(-50%, 10px)' // Center horizontally, offset vertically
            }}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={clsx("p-1.5 rounded-full", bgColor)}>
                        <Icon className={clsx("w-4 h-4", iconColor)} />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">{text}</span>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {explanation}
            </p>

            <button
                onClick={() => {
                    onAskAI()
                    onClose()
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
                <MessageCircle className="w-4 h-4" />
                Preguntar a la IA
            </button>

            <div className={clsx("absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-l border-t", borderColor)}></div>
        </div>
    )
}
