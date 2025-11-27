import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import nlJSON from '@shared/locales/nl/common.json';
import enJSON from '@shared/locales/en/common.json';

// Shared JSON resources
const nlCommon = nlJSON as const;
const enCommon = enJSON as const;

function normalizeLang(input?: string | null): 'nl' | 'en' {
  const v = (input || '').toLowerCase();
  if (v.startsWith('nl')) return 'nl';
  if (v.startsWith('en')) return 'en';
  return 'en';
}

// 1) Prefer explicit lang from URL (?lang=nl|en) so deep links control language
const urlLang = (() => {
  try { const u = new URL(window.location.href); return u.searchParams.get('lang'); } catch { return null; }
})();

// 2) Fall back to stored language
const stored = typeof window !== 'undefined' 
  ? (window.localStorage.getItem('fit_language') || window.localStorage.getItem('fit_lang'))
  : null;
// 3) Finally fall back to browser language
const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
const initialLang = normalizeLang(urlLang || stored || nav || 'en');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nlCommon },
      en: { translation: enCommon },
    },
    lng: initialLang,
    fallbackLng: 'en',
    supportedLngs: ['nl', 'en'],
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });

// Persist param-driven language once
try { if (urlLang) window.localStorage.setItem('fit_lang', initialLang); } catch {}

// Keep <html lang> in sync
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
  i18n.on('languageChanged', (lng) => {
    const norm = normalizeLang(lng);
    document.documentElement.lang = norm;
    try { window.localStorage.setItem('fit_lang', norm); } catch {}
  });
}

export default i18n;
