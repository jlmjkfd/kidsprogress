/**
 * Language switcher component - Dropdown style
 */
import { useTranslation } from 'react-i18next';
import { IconLanguage } from '@tabler/icons-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation('common');

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    localStorage.setItem('user_language', lng);
  };

  return (
    <div className="flex items-center gap-2">
      <IconLanguage className="h-5 w-5 text-gray-600" />
      <select
        value={i18n.language}
        onChange={changeLanguage}
        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSwitcher;
