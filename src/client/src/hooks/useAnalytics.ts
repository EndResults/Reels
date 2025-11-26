/* eslint-disable @typescript-eslint/no-explicit-any */
const GA_ID: string = (import.meta as any)?.env?.VITE_GA_ID || 'G-VL1Q20H00E';

let gaInitDone = false;

function readConsentAnalytics(): boolean {
  try {
    const raw = localStorage.getItem('fit_cookie_consent_v1');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.analytics !== 'boolean') return false;
    return !!parsed.analytics;
  } catch {
    return false;
  }
}

function injectGAOnce() {
  if (gaInitDone) return;
  if (!readConsentAnalytics()) return;

  try {
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).gtag = (window as any).gtag || function gtag() { (window as any).dataLayer.push(arguments); };
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    (window as any).gtag('js', new Date());
    (window as any).gtag('config', GA_ID, { transport_type: 'beacon', anonymize_ip: true });
    gaInitDone = true;
  } catch {
    /* no-op */
  }
}

// React-friendly hook
export function useAnalytics() {
  function initGA() {
    injectGAOnce();
  }

  function trackEvent(eventName: string, params: Record<string, any> = {}) {
    if (!gaInitDone) injectGAOnce();
    try {
      const g = (window as any).gtag;
      if (typeof g === 'function') {
        g('event', eventName, params);
      }
    } catch {
      /* no-op */
    }
  }

  function trackPageView(path?: string) {
    if (!gaInitDone) injectGAOnce();
    try {
      const g = (window as any).gtag;
      if (typeof g === 'function') {
        g('event', 'page_view', {
          page_path: path || (typeof window !== 'undefined' ? window.location.pathname : undefined),
          page_location: (typeof window !== 'undefined' ? window.location.href : undefined),
          page_title: (typeof document !== 'undefined' ? document.title : undefined),
        });
      }
    } catch {
      /* no-op */
    }
  }

  try {
    if (typeof window !== 'undefined') {
      window.addEventListener('fit:cookie-consent', (e: any) => {
        try {
          const detail = e?.detail;
          if (detail && detail.analytics === true) {
            injectGAOnce();
          }
        } catch {
          /* no-op */
        }
      });
      // Initialize immediately if consent already granted earlier
      if (readConsentAnalytics()) injectGAOnce();
    }
  } catch {
    /* no-op */
  }

  return { initGA, trackEvent, trackPageView };
}
