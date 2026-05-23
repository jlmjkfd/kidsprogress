/**
 * Calculator Tool Plugin Registration
 */
import { IconCalculator } from '@tabler/icons-react';
import type { ToolPlugin } from '../types';
import CalculatorTool from './CalculatorTool';

export const calculatorToolPlugin: ToolPlugin = {
  id: 'calculator',
  name: 'Calculator',
  icon: IconCalculator,
  description: 'Basic calculator for math tasks',
  component: CalculatorTool,
  defaultState: {
    history: [],
  },
  category: 'calculator',
  isSystemTool: true,
};
