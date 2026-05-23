import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import enCommon from '../../locales/en/common.json';
import enAuth from '../../locales/en/auth.json';
import enChildren from '../../locales/en/children.json';
import zhCommon from '../../locales/zh/common.json';
import zhAuth from '../../locales/zh/auth.json';
import zhChildren from '../../locales/zh/children.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'children'],
    interpolation: { escapeValue: false },
    resources: {
      en: { common: enCommon, auth: enAuth, children: enChildren },
      zh: { common: zhCommon, auth: zhAuth, children: zhChildren },
    },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export default i18n;
