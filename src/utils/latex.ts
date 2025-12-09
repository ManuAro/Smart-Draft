// Updated regexes to handle spaces and more flexible patterns
const FRACTION_REGEX = /\\frac\s*\{[^}]+\}\s*\{[^}]+\}/g
const SQRT_REGEX = /\\sqrt\s*\{[^}]+\}/g
const POWER_REGEX = /[a-zA-Z0-9]\s*\^\s*\{[^}]+\}/g
const SUBSCRIPT_REGEX = /[a-zA-Z0-9]\s*_\s*\{[^}]+\}/g
const BIG_OP_REGEX = /\\(int|sum|prod|lim|log|ln|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan)\b/g
const GREEK_REGEX = /\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega|Alpha|Beta|Gamma|Delta|Theta|Lambda|Pi|Sigma|Omega)\b/g

const restoreLatexEscapes = (text: string) => {
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

const wrapMatchIfNeeded = (text: string, match: string, index: number) => {
    const before = text[index - 1]
    const after = text[index + match.length]
    if (before === '$' && after === '$') {
        return match
    }
    return `$${match.trim()}$`
}

const LATEX_TO_CHAR_MAP: Record<string, string> = {
    '\\pi': 'π',
    '\\theta': 'θ',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\sigma': 'σ',
    '\\omega': 'ω',
    '\\cdot': '·',
    '\\times': '×',
    '\\div': '÷',
    '\\pm': '±',
    '\\rightarrow': '→',
    '\\to': '→',
    '\\geq': '≥',
    '\\leq': '≤',
    '\\neq': '≠',
    '\\infty': '∞'
}

export const formatMathText = (input?: string | null) => {
    if (!input) return ''

    const normalized = restoreLatexEscapes(input)

    // If the text already has LaTeX delimiters ($ or $$), return it as-is
    // This prevents double-wrapping and breaking properly formatted LaTeX
    if (normalized.includes('$')) {
        return normalized
    }

    let text = normalized

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

const latexFragmentToPlainText = (fragment: string) => {
    let text = fragment
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/\\left|\\right/g, '')
        .replace(/\\,/g, ' ')
        .replace(/\\\\/g, ' ')

    text = text.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)')
    text = text.replace(/\\sqrt\{([^}]*)\}/g, '√($1)')

    text = text.replace(/\\([a-zA-Z]+)/g, (_match, cmd) => {
        const key = `\\${cmd}`
        if (LATEX_TO_CHAR_MAP[key]) return LATEX_TO_CHAR_MAP[key]
        return cmd
    })

    return text.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim()
}

const replaceDelimitedMath = (input: string, pattern: RegExp) => {
    return input.replace(pattern, (_match, _open, content) => {
        return ` ${latexFragmentToPlainText(content)} `
    })
}

export const inlineMathToPlainText = (input?: string | null) => {
    if (!input) return ''

    let text = restoreLatexEscapes(input)
    text = replaceDelimitedMath(text, /(\${1,2})([\s\S]*?)(\1)/g)
    text = replaceDelimitedMath(text, /(\\\()([\s\S]*?)(\\\))/g)
    text = replaceDelimitedMath(text, /(\\\[)([\s\S]*?)(\\\])/g)

    return text.replace(/\s+/g, ' ').trim()
}

const removeMathSegmentsWithFlag = (input: string) => {
    let hadMath = false
    const stripPattern = (text: string, pattern: RegExp) => {
        return text.replace(pattern, () => {
            hadMath = true
            return ' '
        })
    }

    let stripped = restoreLatexEscapes(input)
    stripped = stripPattern(stripped, /(\${1,2})([\s\S]*?)(\1)/g)
    stripped = stripPattern(stripped, /(\\\()([\s\S]*?)(\\\))/g)
    stripped = stripPattern(stripped, /(\\\[)([\s\S]*?)(\\\])/g)

    return { text: stripped.replace(/\s+/g, ' ').trim(), hadMath }
}

export const removeMathFromText = (input?: string | null) => {
    if (!input) return { text: '', hadMath: false }
    return removeMathSegmentsWithFlag(input)
}
