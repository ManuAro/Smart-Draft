import type { VercelRequest, VercelResponse } from '@vercel/node'

const apiKey = process.env.OPENAI_API_KEY

const PRIMARY_MODEL = 'gpt-4o-mini'
const FALLBACK_MODEL = 'gpt-4o-mini'
const MIN_STATEMENT_CHARS = 40
const IRRELEVANT_KEYWORDS = ['prolijidad', 'presentación', 'orden', 'limpieza', 'estética', 'legible', 'caligrafía', 'formato', 'dibujo', 'alineación', 'márgenes']

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const needsCanvasContext = (statement?: string) => {
    if (!statement) return true
    const trimmed = statement.trim()
    if (!trimmed) return true
    if (trimmed.length < MIN_STATEMENT_CHARS) return true
    const hasNumbers = /\d/.test(trimmed)
    return !hasNumbers
}

async function describeCanvas(imageDataUrl: string): Promise<string | null> {
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
                        content: `Eres un asistente que observa una captura de un cuaderno y describe brevemente qué ejercicio matemático se está resolviendo. Indica la ecuación o datos numéricos con LaTeX y resume el objetivo en una oración en español.`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Describe el ejercicio de la imagen y los datos clave. Usa máximo 2 oraciones." },
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
        console.error('Failed to derive canvas context', error)
        return null
    }
}

const sanitizeAnnotation = (annotation: any) => {
    const safeWidth = clamp01(annotation.width ?? 0.05)
    const safeHeight = clamp01(annotation.height ?? 0.05)

    return {
        ...annotation,
        x: clamp01(annotation.x ?? 0),
        y: clamp01(annotation.y ?? 0),
        width: safeWidth < 0.02 ? 0.02 : safeWidth,
        height: safeHeight < 0.02 ? 0.02 : safeHeight
    }
}

const filterAnnotations = (annotations: any[]) => {
    return annotations.filter((ann) => {
        if (!ann) return false
        if (!ann.text || !ann.explanation) return false
        if (ann.type === 'success') return true

        const combined = `${ann.text} ${ann.explanation}`.toLowerCase()
        const isIrrelevant = IRRELEVANT_KEYWORDS.some(keyword => combined.includes(keyword))
        return !isIrrelevant
    }).map(sanitizeAnnotation)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' })
    }

    const { imageDataUrl, mode, exerciseStatement } = req.body

    let derivedContext: string | null = null
    if (needsCanvasContext(exerciseStatement)) {
        derivedContext = await describeCanvas(imageDataUrl)
    }

    const combinedStatement = [
        exerciseStatement && exerciseStatement.trim().length > 0
            ? `Enunciado proporcionado por el estudiante: "${exerciseStatement.trim()}"`
            : 'El estudiante no proporcionó un enunciado claro.',
        derivedContext ? `Contexto inferido desde la hoja: ${derivedContext}` : null
    ].filter(Boolean).join('\n\n')

    const prompt = mode === 'active'
        ? "Analiza la resolución y marca ÚNICAMENTE errores matemáticos relevantes (operaciones incorrectas, pasos faltantes, conclusiones inválidas). Cada anotación debe corresponder a una región específica de la imagen y nunca debes mencionar prolijidad o estética. Si no hay errores, responde con un array vacío."
        : "El estudiante estuvo inactivo. Ofrece a lo sumo una guía concreta para continuar (por ejemplo, 'aplica la fórmula cuadrática' o 'sustituye los datos en la fórmula'), señalando la zona relevante. Nunca señales prolijidad ni detalles estéticos."

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
                        content: `Eres un asistente experto corrigiendo ejercicios de matemática con énfasis en precisión.
El problema es:
${combinedStatement}

Instrucciones obligatorias:
1. Devuelve la respuesta en español usando LaTeX para cualquier expresión matemática.
2. Para cada observación debes proporcionar un cuadro delimitador ajustado al área del error:
   - x, y: esquina superior izquierda (0-1)
   - width, height: tamaño relativo (0-1)
3. Ignora aspectos estéticos, de caligrafía o prolijidad y señala solo errores conceptuales o cálculos incorrectos.
4. Si todo está correcto, responde con un array vacío (el backend mostrará un check verde).
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
                                            type: { type: "string", enum: ["warning", "info", "success"] },
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
        })

        const data = await response.json()
        const content = data.choices[0].message.content

        if (!content) {
            return res.status(200).json({ annotations: [] })
        }

        const result = JSON.parse(content)
        const sanitized = filterAnnotations(result.annotations || [])

        if (sanitized.length === 0) {
            return res.status(200).json({
                annotations: [{
                    type: 'success',
                    text: 'Correcto',
                    explanation: 'No se detectaron errores matemáticos relevantes.',
                    x: 0.4,
                    y: 0.05,
                    width: 0.2,
                    height: 0.1
                }]
            })
        }

        return res.status(200).json({ annotations: sanitized })

    } catch (error) {
        console.error("Error calling OpenAI:", error)
        return res.status(500).json({ error: 'Failed to analyze canvas' })
    }
}
