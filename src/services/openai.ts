import OpenAI from 'openai'
import { logDebug } from '../components/DebugConsole'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY

const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for client-side usage
})

const PRIMARY_MODEL = "gpt-5.1"
const FALLBACK_MODEL = "gpt-4o"

async function callOpenAIWithFallback(params: any) {
    try {
        logDebug(`Attempting call with ${PRIMARY_MODEL}`)
        // Log payload summary (hide base64)
        const payloadSummary = JSON.parse(JSON.stringify(params))
        if (payloadSummary.messages) {
            payloadSummary.messages.forEach((m: any) => {
                if (Array.isArray(m.content)) {
                    m.content = m.content.map((c: any) => c.type === 'image_url' ? { ...c, image_url: { ...c.image_url, url: '<BASE64_HIDDEN>' } } : c)
                }
            })
        }
        logDebug("Request Payload:", payloadSummary)

        const response = await openai.chat.completions.create({ ...params, model: PRIMARY_MODEL })

        if (!response.choices[0]?.message?.content) {
            throw new Error("Empty response from primary model")
        }

        return response

    } catch (error) {
        console.warn(`${PRIMARY_MODEL} failed, falling back to ${FALLBACK_MODEL}`, error)
        logDebug(`${PRIMARY_MODEL} failed, falling back to ${FALLBACK_MODEL}`, error)
        return await openai.chat.completions.create({ ...params, model: FALLBACK_MODEL })
    }
}

export interface AIAnnotation {
    type: 'warning' | 'info'
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
    if (!apiKey) {
        console.error("No API Key found")
        return []
    }

    const prompt = mode === 'active'
        ? "You are a math tutor checking for errors. Look for logical errors, calculation mistakes, or missing justifications. Return a JSON array of annotations. For each error, provide a VERY SHORT keyword (max 2 words), a detailed explanation, and the BOUNDING BOX of the error."
        : "You are a helpful math tutor. The student is stuck. Provide a helpful hint or suggestion to move forward. Return a JSON array of annotations. Provide a VERY SHORT keyword (max 2 words), a detailed explanation, and the BOUNDING BOX of the area to focus on."

    try {
        const response = await callOpenAIWithFallback({
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant analyzing handwritten math. 
          The current exercise statement is: "${exerciseStatement}".
          
          Analyze the image and provide annotations.
          IMPORTANT: You must return a BOUNDING BOX for each error.
          - x, y: Top-left corner of the box (0-1 relative coordinates).
          - width, height: Size of the box (0-1 relative).
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
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "math_analysis",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            annotations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["warning", "info"] },
                                        text: { type: "string" },
                                        explanation: { type: "string" },
                                        x: { type: "number" },
                                        y: { type: "number" },
                                        width: { type: "number" },
                                        height: { type: "number" }
                                    },
                                    required: ["type", "text", "explanation", "x", "y", "width", "height"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["annotations"],
                        additionalProperties: false
                    }
                }
            }
        })

        const content = response.choices[0].message.content
        logDebug("OpenAI API Content", content)

        if (!content) return []

        const result = JSON.parse(content)
        return result.annotations || []

    } catch (error) {
        console.error("Error calling OpenAI API:", error)
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
    if (!apiKey) {
        console.error("No API Key found")
        return []
    }

    try {
        const userContent: any[] = [{ type: "text", text: "Solve this problem step-by-step." }]

        if (imageDataUrl) {
            userContent.push({
                type: "image_url",
                image_url: {
                    url: imageDataUrl,
                    detail: "high"
                }
            })
        }

        const response = await callOpenAIWithFallback({
            messages: [
                {
                    role: "system",
                    content: `You are an expert math tutor.
          The current exercise statement is: "${exerciseStatement}".
          
          You have access to the student's current work (if provided). Use it to understand their approach, but provide a complete correct solution.
          
          Solve the problem step-by-step.
          IMPORTANT: ALL OUTPUT MUST BE IN SPANISH.
          `
                },
                {
                    role: "user",
                    content: userContent
                }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "math_solution",
                    strict: true,
                    schema: {
                        type: "object",
                        properties: {
                            steps: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        explanation: { type: "string" },
                                        latex: { type: "string" }
                                    },
                                    required: ["explanation", "latex"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["steps"],
                        additionalProperties: false
                    }
                }
            }
        })

        const content = response.choices[0].message.content
        logDebug("OpenAI API Solution", content)

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

        const response = await callOpenAIWithFallback({
            messages: apiMessages,
        })

        return response.choices[0].message.content || "Lo siento, no pude generar una respuesta."

    } catch (error) {
        console.error("Error in chatWithAI:", error)
        return "Lo siento, hubo un error al conectar con el tutor virtual."
    }
}
