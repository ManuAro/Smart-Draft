import { useState } from 'react'
import { X, Equal, Plus, Minus, X as Multiply, Divide, GripVertical } from 'lucide-react'
import { motion } from 'framer-motion'

interface CalculatorProps {
    isOpen: boolean
    onClose: () => void
}

export const Calculator = ({ isOpen, onClose }: CalculatorProps) => {
    const [display, setDisplay] = useState('0')
    const [equation, setEquation] = useState('')
    const [isNewNumber, setIsNewNumber] = useState(true)

    const handleNumber = (num: string) => {
        if (isNewNumber) {
            setDisplay(num)
            setIsNewNumber(false)
        } else {
            setDisplay(display === '0' ? num : display + num)
        }
    }

    const handleOperator = (op: string) => {
        setEquation(display + ' ' + op + ' ')
        setIsNewNumber(true)
    }

    const handleEqual = () => {
        const fullEquation = equation + display
        try {
            // eslint-disable-next-line no-eval
            const result = eval(fullEquation.replace('×', '*').replace('÷', '/'))
            setDisplay(String(result))
            setEquation('')
            setIsNewNumber(true)
        } catch (e) {
            setDisplay('Error')
            setEquation('')
            setIsNewNumber(true)
        }
    }

    const handleClear = () => {
        setDisplay('0')
        setEquation('')
        setIsNewNumber(true)
    }

    if (!isOpen) return null

    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ x: 24, y: 80 }}
            className="absolute w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[100]"
            style={{ cursor: 'grab' }}
            whileDrag={{ cursor: 'grabbing', scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}
        >
            {/* Header */}
            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">Calculadora</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Display */}
            <div className="p-4 bg-gray-50 text-right">
                <div className="text-xs text-gray-400 h-4">{equation}</div>
                <div className="text-2xl font-semibold text-gray-800 truncate">{display}</div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-1 p-2 bg-white">
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={handleClear} className="col-span-3 p-3 text-sm font-medium text-red-500 hover:bg-red-50 rounded">AC</button>
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleOperator('÷')} className="p-3 text-blue-600 hover:bg-blue-50 rounded"><Divide className="w-4 h-4 mx-auto" /></button>

                {[7, 8, 9].map(num => (
                    <button key={num} onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleNumber(String(num))} className="p-3 text-gray-700 hover:bg-gray-100 rounded font-medium">{num}</button>
                ))}
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleOperator('×')} className="p-3 text-blue-600 hover:bg-blue-50 rounded"><Multiply className="w-4 h-4 mx-auto" /></button>

                {[4, 5, 6].map(num => (
                    <button key={num} onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleNumber(String(num))} className="p-3 text-gray-700 hover:bg-gray-100 rounded font-medium">{num}</button>
                ))}
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleOperator('-')} className="p-3 text-blue-600 hover:bg-blue-50 rounded"><Minus className="w-4 h-4 mx-auto" /></button>

                {[1, 2, 3].map(num => (
                    <button key={num} onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleNumber(String(num))} className="p-3 text-gray-700 hover:bg-gray-100 rounded font-medium">{num}</button>
                ))}
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleOperator('+')} className="p-3 text-blue-600 hover:bg-blue-50 rounded"><Plus className="w-4 h-4 mx-auto" /></button>

                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleNumber('0')} className="col-span-2 p-3 text-gray-700 hover:bg-gray-100 rounded font-medium">0</button>
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => handleNumber('.')} className="p-3 text-gray-700 hover:bg-gray-100 rounded font-medium">.</button>
                <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={handleEqual} className="p-3 bg-blue-600 text-white hover:bg-blue-700 rounded"><Equal className="w-4 h-4 mx-auto" /></button>
            </div>
        </motion.div>
    )
}
