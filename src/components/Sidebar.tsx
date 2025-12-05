import { MessageSquare, ChevronRight, ChevronDown, Folder, FileText, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFileSystem } from '../contexts/FileSystemContext'
import type { FileSystemItem } from '../contexts/FileSystemContext'

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

const Sidebar = ({ onLoadFile }: { onLoadFile?: (file: FileSystemItem) => void }) => {
    const [activeTab, setActiveTab] = useState<'ai' | 'files'>('ai')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const { items, currentFolderId, setCurrentFolderId, createFolder, deleteItem } = useFileSystem()
    const [newFolderName, setNewFolderName] = useState('')
    const [isCreatingFolder, setIsCreatingFolder] = useState(false)

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id)
    }

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            createFolder(newFolderName)
            setNewFolderName('')
            setIsCreatingFolder(false)
        }
    }

    const FileTreeItem = ({ item, level = 0 }: { item: FileSystemItem, level?: number }) => {
        const isFolder = item.type === 'folder'
        const paddingLeft = level * 12 + 12

        return (
            <div
                className={`group flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer text-sm text-gray-700 ${currentFolderId === item.id ? 'bg-blue-50 text-blue-700' : ''}`}
                style={{ paddingLeft: `${paddingLeft}px` }}
                onClick={() => {
                    if (isFolder) {
                        setCurrentFolderId(currentFolderId === item.id ? item.parentId : item.id)
                    } else {
                        if (onLoadFile) {
                            onLoadFile(item)
                        }
                    }
                }}
            >
                {isFolder ? (
                    <Folder className={`w-4 h-4 ${currentFolderId === item.id ? 'text-blue-500 fill-blue-100' : 'text-gray-400'}`} />
                ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                )}
                <span className="flex-1 truncate">{item.name}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        deleteItem(item.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-500"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        )
    }

    const renderFileTree = (parentId: string | null = null, level = 0) => {
        const children = items.filter(i => i.parentId === parentId)
        return children.map(item => (
            <div key={item.id}>
                <FileTreeItem item={item} level={level} />
                {item.type === 'folder' && (currentFolderId === item.id || items.some(i => i.parentId === item.id)) && (
                    <div>
                        {renderFileTree(item.id, level + 1)}
                    </div>
                )}
            </div>
        ))
    }

    return (
        <div className="w-80 bg-gray-50 border-l border-gray-200 h-full flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <MessageSquare className="w-4 h-4" />
                    AI Assistant
                </button>
                <button
                    onClick={() => setActiveTab('files')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Folder className="w-4 h-4" />
                    Archivos
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'ai' ? (
                    <div className="space-y-4">
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
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Mis Ejercicios</h3>
                            <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600"
                                title="Nueva Carpeta"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {isCreatingFolder && (
                            <div className="flex items-center gap-2 mb-2 px-2">
                                <Folder className="w-4 h-4 text-blue-500" />
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                    onBlur={() => setIsCreatingFolder(false)}
                                    placeholder="Nombre carpeta..."
                                    className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                        )}

                        <div className="space-y-0.5">
                            {renderFileTree(null)}
                        </div>

                        {items.length === 0 && !isCreatingFolder && (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                <Folder className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p>No hay archivos guardados</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Sidebar
