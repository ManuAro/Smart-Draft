import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface Message {
    id: string
    role: 'user' | 'assistant'
    text: string
}

interface ChatInterfaceProps {
    onClose: () => void
    onSendMessage: (text: string) => Promise<string>
    initialMessage?: string
}

export const ChatInterface = ({ onClose, onSendMessage, initialMessage }: ChatInterfaceProps) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '0', role: 'assistant', text: 'Hola, ¿en qué puedo ayudarte con este ejercicio?' }
    ])
    const [input, setInput] = useState('')
    const [isMinimized, setIsMinimized] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const hasSentInitialMessage = useRef(false)

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }, [messages])

    // Auto-send initial message
    useEffect(() => {
        if (initialMessage && !hasSentInitialMessage.current) {
            hasSentInitialMessage.current = true
            handleSend(initialMessage)
        }
    }, [initialMessage])

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input
        if (!textToSend.trim() || isLoading) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend }
        setMessages(prev => [...prev, userMsg])
        if (!textOverride) setInput('')
        setIsLoading(true)

        try {
            const response = await onSendMessage(userMsg.text)
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: response }
            setMessages(prev => [...prev, aiMsg])
        } catch (error) {
            console.error(error)
            const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Lo siento, hubo un error al procesar tu mensaje.' }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    const [position, setPosition] = useState({ x: 0, y: 0 })
    const dragStartPos = useRef<{ x: number, y: number } | null>(null)
    const initialPos = useRef<{ x: number, y: number } | null>(null)
    const isDragging = useRef(false)

    const handleHeaderPointerDown = (e: React.PointerEvent) => {
        // Only drag if clicking on the header itself, not buttons
        if ((e.target as HTMLElement).closest('button')) return

        e.preventDefault()
        isDragging.current = true
        dragStartPos.current = { x: e.clientX, y: e.clientY }
        initialPos.current = { ...position }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
    }

    const handlePointerMove = (e: PointerEvent) => {
        if (!isDragging.current || !dragStartPos.current || !initialPos.current) return

        const dx = e.clientX - dragStartPos.current.x
        const dy = e.clientY - dragStartPos.current.y

        setPosition({
            x: initialPos.current.x + dx,
            y: initialPos.current.y + dy
        })
    }

    const handlePointerUp = () => {
        isDragging.current = false
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        dragStartPos.current = null
        initialPos.current = null
    }

    if (isMinimized) {
        return createPortal(
            <div
                className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors z-[100]"
                onClick={() => setIsMinimized(false)}
            >
                <MessageCircle className="w-6 h-6" />
            </div>,
            document.body
        )
    }

    return createPortal(
        <div
            className="fixed bottom-6 right-6 z-[1000]"
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isDragging.current ? 'none' : 'transform 0.2s ease-out'
            }}
        >
            <div className="w-80 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
                {/* Header - Draggable Area */}
                <div
                    className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg cursor-grab active:cursor-grabbing select-none"
                    onPointerDown={handleHeaderPointerDown}
                >
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-700 text-sm">Ayuda AI</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                        >
                            <Minimize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div
                    className="h-[450px] overflow-y-scroll overflow-x-hidden p-4 pr-2 space-y-3 bg-gray-50/50"
                    style={{ overscrollBehavior: 'contain' }}
                >
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-sm'
                                    }`}
                            >
                                {msg.role === 'assistant' ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                            code: ({ children }) => <code className="bg-gray-100 px-1 rounded">{children}</code>
                                        }}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : (
                                    msg.text
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none shadow-sm">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-100 bg-white rounded-b-lg">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escribe tu pregunta..."
                            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            autoFocus
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
