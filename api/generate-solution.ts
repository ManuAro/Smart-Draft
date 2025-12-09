import type { VercelRequest, VercelResponse } from '@vercel/node'

const apiKey = process.env.OPENAI_API_KEY
const PRIMARY_MODEL = 'gpt-4o-mini'
const MIN_STATEMENT_CHARS = 40

const restoreLatexEscapes = (text?: string | null) => {
    if (!text) return text ?? ''

    const escapeMap: Record<string, string> = {
        '\b': 'b',
        '\f': 'f',
        '\r': 'r',
        '\t': 't'
    }

    let restored = ''
    for (const char of text) {
        if (char in escapeMap) {
            restored += '\\' + escapeMap[char as keyof typeof escapeMap]
        } else {
            restored += char
        }
    }
    return restored
}

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

    const { exerciseStatement, imageDataUrl, detailImageDataUrl } = req.body

    const referenceImage = detailImageDataUrl || imageDataUrl
    const derivedContext = needsCanvasContext(exerciseStatement) ? await describeCanvas(referenceImage) : null
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
                detail: "low"
            }
        })
    }

    if (detailImageDataUrl) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: detailImageDataUrl,
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
   - explanation: descripción clara en español (si incluye matemáticas, usa delimitadores LaTeX: $...$).
   - latex: expresión LaTeX PURO sin delimitadores $ (KaTeX lo envolverá automáticamente).
5. FORMATO DE MATEMÁTICAS:
   - En explanation: usa delimitadores $...$ si mencionas fórmulas
   - En latex: LaTeX puro sin $ (se agregará automáticamente)
   - Ejemplo JSON correcto:
     {
       "explanation": "Aplicamos la regla $\\int x^n dx = \\frac{x^{n+1}}{n+1}$",
       "latex": "\\int_0^{\\pi} x^2 dx = \\frac{x^3}{3}\\bigg|_0^{\\pi}"
     }
   - INCORRECTO: "$$\\\\int x dx$$" (doble backslash)
6. Usa LaTeX estándar (\\frac{}, \\sqrt{}, \\int, etc.) para TODA matemática.
7. ENFOQUE EN DATOS DE LA HOJA:
   - Paso 1 debe transcribir literalmente los datos del ejercicio (matriz, sistema, valores numéricos) tal como se ven en las imágenes. Si se trata de una matriz, escribe sus entradas explícitamente.
   - Usa la segunda imagen (detalle) como referencia principal para los números; si hay inconsistencias, prioriza lo que veas ahí y menciónalo.
   - Evita casos genéricos: trabaja con los valores concretos copiados de la hoja. Si no puedes leer un dato, dilo explícitamente y no inventes.
8. El último paso DEBE contener el resultado final evaluado (ej. "Determinante = 0") tanto en el texto como en el campo latex.
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

        if (Array.isArray(result?.steps)) {
            result.steps = result.steps.map((step: any) => ({
                ...step,
                explanation: restoreLatexEscapes(step.explanation),
                latex: restoreLatexEscapes(step.latex)
            }))
        }

        return res.status(200).json(result)

    } catch (error) {
        console.error("Error generating solution:", error)
        return res.status(500).json({ error: 'Failed to generate solution' })
    }
}
