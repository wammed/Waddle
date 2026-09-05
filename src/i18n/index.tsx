import React, { createContext, useContext, useMemo } from 'react';
import { Language } from '../types';
import { translations, Translations } from './translations';

interface I18nContextType {
  language: Language;
  t: Translations;
}

export const I18nContext = createContext<I18nContextType>({
  language: 'en-US',
  t: translations['en-US'],
});

export const I18nProvider: React.FC<{
  language?: Language;
  children: React.ReactNode;
}> = ({ language = 'en-US', children }) => {
  const activeLanguage = language && translations[language] ? language : 'en-US';
  const t = useMemo(() => {
    return translations[activeLanguage] || translations['en-US'];
  }, [activeLanguage]);

  return (
    <I18nContext.Provider value={{ language: activeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

export { translations };
export type { Translations };
