import type { VercelRequest, VercelResponse } from '@vercel/node'

const apiKey = process.env.OPENAI_API_KEY

const PRIMARY_MODEL = 'gpt-4o-mini'
const FALLBACK_MODEL = 'gpt-4o-mini'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' })
    }

    const { imageDataUrl, mode, exerciseStatement } = req.body

    const prompt = mode === 'active'
        ? "You are a math tutor checking for errors. Look for logical errors, calculation mistakes, or missing justifications. Return a JSON array of annotations. For each error, provide a VERY SHORT keyword (max 2 words), a detailed explanation, and the BOUNDING BOX of the error."
        : "You are a helpful math tutor. The student is stuck. Provide a helpful hint or suggestion to move forward. Return a JSON array of annotations. Provide a VERY SHORT keyword (max 2 words), a detailed explanation, and the BOUNDING BOX of the area to focus on."

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
                        content: `You are an AI assistant analyzing handwritten math.
          The current exercise statement is: "${exerciseStatement}".

          Analyze the image and provide annotations.
          IMPORTANT: You must return a BOUNDING BOX for each error.
          - x, y: Top-left corner of the box (0-1 relative coordinates).
          - width, height: Size of the box (0-1 relative).
          (0,0) is top-left, (1,1) is bottom-right of the provided image.

          IMPORTANT GUIDELINES:
          1. ALL OUTPUT MUST BE IN SPANISH.
          2. When mentioning mathematical expressions in the "explanation" field, use LaTeX notation:
             - For inline math, use: $x^2 + 1$
             - For display math, use: $$\\int x dx = \\frac{x^2}{2} + C$$
             - Always use LaTeX for formulas, equations, integrals, derivatives, etc.
          3. Make sure explanations are clear and use proper mathematical notation.
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
        })

        const data = await response.json()
        const content = data.choices[0].message.content

        if (!content) {
            return res.status(200).json({ annotations: [] })
        }

        const result = JSON.parse(content)
        return res.status(200).json(result)

    } catch (error) {
        console.error("Error calling OpenAI:", error)
        return res.status(500).json({ error: 'Failed to analyze canvas' })
    }
}
