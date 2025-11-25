import { MessageSquare, ChevronRight, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface Annotation {
    id: string
    text: string
    explanation: string
    type: 'warning' | 'info'
}

const mockAnnotations: Annotation[] = [
    {
        id: '1',
        text: 'Esto no lo podes asumir',
        explanation: 'Esta afirmación carece de sustento en el contexto actual del documento. Se requiere una cita o una demostración lógica previa.',
        type: 'warning',
    },
    {
        id: '2',
        text: 'Sugerencia de estilo',
        explanation: 'Considera usar un tono más formal en esta sección para alinearse con el resto del documento.',
        type: 'info',
    },
]

const Sidebar = () => {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id)
    }

    return (
        <div className="w-80 bg-gray-50 border-l border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-700">AI Assistant</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {mockAnnotations.map((annotation) => (
                    <div key={annotation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div
                            className="p-3 cursor-pointer hover:bg-gray-50 flex items-start justify-between"
                            onClick={() => toggleExpand(annotation.id)}
                        >
                            <div className="flex gap-2">
                                <div className={`w-1 h-full absolute left-0 top-0 bottom-0 ${annotation.type === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{annotation.text}</p>
                                </div>
                            </div>
                            {expandedId === annotation.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        </div>

                        {expandedId === annotation.id && (
                            <div className="p-3 bg-gray-50 text-sm text-gray-600 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                                {annotation.explanation}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Sidebar
