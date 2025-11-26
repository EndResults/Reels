"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeProduct = scrapeProduct;
const widgetScraper_1 = require("./widgetScraper");
function normalizePrice(raw, opts) {
    if (!raw)
        return { price: undefined, currency: opts?.currencyHint };
    const cleaned = String(raw).replace(/\s|\u00A0/g, '');
    const m = cleaned.match(/([\€£\$])?\s?([\d\.,]+)/);
    if (!m)
        return { price: undefined, currency: opts?.currencyHint };
    const num = m[2].includes(',') && m[2].includes('.')
        ? parseFloat(m[2].replace(/\./g, '').replace(',', '.'))
        : (m[2].includes(',') ? parseFloat(m[2].replace(',', '.')) : parseFloat(m[2]));
    return { price: Number.isFinite(num) ? num : undefined, currency: opts?.currencyHint };
}
function toAbsolute(src, pageUrl) {
    try {
        if (!src)
            return '';
        if (src.startsWith('http'))
            return src;
        if (src.startsWith('//')) {
            const u = new URL(pageUrl);
            return `${u.protocol}${src}`;
        }
        const u = new URL(pageUrl);
        return `${u.protocol}//${u.host}${src.startsWith('/') ? '' : '/'}${src}`;
    }
    catch {
        return src;
    }
}
function filterImages(urls, pageUrl) {
    const abs = urls.map(u => toAbsolute(u, pageUrl));
    const out = Array.from(new Set(abs))
        .filter(u => /\.(jpg|jpeg|png|webp|avif)$/i.test(u))
        .filter(u => !/sprite|logo|icon|banner|placeholder|avatar|generic|thumb/i.test(u))
        .slice(0, 12);
    return out;
}
function confidenceScore(i) {
    let s = 0;
    if (i.title && i.title.trim().length > 3)
        s += 0.5;
    if (i.price && i.price > 0)
        s += 0.4;
    if (i.images && i.images.length >= 1)
        s += 0.1;
    return Math.min(1, s);
}
async function aiFallback(html, url) {
    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key)
            return {};
        const mod = await Promise.resolve().then(() => __importStar(require('@google/generative-ai')));
        const { GoogleGenerativeAI } = mod;
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
        const prompt = (`Extract product title, numeric price, currency, and up to 10 image URLs (exclude logos/banners/placeholders/videos) from this HTML.\n` +
            `Return valid JSON: { "title": string, "price": number, "currency": string, "images": string[] }.\n` +
            `URL: ${url}\nHTML:\n` +
            html.slice(0, 150000));
        const result = await model.generateContent(prompt);
        const text = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        try {
            const parsed = JSON.parse(text);
            const out = {};
            if (parsed && typeof parsed === 'object') {
                if (typeof parsed.title === 'string')
                    out.title = parsed.title;
                if (typeof parsed.price === 'number')
                    out.price = parsed.price;
                if (typeof parsed.currency === 'string')
                    out.currency = parsed.currency;
                if (Array.isArray(parsed.images))
                    out.images = parsed.images.filter((u) => typeof u === 'string');
            }
            return out;
        }
        catch {
            return {};
        }
    }
    catch {
        return {};
    }
}
async function fetchHtmlWithRetries(url, maxRetries = 2) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
    };
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const resp = await fetch(url, { headers, redirect: 'follow' });
            if (resp.status === 429 || resp.status === 503)
                throw new Error(`HTTP ${resp.status}`);
            const html = await resp.text();
            return { html, retries: attempt };
        }
        catch (e) {
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
async function scrapeProduct(url, opts = {}) {
    const v = (0, widgetScraper_1.validateUrl)(url);
    if (!v.isValid)
        throw new Error(v.error || 'Invalid URL');
    let raw;
    let blockedStatus = null;
    try {
        raw = await (0, widgetScraper_1.scrapeProductData)(url);
    }
    catch (e) {
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
            }
            catch { }
            const ai = await aiFallback(html, url);
            const imgs = Array.isArray(ai.images) ? ai.images.filter((u) => typeof u === 'string') : [];
            const filteredImgs = filterImages(imgs, url);
            let priceNum;
            let priceRaw;
            if (typeof ai.price === 'number') {
                priceNum = ai.price;
                priceRaw = String(priceNum);
            }
            else if (typeof ai.price === 'string') {
                priceRaw = ai.price;
                priceNum = normalizePrice(priceRaw, { locale: opts.locale, currencyHint: opts.currencyHint }).price;
            }
            const currency = (typeof ai.currency === 'string' && ai.currency) || opts.currencyHint || 'EUR';
            const result = {
                title: ai.title || undefined,
                priceRaw,
                price: priceNum,
                currency,
                images: filteredImgs,
                source: (ai && (ai.title || ai.price || filteredImgs.length)) ? 'ai' : 'dom',
                confidence: Math.max(0.3, confidenceScore({ title: ai.title, price: priceNum, images: filteredImgs })),
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
    const imagesRaw = Array.from(new Set([...(raw.images || []), raw.image || ''].filter(Boolean)));
    const images = filterImages(imagesRaw, url);
    const priceRaw = raw.price || undefined;
    const { price, currency } = normalizePrice(priceRaw, { locale: opts.locale, currencyHint: opts.currencyHint });
    let result = {
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
        }
        catch { }
        const ai = await aiFallback(html, url);
        const merged = {
            ...result,
            ...ai,
            images: ai?.images && ai.images.length ? filterImages(ai.images, url) : result.images,
            source: (ai.title || ai.price || (ai.images && ai.images.length)) ? 'ai' : result.source,
        };
        merged.confidence = Math.max(result.confidence, confidenceScore(merged));
        const info = Array.isArray(merged.notes) ? merged.notes : [];
        if (retries > 0)
            info.push(`ai_html_retries:${retries}`);
        if (priceMissing)
            info.push('ai_forced:no_price');
        merged.notes = info;
        result = merged;
    }
    return result;
}
//# sourceMappingURL=adaptiveScraper.js.map