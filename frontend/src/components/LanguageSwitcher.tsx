/**
 * Language switcher component
 */
import { useTranslation } from 'react-i18next';
import { IconLanguage } from '@tabler/icons-react';

function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('user_language', lng);
  };

  return (
    <div className="flex items-center gap-2">
      <IconLanguage className="h-5 w-5 text-gray-600" />
      <div className="flex gap-2">
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1 text-sm rounded ${
            i18n.language === 'en'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {t('language.english')}
        </button>
        <button
          onClick={() => changeLanguage('zh')}
          className={`px-3 py-1 text-sm rounded ${
            i18n.language === 'zh'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {t('language.chinese')}
        </button>
      </div>
    </div>
  );
}

export default LanguageSwitcher;
