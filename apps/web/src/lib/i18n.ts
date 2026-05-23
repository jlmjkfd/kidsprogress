import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import enCommon from '../../locales/en/common.json';
import zhCommon from '../../locales/zh/common.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    resources: {
      en: { common: enCommon },
      zh: { common: zhCommon },
    },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
