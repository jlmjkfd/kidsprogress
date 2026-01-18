/**
 * Writing Plugin
 * Template plugin for creative writing tasks
 */
import type { TemplatePlugin } from '../_shared/types/plugin-interface';
import type {
  WritingConfig,
  WritingExecution,
  WritingCompletion,
  WritingDetailedData,
  WritingMeasuredData,
} from './types';
import SettingsEditor from './components/SettingsEditor';
import TaskExecutor from './components/TaskExecutor';
import AnalysisView from './components/AnalysisView';
import AttemptView from './components/AttemptView';
import manifest from './manifest.json';
import en from './locales/en/translation.json';
import zh from './locales/zh/translation.json';

/**
 * JSON Schema for writing config
 */
const configSchema = {
  type: 'object',
  properties: {
    content_type: {
      type: 'string',
      enum: ['writing', 'drawing', 'recording'],
      description: 'Type of content creation',
    },
    prompts: {
      type: 'array',
      items: { type: 'string' },
      description: 'Writing prompts to guide the child',
    },
    min_length: {
      type: 'number',
      minimum: 1,
      description: 'Minimum word count required',
    },
    max_length: {
      type: 'number',
      minimum: 1,
      description: 'Maximum word count allowed',
    },
    allow_llm_feedback: {
      type: 'boolean',
      description: 'Enable AI feedback for writing quality',
    },
    save_drafts: {
      type: 'boolean',
      description: 'Allow saving drafts before final submission',
    },
  },
  required: ['content_type'],
};

/**
 * Default configuration values
 */
const defaultConfig: WritingConfig = {
  content_type: 'writing' as const,
  prompts: [],
  min_length: 50,
  max_length: 2000,
  allow_llm_feedback: true,
  save_drafts: false,
};

/**
 * Export the complete plugin
 */
export const writingPlugin: TemplatePlugin<
  WritingConfig,
  WritingExecution,
  WritingCompletion,
  WritingDetailedData,
  WritingMeasuredData
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

export default writingPlugin;
