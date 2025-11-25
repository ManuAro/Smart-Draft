import { BookOpen, Calculator, Atom, FlaskConical, History, Languages } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DoodleBackground } from '../components/DoodleBackground'

const subjects = [
    { id: 'math', name: 'Matemáticas', icon: Calculator, color: 'bg-indigo-100 text-indigo-600', count: 12 },
    { id: 'physics', name: 'Física', icon: Atom, color: 'bg-orange-100 text-orange-600', count: 8 },
    { id: 'chemistry', name: 'Química', icon: FlaskConical, color: 'bg-emerald-100 text-emerald-600', count: 5 },
    { id: 'history', name: 'Historia', icon: History, color: 'bg-yellow-100 text-yellow-600', count: 3 },
    { id: 'literature', name: 'Literatura', icon: BookOpen, color: 'bg-pink-100 text-pink-600', count: 7 },
    { id: 'english', name: 'Inglés', icon: Languages, color: 'bg-teal-100 text-teal-600', count: 4 },
]

export const Dashboard = () => {
    return (
        <div className="min-h-screen bg-[var(--color-paper)] p-8 relative overflow-hidden font-sans">
            <DoodleBackground />

            <div className="relative z-10 max-w-6xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-5xl font-black text-gray-800 tracking-tight mb-3" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
                        Mis Materias
                    </h1>
                    <p className="text-gray-600 text-xl font-medium">Tu espacio creativo de aprendizaje</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {subjects.map((subject) => (
                        <Link
                            key={subject.id}
                            to={`/subject/${subject.id}`}
                            className="bg-white rounded-[2rem] p-8 shadow-lg border-2 border-gray-100 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                            style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }} // Sketchy border
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-gray-50 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>

                            <div className="flex items-start justify-between mb-6 relative">
                                <div className={`p-4 rounded-2xl ${subject.color} group-hover:rotate-12 transition-transform shadow-sm ring-4 ring-white`}>
                                    <subject.icon className="w-8 h-8" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                                    {subject.count} ejercicios
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">{subject.name}</h2>
                            <p className="text-sm text-gray-400 font-medium">Última actividad: hace 2 días</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
