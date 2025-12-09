import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'

const apiKey = process.env.OPENAI_API_KEY

const PRIMARY_MODEL = 'gpt-4o-mini'
const MIN_STATEMENT_CHARS = 40
const IRRELEVANT_KEYWORDS = ['prolijidad', 'presentación', 'orden', 'limpieza', 'estética', 'legible', 'caligrafía', 'formato', 'dibujo', 'alineación', 'márgenes']
const MIN_BOX_RATIO = 0.02

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
    const safeWidth = clamp01(annotation.width ?? MIN_BOX_RATIO)
    const safeHeight = clamp01(annotation.height ?? MIN_BOX_RATIO)

    // Fix double-escaped backslashes in LaTeX (\\int -> \int in actual string)
    const cleanText = (text: string) => {
        if (!text) return text
        let cleaned = text
        // Replace double backslashes with single backslashes for LaTeX commands
        cleaned = cleaned.replace(/\\\\/g, '\\')
        // Remove unnecessary \textstyle commands
        cleaned = cleaned.replace(/\\textstyle\s*/g, '')
        if (text !== cleaned) {
            console.log('🔧 Sanitized:', { before: text, after: cleaned })
        }
        return cleaned
    }

    return {
        ...annotation,
        id: annotation.id ?? randomUUID(),
        text: cleanText(annotation.text),
        explanation: cleanText(annotation.explanation),
        x: clamp01(annotation.x ?? 0),
        y: clamp01(annotation.y ?? 0),
        width: safeWidth < MIN_BOX_RATIO ? MIN_BOX_RATIO : safeWidth,
        height: safeHeight < MIN_BOX_RATIO ? MIN_BOX_RATIO : safeHeight
    }
}

const filterAnnotations = (annotations: any[]) => {
    return annotations.filter((ann) => {
        if (!ann) return false
        if (!ann.text || !ann.explanation) return false
        if (ann.type === 'success') return true

        if (ann.type !== 'warning') {
            const combined = `${ann.text} ${ann.explanation}`.toLowerCase()
            const isIrrelevant = IRRELEVANT_KEYWORDS.some(keyword => combined.includes(keyword))
            if (isIrrelevant) {
                return false
            }
        }

        return true
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
    if (needsCanvasContext(exerciseStatement) && imageDataUrl) {
        derivedContext = await describeCanvas(imageDataUrl)
    }

    const combinedStatement = [
        exerciseStatement && exerciseStatement.trim().length > 0
            ? `Enunciado proporcionado por el estudiante: "${exerciseStatement.trim()}"`
            : 'El estudiante no proporcionó un enunciado claro.',
        derivedContext ? `Contexto inferido desde la hoja: ${derivedContext}` : null
    ].filter(Boolean).join('\n\n')

    const prompt = mode === 'active'
        ? "1) Verifica si el RESULTADO FINAL que aparece en la hoja coincide con la solución correcta. Si es correcto, devuelve una sola anotación tipo success celebrando el resultado e incluye sugerencias solo como type 'suggestion'.\n2) Si encuentras errores matemáticos (operaciones incorrectas, omisiones, conclusiones inválidas), devuelve type 'warning'.\n3) Cuando notes oportunidades de mejora que no afectan la corrección (por ejemplo, detallar un paso, usar otra técnica), usa type 'suggestion'.\n4) Si detectas un error corregido recientemente y sólo quieres dejar referencia, usa type 'reference' con el texto 'ArrastraError' sin remarcarlo.\n5) Nunca menciones prolijidad ni estética.\n6) Cada anotación debe mapearse a su región exacta en la imagen."
        : "El estudiante estuvo inactivo. Ofrece una sola sugerencia concreta para continuar, marcada como type 'suggestion', apuntando a la región relevante."

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
                        content: `Eres un asistente experto corrigiendo ejercicios de matemática con énfasis en el resultado final.
Problema a corregir:
${combinedStatement}

Reglas:
- Prioridad absoluta: confirma si el resultado final escrito por el estudiante es correcto. Si lo es, responde con type "success" (sin más errores) y, si aplica, agrega recomendaciones como type "suggestion".
- Diferencia severidades:
  * type "warning": error matemático real (operación incorrecta, paso faltante, conclusión errónea).
  * type "suggestion": mejora opcional que no invalida el resultado.
  * type "reference": sólo referencia un error pasado ya corregido (usa texto "ArrastraError").
  * type "success": todo correcto.
- FORMATO DE MATEMÁTICAS OBLIGATORIO:
  * SIEMPRE encierra expresiones matemáticas entre delimitadores LaTeX: $...$ para inline o $$...$$ para display.
  * Usa UN SOLO backslash antes de comandos LaTeX en el JSON: \\int, \\frac, \\pi
  * NO uses \\textstyle, \\displaystyle, \\text{}, \\mathrm{} - escribe LaTeX simple
  * El ÚNICO formato JSON permitido (copia exactamente este formato):
    "explanation": "La integral $$\\int_0^{\\pi} x^2 dx$$ resulta en $$\\frac{\\pi^3}{3}$$"
  * CORRECTO: "$$\\int_0^{\\pi} x^2 dx$$", "$\\frac{\\pi^3}{3}$"
  * PROHIBIDO: "$$\\\\int$$", "$$\\textstyle \\\\int$$", "\\frac{a}{b}" (sin $)
- Proporciona un bounding box preciso para cada anotación (x, y, width, height en rango 0-1).
- Evita mencionar prolijidad, caligrafía u otros aspectos estéticos.
- Nunca generes anotaciones superpuestas si puedes agruparlas.
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
                                            id: { type: "string" },
                                            type: { type: "string", enum: ["warning", "info", "success", "suggestion", "reference"] },
                                            text: { type: "string" },
                                            explanation: { type: "string" },
                                            x: { type: "number" },
                                            y: { type: "number" },
                                            width: { type: "number" },
                                            height: { type: "number" }
                                        },
                                        required: ["id", "type", "text", "explanation", "x", "y", "width", "height"],
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

        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}))
            console.error('OpenAI analyze error response', errorPayload)
            return res.status(500).json({ error: 'OpenAI analyze request failed', details: errorPayload })
        }

        const data = await response.json()

        if (data?.error) {
            console.error('OpenAI analyze error payload', data.error)
            return res.status(500).json({ error: 'OpenAI analyze error', details: data.error })
        }

        const content = data?.choices?.[0]?.message?.content

        if (!content) {
            return res.status(200).json({ annotations: [] })
        }

        let result: any
        try {
            result = JSON.parse(content)
            console.log('📥 Raw parsed annotations:', JSON.stringify(result.annotations, null, 2))
        } catch (parseError) {
            console.error('Failed to parse OpenAI analyze content', content)
            return res.status(500).json({ error: 'Invalid response format from OpenAI analyze' })
        }
        const sanitized = filterAnnotations(result.annotations || [])
        console.log('✅ After sanitization:', JSON.stringify(sanitized, null, 2))

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
