import type { VercelRequest, VercelResponse } from '@vercel/node'

const apiKey = process.env.OPENAI_API_KEY
const PRIMARY_MODEL = 'gpt-4o-mini'
const MIN_STATEMENT_CHARS = 40

const needsCanvasContext = (statement?: string) => {
    if (!statement) return true
    const trimmed = statement.trim()
    if (!trimmed) return true
    if (trimmed.length < MIN_STATEMENT_CHARS) return true
    const hasNumbers = /\d/.test(trimmed)
    return !hasNumbers
}

async function describeCanvas(imageDataUrl?: string): Promise<string | null> {
    if (!imageDataUrl) return null

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: PRIMARY_MODEL,
                messages: [
                    {
                        role: "system",
                        content: `Describe en español qué ejercicio de matemática se observa en la imagen y cuál parece ser el objetivo. Usa LaTeX para ecuaciones.`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Describe brevemente el contenido y los datos relevantes." },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageDataUrl,
                                    detail: "low"
                                }
                            }
                        ]
                    }
                ]
            })
        })

        const data = await response.json()
        return data?.choices?.[0]?.message?.content?.trim() || null
    } catch (error) {
        console.error('Failed to derive canvas context for chat', error)
        return null
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' })
    }

    const { messages, imageDataUrl, exerciseStatement } = req.body

    const derivedContext = needsCanvasContext(exerciseStatement) ? await describeCanvas(imageDataUrl) : null
    const combinedStatement = [
        exerciseStatement && exerciseStatement.trim().length > 0
            ? `Enunciado del estudiante: "${exerciseStatement.trim()}"`
            : 'El estudiante no proporcionó un enunciado claro.',
        derivedContext ? `Contexto reconstruido desde la hoja: ${derivedContext}` : null
    ].filter(Boolean).join('\n\n')

    const systemPrompt = `Eres un tutor de matemática amigable y riguroso.
Contexto del ejercicio:
${combinedStatement}

Reglas:
1. Responde en español con un tono motivador.
2. No des la respuesta final inmediatamente; guía al estudiante con preguntas y micro-pasos.
3. Si notas un error, descríbelo y sugiere cómo corregirlo, priorizando el resultado final.
4. FORMATO DE MATEMÁTICAS OBLIGATORIO:
   - SIEMPRE encierra expresiones matemáticas entre delimitadores LaTeX: $...$ para inline o $$...$$ para display.
   - NUNCA escribas comandos LaTeX sin delimitadores.
   - Ejemplos CORRECTOS: "La integral $$\\int_0^{\\pi} x^2 dx$$ resulta en $\\frac{\\pi^3}{3}$"
   - Ejemplos INCORRECTOS: "$$\\\\int x dx$$" (doble backslash), "\\frac{a}{b}" (sin delimitadores $)
5. Si el ejercicio ya está correcto, confírmalo y ofrece mejoras sólo como sugerencias.`

    const apiMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...messages.slice(0, -1).map((m: any) => ({ role: m.role, content: m.text })),
    ]

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

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: PRIMARY_MODEL,
                messages: apiMessages
            })
        })

        const data = await response.json()
        let content = data.choices[0].message.content || "Lo siento, no pude generar una respuesta."

        // Fix double-escaped backslashes in LaTeX (\\int -> \int)
        content = content.replace(/\\\\/g, '\\')

        return res.status(200).json({ content })

    } catch (error) {
        console.error("Error in chat:", error)
        return res.status(500).json({ error: 'Failed to process chat' })
    }
}
