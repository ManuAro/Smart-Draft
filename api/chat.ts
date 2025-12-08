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

    const { messages, imageDataUrl, exerciseStatement } = req.body

    const systemPrompt = `You are a helpful and encouraging math tutor.
        The student is working on an exercise: "${exerciseStatement}".

        You have access to the student's current canvas drawing (if provided).
        Analyze the drawing to understand where they are stuck or what they have done so far.

        Guidelines:
        1. Be concise and friendly.
        2. Do NOT give the final answer immediately. Guide them step-by-step.
        3. If they made a mistake, gently point it out and ask a guiding question.
        4. If the canvas is empty, ask them how they plan to start.
        5. Respond in Spanish.
        6. IMPORTANT: When writing mathematical expressions, use LaTeX notation:
           - For inline math, use single dollar signs: $x^2 + 1$
           - For display math, use double dollar signs: $$\\int x dx = \\frac{x^2}{2} + C$$
           - Always use LaTeX for formulas, equations, integrals, derivatives, etc.`

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
        const content = data.choices[0].message.content || "Lo siento, no pude generar una respuesta."

        return res.status(200).json({ content })

    } catch (error) {
        console.error("Error in chat:", error)
        return res.status(500).json({ error: 'Failed to process chat' })
    }
}
