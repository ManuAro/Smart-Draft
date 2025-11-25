import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export const logDebug = (message: string, data?: any) => {
    const event = new CustomEvent('debug-log', {
        detail: { message, data: data ? JSON.stringify(data, null, 2) : undefined }
    })
    window.dispatchEvent(event)
    console.log(`[Debug] ${message}`, data || '')
}

export const DebugConsole = () => {
    const [logs, setLogs] = useState<{ time: string, message: string, data?: string }[]>([])
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail
            setLogs(prev => [{
                time: new Date().toLocaleTimeString(),
                message: detail.message,
                data: detail.data
            }, ...prev].slice(0, 50))
        }

        window.addEventListener('debug-log', handler)
        return () => window.removeEventListener('debug-log', handler)
    }, [])

    if (!isVisible) return (
        <button
            onClick={() => setIsVisible(true)}
            className="fixed bottom-4 left-4 bg-black text-white px-3 py-1 rounded text-xs z-[9999]"
        >
            Show Debug
        </button>
    )

    return (
        <div className="fixed bottom-0 left-0 w-full h-64 bg-black/90 text-green-400 font-mono text-xs p-4 overflow-auto z-[9999] border-t border-gray-700">
            <div className="flex justify-between items-center mb-2 sticky top-0 bg-black/90 pb-2 border-b border-gray-800">
                <span className="font-bold text-white">Debug Console</span>
                <div className="flex gap-2">
                    <button onClick={() => setLogs([])} className="hover:text-white">Clear</button>
                    <button onClick={() => setIsVisible(false)}><X className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                {logs.map((log, i) => (
                    <div key={i} className="border-b border-gray-800 pb-1">
                        <span className="text-gray-500">[{log.time}]</span> <span className="font-bold">{log.message}</span>
                        {log.data && <pre className="text-gray-400 mt-1 ml-4 whitespace-pre-wrap">{log.data}</pre>}
                    </div>
                ))}
            </div>
        </div>
    )
}
