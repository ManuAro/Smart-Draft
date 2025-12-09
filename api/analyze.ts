import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'crypto'

const apiKey = process.env.OPENAI_API_KEY

const PRIMARY_MODEL = 'gpt-5.1-chat-latest' // GPT-5.1 Instant with adaptive reasoning for better mathematical accuracy
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

    // Fix LaTeX formatting issues
    const cleanText = (text: string) => {
        if (!text) return text
        console.log('🔍 cleanText input:', text)

        let cleaned = text

        // Emergency fix: Add backslashes to common LaTeX commands that are missing them
        // This catches when AI sends "frac" instead of "\frac"
        const latexCommands = [
            'frac', 'int', 'sum', 'prod', 'lim', 'sqrt',
            'theta', 'pi', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'sigma', 'omega',
            'sin', 'cos', 'tan', 'log', 'ln',
            'bigg', 'Big', 'left', 'right',
            'infty', 'cdot', 'times', 'div'
        ]

        // Add backslash before commands that are missing it (within $$...$$ blocks)
        latexCommands.forEach(cmd => {
            // Match the command only if it's NOT already preceded by a backslash
            const regex = new RegExp(`(?<!\\\\)\\b${cmd}\\b`, 'g')
            cleaned = cleaned.replace(regex, `\\${cmd}`)
        })

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
                reasoning_effort: 'medium', // Enable adaptive reasoning for mathematical analysis
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
- FORMATO DE ANOTACIONES - Sigue este formato exactamente:

{
  "text": "Título corto (2-4 palabras)",
  "explanation": "Explicación detallada con fórmulas LaTeX"
}

Ejemplos CORRECTOS:

// Error en integral
{
  "text": "Límite de integración incorrecto",
  "explanation": "El límite superior debe ser $$\\frac{\\pi}{2}$$ no $$\\pi$$. Al evaluar $$\\int_0^{\\frac{\\pi}{2}} x^2 dx = \\frac{x^3}{3}\\bigg|_0^{\\frac{\\pi}{2}}$$ obtenemos $$\\frac{\\pi^3}{24}$$."
}

// Sugerencia
{
  "text": "Puede simplificarse más",
  "explanation": "El resultado $$\\frac{2\\pi}{4}$$ puede simplificarse a $$\\frac{\\pi}{2}$$."
}

// Éxito
{
  "text": "¡Resultado correcto!",
  "explanation": "Excelente trabajo. La integral $$\\int_0^{\\pi} x^2 dx = \\frac{\\pi^3}{3}$$ está perfectamente resuelta."
}

REGLAS CRÍTICAS:
- "text": Título conciso, sin fórmulas (máximo 5 palabras)
- "explanation": Detalle completo con LaTeX usando $$...$$
- OBLIGATORIO: TODOS los comandos LaTeX requieren backslash: \\frac, \\int, \\theta, \\pi, \\bigg
- Si escribes "frac" sin \\ el sistema NO puede renderizarlo
- Ejemplo JSON literal que DEBES seguir:
  "explanation": "La integral $$\\int_0^{\\theta} x^2 dx = \\frac{\\theta^3}{3}$$ es correcta."
- PROHIBIDO: comandos sin backslash (frac, theta, int), \\textstyle, \\displaystyle
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
            console.log('📜 Raw JSON string from AI:', content)
            result = JSON.parse(content)
            console.log('📥 Raw parsed annotations:', JSON.stringify(result.annotations, null, 2))
        } catch (parseError) {
            console.error('Failed to parse OpenAI analyze content', content)
            return res.status(500).json({ error: 'Invalid response format from OpenAI analyze' })
        }
        const sanitized = filterAnnotations(result.annotations || [])
        console.log('✅ After sanitization:', JSON.stringify(sanitized, null, 2))

        // Double-escape backslashes for JSON transmission
        // When res.json() serializes, single backslashes get interpreted
        // So we need to send double backslashes to preserve them
        const forTransmission = sanitized.map((ann: any) => ({
            ...ann,
            text: ann.text?.replace(/\\/g, '\\\\'),
            explanation: ann.explanation?.replace(/\\/g, '\\\\')
        }))
        console.log('📤 Ready for transmission:', JSON.stringify(forTransmission[0]?.explanation?.substring(0, 100)))

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

        return res.status(200).json({ annotations: forTransmission })

    } catch (error) {
        console.error("Error calling OpenAI:", error)
        return res.status(500).json({ error: 'Failed to analyze canvas' })
    }
}
