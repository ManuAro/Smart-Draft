import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DoodleBackground } from '../components/DoodleBackground'
import { Mail, ArrowRight } from 'lucide-react'

interface EmailGateProps {
    onSubmit: (email: string) => void
}

export const EmailGate = ({ onSubmit }: EmailGateProps) => {
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return re.test(email)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email.trim()) {
            setError('Por favor ingresa tu email')
            return
        }

        if (!validateEmail(email)) {
            setError('Por favor ingresa un email válido')
            return
        }

        setIsSubmitting(true)
        setError('')

        try {
            // Guardar en localStorage
            localStorage.setItem('smart-draft-user-email', email)
            localStorage.setItem('smart-draft-email-submitted-at', new Date().toISOString())

            // Aquí puedes agregar llamada a Google Sheets / Formspree / etc
            // Por ahora solo guardamos localmente

            onSubmit(email)
            navigate('/')
        } catch (err) {
            setError('Hubo un error. Por favor intenta de nuevo.')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center relative overflow-hidden">
            <DoodleBackground />

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 animate-in fade-in zoom-in-95 duration-500">
                    {/* Logo/Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
                        Bienvenido a Smart Draft
                    </h1>
                    <p className="text-gray-600 text-center mb-8">
                        Tu asistente de IA para aprender Probabilidad y Estadística
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    setError('')
                                }}
                                placeholder="tu@email.com"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                autoFocus
                                disabled={isSubmitting}
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-600">{error}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                'Accediendo...'
                            ) : (
                                <>
                                    Comenzar
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Privacy note */}
                    <p className="text-xs text-gray-500 text-center mt-6">
                        Usaremos tu email solo para enviarte actualizaciones importantes y pedir feedback. No spam, prometido.
                    </p>
                </div>

                {/* Features */}
                <div className="mt-8 space-y-3 text-center">
                    <div className="text-sm text-gray-600">
                        ✨ Resuelve ejercicios con IA
                    </div>
                    <div className="text-sm text-gray-600">
                        📊 Visualiza conceptos estadísticos
                    </div>
                    <div className="text-sm text-gray-600">
                        💬 Chat inteligente que te guía paso a paso
                    </div>
                </div>
            </div>
        </div>
    )
}
