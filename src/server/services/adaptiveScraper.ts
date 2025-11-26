import { scrapeProductData, validateUrl } from './widgetScraper';

export type SourceKind = 'jsonld' | 'meta' | 'dom' | 'ai';

export interface ExtractResult {
  title?: string;
  priceRaw?: string;
  price?: number;
  currency?: string;
  images: string[];
  source: SourceKind;
  confidence: number; // 0..1
  url: string;
  notes?: string[];
}

export interface ScrapeOptions {
  locale?: string;
  currencyHint?: string;
  timeoutMs?: number;
  userAgent?: string;
  aiEnabled?: boolean;
}

function normalizePrice(raw?: string, opts?: { locale?: string; currencyHint?: string }): { price?: number; currency?: string } {
  if (!raw) return { price: undefined, currency: opts?.currencyHint };
  const cleaned = String(raw).replace(/\s|\u00A0/g, '');
  const m = cleaned.match(/([\€£\$])?\s?([\d\.,]+)/);
  if (!m) return { price: undefined, currency: opts?.currencyHint };
  const num = m[2].includes(',') && m[2].includes('.')
    ? parseFloat(m[2].replace(/\./g, '').replace(',', '.'))
    : (m[2].includes(',') ? parseFloat(m[2].replace(',', '.')) : parseFloat(m[2]));
  return { price: Number.isFinite(num) ? num : undefined, currency: opts?.currencyHint };
}

function toAbsolute(src: string, pageUrl: string): string {
  try {
    if (!src) return '';
    if (src.startsWith('http')) return src;
    if (src.startsWith('//')) {
      const u = new URL(pageUrl); return `${u.protocol}${src}`;
    }
    const u = new URL(pageUrl);
    return `${u.protocol}//${u.host}${src.startsWith('/') ? '' : '/'}${src}`;
  } catch { return src; }
}

function filterImages(urls: string[], pageUrl: string): string[] {
  const abs = urls.map(u => toAbsolute(u, pageUrl));
  const out = Array.from(new Set(abs))
    .filter(u => /\.(jpg|jpeg|png|webp|avif)$/i.test(u))
    .filter(u => !/sprite|logo|icon|banner|placeholder|avatar|generic|thumb/i.test(u))
    .slice(0, 12);
  return out;
}

function confidenceScore(i: { title?: string; price?: number; images?: string[] }): number {
  let s = 0;
  if (i.title && i.title.trim().length > 3) s += 0.5;
  if (i.price && i.price > 0) s += 0.4;
  if (i.images && i.images.length >= 1) s += 0.1;
  return Math.min(1, s);
}

async function aiFallback(html: string, url: string): Promise<Partial<ExtractResult>> {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return {};
    const mod: any = await import('@google/generative-ai');
    const { GoogleGenerativeAI } = mod;
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = (
      `Extract product title, numeric price, currency, and up to 10 image URLs (exclude logos/banners/placeholders/videos) from this HTML.\n` +
      `Return valid JSON: { "title": string, "price": number, "currency": string, "images": string[] }.\n` +
      `URL: ${url}\nHTML:\n` +
      html.slice(0, 150000)
    );
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    try {
      const parsed = JSON.parse(text);
      const out: Partial<ExtractResult> = {};
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.title === 'string') out.title = parsed.title;
        if (typeof parsed.price === 'number') out.price = parsed.price;
        if (typeof parsed.currency === 'string') out.currency = parsed.currency;
        if (Array.isArray(parsed.images)) out.images = parsed.images.filter((u: string) => typeof u === 'string');
      }
      return out;
    } catch {
      return {};
    }
  } catch {
    return {};
  }
}

async function fetchHtmlWithRetries(url: string, maxRetries = 2): Promise<{ html: string; retries: number }> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  } as any;
  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, { headers, redirect: 'follow' });
      if (resp.status === 429 || resp.status === 503) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      return { html, retries: attempt };
    } catch (e) {
      lastErr = e;
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 500;
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

export async function scrapeProduct(url: string, opts: ScrapeOptions = {}): Promise<ExtractResult> {
  const v = validateUrl(url);
  if (!v.isValid) throw new Error(v.error || 'Invalid URL');

  let raw: any;
  let blockedStatus: number | null = null;
  try {
    raw = await scrapeProductData(url);
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    const m = msg.match(/HTTP error! status:\s*(\d{3})/i);
    blockedStatus = m ? parseInt(m[1], 10) : null;
    const aiEnabled = opts.aiEnabled || String(process.env.AI_FALLBACK_ENABLED || '').toLowerCase() === '1';
    if (aiEnabled && (blockedStatus === 403 || blockedStatus === 429 || blockedStatus === 503 || blockedStatus === null)) {
      let html = '';
      let retries = 0;
      try {
        const fh = await fetchHtmlWithRetries(url, 2);
        html = fh.html;
        retries = fh.retries;
      } catch {}
      const ai = await aiFallback(html, url);
      const imgs = Array.isArray(ai.images) ? ai.images.filter((u: any) => typeof u === 'string') : [];
      const filteredImgs = filterImages(imgs as string[], url);
      let priceNum: number | undefined;
      let priceRaw: string | undefined;
      if (typeof (ai as any).price === 'number') {
        priceNum = (ai as any).price;
        priceRaw = String(priceNum);
      } else if (typeof (ai as any).price === 'string') {
        priceRaw = (ai as any).price;
        priceNum = normalizePrice(priceRaw, { locale: opts.locale, currencyHint: opts.currencyHint }).price;
      }
      const currency = (typeof (ai as any).currency === 'string' && (ai as any).currency) || opts.currencyHint || 'EUR';
      const result: ExtractResult = {
        title: (ai as any).title || undefined,
        priceRaw,
        price: priceNum,
        currency,
        images: filteredImgs,
        source: (ai && ((ai as any).title || (ai as any).price || filteredImgs.length)) ? 'ai' : 'dom',
        confidence: Math.max(0.3, confidenceScore({ title: (ai as any).title, price: priceNum, images: filteredImgs })),
        url,
        notes: [
          `ai_on_error:true`,
          `blocked_status:${blockedStatus ?? 'unknown'}`,
          ...(retries > 0 ? [`ai_html_retries:${retries}`] : [])
        ]
      };
      return result;
    }
    throw e;
  }
  const imagesRaw: string[] = Array.from(new Set([...(raw.images || []), raw.image || ''].filter(Boolean) as string[]));
  const images = filterImages(imagesRaw, url);
  const priceRaw = raw.price || undefined;
  const { price, currency } = normalizePrice(priceRaw, { locale: opts.locale, currencyHint: opts.currencyHint });

  let result: ExtractResult = {
    title: raw.title || undefined,
    priceRaw,
    price,
    currency: currency || 'EUR',
    images,
    source: 'dom',
    confidence: confidenceScore({ title: raw.title, price, images }),
    url,
    notes: []
  };

  const threshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.55');
  const aiEnabled = opts.aiEnabled || String(process.env.AI_FALLBACK_ENABLED || '').toLowerCase() === '1';
  const priceMissing = !(typeof result.price === 'number' && isFinite(result.price));
  if (aiEnabled && (result.confidence < threshold || priceMissing)) {
    let html = '';
    let retries = 0;
    try {
      const fh = await fetchHtmlWithRetries(url, 2);
      html = fh.html;
      retries = fh.retries;
    } catch {}
    const ai = await aiFallback(html, url);
    const merged: ExtractResult = {
      ...result,
      ...ai,
      images: ai?.images && ai.images.length ? filterImages(ai.images, url) : result.images,
      source: (ai.title || ai.price || (ai.images && ai.images.length)) ? 'ai' as const : result.source,
    } as ExtractResult;
    merged.confidence = Math.max(result.confidence, confidenceScore(merged));
    const info: string[] = Array.isArray(merged.notes) ? merged.notes : [];
    if (retries > 0) info.push(`ai_html_retries:${retries}`);
    if (priceMissing) info.push('ai_forced:no_price');
    merged.notes = info;
    result = merged;
  }

  return result;
}
