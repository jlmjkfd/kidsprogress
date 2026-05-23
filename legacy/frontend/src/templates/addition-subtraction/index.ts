/**
 * Addition & Subtraction Plugin
 * Template plugin for math practice with addition and subtraction
 */
import type { TemplatePlugin } from '../_shared/types/plugin-interface';
import type {
  AdditionSubtractionConfig,
  AdditionSubtractionExecution,
  AdditionSubtractionCompletion,
  AdditionSubtractionDetailedData,
  AdditionSubtractionMeasuredData,
} from './types';
import SettingsEditor from './components/SettingsEditor';
import TaskExecutor from './components/TaskExecutor';
import AnalysisView from './components/AnalysisView';
import AttemptView from './components/AttemptView';
import manifest from './manifest.json';
import en from './locales/en/translation.json';
import zh from './locales/zh/translation.json';

/**
 * JSON Schema for addition-subtraction config
 */
const configSchema = {
  type: 'object',
  properties: {
    max_value: {
      type: 'number',
      minimum: 10,
      maximum: 10000,
      description: 'Maximum value for numbers in questions',
    },
    num_questions: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      description: 'Number of questions to generate',
    },
    only_carry: {
      type: 'boolean',
      description: 'Generate only questions requiring carry/borrow',
    },
    has_timer: {
      type: 'boolean',
      description: 'Enable timer during practice',
    },
  },
  required: ['max_value', 'num_questions'],
};

/**
 * Default configuration values
 */
const defaultConfig = {
  max_value: 100,
  num_questions: 10,
  only_carry: false,
  has_timer: true,
};

/**
 * Export the complete plugin
 */
export const additionSubtractionPlugin: TemplatePlugin<
  AdditionSubtractionConfig,
  AdditionSubtractionExecution,
  AdditionSubtractionCompletion,
  AdditionSubtractionDetailedData,
  AdditionSubtractionMeasuredData
> = {
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  handlerType: manifest.handlerType,
  description: manifest.description,
  components: {
    SettingsEditor,
    TaskExecutor,
    AnalysisView,
    AttemptView,
  },
  configSchema,
  defaultConfig,
  i18n: {
    en,
    zh,
  },
};

export default additionSubtractionPlugin;
