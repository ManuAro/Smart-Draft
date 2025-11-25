import { Upload, FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface Document {
    id: string
    name: string
    size: string
}

const ContextPanel = () => {
    const [documents, setDocuments] = useState<Document[]>([
        { id: '1', name: 'Syllabus.pdf', size: '2.4 MB' },
        { id: '2', name: 'Notas_Clase_1.docx', size: '1.1 MB' },
    ])

    const handleDelete = (id: string) => {
        setDocuments(documents.filter(doc => doc.id !== id))
    }

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Contexto
                </h2>
            </div>

            <div className="p-4">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 border-dashed">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">Subir documento</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {documents.map((doc) => (
                    <div key={doc.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="truncate">
                                <p className="text-sm text-gray-700 truncate">{doc.name}</p>
                                <p className="text-xs text-gray-400">{doc.size}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ContextPanel
