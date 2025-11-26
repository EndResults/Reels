import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Consent storage key and versioning
const CONSENT_STORAGE_KEY = 'fit_cookie_consent_v1';
const CONSENT_VERSION = '1.0.0';

export type ConsentCategories = {
  necessary: boolean; // always true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type Consent = ConsentCategories & {
  timestamp: string;
  version: string;
};

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: Consent = JSON.parse(raw);
    // Basic validation + version check to allow future migrations
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    if (typeof parsed.necessary !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(next: Consent) {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  // Also expose as cookie for edge/CDN or server usage if needed
  try {
    const value = [
      `nec=${next.necessary ? 1 : 0}`,
      `fun=${next.functional ? 1 : 0}`,
      `ana=${next.analytics ? 1 : 0}`,
      `mkt=${next.marketing ? 1 : 0}`,
      `v=${CONSENT_VERSION}`,
    ].join('|');
    document.cookie = `fit_consent=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {/* no-op */}
  // Dispatch a custom event so integrations can react
  try {
    window.dispatchEvent(new CustomEvent('fit:cookie-consent', { detail: next }));
    (window as any).FiTConsent = next;
  } catch {/* no-op */}
}

const defaultCategories: ConsentCategories = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    const original = document.body.style.overflow;
    if (locked) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

export default function CookieWall() {
  const existing = useMemo(() => readConsent(), []);
  const [isOpen, setIsOpen] = useState<boolean>(!existing);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [categories, setCategories] = useState<ConsentCategories>(existing ?? defaultCategories);
  const { t } = useTranslation();

  // Find shared bottom-actions root and de-duplicate if HMR left multiple in DOM
  const getBottomActionsRoot = useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    const list = Array.from(document.querySelectorAll('#fit-bottom-actions')) as HTMLElement[];
    if (list.length > 1) {
      // Keep the first, remove the rest
      const keep = list[0];
      for (let i = 1; i < list.length; i++) {
        try { list[i].parentElement?.removeChild(list[i]); } catch {}
      }
      return keep;
    }
    return list[0] || null;
  }, []);

  useBodyScrollLock(isOpen);

  const save = useCallback((cat: ConsentCategories) => {
    const payload: Consent = {
      ...cat,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    writeConsent(payload);
    setIsOpen(false);
  }, []);

  const acceptAll = () => save({ necessary: true, functional: true, analytics: true, marketing: true });
  const acceptNecessaryOnly = () => save({ necessary: true, functional: false, analytics: false, marketing: false });

  const openManager = () => {
    const current = readConsent();
    setCategories(current ?? defaultCategories);
    setShowAdvanced(false);
    setIsOpen(true);
  };

  // Expose a global re-open helper for footer/links: window.FiT.openCookiePreferences()
  useEffect(() => {
    (window as any).FiT = (window as any).FiT || {};
    (window as any).FiT.openCookiePreferences = openManager;
  }, []);

  if (!isOpen) {
    // Render manage button into the global bottom actions container so it aligns
    const root = getBottomActionsRoot();
    const btn = (
      <button
        aria-label={t('cookie.manage.openAria')}
        onClick={openManager}
        className="inline-flex items-center px-3 py-2 text-xs rounded-full bg-dark-900 text-white shadow-lg hover:bg-dark-800 pointer-events-auto"
      >
        <Eye className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">{t('cookie.manage.label')}</span>
      </button>
    );
    return root ? createPortal(btn, root) : null;
  }

  return (
    <div aria-modal="true" role="dialog" className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-left">
          <h2 className="text-2xl font-bold text-dark-900">{t('cookie.title')}</h2>
          <p className="mt-2 text-sm text-gray-600">{t('cookie.intro')}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
          {/* Always visible short list */}
          <ConsentRow
            title={t('cookie.categories.necessary.title')}
            description={t('cookie.categories.necessary.desc')}
            checked
            disabled
          />
          <ConsentRow
            title={t('cookie.categories.functional.title')}
            description={t('cookie.categories.functional.desc')}
            checked={categories.functional}
            onChange={(v) => setCategories((c) => ({ ...c, functional: v }))}
          />
          <ConsentRow
            title={t('cookie.categories.analytics.title')}
            description={t('cookie.categories.analytics.desc')}
            checked={categories.analytics}
            onChange={(v) => setCategories((c) => ({ ...c, analytics: v }))}
          />
          <ConsentRow
            title={t('cookie.categories.marketing.title')}
            description={t('cookie.categories.marketing.desc')}
            checked={categories.marketing}
            onChange={(v) => setCategories((c) => ({ ...c, marketing: v }))}
          />

          {/* Advanced details */}
          {showAdvanced && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 text-left">
              <p className="mb-2">
                {t('cookie.advanced.textPrefix')}
                <a className="text-primary-600 font-medium hover:underline ml-1" href="/privacy">{t('cookie.advanced.privacy')}</a>
                {" "}{t('cookie.advanced.and')}{" "}
                <a className="text-primary-600 font-medium hover:underline" href="/terms">{t('cookie.advanced.terms')}</a>.
                {" "}{t('cookie.advanced.textSuffix')}{" "}
                <span className="ml-1 font-medium">{t('cookie.manage.label')}</span>{" "}
                {t('cookie.advanced.linkLocation')}.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t('cookie.advanced.items.essential')}</li>
                <li>{t('cookie.advanced.items.functional')}</li>
                <li>{t('cookie.advanced.items.analytics')}</li>
                <li>{t('cookie.advanced.items.marketing')}</li>
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={acceptNecessaryOnly}
          >
            {t('cookie.actions.acceptNecessary')}
          </button>
          <button
            type="button"
            className="w-full border-2 border-gray-200 text-dark-900 hover:bg-gray-100 font-medium px-6 py-3 rounded-lg transition-colors"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? t('cookie.actions.hideOptions') : t('cookie.actions.options')}
          </button>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={acceptAll}
          >
            {t('cookie.actions.acceptAll')}
          </button>
          {showAdvanced && (
            <button
              type="button"
              className="w-full bg-dark-900 text-white font-medium px-6 py-3 rounded-lg hover:bg-dark-800 transition-colors"
              onClick={() => save(categories)}
            >
              {t('cookie.actions.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4">
      <div className="text-left">
        <div className="font-semibold text-dark-900">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
      <label className={`relative inline-flex items-center ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          className="sr-only peer"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.checked)}
          aria-checked={!!checked}
          aria-disabled={!!disabled}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-primary-500 transition-colors">
          {/* knob */}
          <div className={`absolute mt-1 ml-1 h-4 w-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}></div>
        </div>
      </label>
    </div>
  );
}
