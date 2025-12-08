import React, { createContext, useContext, useState, useEffect } from 'react'

interface EmailAuthContextType {
    userEmail: string | null
    hasSubmittedEmail: boolean
    setUserEmail: (email: string) => void
}

const EmailAuthContext = createContext<EmailAuthContextType | undefined>(undefined)

export const useEmailAuth = () => {
    const context = useContext(EmailAuthContext)
    if (!context) {
        throw new Error('useEmailAuth must be used within EmailAuthProvider')
    }
    return context
}

export const EmailAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userEmail, setUserEmailState] = useState<string | null>(null)
    const [hasSubmittedEmail, setHasSubmittedEmail] = useState(false)

    useEffect(() => {
        const savedEmail = localStorage.getItem('smart-draft-user-email')
        if (savedEmail) {
            setUserEmailState(savedEmail)
            setHasSubmittedEmail(true)
        }
    }, [])

    const setUserEmail = (email: string) => {
        setUserEmailState(email)
        setHasSubmittedEmail(true)
        localStorage.setItem('smart-draft-user-email', email)
        localStorage.setItem('smart-draft-email-submitted-at', new Date().toISOString())

        // Aquí puedes agregar el envío a tu backend/Google Sheets
        sendEmailToBackend(email)
    }

    return (
        <EmailAuthContext.Provider value={{ userEmail, hasSubmittedEmail, setUserEmail }}>
            {children}
        </EmailAuthContext.Provider>
    )
}

// Función para enviar el email a tu backend
async function sendEmailToBackend(email: string) {
    try {
        // Enviando a Google Sheets via Apps Script
        await fetch('https://script.google.com/macros/s/AKfycby29Q4qMVp4fkb_-aZ5liSLNqO3ipoPyjRAP7m4GiGerFjftWw04HwATIKC8KTs7PBP/exec', {
            method: 'POST',
            mode: 'no-cors', // Importante para Google Apps Script
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                timestamp: new Date().toISOString()
            })
        })

        console.log('📧 Email sent to Google Sheets:', email)
    } catch (error) {
        console.error('Failed to send email to backend:', error)
        // No mostramos error al usuario para no bloquear la experiencia
    }
}
