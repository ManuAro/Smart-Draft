import OpenAI from 'openai'
import { logDebug } from '../components/DebugConsole'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY

const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
})

export interface AIAnnotation {
    type: 'warning' | 'info'
    text: string
    explanation: string // Detailed explanation
    x: number // 0-1 relative to image width
    y: number // 0-1 relative to image height
}

export const analyzeCanvas = async (
    imageDataUrl: string,
    mode: 'active' | 'idle',
    exerciseStatement: string
): Promise<AIAnnotation[]> => {
    if (!apiKey) {
        console.error("No API Key found")
        return []
    }

    const prompt = mode === 'active'
        ? "You are a strict math tutor checking for errors in real-time. Look for logical errors, calculation mistakes, or missing justifications. CRITICAL RULES:\n1. IGNORE INCOMPLETE WORK. If an equation ends in '=', or if an integral/parenthesis is unclosed, DO NOT flag it. The user is still writing.\n2. Only flag CLEAR, OBJECTIVE ERRORS in COMPLETED steps.\n3. False positives are unacceptable.\nReturn a JSON array of annotations. For each error, provide a VERY SHORT keyword (max 2 words), a detailed explanation, and the position."
        : "You are a helpful math tutor. The student is stuck. Provide a helpful hint or suggestion to move forward. Return a JSON array of annotations. Provide a VERY SHORT keyword (max 2 words), a detailed explanation, and the position."

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant analyzing handwritten math. 
          The current exercise statement is: "${exerciseStatement}".
          
          Output strictly valid JSON in this format:
          {
            "annotations": [
              { 
                "type": "warning" (for errors) or "info" (for hints), 
                "text": "keyword", 
                "explanation": "Detailed explanation of why this is wrong or a helpful hint.",
                "x": 0.5, 
                "y": 0.5 
              }
            ]
          }
          IMPORTANT: x and y MUST be relative coordinates (0-1) pointing EXACTLY to the specific error or part of the equation.
          (0,0) is top-left, (1,1) is bottom-right of the provided image.
          IMPORTANT: ALL OUTPUT MUST BE IN SPANISH.
          `
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt + " RESPOND IN SPANISH." },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageDataUrl,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
        })

        const content = response.choices[0].message.content
        logDebug("Raw OpenAI Content", content)
        if (!content) return []

        const result = JSON.parse(content)
        return result.annotations || []

    } catch (error) {
        console.error("Error calling OpenAI:", error)
        return []
    }
}

export interface SolutionStep {
    explanation: string
    latex: string
}

export const generateSolution = async (exerciseStatement: string): Promise<SolutionStep[]> => {
    if (!apiKey) {
        console.error("No API Key found")
        return []
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert math tutor.
          The current exercise statement is: "${exerciseStatement}".
          
          Solve the problem step-by-step.
          Output strictly valid JSON in this format:
          {
            "steps": [
              { 
                "explanation": "Brief explanation of the step in Spanish", 
                "latex": "The math equation for this step (e.g. \\int x dx)"
              }
            ]
          }
          IMPORTANT: ALL OUTPUT MUST BE IN SPANISH.
          `
                },
                {
                    role: "user",
                    content: "Solve this problem step-by-step. Return the JSON."
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 1000,
        })

        const content = response.choices[0].message.content
        logDebug("Raw OpenAI Solution", content)
        if (!content) return []

        const result = JSON.parse(content)
        return result.steps || []

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
    if (!apiKey) {
        return "Error: No API Key found. Please check your .env file."
    }

    try {
        const systemPrompt = `You are a helpful and encouraging math tutor.
        The student is working on an exercise: "${exerciseStatement}".
        
        You have access to the student's current canvas drawing (if provided).
        Analyze the drawing to understand where they are stuck or what they have done so far.
        
        Guidelines:
        1. Be concise and friendly.
        2. Do NOT give the final answer immediately. Guide them step-by-step.
        3. If they made a mistake, gently point it out and ask a guiding question.
        4. If the canvas is empty, ask them how they plan to start.
        5. Respond in Spanish.
        6. IMPORTANT: When writing mathematical expressions, use LaTeX notation:
           - For inline math, use single dollar signs: $x^2 + 1$
           - For display math, use double dollar signs: $$\\int x dx = \\frac{x^2}{2} + C$$
           - Always use LaTeX for formulas, equations, integrals, derivatives, etc.`

        const apiMessages: any[] = [
            { role: "system", content: systemPrompt },
            ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.text })), // Previous context
        ]

        // Add the latest message with image if available
        const lastMessage = messages[messages.length - 1]
        const userContent: any[] = [{ type: "text", text: lastMessage.text }]

        if (imageDataUrl) {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: imageDataUrl,
                    detail: "high"
                }
            })
        }

        apiMessages.push({
            role: "user",
            content: userContent
        })

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: apiMessages,
            max_tokens: 500,
        })

        return response.choices[0].message.content || "Lo siento, no pude generar una respuesta."

    } catch (error) {
        console.error("Error in chatWithAI:", error)
        return "Lo siento, hubo un error al conectar con el tutor virtual."
    }
}
