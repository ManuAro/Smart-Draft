const FRACTION_REGEX = /\\frac\{[^}]+\}\{[^}]+\}/g
const SQRT_REGEX = /\\sqrt\{[^}]+\}/g
const BIG_OP_REGEX = /\\(int|sum|prod|lim|log|ln)[^$\\\n]*/g

const wrapMatchIfNeeded = (text: string, match: string, index: number) => {
    const before = text[index - 1]
    const after = text[index + match.length]
    if (before === '$' && after === '$') {
        return match
    }
    return `$${match.trim()}$`
}

export const formatMathText = (input?: string | null) => {
    if (!input) return ''
    let text = input

    const applyPattern = (pattern: RegExp) => {
        text = text.replace(pattern, (match, ...args) => {
            const fullString = args[args.length - 1] as string
            const offset = args[args.length - 2] as number
            return wrapMatchIfNeeded(fullString, match, offset)
        })
    }

    applyPattern(FRACTION_REGEX)
    applyPattern(SQRT_REGEX)
    applyPattern(BIG_OP_REGEX)

    return text
}
