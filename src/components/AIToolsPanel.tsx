import { Calculator as CalculatorIcon, CheckCircle2, MessageCircle, Lightbulb, GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'

interface AIToolsPanelProps {
    onCalculatorClick: () => void
    onAnalyzeClick: () => void
    onChatClick: () => void
    onSolutionClick: () => void
    isGeneratingSolution: boolean
}

export const AIToolsPanel = ({
    onCalculatorClick,
    onAnalyzeClick,
    onChatClick,
    onSolutionClick,
    isGeneratingSolution
}: AIToolsPanelProps) => {
    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ x: 24, y: window.innerHeight - 450 }}
            className="absolute z-[200] flex flex-col gap-3"
            style={{ cursor: 'default' }}
        >
            <div
                className="bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-xl border border-white/50 flex flex-col gap-1"
            >
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-3 h-3" />
                    Herramientas IA
                </div>

                <button
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClick={onCalculatorClick}
                    className="flex items-center gap-3 px-4 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-all group text-left w-full border border-transparent hover:border-blue-100"
                >
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition-colors">
                        <CalculatorIcon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">Calculadora</span>
                        <span className="text-xs text-gray-400 font-normal">Herramienta básica</span>
                    </div>
                </button>

                <button
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClick={onAnalyzeClick}
                    className="flex items-center gap-3 px-4 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-all group text-left w-full border border-transparent hover:border-blue-100"
                >
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">Listo para corregir</span>
                        <span className="text-xs text-gray-400 font-normal">Analizar errores en el canvas</span>
                    </div>
                </button>

                <button
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClick={onChatClick}
                    className="flex items-center gap-3 px-4 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 hover:text-blue-600 transition-all group text-left w-full border border-transparent hover:border-blue-100"
                >
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">¿Cómo sigo?</span>
                        <span className="text-xs text-gray-400 font-normal">Pedir una pista o ayuda</span>
                    </div>
                </button>

                <button
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClick={onSolutionClick}
                    disabled={isGeneratingSolution}
                    className="flex items-center gap-3 px-4 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 hover:text-amber-600 transition-all group text-left w-full border border-transparent hover:border-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                        <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">Ver solución</span>
                        <span className="text-xs text-gray-400 font-normal">Resolver paso a paso</span>
                    </div>
                </button>
            </div>
        </motion.div>
    )
}
