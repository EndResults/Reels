// Image URL utilities for FiT results
// This builds a Cloudinary fetch URL with a watermark overlay for
// images stored publicly in Supabase storage (fit-results bucket).

const CLOUDINARY_ACCOUNT = 'dbzm9mwun';
const CLOUDINARY_TRANSFORM = 'f_auto,q_auto/l_BrendR_w64uef,g_north_east,w_280,o_100,x_680,y_700';
const CLOUDINARY_TRANSFORM_DOWNLOAD = 'f_auto,q_auto,fl_attachment/l_BrendR_w64uef,g_north_east,w_280,o_100,x_680,y_700';
const CLOUDINARY_FETCH_BASE = `https://res.cloudinary.com/${CLOUDINARY_ACCOUNT}/image/fetch`;

// Fallback Supabase URL (project-specific) in case the Vite env var is missing
// Choose per environment based on hostname (UAT vs PROD)
const FALLBACK_SUPABASE_URL = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (/fit-uat|uat/i.test(host)) return 'https://ygmaxytxjpdtimpctqoh.supabase.co';
  } catch {}
  return 'https://hruleghaabwolyrkzzoc.supabase.co';
})();

function getSupabasePublicBase(): string {
  let raw: string | undefined = undefined;
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (/fit-uat|uat/i.test(host)) {
      raw = 'https://ygmaxytxjpdtimpctqoh.supabase.co';
    }
  } catch {}
  if (!raw) {
    raw = (import.meta as any)?.env?.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  }
  const base = String(raw).replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/`;
}

function toAbsoluteSupabasePublicUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  // If absolute and points to Supabase public storage, rewrite to current env base
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const u = new URL(pathOrUrl);
      const isSupabasePublic = /\bsupabase\.co$/i.test(u.hostname) && /\/storage\/v1\/object\/public\//.test(u.pathname);
      if (isSupabasePublic) {
        const base = getSupabasePublicBase();
        // Keep the path segment after '/storage/v1/object/public/'
        const idx = u.pathname.toLowerCase().indexOf('/storage/v1/object/public/');
        const tail = idx >= 0 ? pathOrUrl.substring(pathOrUrl.toLowerCase().indexOf('/storage/v1/object/public/') + '/storage/v1/object/public/'.length) : '';
        return tail ? (base + tail.replace(/^\/+/, '')) : (base.replace(/\/+$/, '') + '/');
      }
    } catch {}
    return pathOrUrl;
  }
  // Otherwise treat as path in public storage (e.g. fit-results/xxx.png)
  const base = getSupabasePublicBase();
  const clean = pathOrUrl.replace(/^\/+/, '');
  return `${base}${clean}`;
}

export function buildFitResultCloudinaryUrl(pathOrUrl: string): string {
  const source = toAbsoluteSupabasePublicUrl(pathOrUrl);
  if (!source) return '';
  const encoded = encodeURIComponent(source);
  return `${CLOUDINARY_FETCH_BASE}/${CLOUDINARY_TRANSFORM}/${encoded}`;
}

export function buildFitResultCloudinaryDownloadUrl(pathOrUrl: string, filename?: string): string {
  const source = toAbsoluteSupabasePublicUrl(pathOrUrl);
  if (!source) return '';
  const encoded = encodeURIComponent(source);
  // Use plain fl_attachment to avoid HTTP 400 issues observed with filename variant
  return `${CLOUDINARY_FETCH_BASE}/${CLOUDINARY_TRANSFORM_DOWNLOAD}/${encoded}`;
}

export function pickDisplayImage(
  status: string,
  generatedImagePathOrUrl: string | null | undefined,
  fallbackProductImageUrl?: string | null
): string | undefined {
  if (status === 'COMPLETED' && generatedImagePathOrUrl) {
    return buildFitResultCloudinaryUrl(generatedImagePathOrUrl);
  }
  return fallbackProductImageUrl || undefined;
}
