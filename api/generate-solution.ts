import type { VercelRequest, VercelResponse } from '@vercel/node'

const apiKey = process.env.OPENAI_API_KEY
const PRIMARY_MODEL = 'gpt-4o-mini'

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' })
    }

    const { exerciseStatement, imageDataUrl } = req.body

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
                        content: `You are an expert math tutor.
          The current exercise statement is: "${exerciseStatement}".

          You have access to the student's current work (if provided). Use it to understand their approach, but provide a complete correct solution.

          Solve the problem step-by-step.

          IMPORTANT GUIDELINES:
          1. ALL OUTPUT MUST BE IN SPANISH.
          2. For each step, provide:
             - "explanation": A clear explanation in Spanish of what is being done
             - "latex": The mathematical expression in LaTeX format (WITHOUT dollar signs, just the raw LaTeX)
          3. ALWAYS use proper LaTeX notation for all mathematical expressions:
             - Fractions: \\frac{a}{b}
             - Integrals: \\int x dx
             - Derivatives: \\frac{dx}{dt}
             - Exponents: x^2
             - Square roots: \\sqrt{x}
             - Greek letters: \\alpha, \\beta, etc.
          4. The latex field will be rendered using KaTeX, so use standard LaTeX syntax.
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
