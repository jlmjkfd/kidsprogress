/**
 * Calculator Tool Plugin
 * Simple calculator for task execution
 */
import { useState } from 'react';
import { IconCalculator } from '@tabler/icons-react';
import type { ToolProps } from '../types';

interface CalculatorState {
  history: string[]; // History of calculations
}

export default function CalculatorTool({ state, onChange }: ToolProps) {
  const calcState = state as CalculatorState;
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    try {
      const fullEquation = equation + display;
      // Safe evaluation using Function constructor (only for numbers and basic operators)
      const result = Function('"use strict"; return (' + fullEquation.replace(/[^0-9+\-*/().]/g, '') + ')')();
      const resultStr = String(result);

      // Save to history
      onChange({
        history: [...(calcState.history || []), `${fullEquation} = ${resultStr}`].slice(-10), // Keep last 10
      });

      setDisplay(resultStr);
      setEquation('');
      setWaitingForOperand(true);
    } catch (error) {
      setDisplay('Error');
      setEquation('');
      setWaitingForOperand(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setWaitingForOperand(false);
  };

  const Button = ({ children, onClick, className = '' }: { children: React.ReactNode; onClick: () => void; className?: string }) => (
    <button
      onClick={onClick}
      className={`h-14 rounded-lg font-semibold text-lg transition-colors ${className || 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <IconCalculator size={20} className="text-green-600" />
        <h3 className="font-semibold text-gray-900">Calculator</h3>
      </div>

      {/* Display */}
      <div className="bg-gray-100 rounded-lg p-4 mb-3">
        {equation && <div className="text-sm text-gray-600 mb-1">{equation}</div>}
        <div className="text-3xl font-bold text-right font-mono">{display}</div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <Button onClick={handleClear} className="bg-red-100 hover:bg-red-200 text-red-700">C</Button>
        <Button onClick={() => handleOperator('/')}>/</Button>
        <Button onClick={() => handleOperator('*')}>×</Button>
        <Button onClick={() => handleOperator('-')}>−</Button>

        <Button onClick={() => handleNumber('7')}>7</Button>
        <Button onClick={() => handleNumber('8')}>8</Button>
        <Button onClick={() => handleNumber('9')}>9</Button>
        <Button onClick={() => handleOperator('+')} className="row-span-2 bg-blue-100 hover:bg-blue-200 text-blue-700">+</Button>

        <Button onClick={() => handleNumber('4')}>4</Button>
        <Button onClick={() => handleNumber('5')}>5</Button>
        <Button onClick={() => handleNumber('6')}>6</Button>

        <Button onClick={() => handleNumber('1')}>1</Button>
        <Button onClick={() => handleNumber('2')}>2</Button>
        <Button onClick={() => handleNumber('3')}>3</Button>
        <Button onClick={handleEquals} className="row-span-2 bg-green-100 hover:bg-green-200 text-green-700">=</Button>

        <Button onClick={() => handleNumber('0')} className="col-span-2">0</Button>
        <Button onClick={() => handleNumber('.')}>.</Button>
      </div>

      {/* History */}
      {calcState.history && calcState.history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-1">Recent:</p>
          <div className="text-xs text-gray-500 space-y-1">
            {calcState.history.slice(-3).reverse().map((calc, idx) => (
              <div key={idx} className="font-mono">{calc}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
