import { useParams, Link } from 'react-router-dom'
import { Plus, FileText, Upload, Edit2, Check, X } from 'lucide-react'
import { useState } from 'react'
import { DoodleBackground } from '../components/DoodleBackground'
import { useFileSystem } from '../contexts/FileSystemContext'

// Mock data for documents (would normally come from a backend/context)
const mockDocs = [
    { id: 1, name: 'Guía de Integrales.pdf', size: '2.4 MB', date: '2023-10-24' },
    { id: 2, name: 'Resumen Derivadas.pdf', size: '1.1 MB', date: '2023-10-20' },
    { id: 3, name: 'Ejercicios Resueltos.jpg', size: '4.5 MB', date: '2023-10-18' },
]

export const SubjectView = () => {
    const { id } = useParams()
    const { items, renameItem } = useFileSystem()
    const [docs, setDocs] = useState(mockDocs)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    // Get folder info
    const folder = items.find(item => item.id === id && item.type === 'folder')
    const folderName = folder?.name || 'Carpeta'

    // Get exercises in this folder
    const exercises = items.filter(item => item.type === 'file' && item.parentId === id)

    const startEditing = (e: React.MouseEvent, file: { id: string, name: string }) => {
        e.preventDefault() // Prevent navigation
        e.stopPropagation()
        setEditingId(file.id)
        setEditName(file.name)
    }

    const saveRename = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (editingId && editName.trim()) {
            renameItem(editingId, editName.trim())
            setEditingId(null)
            setEditName('')
        }
    }

    const cancelRename = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setEditingId(null)
        setEditName('')
    }

    return (
        <div className="min-h-screen bg-[var(--color-paper)] flex flex-col relative overflow-hidden">
            <DoodleBackground />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    {/* Back button removed for MVP as this is the home screen */}
                    <div className="p-2 rounded-full bg-indigo-50 text-indigo-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{folderName}</h1>
                        <p className="text-sm text-gray-500">Gestión de documentos y ejercicios</p>
                    </div>
                </div>

                <Link
                    to={`/canvas/${id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm hover:shadow"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Ejercicio
                </Link>
            </header>

            <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
                {/* Context / Documents Section */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-400" />
                            Documentos de Contexto
                        </h2>
                        <button className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1">
                            <Upload className="w-4 h-4" />
                            Subir Archivo
                        </button>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {docs.map((doc) => (
                            <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-700">{doc.name}</p>
                                        <p className="text-xs text-gray-400">{doc.size} • {doc.date}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDocs(docs.filter(d => d.id !== doc.id))}
                                    className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    Eliminar
                                </button>
                            </div>
                        ))}

                        {docs.length === 0 && (
                            <div className="p-12 text-center text-gray-400">
                                <p>No hay documentos subidos aún.</p>
                                <p className="text-sm mt-1">Sube guías o apuntes para que la IA tenga contexto.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Saved Exercises */}
                <section className="mt-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Ejercicios Guardados</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {exercises.map((file) => (
                            <div key={file.id} className="relative group">
                                <Link
                                    to={`/canvas/${id}/${file.id}`}
                                    className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-200 transition-colors cursor-pointer block"
                                    onClick={(e) => {
                                        if (editingId === file.id) e.preventDefault()
                                    }}
                                >
                                    <div className="h-32 bg-gray-50 rounded-lg mb-3 flex items-center justify-center text-gray-300 overflow-hidden relative">
                                        {/* Placeholder for preview - in real app we'd capture a thumbnail */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                            <FileText className="w-8 h-8 text-gray-300" />
                                        </div>
                                    </div>

                                    {editingId === file.id ? (
                                        <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveRename()
                                                    if (e.key === 'Escape') cancelRename()
                                                    e.stopPropagation()
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button
                                                onClick={saveRename}
                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={cancelRename}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-medium text-gray-700 truncate">{file.name}</h3>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Editado {new Date(file.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => startEditing(e, file)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                title="Renombrar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </Link>
                            </div>
                        ))}

                        {exercises.length === 0 && (
                            <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500">No hay ejercicios guardados en esta carpeta.</p>
                                <Link to={`/canvas/${id}`} className="text-blue-600 font-medium hover:underline mt-2 inline-block">
                                    Crear uno nuevo
                                </Link>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
