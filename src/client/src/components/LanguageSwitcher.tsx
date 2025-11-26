import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const FlagNL = () => (
    <svg aria-hidden="true" width="18" height="12" viewBox="0 0 3 2" className="rounded-sm shadow-sm">
      <rect width="3" height="2" fill="#21468B" />
      <rect width="3" height="1.333" fill="#FFF" />
      <rect width="3" height="0.666" fill="#AE1C28" />
    </svg>
  );
  const FlagGB = () => (
    <svg aria-hidden="true" width="18" height="12" viewBox="0 0 60 30" className="rounded-sm shadow-sm">
      <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
      <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
      <g clipPath="url(#s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#t)"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#FFF" strokeWidth="10"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );

  const normalize = (lng?: string): 'nl' | 'en' => {
    const v = (lng || '').toLowerCase();
    if (v.startsWith('en')) return 'en';
    return 'nl';
  };
  const current = normalize(i18n.language || 'nl');

  const options: Array<{ code: 'nl' | 'en'; label: string }> = [
    { code: 'nl', label: 'NL' },
    { code: 'en', label: 'EN' },
  ];
  const others = options.filter(o => o.code !== current);

  const setLang = (lang: 'nl' | 'en') => {
    try { localStorage.setItem('fit_lang', lang); } catch {}
    i18n.changeLanguage(lang);
    setOpen(false);
  };

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (e.target instanceof Node && ref.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggle = () => setOpen(v => !v);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-block text-left" aria-label="Language switcher">
      <button
        type="button"
        onClick={toggle}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={current === 'nl' ? 'Nederlands' : 'English'}
      >
        <Globe className="h-4 w-4 text-gray-600" aria-hidden="true" />
        {current === 'nl' ? <FlagNL /> : <FlagGB />}
        <span className="font-medium">{current.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-28 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
          <ul role="listbox" aria-label="Available languages" className="py-1">
            {others.map(opt => (
              <li key={opt.code}>
                <button
                  type="button"
                  onClick={() => setLang(opt.code)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
                  role="option"
                  aria-selected={false}
                >
                  {opt.code === 'nl' ? <FlagNL /> : <FlagGB />}
                  <span>{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
