const ESCAPE_MAP: Record<string, string> = {
    '\b': 'b',
    '\f': 'f',
    '\r': 'r',
    '\t': 't'
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

const restoreSolutionLatexEscapes = (text?: string | null) => {
    if (!text) return text ?? ''

    let restored = ''
    for (const char of text) {
        if (char in ESCAPE_MAP) {
            restored += '\\' + ESCAPE_MAP[char as keyof typeof ESCAPE_MAP]
        } else {
            restored += char
        }
    }
    return restored
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

    let text = restoreSolutionLatexEscapes(input)
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

    let stripped = restoreSolutionLatexEscapes(input)
    stripped = stripPattern(stripped, /(\${1,2})([\s\S]*?)(\1)/g)
    stripped = stripPattern(stripped, /(\\\()([\s\S]*?)(\\\))/g)
    stripped = stripPattern(stripped, /(\\\[)([\s\S]*?)(\\\])/g)

    return { text: stripped.replace(/\s+/g, ' ').trim(), hadMath }
}

export const removeMathFromText = (input?: string | null) => {
    if (!input) return { text: '', hadMath: false }
    return removeMathSegmentsWithFlag(input)
}

export const normalizeLatexForImage = (input: string) => {
    return restoreSolutionLatexEscapes(input)
}
