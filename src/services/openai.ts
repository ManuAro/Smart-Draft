// All OpenAI calls are now routed through serverless functions
// This keeps the API key secure on the server side

export interface AIAnnotation {
    id?: string
    type: 'warning' | 'info' | 'success' | 'suggestion' | 'reference'
    text: string
    explanation: string // Detailed explanation
    x: number // 0-1 relative to image width (top-left of box)
    y: number // 0-1 relative to image height (top-left of box)
    width: number // 0-1 relative width
    height: number // 0-1 relative height
}

export const analyzeCanvas = async (
    imageDataUrl: string,
    mode: 'active' | 'idle',
    exerciseStatement: string
): Promise<AIAnnotation[]> => {
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageDataUrl,
                mode,
                exerciseStatement
            })
        })

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()

        // Debug: Log raw annotations to inspect formatting issues
        if (data.annotations && data.annotations.length > 0) {
            console.log('🔍 Raw AI annotations:', data.annotations)
            console.log('🔍 First annotation explanation:', data.annotations[0].explanation)
            console.log('🔍 First annotation explanation length:', data.annotations[0].explanation?.length)
            console.log('🔍 Has backslashes?', data.annotations[0].explanation?.includes('\\'))
        }

        return data.annotations || []

    } catch (error) {
        console.error("Error calling analyze API:", error)
        return []
    }
}

export interface SolutionStep {
    explanation: string
    latex: string
}

export const generateSolution = async (
    exerciseStatement: string,
    imageDataUrl: string | null
): Promise<SolutionStep[]> => {
    try {
        const response = await fetch('/api/generate-solution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                exerciseStatement,
                imageDataUrl
            })
        })

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        return data.steps || []

    } catch (error) {
        console.error("Error generating solution:", error)
        return []
    }
}

export interface ChatMessage {
    role: 'user' | 'assistant'
    text: string
}

export const chatWithAI = async (
    messages: ChatMessage[],
    imageDataUrl: string | null,
    exerciseStatement: string
): Promise<string> => {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages,
                imageDataUrl,
                exerciseStatement
            })
        })

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        return data.content || "Lo siento, no pude generar una respuesta."

    } catch (error) {
        console.error("Error in chatWithAI:", error)
        return "Lo siento, hubo un error al conectar con el tutor virtual."
    }
}
