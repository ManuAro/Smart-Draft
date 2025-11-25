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
          `
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
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
