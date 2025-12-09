// Updated regexes to handle spaces and more flexible patterns
const FRACTION_REGEX = /\\frac\s*\{[^}]+\}\s*\{[^}]+\}/g
const SQRT_REGEX = /\\sqrt\s*\{[^}]+\}/g
const POWER_REGEX = /[a-zA-Z0-9]\s*\^\s*\{[^}]+\}/g
const SUBSCRIPT_REGEX = /[a-zA-Z0-9]\s*_\s*\{[^}]+\}/g
const BIG_OP_REGEX = /\\(int|sum|prod|lim|log|ln|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\b/g
const GREEK_REGEX = /\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|Alpha|Beta|Gamma|Delta|Theta|Lambda|Pi|Sigma|Omega)\b/g

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

    // If the text already has LaTeX delimiters ($ or $$), return it as-is
    // This prevents double-wrapping and breaking properly formatted LaTeX
    if (input.includes('$')) {
        return input
    }

    let text = input

    const applyPattern = (pattern: RegExp) => {
        text = text.replace(pattern, (match, ...args) => {
            const fullString = args[args.length - 1] as string
            const offset = args[args.length - 2] as number
            return wrapMatchIfNeeded(fullString, match, offset)
        })
    }

    // Apply all patterns to catch LaTeX commands without delimiters
    applyPattern(FRACTION_REGEX)
    applyPattern(SQRT_REGEX)
    applyPattern(POWER_REGEX)
    applyPattern(SUBSCRIPT_REGEX)
    applyPattern(BIG_OP_REGEX)
    applyPattern(GREEK_REGEX)

    return text
}
