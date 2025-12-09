import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'

const apiKey = process.env.OPENAI_API_KEY

const PRIMARY_MODEL = 'gpt-4o' // Using full gpt-4o for better mathematical accuracy
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
        ? `ANÁLISIS ACTIVO - El estudiante está trabajando:

1. VERIFICA EL RESULTADO FINAL con máximo rigor:
   - Resuelve el ejercicio tú mismo paso a paso
   - Compara tu resultado con el del estudiante
   - Si coinciden → type "success" celebrando el logro
   - Si difieren → type "warning" explicando el error específico

2. REVISA PASOS INTERMEDIOS:
   - Derivadas: verifica reglas aplicadas (cadena, producto, cociente)
   - Integrales: verifica límites, sustituciones, constantes
   - Álgebra: verifica signos, simplificaciones, factorizaciones
   - Solo marca "warning" si hay ERROR CONFIRMADO

3. SUGERENCIAS CONSTRUCTIVAS (type "suggestion"):
   - Métodos alternativos más eficientes
   - Pasos que podrían detallarse más
   - Verificaciones adicionales recomendadas

4. PRECISIÓN EN BOUNDING BOXES:
   - Marca exactamente la región del error/sugerencia
   - No marques toda la hoja si el error es específico

NO menciones estética, prolijidad o presentación.`
        : "MODO INACTIVO: El estudiante lleva >1min sin escribir. Ofrece UNA sugerencia concreta para continuar (type 'suggestion'), señalando la próxima acción recomendada."

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
                        content: `Eres un profesor experto de matemática universitaria corrigiendo ejercicios con máximo rigor académico.

Problema a corregir:
${combinedStatement}

METODOLOGÍA DE CORRECCIÓN:
1. Lee cuidadosamente el enunciado y reconoce qué se pide resolver
2. Identifica el resultado final que escribió el estudiante
3. Resuelve mentalmente el ejercicio paso a paso para verificar
4. Compara tu resultado con el del estudiante
5. Verifica operaciones intermedias (derivadas, integrales, álgebra)
6. Solo marca errores si estás 100% seguro - en caso de duda, usa type "suggestion"

Reglas de severidad:
- type "warning": ERROR MATEMÁTICO CONFIRMADO (cálculo incorrecto, signo equivocado, límite erróneo, resultado final incorrecto)
- type "suggestion": mejora metodológica que NO invalida el resultado (puede simplificar más, puede usar otro método, falta justificar un paso)
- type "success": el resultado final es MATEMÁTICAMENTE CORRECTO
- type "reference": referencia a error ya corregido previamente (texto "ArrastraError")
- FORMATO DE MATEMÁTICAS OBLIGATORIO - Copia este formato literal en tu JSON response:
{
  "explanation": "La integral $$\\int_0^{\\pi} x^2 dx$$ resulta en $$\\frac{\\pi^3}{3}$$"
}

IMPORTANTE: En el string JSON, los comandos LaTeX deben tener UN backslash: \\int (no \\\\int)
Cuando generes el JSON, escribe exactamente: "$$\\int" NO "$$\\\\int"
El parser de JSON convertirá \\int automáticamente.

PROHIBIDO: \\textstyle, \\displaystyle, \\text{}, comandos LaTeX sin delimitadores $
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
