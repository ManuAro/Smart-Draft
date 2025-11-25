import { useState } from 'react'
import { ChevronDown, ChevronUp, Edit2, Save } from 'lucide-react'

interface ExercisePanelProps {
    statement: string
    setStatement: (s: string) => void
}

const ExercisePanel = ({ statement, setStatement }: ExercisePanelProps) => {
    const [isExpanded, setIsExpanded] = useState(true)
    const [isEditing, setIsEditing] = useState(false)

    return (
        <div className="bg-white border-b border-gray-200 shadow-sm z-10">
            <div
                className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">Ejercicio</span>
                    {!isExpanded && <span className="text-gray-500 font-normal text-sm truncate max-w-xl">{statement}</span>}
                </h2>
                <div className="flex items-center gap-2 text-gray-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>

            {isExpanded && (
                <div className="px-6 pb-4 animate-in slide-in-from-top-2">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={statement}
                                onChange={(e) => setStatement(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[80px]"
                                placeholder="Escribe aquí el enunciado del ejercicio..."
                                autoFocus
                            />
                            <div className="flex justify-end">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsEditing(false)
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="group relative bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-gray-800 text-lg font-medium leading-relaxed">{statement}</p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsEditing(true)
                                }}
                                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default ExercisePanel
