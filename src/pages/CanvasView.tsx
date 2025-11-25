import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Editor from '../components/Editor'
import ExercisePanel from '../components/ExercisePanel'
import { DebugConsole } from '../components/DebugConsole'

export const CanvasView = () => {
    const { subjectId } = useParams()
    const [statement, setStatement] = useState(
        "Resolver la siguiente integral definida: ∫(0 a π) x * sin(x) dx. Justificar cada paso."
    )

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Minimal Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <Link to={`/subject/${subjectId}`} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <h1 className="font-medium text-gray-700 text-sm">
                        {subjectId?.charAt(0).toUpperCase() + subjectId?.slice(1)} / Nuevo Ejercicio
                    </h1>
                </div>
                <div className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    Guardado automático
                </div>
            </header>

            {/* Exercise Statement Panel */}
            <div className="shrink-0 z-10">
                <ExercisePanel statement={statement} setStatement={setStatement} />
            </div>

            {/* Main Canvas Area */}
            <main className="flex-1 relative overflow-hidden">
                <Editor exerciseStatement={statement} />
            </main>

            <DebugConsole />
        </div>
    )
}
