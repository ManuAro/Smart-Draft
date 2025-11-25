import { clsx } from 'clsx'
import { useEffect, useState } from 'react'

const symbols = [
    // Integral
    (props: any) => <path d="M40,20 C50,10 60,10 60,20 L60,80 C60,90 50,90 40,80" {...props} />,
    // Pi
    (props: any) => <path d="M20,30 L80,30 M30,30 L30,80 M70,30 L70,80 M70,80 C70,90 80,90 80,80" {...props} />,
    // Sigma
    (props: any) => <path d="M70,20 L30,20 L50,50 L30,80 L70,80" {...props} />,
    // Triangle
    (props: any) => <path d="M50,20 L80,80 L20,80 Z" {...props} />,
    // X
    (props: any) => <path d="M20,20 L80,80 M80,20 L20,80" {...props} />,
    // Infinity
    (props: any) => <path d="M20,25 C20,10 40,10 50,25 C60,40 80,40 80,25 C80,10 60,10 50,25 C40,40 20,40 20,25 Z" {...props} />,
    // Plus
    (props: any) => <path d="M50,20 L50,80 M20,50 L80,50" {...props} />,
    // Circle
    (props: any) => <circle cx="50" cy="50" r="30" {...props} />,
    // Square Root
    (props: any) => <path d="M20,50 L40,80 L60,20 L90,20" {...props} />,
    // Cube (Simple)
    (props: any) => <path d="M20,30 L50,10 L80,30 L80,70 L50,90 L20,70 Z M20,30 L50,50 L80,30 M50,50 L50,90" {...props} />,
    // Alpha
    (props: any) => <path d="M80,30 C60,30 50,50 50,50 C50,50 40,30 20,30 C10,30 10,50 20,60 C30,70 50,50 50,50 L80,80" {...props} />,
    // Beta
    (props: any) => <path d="M30,90 L30,10 C30,10 60,10 60,30 C60,45 40,50 40,50 C40,50 70,55 70,75 C70,90 30,90 30,90" {...props} />,
]

const colors = [
    'text-indigo-300',
    'text-orange-300',
    'text-emerald-300',
    'text-blue-300',
    'text-purple-300',
    'text-pink-300',
]

interface Doodle {
    id: number
    Symbol: any
    x: number
    y: number
    size: number
    rotation: number
    color: string
}

export const DoodleBackground = ({ className }: { className?: string }) => {
    const [doodles, setDoodles] = useState<Doodle[]>([])

    useEffect(() => {
        // Generate random doodles only once on mount to avoid hydration mismatch/re-renders
        const newDoodles = Array.from({ length: 25 }).map((_, i) => ({
            id: i,
            Symbol: symbols[Math.floor(Math.random() * symbols.length)],
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 40 + Math.random() * 60,
            rotation: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)],
        }))
        setDoodles(newDoodles)
    }, [])

    return (
        <div className={clsx("absolute inset-0 overflow-hidden pointer-events-none", className)}>
            {doodles.map((d) => (
                <svg
                    key={d.id}
                    className={clsx("absolute opacity-20 transition-all duration-1000 ease-in-out hover:scale-110 hover:opacity-40", d.color)}
                    style={{
                        left: `${d.x}%`,
                        top: `${d.y}%`,
                        width: `${d.size}px`,
                        height: `${d.size}px`,
                        transform: `rotate(${d.rotation}deg)`,
                    }}
                    viewBox="0 0 100 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <d.Symbol />
                </svg>
            ))}

            {/* Texture Overlay */}
            <div className="texture-overlay"></div>
        </div>
    )
}
