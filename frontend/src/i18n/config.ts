/**
 * i18next configuration for internationalization
 * Supports English and Chinese (zh-CN)
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enErrors from './locales/en/errors.json';
import zhCommon from './locales/zh/common.json';
import zhAuth from './locales/zh/auth.json';
import zhErrors from './locales/zh/errors.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        errors: enErrors,
      },
      zh: {
        common: zhCommon,
        auth: zhAuth,
        errors: zhErrors,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
