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
                        content: `Describe en español qué ejercicio se observa en la imagen, incluyendo datos clave o ecuaciones usando LaTeX. Máximo 2 oraciones.`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Describe brevemente el ejercicio y qué se está resolviendo." },
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
        console.error('Failed to derive canvas context for solution', error)
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

    const { exerciseStatement, imageDataUrl } = req.body

    const derivedContext = needsCanvasContext(exerciseStatement) ? await describeCanvas(imageDataUrl) : null
    const combinedStatement = [
        exerciseStatement && exerciseStatement.trim().length > 0
            ? `Enunciado del estudiante: "${exerciseStatement.trim()}"`
            : 'El estudiante no proporcionó un enunciado claro.',
        derivedContext ? `Contexto reconstruido desde la hoja: ${derivedContext}` : null
    ].filter(Boolean).join('\n\n')

    const userContent: any[] = [{
        type: "text",
        text: `Resuelve este ejercicio paso a paso asegurando coherencia con lo que se ve en la hoja y concluye con el mismo resultado final (si es correcto).`
    }]

    if (imageDataUrl) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: imageDataUrl,
                detail: "high"
            }
        })
    }

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
                        content: `Eres un profesor de matemática que presenta soluciones limpias y consistentes con la hoja del estudiante.
Ejercicio a resolver:
${combinedStatement}

Instrucciones:
1. Devuelve TODO en español.
2. Reconstruye cualquier parte faltante del enunciado usando el contexto de la hoja antes de resolver.
3. Mantén el mismo resultado final que debería obtenerse; si el alumno ya lo tiene correcto, respétalo.
4. Cada paso debe incluir:
   - explanation: descripción clara en español.
   - latex: expresión LaTeX sin signos $ (KaTeX lo envolverá).
5. Usa LaTeX estándar (\\frac{}, \\sqrt{}, potencias, integrales, etc.) para TODA matemática.
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
        })

        const data = await response.json()
        const content = data.choices[0].message.content

        if (!content) {
            return res.status(200).json({ steps: [] })
        }

        const result = JSON.parse(content)
        return res.status(200).json(result)

    } catch (error) {
        console.error("Error generating solution:", error)
        return res.status(500).json({ error: 'Failed to generate solution' })
    }
}
