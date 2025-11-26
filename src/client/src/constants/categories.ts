export type Locale = 'nl' | 'en';
import i18n from '../i18n';

export const getCategoryLabel = (key: string | null | undefined, lang: Locale = 'nl'): string => {
  const up = (key || '').toString().trim().toUpperCase();
  const tFixed = i18n.getFixedT(lang);
  if (!up) return tFixed('categories.GENERAL');
  const translated = tFixed(`categories.${up}`);
  // If translation missing, i18next returns the key; fallback to original code
  if (!translated || translated.startsWith('categories.')) return up;
  return translated;
};
