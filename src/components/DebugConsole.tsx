import { useEffect, useState, useRef } from 'react'

interface DebugConsoleProps {
    editorState: {
        hasEditor: boolean
        hasInitialized: boolean
        hasLoadedSnapshot: boolean
        initialSnapshotExists: boolean
        fileId: string | undefined
    }
}

export const DebugConsole = ({ editorState }: DebugConsoleProps) => {
    const [logs, setLogs] = useState<string[]>([])
    const [isMinimized, setIsMinimized] = useState(false)
    const renderCount = useRef(0)
    const prevState = useRef(editorState)

    useEffect(() => {
        renderCount.current++
        const timestamp = new Date().toLocaleTimeString()

        // Check what changed
        const changes: string[] = []
        if (prevState.current.hasEditor !== editorState.hasEditor) {
            changes.push(`hasEditor: ${prevState.current.hasEditor} → ${editorState.hasEditor}`)
        }
        if (prevState.current.hasInitialized !== editorState.hasInitialized) {
            changes.push(`hasInitialized: ${prevState.current.hasInitialized} → ${editorState.hasInitialized}`)
        }
        if (prevState.current.hasLoadedSnapshot !== editorState.hasLoadedSnapshot) {
            changes.push(`hasLoadedSnapshot: ${prevState.current.hasLoadedSnapshot} → ${editorState.hasLoadedSnapshot}`)
        }
        if (prevState.current.initialSnapshotExists !== editorState.initialSnapshotExists) {
            changes.push(`initialSnapshotExists: ${prevState.current.initialSnapshotExists} → ${editorState.initialSnapshotExists}`)
        }
        if (prevState.current.fileId !== editorState.fileId) {
            changes.push(`fileId: ${prevState.current.fileId} → ${editorState.fileId}`)
        }

        if (changes.length > 0) {
            const log = `[${timestamp}] Render #${renderCount.current} - ${changes.join(', ')}`
            setLogs(prev => [...prev.slice(-19), log]) // Keep last 20 logs
        }

        prevState.current = editorState
    }, [editorState])

    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-[500]">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-mono hover:bg-gray-800"
                >
                    🐛 Debug ({logs.length})
                </button>
            </div>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-[500] bg-gray-900 text-green-400 p-4 rounded-lg shadow-2xl max-w-2xl font-mono text-xs">
            <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold">🐛 Debug Console</span>
                    <span className="text-gray-500">Renders: {renderCount.current}</span>
                </div>
                <button
                    onClick={() => setIsMinimized(true)}
                    className="text-gray-400 hover:text-white"
                >
                    ✕
                </button>
            </div>

            <div className="mb-3 space-y-1">
                <div className="text-white">Current State:</div>
                <div>Editor: <span className={editorState.hasEditor ? 'text-green-400' : 'text-red-400'}>{editorState.hasEditor ? '✓' : '✗'}</span></div>
                <div>Initialized: <span className={editorState.hasInitialized ? 'text-green-400' : 'text-red-400'}>{editorState.hasInitialized ? '✓' : '✗'}</span></div>
                <div>Snapshot Loaded: <span className={editorState.hasLoadedSnapshot ? 'text-green-400' : 'text-red-400'}>{editorState.hasLoadedSnapshot ? '✓' : '✗'}</span></div>
                <div>Initial Snapshot Exists: <span className={editorState.initialSnapshotExists ? 'text-green-400' : 'text-red-400'}>{editorState.initialSnapshotExists ? '✓' : '✗'}</span></div>
                <div>File ID: <span className="text-yellow-400">{editorState.fileId || 'new-exercise'}</span></div>
            </div>

            <div className="border-t border-gray-700 pt-2">
                <div className="text-white mb-1">Change Log:</div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {logs.length === 0 ? (
                        <div className="text-gray-500">No changes detected yet...</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="text-xs text-gray-300">{log}</div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
