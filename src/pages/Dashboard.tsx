import { Link } from 'react-router-dom'
import { FolderPlus, Folder } from 'lucide-react'
import { useState } from 'react'
import { DoodleBackground } from '../components/DoodleBackground'
import { useFileSystem } from '../contexts/FileSystemContext'

export const Dashboard = () => {
    const { items, createFolder } = useFileSystem()
    const [isCreatingFolder, setIsCreatingFolder] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')

    const folders = items.filter(item => item.type === 'folder' && item.parentId === null)

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            createFolder(newFolderName.trim())
            setNewFolderName('')
            setIsCreatingFolder(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-paper)] flex flex-col relative overflow-hidden">
            <DoodleBackground />

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-6 sticky top-0 z-20 shadow-sm">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900">Mis Carpetas</h1>
                    <p className="text-gray-500 mt-1">Organiza tus ejercicios en carpetas</p>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
                {/* Beta Disclaimer */}
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="text-3xl">💡</div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-3">Esta aplicación está en fase beta y sigue en desarrollo.</h3>
                            <p className="text-gray-700 mb-3">
                                Por ahora es <strong>100% gratuita</strong>, mientras recopilo feedback real de uso para mejorarla y decidir los próximos pasos.
                            </p>
                            <p className="text-gray-700 mb-3">
                                Si tenés comentarios, sugerencias, ideas o encontrás algún error, te agradecería muchísimo que me lo compartas.
                                <strong> Tu opinión hace realmente la diferencia.</strong>
                            </p>
                            <p className="text-gray-700 mb-3">
                                Podés escribirme a: <a href="mailto:manuelarocena3@gmail.com" className="text-blue-600 hover:underline font-medium">📧 manuelarocena3@gmail.com</a>
                            </p>
                            <p className="text-gray-700 mb-2">
                                Gracias por probar esta herramienta. Espero que te ayude a estudiar, organizarte y aprender mejor.
                            </p>
                            <p className="text-gray-700">
                                La hice con mucho cariño y me encantaría saber qué te parece. <span className="text-xl">🙌💛</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Create Folder Button */}
                <div className="mb-6">
                    {!isCreatingFolder ? (
                        <button
                            onClick={() => setIsCreatingFolder(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm hover:shadow"
                        >
                            <FolderPlus className="w-4 h-4" />
                            Nueva Carpeta
                        </button>
                    ) : (
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-w-md">
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                placeholder="Nombre de la carpeta..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateFolder}
                                    disabled={!newFolderName.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Crear
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreatingFolder(false)
                                        setNewFolderName('')
                                    }}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Folders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {folders.map((folder) => {
                        const exerciseCount = items.filter(
                            item => item.type === 'file' && item.parentId === folder.id
                        ).length

                        return (
                            <Link
                                key={folder.id}
                                to={`/folder/${folder.id}`}
                                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                                        <Folder className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">{folder.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}

                    {folders.length === 0 && !isCreatingFolder && (
                        <div className="col-span-full text-center py-12">
                            <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">No tienes carpetas aún</p>
                            <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="text-blue-600 hover:underline font-medium"
                            >
                                Crear tu primera carpeta
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
