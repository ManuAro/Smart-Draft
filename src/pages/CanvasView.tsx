import { useState, useRef, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import Editor, { type EditorRef } from '../components/Editor'
import { ChatInterface } from '../components/ChatInterface'
import { useFileSystem } from '../contexts/FileSystemContext'
import { chatWithAI, type ChatMessage } from '../services/openai'

const CanvasView = () => {
    const { folderId, fileId } = useParams()
    const displayFolderName = folderId || 'Carpeta'
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [exerciseStatement, setExerciseStatement] = useState('')
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [filename, setFilename] = useState('')
    const [currentFileId, setCurrentFileId] = useState<string | undefined>(fileId)

    const editorRef = useRef<EditorRef>(null)
    const { createFile, getFile, saveFile, setCurrentFolderId } = useFileSystem()
    const [messages, setMessages] = useState<ChatMessage[]>([])

    // Set current folder when component mounts
    useEffect(() => {
        if (folderId) {
            setCurrentFolderId(folderId)
        }
        return () => {
            setCurrentFolderId(null) // Clean up when leaving
        }
    }, [folderId, setCurrentFolderId])

    // Load existing file if fileId is present - ONLY ONCE on mount
    const [initialSnapshot, setInitialSnapshot] = useState<any>(null)

    useEffect(() => {
        if (fileId) {
            const file = getFile(fileId)
            if (file && file.content) {
                setFilename(file.name)
                setExerciseStatement(file.content.statement || '')
                setCurrentFileId(fileId)
                // Set initial snapshot only once
                if (file.content.snapshot) {
                    setInitialSnapshot(file.content.snapshot)
                }
            }
        }
    }, [fileId, getFile])

    const handleSave = () => {
        if (!filename.trim()) return

        const snapshot = editorRef.current?.getSnapshot()
        const content = {
            statement: exerciseStatement,
            snapshot
        }

        if (currentFileId) {
            // Update existing file
            saveFile(currentFileId, content)
        } else {
            // Create new file
            const newFileId = createFile(filename, content)
            setCurrentFileId(newFileId)
        }

        setIsSaveModalOpen(false)
    }



    const handleSendMessage = async (text: string) => {
        try {
            // Capture current canvas state
            const image = await editorRef.current?.getCanvasImage()

            // Build message history
            const newMessage: ChatMessage = { role: 'user', text }
            const allMessages = [...messages, newMessage]
            setMessages(allMessages)

            // Call AI with image and context
            const response = await chatWithAI(allMessages, image ?? null, exerciseStatement)

            // Add AI response to history
            setMessages([...allMessages, { role: 'assistant', text: response }])

            return response
        } catch (error) {
            console.error("Error in handleSendMessage:", error)
            return "Lo siento, hubo un error al procesar tu mensaje."
        }
    }

    return (
        <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans text-gray-900">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <Link to={`/folder/${folderId}`} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="font-semibold text-lg text-gray-800">
                            {displayFolderName}
                        </h1>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">Ejercicio 1</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (currentFileId && filename) {
                                    // Si ya existe el archivo, guardar directamente sin modal
                                    handleSave()
                                } else {
                                    // Si es nuevo, mostrar modal para pedir nombre
                                    setIsSaveModalOpen(true)
                                }
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Guardar
                        </button>
                    </div>
                </header>

                {/* Workspace */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Exercise Statement Section */}
                    <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
                        <label className="block text-xs font-semibold text-blue-900 mb-2">
                            Enunciado del Ejercicio
                        </label>
                        <textarea
                            value={exerciseStatement}
                            onChange={(e) => setExerciseStatement(e.target.value)}
                            onBlur={() => {
                                // Re-focus the tldraw editor when user finishes with textarea
                                // This prevents the toolbar from disappearing
                                setTimeout(() => {
                                    const editor = editorRef.current?.getEditor()
                                    if (editor) {
                                        editor.focus()
                                    }
                                }, 100)
                            }}
                            placeholder="Escribe aquí el enunciado del ejercicio para dar contexto a la IA..."
                            className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white"
                            rows={2}
                        />
                    </div>

                    {/* Canvas - Full Width */}
                    <div className="flex-1 relative bg-white">
                        <Editor
                            ref={editorRef}
                            exerciseStatement={exerciseStatement}
                            onOpenChat={() => setIsChatOpen(true)}
                            initialSnapshot={initialSnapshot}
                        />

                        {/* Chat Interface (Floating) */}
                        {isChatOpen && (
                            <ChatInterface
                                onClose={() => setIsChatOpen(false)}
                                onSendMessage={handleSendMessage}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Save Modal */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guardar Ejercicio</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del archivo</label>
                                <input
                                    type="text"
                                    value={filename}
                                    onChange={(e) => setFilename(e.target.value)}
                                    placeholder="Ej: Derivadas Parciales 1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!filename.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CanvasView
