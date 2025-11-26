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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeProductData = scrapeProductData;
exports.validateUrl = validateUrl;
const cheerio = __importStar(require("cheerio"));
const fs_1 = __importDefault(require("fs"));
function getPlatformSelectors(url) {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('zalando')) {
        return {
            title: [
                '[data-testid="product-detail-name"]',
                '.pdp-product-name',
                '.catalog-product-name',
                '[class*="Name"]',
                '[class*="title"]',
                'h1[class*="product"]',
                'h1'
            ],
            price: [
                '[data-testid="product-detail-price"]',
                '.price_current',
                '.price-current',
                '[class*="Price"]',
                '.price',
                '[class*="price"]'
            ],
            image: [
                '[data-testid="product-detail-image"]',
                '.catalog-product-gallery img',
                '.product-gallery img',
                '[class*="Gallery"] img',
                '.pdp-image img',
                'main img',
                'picture source',
                'meta[property="og:image"]',
                'meta[property="og:image:secure_url"]'
            ]
        };
    }
    if (hostname.includes('bonprix')) {
        return {
            title: [
                'h1',
                'meta[property="og:title"]',
                '[itemprop="name"]',
                '.product-title'
            ],
            price: [
                '.price-tag',
                '.price',
                '[class*="price"]',
                'meta[property="product:price:amount"]'
            ],
            image: [
                'meta[property="og:image"]',
                'picture source',
                'main img',
                'img[data-src]'
            ]
        };
    }
    if (hostname.includes('jdsports')) {
        return {
            title: [
                'h1',
                'meta[property="og:title"]',
                '[data-e2e="product-title"]'
            ],
            price: [
                '[data-e2e="product-price"]',
                '.pri',
                '.price',
                'meta[property="product:price:amount"]'
            ],
            image: [
                'meta[property="og:image"]',
                'img[data-e2e*="image"]',
                'picture source',
                'main img'
            ]
        };
    }
    if (hostname.includes('xooon')) {
        return {
            title: [
                'h1',
                'meta[property="og:title"]',
                '.product-title'
            ],
            price: [
                '.product__price__tag',
                '[itemprop="price"]',
                'meta[property="product:price:amount"]',
                '.price'
            ],
            image: [
                'meta[property="og:image"]',
                'picture source',
                'main img',
                'img[data-src]'
            ]
        };
    }
    if (hostname.includes('wehkamp')) {
        return {
            title: [
                '.pdp-product-title',
                '.product-title',
                'h1[class*="title"]',
                'h1'
            ],
            price: [
                '.price-current',
                '.price-now',
                '[class*="price-current"]',
                '.price',
                '[class*="price"]'
            ],
            image: [
                '.pdp-product-image img',
                '.product-image img',
                '.main-image img',
                'main img',
                'picture source',
                'meta[property="og:image"]'
            ]
        };
    }
    if (hostname.includes('wefashion')) {
        return {
            title: [
                'h1.product-name',
                '.product-title',
                'h1[class*="title"]',
                'h1'
            ],
            price: [
                '.price-current',
                '.price-now',
                '.pdp-price',
                '[class*="price"]',
                '.price'
            ],
            image: [
                '.product-media img',
                'img[fetchpriority="high"]',
                'img[data-src]',
                'img[data-zoom-image]',
                'picture source',
                'meta[property="og:image"]',
                'meta[property="og:image:secure_url"]'
            ]
        };
    }
    if (hostname.includes('bol.com')) {
        return {
            title: [
                '[data-test="title"]',
                '.pdp-product-title',
                'h1[class*="title"]',
                'h1'
            ],
            price: [
                '[data-test="price"]',
                '.price-block__highlight',
                '.price',
                '[class*="price"]'
            ],
            image: [
                '[data-test="product-image"]',
                '.pdp-product-image img',
                '.js_selected_image',
                'main img'
            ]
        };
    }
    if (hostname.includes('zara.com')) {
        return {
            title: [
                'h1',
                'meta[property="og:title"]',
                '.product-detail-info__title',
                '[data-qa="product-name"]'
            ],
            price: [
                'span.price__amount',
                '[data-qa="product-price"]',
                '.price',
                '[class*="price"]'
            ],
            image: [
                'meta[property="og:image"]',
                'img[data-qa*="image"]',
                'picture source',
                'main img'
            ]
        };
    }
    if (hostname.includes('hm.com')) {
        return {
            title: [
                'h1',
                'meta[property="og:title"]',
                '[data-testid*="product-title"]'
            ],
            price: [
                'span.price-value',
                '.price',
                '[class*="price"]',
                'meta[property="product:price:amount"]'
            ],
            image: [
                'meta[property="og:image"]',
                'picture source',
                'img[alt*="product"]',
                'main img'
            ]
        };
    }
    if (hostname.includes('topshoe.nl')) {
        return {
            title: [
                'h1.product-detail__product-title',
                'h1',
                'meta[property="og:title"]'
            ],
            price: [
                '#currentPrice',
                'meta[itemprop="price"]',
                '.pd_price [itemprop="price"]',
                '[class*="price"]',
                '.price'
            ],
            image: [
                'meta[itemprop="image"]',
                'meta[property="og:image"]',
                'meta[property="og:image:secure_url"]',
                '#fotorama a[href]',
                '#fotorama img',
                '.fotorama a[href]',
                '.fotorama img',
                '.detailImage img',
                'img[src*="/pim/Files/Product/"]'
            ]
        };
    }
    return {
        title: [
            'h1',
            'meta[property="og:title"]',
            '[itemprop="name"]',
            '.product-title'
        ],
        price: [
            '.price',
            '[class*="price"]',
            'meta[property="product:price:amount"]'
        ],
        image: [
            'meta[property="og:image"]',
            'meta[property="og:image:secure_url"]',
            'meta[itemprop="image"]',
            'picture source',
            'main img'
        ]
    };
}
function allowHeadlessHost(hostname) {
    try {
        const h = hostname.toLowerCase();
        return ['zalando', 'mytheresa', 'farfetch', 'debijenkorf', 'nike', 'hm.com', 'iqueens', 'zara', 'c-and-a.com', 'c-and-a', 'seabirr', 'shopify', 'myshopify', 'vanarendonk']
            .some(d => h.includes(d));
    }
    catch {
        return false;
    }
}
function extractXooonData($, html, baseUrl) {
    try {
        const host = new URL(baseUrl).hostname.toLowerCase();
        if (!host.includes('xooon'))
            return null;
        const images = [];
        let price;
        const push = (u) => {
            const s = typeof u === 'string' ? u.trim() : '';
            if (!s)
                return;
            try {
                const x = new URL(s, baseUrl);
                x.search = '';
                const v = x.toString();
                if (isValidImageUrl(v))
                    images.push(v);
            }
            catch {
                if (isValidImageUrl(s))
                    images.push(s);
            }
        };
        const scripts = $('script').toArray().map((el) => String($(el).html() || ''));
        for (const txt of scripts) {
            if (!txt)
                continue;
            const m1 = txt.match(/var\s+jsonVariation\s*=\s*(\{[\s\S]*?\});/i);
            if (m1 && m1[1]) {
                try {
                    const obj = JSON.parse(m1[1]);
                    if (!price)
                        price = String(obj.price || obj.priceAmount || '');
                    const lists = [obj.productFullSizeAssetList, obj.productAssetList, obj.productThumbnailAssetList];
                    for (const arr of lists) {
                        if (Array.isArray(arr)) {
                            for (const it of arr)
                                push((it && (it.href || it.src || it.url)) || '');
                        }
                    }
                }
                catch {
                    try {
                        const reImg = /https?:\/\/[^"'\s>]+cloudinary[^"'\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s>]*)?/ig;
                        const found = m1[1].match(reImg) || [];
                        for (const u of found)
                            push(u);
                        const pm = m1[1].match(/"price"\s*:\s*"([^"]+)"|"priceAmount"\s*:\s*(\d+(?:\.\d+)?)/i);
                        if (pm)
                            price = pm[1] || pm[2] || price;
                    }
                    catch { }
                }
            }
            const m2 = txt.match(/var\s+pdpViewItem\s*=\s*(\{[\s\S]*?\});/i);
            if (m2 && m2[1]) {
                try {
                    const obj2 = JSON.parse(m2[1]);
                    if (!price) {
                        const p = obj2?.value ?? obj2?.items?.[0]?.price;
                        if (p != null)
                            price = String(p);
                    }
                }
                catch { }
            }
            if (images.length >= 20 && price)
                break;
        }
        const uniq = dedupe(images);
        if (uniq.length || price)
            return { price, images: uniq.slice(0, 20) };
    }
    catch { }
    return null;
}
function extractJsonLdData($) {
    try {
        const scripts = $('script[type="application/ld+json"]');
        for (let i = 0; i < scripts.length; i++) {
            try {
                const jsonContent = $(scripts[i]).html();
                if (!jsonContent)
                    continue;
                const data = JSON.parse(jsonContent);
                const asArray = (x) => Array.isArray(x) ? x : [x];
                const visit = (node) => {
                    if (!node || typeof node !== 'object')
                        return null;
                    const types = asArray((node['@type'] || node.type || '')).map((t) => String(t));
                    if (types.includes('Product')) {
                        return {
                            name: node.name,
                            price: node.offers?.price || node.price || node.offers?.[0]?.price,
                            image: node.image,
                            description: node.description
                        };
                    }
                    const containers = [
                        node['@graph'], node.graph, node.itemListElement, node.mainEntity,
                        node.offers, node.brand, node.isRelatedTo, node.about
                    ];
                    for (const c of containers) {
                        const arr = asArray(c).filter(Boolean);
                        for (const it of arr) {
                            const found = visit(it);
                            if (found)
                                return found;
                        }
                    }
                    return null;
                };
                const rootItems = asArray(data);
                for (const root of rootItems) {
                    const found = visit(root);
                    if (found)
                        return found;
                }
            }
            catch (e) {
                continue;
            }
        }
    }
    catch (error) {
        console.error('Error extracting JSON-LD:', error);
    }
    return null;
}
function extractNextData($) {
    try {
        const candidates = [
            '#__NEXT_DATA__',
            'script[id="__NEXT_DATA__"][type="application/json"]',
            'script[type="application/json"]'
        ];
        const asArray = (x) => Array.isArray(x) ? x : [x];
        const tryParse = (txt) => {
            if (!txt)
                return null;
            try {
                return JSON.parse(txt);
            }
            catch {
                return null;
            }
        };
        const visit = (node) => {
            if (!node || typeof node !== 'object')
                return null;
            const hasName = typeof node.name === 'string' && node.name.length > 1;
            const hasImage = node.image || node.images || node.media || node.gallery;
            const hasPrice = node.price || node.offerPrice || node.currentPrice || node.offers?.price;
            if (hasName && (hasImage || hasPrice)) {
                const imgUrl = toFirstImageUrl(node.image) || toFirstImageUrl(node.images) || toFirstImageUrl(node.media) || toFirstImageUrl(node.gallery);
                return {
                    name: node.name,
                    price: node.offers?.price || node.price || node.offerPrice || node.currentPrice,
                    image: imgUrl || undefined,
                    description: node.description
                };
            }
            for (const key of Object.keys(node)) {
                const val = node[key];
                const arr = asArray(val).filter((v) => typeof v === 'object');
                for (const it of arr) {
                    const found = visit(it);
                    if (found)
                        return found;
                }
            }
            return null;
        };
        for (const sel of candidates) {
            const el = $(sel).first();
            if (!el || el.length === 0)
                continue;
            const jsonText = el.attr('type') === 'application/json' ? el.html() : el.text();
            const data = tryParse(jsonText || '');
            if (!data)
                continue;
            const found = visit(data);
            if (found)
                return found;
        }
    }
    catch { }
    return null;
}
function pageHasPreloadedStateHtml(html) {
    try {
        return /__(PRELOADED_STATE|INITIAL_STATE)__\s*=\s*\{/.test(html);
    }
    catch {
        return false;
    }
}
function reactHydrationExtractorHtml($, html, baseUrl) {
    try {
        let stateData = null;
        const scripts = $('script').toArray();
        for (const el of scripts) {
            const txt = $(el).html() || '';
            if (!txt)
                continue;
            const m = txt.match(/(__PRELOADED_STATE__|__INITIAL_STATE__)\s*=\s*(\{[\s\S]*?\});/);
            if (m && m[2]) {
                try {
                    stateData = JSON.parse(m[2]);
                    break;
                }
                catch { }
            }
        }
        if (stateData) {
            const product = stateData?.product || stateData?.pageData?.product || stateData?.data?.product;
            if (product) {
                const toUrl = (v) => {
                    if (!v)
                        return '';
                    if (typeof v === 'string')
                        return v;
                    if (Array.isArray(v))
                        return (v.map(toUrl).find(Boolean) || '');
                    if (typeof v === 'object')
                        return (v.url || v.src || v.contentUrl || v['@id'] || '').toString();
                    return '';
                };
                const imgsRaw = Array.isArray(product.images) ? product.images.map(toUrl) : [toUrl(product.images)];
                const uniqImgs = Array.from(new Set(imgsRaw.filter(Boolean)));
                const imgs = uniqImgs.slice(0, 20).map((u) => {
                    try {
                        const x = new URL(u, baseUrl);
                        x.search = '';
                        return x.toString();
                    }
                    catch {
                        return String(u);
                    }
                });
                const priceNum = parseFloat(String((product.price?.value ?? product.price ?? '')).replace(',', '.')) || undefined;
                return {
                    brand: product.brand || product.designerName,
                    title: product.name,
                    price: priceNum,
                    currency: product.currency || product.price?.currency || undefined,
                    images: imgs.length ? imgs : undefined
                };
            }
        }
        try {
            const jsonScripts = $('script[type="application/json"]').toArray();
            for (const el of jsonScripts) {
                const raw = $(el).html() || '';
                if (!raw)
                    continue;
                if (raw.includes('"price"') && raw.includes('"image"')) {
                    try {
                        const data = JSON.parse(raw);
                        const images = (data.images || []).map((i) => (i?.url || i)).filter(Boolean);
                        const imgs = Array.from(new Set(images)).slice(0, 20).map((u) => {
                            try {
                                const x = new URL(u, baseUrl);
                                x.search = '';
                                return x.toString();
                            }
                            catch {
                                return u;
                            }
                        });
                        const priceNum = Number(data.price?.value ?? data.offers?.price ?? NaN);
                        return {
                            brand: data.brand?.name || data.brand,
                            title: data.name,
                            price: Number.isFinite(priceNum) ? priceNum : undefined,
                            currency: data.price?.currency || data.offers?.priceCurrency,
                            images: imgs
                        };
                    }
                    catch { }
                }
            }
        }
        catch { }
        const title = ($('h1').first().text() || '').trim();
        const brand = ($('a[data-testid*="brand"], [itemprop=\"brand\"]').first().text() || '').trim();
        const priceText = ($('[data-testid*="price"], .price, [itemprop=\"price\"]').first().text() || '').trim();
        const priceNum = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
        const imgs2 = $('img').toArray().map((el) => {
            const $el = $(el);
            return $el.attr('src') || '';
        }).filter((src) => /\/media\/|\/products\//.test(src)).filter((src) => /\.(jpg|jpeg|png|webp|avif)$/i.test(src) && !/icon|logo|banner/i.test(src));
        const uniqImgs2 = Array.from(new Set(imgs2));
        const imgs = uniqImgs2.slice(0, 20).map((u) => { try {
            const x = new URL(u, baseUrl);
            x.search = '';
            return x.toString();
        }
        catch {
            return String(u);
        } });
        return { brand, title, price: Number.isFinite(priceNum) ? priceNum : undefined, currency: 'EUR', images: imgs };
    }
    catch {
        return null;
    }
}
function resolveImageUrl(src, baseUrl) {
    if (src.startsWith('//')) {
        return 'https:' + src;
    }
    else if (src.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        return urlObj.origin + src;
    }
    else if (src.startsWith('http')) {
        return src;
    }
    else {
        const urlObj = new URL(baseUrl);
        return urlObj.origin + '/' + src;
    }
}
function toFirstImageUrl(img) {
    try {
        if (!img)
            return null;
        if (typeof img === 'string') {
            const s = String(img).trim();
            if (!s || s === '[object Object]')
                return null;
            return s;
        }
        if (Array.isArray(img)) {
            for (const it of img) {
                const u = toFirstImageUrl(it);
                if (u)
                    return u;
            }
            return null;
        }
        if (typeof img === 'object') {
            const candidate = (img.url || img.contentUrl || img.src || img['@id'] || '').toString().trim();
            if (candidate && candidate !== '[object Object]')
                return candidate;
            return null;
        }
        return null;
    }
    catch {
        return null;
    }
}
function dedupe(arr) {
    const out = [];
    const seen = {};
    for (const raw of arr) {
        const s = String(raw || '').trim();
        if (!s)
            continue;
        if (!seen[s]) {
            seen[s] = 1;
            out.push(s);
        }
    }
    return out;
}
function isValidImageUrl(u) {
    if (!u)
        return false;
    const s = String(u).trim();
    if (!s)
        return false;
    if (s.startsWith('data:') || s.includes('data:image'))
        return false;
    if (/facebook\.com\/tr\b|connect\.facebook\.net|google-analytics|googletagmanager|doubleclick\.net|fbevents\.js|\/gtag\/js/i.test(s))
        return false;
    if (/placeholder|spacer|blank\.gif|1x1\.png|svg\+xml|\b(icon|logo|sprite|banner|thumb|generic|avatar|badge|advert)\b/i.test(s))
        return false;
    if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(s))
        return true;
    if (/\bimages\b|\/image\/|cdn|media|asset|img/i.test(s))
        return true;
    return false;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function buildRequestHeaders(url) {
    const origin = (() => { try {
        return new URL(url).origin + '/';
    }
    catch {
        return 'https://www.google.com/';
    } })();
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': origin
    };
}
function extractCookieString(resp) {
    try {
        const h = resp && resp.headers;
        const arr = h?.getSetCookie ? h.getSetCookie() : (h?.get('set-cookie') ? [String(h.get('set-cookie'))] : []);
        const pairs = [];
        for (const c of arr) {
            const p = String(c || '').split(';')[0];
            if (p)
                pairs.push(p.trim());
        }
        return pairs.join('; ');
    }
    catch {
        return '';
    }
}
async function primeSession(url) {
    try {
        const origin = new URL(url).origin + '/';
        const resp = await fetch(origin, { headers: buildRequestHeaders(url), redirect: 'follow' });
        return extractCookieString(resp);
    }
    catch {
        return '';
    }
}
async function tryPlaywrightScrape(url) {
    try {
        let chromiumLib = null;
        try {
            const pe = await Promise.resolve().then(() => __importStar(require('playwright-extra')));
            try {
                const stealthMod = await Promise.resolve().then(() => __importStar(require('puppeteer-extra-plugin-stealth')));
                const stealth = (stealthMod && (stealthMod.default || stealthMod));
                if (stealth && typeof stealth === 'function')
                    pe.chromium.use(stealth());
            }
            catch { }
            chromiumLib = pe.chromium;
        }
        catch {
            const pw = await Promise.resolve().then(() => __importStar(require('playwright')));
            chromiumLib = pw.chromium;
        }
        try {
            fs_1.default.mkdirSync('/tmp/playwright_chromiumdev_profile', { recursive: true });
            fs_1.default.chmodSync('/tmp/playwright_chromiumdev_profile', 0o777);
        }
        catch { }
        const proxy = String(process.env.HEADLESS_PROXY_SERVER || process.env.HEADLESS_PROXY_URL || '').trim();
        const proxyUser = String(process.env.HEADLESS_PROXY_USERNAME || '').trim();
        const proxyPass = String(process.env.HEADLESS_PROXY_PASSWORD || '').trim();
        const argsList = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-infobars',
            '--window-size=1366,900'
        ];
        if (proxy)
            argsList.push(`--proxy-server=${proxy}`);
        const launchOpts = { headless: true, args: argsList };
        if (proxy) {
            launchOpts.proxy = { server: proxy };
            if (proxyUser && proxyPass)
                launchOpts.proxy = { server: proxy, username: proxyUser, password: proxyPass };
        }
        const browser = await chromiumLib.launch(launchOpts);
        try {
            console.log('Chromium launched successfully (Playwright headless)');
        }
        catch { }
        const referer = 'https://www.google.com/';
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            locale: 'nl-NL',
            extraHTTPHeaders: {
                referer: referer,
                'accept-language': 'en-US,en;q=0.9,nl;q=0.8',
                'accept-encoding': 'gzip, deflate, br',
                'sec-ch-ua': '"Chromium";v="126", "Not.A/Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            }
        });
        try {
            await context.route('**/*', (route) => {
                try {
                    const type = route.request().resourceType();
                    if (type === 'image' || type === 'media' || type === 'font') {
                        return route.abort();
                    }
                }
                catch { }
                return route.continue();
            });
        }
        catch { }
        const page = await context.newPage();
        let saw403 = false;
        try {
            await page.setExtraHTTPHeaders({
                referer: referer,
                'accept-language': 'en-US,en;q=0.9,nl;q=0.8',
                'accept-encoding': 'gzip, deflate, br',
                'sec-ch-ua': '"Chromium";v="126", "Not.A/Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            });
        }
        catch { }
        try {
            await page.addInitScript(() => {
                try {
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    window.chrome = { runtime: {} };
                    try {
                        Object.defineProperty(navigator, 'languages', { get: () => ['nl-NL', 'nl', 'en-US', 'en'] });
                    }
                    catch { }
                    try {
                        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                    }
                    catch { }
                }
                catch { }
            });
        }
        catch { }
        await page.setViewportSize({ width: 1366, height: 900 });
        const collected = [];
        try {
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                try {
                    const type = req.resourceType();
                    if (type === 'image' || type === 'media' || type === 'font')
                        return req.abort();
                }
                catch { }
                return req.continue();
            });
        }
        catch { }
        page.on('response', async (resp) => {
            try {
                try {
                    const st = typeof resp.status === 'function' ? resp.status() : 0;
                    if (st >= 400) {
                        const body = await resp.text().catch(() => '');
                        try {
                            console.warn('Playwright failed resp', { url: resp.url(), status: st, headers: resp.headers(), body: (body || '').slice(0, 1000) });
                        }
                        catch { }
                        if (st === 403)
                            saw403 = true;
                    }
                }
                catch { }
                const ct = (resp.headers()?.['content-type'] || resp.headers()?.['Content-Type'] || '').toString();
                const u = resp.url();
                if (ct.startsWith('image/')) {
                    if (isValidImageUrl(u))
                        collected.push(u);
                }
                else {
                    const rt = resp.request()?.resourceType?.() || '';
                    if (rt === 'xhr' || rt === 'fetch') {
                        const text = await resp.text().catch(() => '');
                        const m = (text || '').match(/https?:\/\/[^"'\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s>]*)?/ig);
                        if (m) {
                            for (const x of m) {
                                if (collected.length >= 40)
                                    break;
                                if (isValidImageUrl(x))
                                    collected.push(x);
                            }
                        }
                        try {
                            const isJson = (ct.includes('application/json') || (/^\s*[\[{]/.test(text)));
                            if (isJson) {
                                const obj = JSON.parse(text);
                                const visit = (node) => {
                                    try {
                                        if (!node)
                                            return;
                                        if (typeof node === 'string') {
                                            if (isValidImageUrl(node))
                                                collected.push(node);
                                            return;
                                        }
                                        if (Array.isArray(node)) {
                                            for (const it of node)
                                                visit(it);
                                            return;
                                        }
                                        if (typeof node === 'object') {
                                            const direct = (node.url || node.src || node.contentUrl);
                                            if (typeof direct === 'string' && isValidImageUrl(direct))
                                                collected.push(direct);
                                            const keys = ['image', 'images', 'media', 'gallery', 'variants', 'resources', 'assets', 'sources', 'pictures', 'thumbnails'];
                                            for (const k of keys)
                                                if (k in node)
                                                    visit(node[k]);
                                            for (const k of Object.keys(node)) {
                                                const v = node[k];
                                                if (v && typeof v === 'object')
                                                    visit(v);
                                            }
                                        }
                                    }
                                    catch { }
                                };
                                visit(obj);
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        });
        try {
            const origin = new URL(url).origin + '/';
            await page.goto(origin, { waitUntil: 'networkidle', timeout: 45000 });
            try {
                const cookieSel = 'button[data-testid="uc-accept-all-button"], #uc-btn-accept-banner, #onetrust-accept-btn-handler';
                const el = await page.$(cookieSel);
                if (el) {
                    await el.click().catch(() => { });
                    await sleep(300);
                }
            }
            catch { }
        }
        catch { }
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        try {
            await page.waitForFunction(() => {
                try {
                    return !/just a moment/i.test(document.title || '');
                }
                catch {
                    return true;
                }
            }, { timeout: 10000 });
        }
        catch { }
        try {
            if (saw403)
                console.error('Playwright failed, triggering Gemini fallback');
        }
        catch { }
        try {
            const cookieSel = 'button[data-testid="uc-accept-all-button"], #uc-btn-accept-banner, #onetrust-accept-btn-handler';
            const el = await page.$(cookieSel);
            if (el) {
                await el.click().catch(() => { });
                await sleep(300);
            }
        }
        catch { }
        try {
            await page.waitForSelector('[data-testid="product-detail-price"], meta[property="og:image"]', { timeout: 15000 });
        }
        catch { }
        for (let i = 0; i < 4; i++) {
            try {
                await page.mouse.wheel(0, 1000);
                await sleep(200);
            }
            catch { }
        }
        await sleep(800);
        const data = await page.evaluate(() => {
            const pick = (sel) => {
                const el = document.querySelector(sel);
                if (!el)
                    return '';
                if (el.content != null)
                    return (el.content || '').trim();
                return (el.textContent || '').trim();
            };
            const title = pick('[data-testid="product-detail-name"], h1');
            const priceText = pick('[data-testid="product-detail-price"], [class*="Price"], .price');
            const og1 = document.querySelector('meta[property="og:image"]')?.content || '';
            const og2 = document.querySelector('meta[property="og:image:secure_url"]')?.content || '';
            const imgs = Array.from(document.images || []).map(i => i.currentSrc || i.src).filter(Boolean);
            let nextImgs = [];
            try {
                const el = document.querySelector('#__NEXT_DATA__');
                if (el && el.textContent) {
                    const json = JSON.parse(el.textContent);
                    const s = JSON.stringify(json);
                    const re = /https?:\/\/[^"'\\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\\s>]*)?/ig;
                    const m = s.match(re) || [];
                    nextImgs = m;
                }
            }
            catch { }
            return { title, priceText, og: og1 || og2, imgs, nextImgs };
        });
        const stripQs = (u) => { try {
            const x = new URL(u);
            x.search = '';
            return x.toString();
        }
        catch {
            return u;
        } };
        const rawImgs = dedupe([...(data?.imgs || []), ...(data?.nextImgs || []), data?.og || '', ...collected].filter(isValidImageUrl)).map(stripQs);
        const productImgs = rawImgs.filter(u => {
            const s = u.toLowerCase();
            return /(\.jpg|\.jpeg|\.png|\.webp|\.avif|\.gif)(\?|$)/.test(s)
                && !s.includes('logo') && !s.includes('icon') && !s.includes('banner')
                && !s.includes('placeholder') && !s.includes('sprite') && !s.includes('avatar')
                && !s.includes('badge') && !s.includes('advert');
        }).slice(0, 20);
        let out = {
            title: (data?.title || '').trim() || undefined,
            price: (data?.priceText || '').trim() || undefined,
            image: productImgs[0] || undefined,
            images: productImgs.length ? productImgs : undefined
        };
        try {
            const html = await page.content();
            const $ = cheerio.load(html);
            const ld = extractJsonLdData($);
            if (ld) {
                if (!out.title && ld.name)
                    out.title = String(ld.name).trim();
                if (!out.price && ld.price)
                    out.price = String(ld.price).trim();
                const rawLdImg = ld.image;
                const addOne = (val) => {
                    const one = toFirstImageUrl(val);
                    if (!one)
                        return;
                    const norm = stripQs(one);
                    if (isValidImageUrl(norm)) {
                        const merged = dedupe([norm, ...(out.images || [])]);
                        out.image = merged[0];
                        out.images = merged;
                    }
                };
                if (Array.isArray(rawLdImg)) {
                    for (const it of rawLdImg)
                        addOne(it);
                }
                else {
                    addOne(rawLdImg);
                }
            }
            if (!out.price) {
                const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[itemprop="price"]').attr('content') || '';
                const extraSel = ['[data-testid*="price"]', '.price', '.PriceText', '[class*="price"]', '[itemprop="price"]'];
                let text = metaPrice;
                if (!text) {
                    for (const sel of extraSel) {
                        const el = $(sel).first();
                        if (el && el.text()) {
                            text = el.text().trim();
                            break;
                        }
                    }
                }
                if (text) {
                    const normalized = (() => {
                        const stripped = text.replace(/[^0-9,\.]/g, '');
                        if (!stripped)
                            return '';
                        const lastComma = stripped.lastIndexOf(',');
                        const lastDot = stripped.lastIndexOf('.');
                        const decPos = Math.max(lastComma, lastDot);
                        if (decPos === -1)
                            return stripped.replace(/\D/g, '');
                        let intPart = stripped.slice(0, decPos).replace(/\D/g, '');
                        let fracPart = stripped.slice(decPos + 1).replace(/\D/g, '');
                        if (fracPart.length > 2)
                            fracPart = fracPart.slice(-2);
                        return intPart + '.' + fracPart;
                    })();
                    if (normalized)
                        out.price = normalized;
                }
            }
            try {
                const section = $('main, [data-testid*="product"], [class*="product"], [class*="gallery"]').first();
                const imgEls = (section && section.length ? section : $('body')).find('img, source').toArray();
                const imgs2 = imgEls.map((el) => {
                    const $el = $(el);
                    const ss = ($el.attr('srcset') || '').split(',')[0]?.trim().split(' ')[0] || '';
                    return ss || $el.attr('src') || $el.attr('data-src') || '';
                }).filter(Boolean).map(stripQs).filter(isValidImageUrl).filter(u => {
                    const s = u.toLowerCase();
                    return /(\.jpg|\.jpeg|\.png|\.webp|\.avif|\.gif)(\?|$)/.test(s)
                        && !s.includes('logo') && !s.includes('icon') && !s.includes('banner')
                        && !s.includes('placeholder') && !s.includes('sprite') && !s.includes('avatar')
                        && !s.includes('badge') && !s.includes('advert');
                });
                const mergedImgs = dedupe([...(out.images || []), ...imgs2]).slice(0, 20);
                out.image = mergedImgs[0] || out.image;
                out.images = mergedImgs.length ? mergedImgs : out.images;
            }
            catch { }
        }
        catch { }
        await browser.close();
        return out;
    }
    catch (e) {
        try {
            console.warn('Playwright scrape failed:', e);
        }
        catch { }
        return null;
    }
}
async function tryPuppeteerScrape(url) {
    try {
        const puppeteer = await Promise.resolve().then(() => __importStar(require('puppeteer')));
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
        try {
            const referer = (() => { try {
                const u = new URL(url);
                return u.origin + '/';
            }
            catch {
                return 'https://www.zalando.nl/';
            } })();
            await page.setExtraHTTPHeaders({ referer: referer, 'accept-language': 'nl-NL,n;q=0.9,en;q=0.8' });
        }
        catch { }
        await page.setViewport({ width: 1366, height: 900 });
        await page.evaluateOnNewDocument(() => {
            try {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                window.chrome = { runtime: {} };
                try {
                    Object.defineProperty(navigator, 'languages', { get: () => ['nl-NL', 'nl', 'en-US', 'en'] });
                }
                catch { }
                try {
                    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                }
                catch { }
            }
            catch { }
        });
        const collected = [];
        page.on('response', async (resp) => {
            try {
                try {
                    const st = typeof resp.status === 'function' ? resp.status() : 0;
                    if (st >= 400) {
                        const body = await resp.text().catch(() => '');
                        try {
                            console.warn('Puppeteer failed resp', { url: resp.url(), status: st, headers: resp.headers(), body: (body || '').slice(0, 1000) });
                        }
                        catch { }
                    }
                }
                catch { }
                const ct = (resp.headers()?.['content-type'] || resp.headers()?.['Content-Type'] || '').toString();
                const u = resp.url();
                if (ct.startsWith('image/')) {
                    if (isValidImageUrl(u))
                        collected.push(u);
                }
                else {
                    const req = resp.request?.();
                    const rt = req && typeof req.resourceType === 'function' ? req.resourceType() : '';
                    if (rt === 'xhr' || rt === 'fetch') {
                        const text = await resp.text().catch(() => '');
                        const m = (text || '').match(/https?:\/\/[^"'\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s>]*)?/ig);
                        if (m) {
                            for (const x of m)
                                if (isValidImageUrl(x))
                                    collected.push(x);
                        }
                        try {
                            const isJson = (ct.includes('application/json') || (/^\s*[\[{]/.test(text)));
                            if (isJson) {
                                const obj = JSON.parse(text);
                                const visit = (node) => {
                                    try {
                                        if (!node)
                                            return;
                                        if (typeof node === 'string') {
                                            if (isValidImageUrl(node))
                                                collected.push(node);
                                            return;
                                        }
                                        if (Array.isArray(node)) {
                                            for (const it of node)
                                                visit(it);
                                            return;
                                        }
                                        if (typeof node === 'object') {
                                            const direct = (node.url || node.src || node.contentUrl);
                                            if (typeof direct === 'string' && isValidImageUrl(direct))
                                                collected.push(direct);
                                            const keys = ['image', 'images', 'media', 'gallery', 'variants', 'resources', 'assets', 'sources', 'pictures', 'thumbnails'];
                                            for (const k of keys)
                                                if (k in node)
                                                    visit(node[k]);
                                            for (const k of Object.keys(node)) {
                                                const v = node[k];
                                                if (v && typeof v === 'object')
                                                    visit(v);
                                            }
                                        }
                                    }
                                    catch { }
                                };
                                visit(obj);
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }
        });
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        try {
            const handles = await page.$$('button[data-testid="uc-accept-all-button"], #uc-btn-accept-banner, #onetrust-accept-btn-handler');
            if (handles && handles.length) {
                await handles[0].click().catch(() => { });
                await sleep(300);
            }
        }
        catch { }
        try {
            await page.waitForSelector('[data-testid="product-detail-price"], meta[property="og:image"]', { timeout: 15000 });
        }
        catch { }
        for (let i = 0; i < 4; i++) {
            try {
                await page.evaluate(() => window.scrollBy(0, window.innerHeight));
                await sleep(200);
            }
            catch { }
        }
        await sleep(800);
        const data = await page.evaluate(() => {
            const pick = (sel) => {
                const el = document.querySelector(sel);
                if (!el)
                    return '';
                if (el.content != null)
                    return (el.content || '').trim();
                return (el.textContent || '').trim();
            };
            const title = pick('[data-testid="product-detail-name"], h1');
            const priceText = pick('[data-testid="product-detail-price"], [class*="Price"], .price');
            const og1 = document.querySelector('meta[property="og:image"]')?.content || '';
            const og2 = document.querySelector('meta[property="og:image:secure_url"]')?.content || '';
            const imgs = Array.from(document.images || []).map(i => i.currentSrc || i.src).filter(Boolean);
            let nextImgs = [];
            try {
                const el = document.querySelector('#__NEXT_DATA__');
                if (el && el.textContent) {
                    const json = JSON.parse(el.textContent);
                    const s = JSON.stringify(json);
                    const re = /https?:\/\/[^"'\\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\\s>]*)?/ig;
                    const m = s.match(re) || [];
                    nextImgs = m;
                }
            }
            catch { }
            return { title, priceText, og: og1 || og2, imgs, nextImgs };
        });
        const stripQs = (u) => { try {
            const x = new URL(u);
            x.search = '';
            return x.toString();
        }
        catch {
            return u;
        } };
        const rawImgs = dedupe([...(data?.imgs || []), ...(data?.nextImgs || []), data?.og || '', ...collected].filter(isValidImageUrl)).map(stripQs);
        const productImgs = rawImgs.filter(u => {
            const s = u.toLowerCase();
            return /(\.jpg|\.jpeg|\.png|\.webp|\.avif|\.gif)(\?|$)/.test(s)
                && !s.includes('logo') && !s.includes('icon') && !s.includes('banner')
                && !s.includes('placeholder') && !s.includes('sprite') && !s.includes('avatar')
                && !s.includes('badge') && !s.includes('advert');
        }).slice(0, 20);
        let out = {
            title: (data?.title || '').trim() || undefined,
            price: (data?.priceText || '').trim() || undefined,
            image: productImgs[0] || undefined,
            images: productImgs.length ? productImgs : undefined
        };
        try {
            const html = await page.content();
            const $ = cheerio.load(html);
            const ld = extractJsonLdData($);
            if (ld) {
                if (!out.title && ld.name)
                    out.title = String(ld.name).trim();
                if (!out.price && ld.price)
                    out.price = String(ld.price).trim();
                const rawLdImg = ld.image;
                const addOne = (val) => {
                    const one = toFirstImageUrl(val);
                    if (!one)
                        return;
                    const norm = stripQs(one);
                    if (isValidImageUrl(norm)) {
                        const merged = dedupe([norm, ...(out.images || [])]);
                        out.image = merged[0];
                        out.images = merged;
                    }
                };
                if (Array.isArray(rawLdImg)) {
                    for (const it of rawLdImg)
                        addOne(it);
                }
                else {
                    addOne(rawLdImg);
                }
            }
            if (!out.price) {
                const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[itemprop="price"]').attr('content') || '';
                const extraSel = ['[data-testid*="price"]', '.price', '.PriceText', '[class*="price"]', '[itemprop="price"]'];
                let text = metaPrice;
                if (!text) {
                    for (const sel of extraSel) {
                        const el = $(sel).first();
                        if (el && el.text()) {
                            text = el.text().trim();
                            break;
                        }
                    }
                }
                if (text) {
                    const normalized = (() => {
                        const stripped = text.replace(/[^0-9,\.]/g, '');
                        if (!stripped)
                            return '';
                        const lastComma = stripped.lastIndexOf(',');
                        const lastDot = stripped.lastIndexOf('.');
                        const decPos = Math.max(lastComma, lastDot);
                        if (decPos === -1)
                            return stripped.replace(/\D/g, '');
                        let intPart = stripped.slice(0, decPos).replace(/\D/g, '');
                        let fracPart = stripped.slice(decPos + 1).replace(/\D/g, '');
                        if (fracPart.length > 2)
                            fracPart = fracPart.slice(-2);
                        return intPart + '.' + fracPart;
                    })();
                    if (normalized)
                        out.price = normalized;
                }
            }
            try {
                const section = $('main, [data-testid*="product"], [class*="product"], [class*="gallery"]').first();
                const imgEls = (section && section.length ? section : $('body')).find('img, source').toArray();
                const imgs2 = imgEls.map((el) => {
                    const $el = $(el);
                    const ss = ($el.attr('srcset') || '').split(',')[0]?.trim().split(' ')[0] || '';
                    return ss || $el.attr('src') || $el.attr('data-src') || '';
                }).filter(Boolean).map(stripQs).filter(isValidImageUrl).filter(u => {
                    const s = u.toLowerCase();
                    return /(\.jpg|\.jpeg|\.png|\.webp|\.avif|\.gif)(\?|$)/.test(s)
                        && !s.includes('logo') && !s.includes('icon') && !s.includes('banner')
                        && !s.includes('placeholder') && !s.includes('sprite') && !s.includes('avatar')
                        && !s.includes('badge') && !s.includes('advert');
                });
                const mergedImgs = dedupe([...(out.images || []), ...imgs2]).slice(0, 20);
                out.image = mergedImgs[0] || out.image;
                out.images = mergedImgs.length ? mergedImgs : out.images;
            }
            catch { }
        }
        catch { }
        await browser.close();
        return out;
    }
    catch (e) {
        try {
            console.warn('Puppeteer scrape failed:', e);
        }
        catch { }
        return null;
    }
}
async function scrapeProductData(url) {
    try {
        const baseHeaders = buildRequestHeaders(url);
        try {
            const host = new URL(url).hostname.toLowerCase();
            const enabled = String(process.env.HEADLESS_SCRAPER_ENABLED || '0').toLowerCase();
            const allow = enabled === '1' || enabled === 'true' || enabled === 'yes' || enabled === 'on';
            if (allow && allowHeadlessHost(host)) {
                console.log('Headless (early) invoked for', url);
                const engine = String(process.env.HEADLESS_SCRAPER_ENGINE || 'auto').toLowerCase();
                let extra = null;
                if (engine === 'playwright' || engine === 'auto') {
                    extra = await tryPlaywrightScrape(url);
                }
                if ((!extra || ((!extra.image && !extra.images?.length) && !extra.title && !extra.price)) && (engine === 'puppeteer' || engine === 'auto')) {
                    extra = await tryPuppeteerScrape(url);
                }
                if (extra && (extra.image || (extra.images && extra.images.length))) {
                    const imgs = dedupe([...(extra.images || []), extra.image || ''].filter(isValidImageUrl)).slice(0, 20);
                    const image = imgs[0] || undefined;
                    const priceNorm = (() => {
                        const t = String(extra.price || '').trim();
                        if (!t)
                            return '';
                        const m = t.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
                        if (!m)
                            return t;
                        const s = m[0];
                        const lastComma = s.lastIndexOf(',');
                        const lastDot = s.lastIndexOf('.');
                        const decPos = Math.max(lastComma, lastDot);
                        if (decPos === -1)
                            return s.replace(/\D/g, '');
                        let intPart = s.slice(0, decPos).replace(/\D/g, '');
                        let fracPart = s.slice(decPos + 1).replace(/\D/g, '');
                        if (fracPart.length > 2)
                            fracPart = fracPart.slice(0, 2);
                        return intPart + '.' + fracPart;
                    })();
                    return {
                        title: (extra.title || 'Product'),
                        price: (priceNorm || (extra.price || 'Prijs onbekend')),
                        brand: extra.brand || undefined,
                        currency: extra.currency || undefined,
                        image,
                        images: imgs.length ? imgs : undefined,
                        description: undefined,
                        url
                    };
                }
            }
        }
        catch { }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            let response = await fetch(url, { headers: baseHeaders, signal: controller.signal, redirect: 'follow' });
            clearTimeout(timeoutId);
            let textBody = await response.text();
            const cfMitigated = (response.headers.get('cf-mitigated') || '').toLowerCase();
            const serverHdr = (response.headers.get('server') || '').toLowerCase();
            const isCF = serverHdr.includes('cloudflare');
            const isCFChallenge = /<title>\s*just a moment/i.test(textBody) || /cf-browser-verification|managed_challenge/i.test(textBody) || cfMitigated.includes('challenge');
            if (!response.ok || /Access Denied|akamai/i.test(textBody) || (isCF && isCFChallenge)) {
                try {
                    console.warn('Fetch failed', { url, status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers), body: (textBody || '').slice(0, 1000) });
                }
                catch { }
                try {
                    const cookie = await primeSession(url);
                    if (cookie) {
                        const retryHeaders = { ...baseHeaders, Cookie: cookie };
                        response = await fetch(url, { headers: retryHeaders, redirect: 'follow' });
                        textBody = await response.text();
                    }
                }
                catch { }
                const server2 = (response.headers.get('server') || '').toLowerCase();
                const isCF2 = server2.includes('cloudflare');
                const cf2 = (response.headers.get('cf-mitigated') || '').toLowerCase();
                const isCFChallenge2 = /<title>\s*just a moment/i.test(textBody) || /cf-browser-verification|managed_challenge/i.test(textBody) || cf2.includes('challenge');
                if (!response.ok || /Access Denied|akamai/i.test(textBody) || (isCF2 && isCFChallenge2)) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            const html = textBody;
            const $ = cheerio.load(html);
            const platformSelectors = getPlatformSelectors(url);
            let title = '';
            let brand = '';
            let currency = '';
            let description = '';
            for (const selector of platformSelectors.title) {
                const element = $(selector).first();
                if (element.length && element.text().trim()) {
                    title = element.text().trim();
                    break;
                }
            }
            let price = '';
            for (const selector of platformSelectors.price) {
                const element = $(selector).first();
                if (!element || element.length === 0)
                    continue;
                const contentAttr = (element.attr('content') || element.attr('data-price') || '').trim();
                const txt = (element.text() || '').trim();
                const val = contentAttr || txt;
                if (val) {
                    price = val;
                    break;
                }
            }
            try {
                const host = new URL(url).hostname.toLowerCase();
                const hasDecimal = /\d[\.,]\d{2}/.test(price);
                if (!price || !hasDecimal) {
                    if (host.includes('bonprix')) {
                        const intPart = $('.price-tag .integer-place').first().text().trim();
                        const decPart = $('.price-tag .decimal-place').first().text().trim();
                        if (intPart && decPart)
                            price = `${intPart}.${decPart}`;
                    }
                    if ((!price || !/\d/.test(price)) && host.includes('jdsports')) {
                        const el = $('[data-e2e="product-price"]').first();
                        const contentAttr = (el.attr('content') || '').trim();
                        const txt = (el.text() || '').trim();
                        const val = contentAttr || txt;
                        if (val)
                            price = val;
                    }
                    if (!price) {
                        const genInt = $('.integer-place').first().text().trim();
                        const genDec = $('.decimal-place').first().text().trim();
                        if (genInt && genDec)
                            price = `${genInt}.${genDec}`;
                    }
                }
            }
            catch { }
            let image = '';
            let images = [];
            const pushImg = (src) => {
                if (images.length >= 20)
                    return;
                const raw = toFirstImageUrl(src);
                if (!raw)
                    return;
                try {
                    let resolved = resolveImageUrl(raw, url);
                    try {
                        const u = new URL(resolved);
                        u.search = '';
                        resolved = u.toString();
                    }
                    catch { }
                    if (isValidImageUrl(resolved) && resolved !== '[object Object]')
                        images.push(resolved);
                }
                catch { }
            };
            for (const selector of platformSelectors.image) {
                const list = $(selector);
                if (list && list.length) {
                    list.each((_, el) => {
                        const $el = $(el);
                        try {
                            const content = ($el.attr('content') || '').trim();
                            if (content)
                                pushImg(content);
                            const href = ($el.attr('href') || '').trim();
                            if (href)
                                pushImg(href);
                        }
                        catch { }
                        const srcset = $el.attr('srcset') || $el.attr('data-srcset');
                        if (srcset) {
                            const first = srcset.split(',')[0]?.trim().split(' ')[0];
                            pushImg(first);
                        }
                        pushImg($el.attr('src'));
                        pushImg($el.attr('data-src'));
                        pushImg($el.attr('data-lazy-src'));
                        pushImg($el.attr('data-large_image'));
                        pushImg($el.attr('data-zoom-image'));
                        if (images.length >= 20)
                            return false;
                        return true;
                    });
                }
                if (images.length >= 20 && title && price)
                    break;
            }
            $('picture source').each((_, el) => {
                const $el = $(el);
                const s = $el.attr('srcset') || $el.attr('data-srcset');
                if (s) {
                    const first = s.split(',')[0]?.trim().split(' ')[0];
                    pushImg(first);
                }
                if (images.length >= 20 && title && price)
                    return false;
                return true;
            });
            $('.woocommerce-product-gallery__wrapper a[href], .woocommerce-product-gallery__image a[href]').each((_, el) => {
                const href = $(el).attr('href');
                pushImg(href);
                if (images.length >= 20 && title && price)
                    return false;
                return true;
            });
            $('noscript').each((_, el) => {
                const inner = $(el).html() || '';
                if (!inner)
                    return;
                try {
                    const $$ = cheerio.load(inner);
                    $$('img').each((__, imgEl) => {
                        const $i = $$(imgEl);
                        pushImg($i.attr('src'));
                        pushImg($i.attr('data-src'));
                        const ss = $i.attr('srcset') || $i.attr('data-srcset');
                        if (ss) {
                            const first = ss.split(',')[0]?.trim().split(' ')[0];
                            pushImg(first);
                        }
                        if (images.length >= 20)
                            return false;
                        return true;
                    });
                }
                catch { }
                if (images.length >= 20 && title && price)
                    return false;
                return true;
            });
            try {
                const jsonLdData = extractJsonLdData($);
                if (jsonLdData) {
                    title = title || jsonLdData.name || '';
                    price = price || jsonLdData.price || '';
                    const jdImg = jsonLdData.image;
                    if (Array.isArray(jdImg)) {
                        for (const s of jdImg)
                            pushImg(s);
                    }
                    else if (jdImg) {
                        pushImg(jdImg);
                    }
                    description = jsonLdData.description || description;
                }
            }
            catch { }
            try {
                const xo = extractXooonData($, html, url);
                if (xo) {
                    if (!price && xo.price)
                        price = String(xo.price);
                    if (Array.isArray(xo.images)) {
                        for (const s of xo.images)
                            pushImg(s);
                    }
                }
            }
            catch { }
            if ((!title || !price || images.length === 0)) {
                const nextData = extractNextData($);
                if (nextData) {
                    title = title || nextData.name || '';
                    price = price || nextData.price || '';
                    const ndImg = nextData.image;
                    if (Array.isArray(ndImg)) {
                        for (const s of ndImg)
                            pushImg(s);
                    }
                    else if (ndImg) {
                        pushImg(ndImg);
                    }
                    description = nextData.description || description;
                }
            }
            if (title && price && images.length >= 20) {
                images = dedupe(images.filter(isValidImageUrl)).slice(0, 20);
                if (!image && images.length)
                    image = images[0];
                const normalizePrice = (t) => {
                    const s0 = String(t || '');
                    const s = s0.replace(/\s+/g, '').replace(/([.,])-\b/g, '$100');
                    const m = s.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
                    if (!m)
                        return '';
                    const p = m[0];
                    const lastComma = p.lastIndexOf(',');
                    const lastDot = p.lastIndexOf('.');
                    const decPos = Math.max(lastComma, lastDot);
                    if (decPos === -1)
                        return p.replace(/\D/g, '');
                    let intPart = p.slice(0, decPos).replace(/\D/g, '');
                    let fracPart = p.slice(decPos + 1).replace(/\D/g, '');
                    if (fracPart.length > 2)
                        fracPart = fracPart.slice(0, 2);
                    return intPart + '.' + fracPart;
                };
                const p = normalizePrice(price) || price;
                title = title.replace(/\s+/g, ' ').trim();
                return {
                    title: title || 'Product',
                    price: p || 'Prijs onbekend',
                    brand: brand || undefined,
                    currency: currency || undefined,
                    image: image || (images[0] || undefined),
                    images: images.length ? images : undefined,
                    description: description || undefined,
                    url
                };
            }
            if (!title || !price || images.length === 0) {
                const hyd = reactHydrationExtractorHtml($, html, url);
                if (hyd) {
                    if (!title && hyd.title)
                        title = hyd.title;
                    const hydPriceStr = hyd.price != null ? String(hyd.price) : '';
                    if (!price && hydPriceStr)
                        price = hydPriceStr;
                    if (!brand && hyd.brand)
                        brand = hyd.brand;
                    if (!currency && hyd.currency)
                        currency = hyd.currency;
                    if (Array.isArray(hyd.images)) {
                        for (const s of hyd.images)
                            pushImg(s);
                    }
                }
            }
            try {
                const host = new URL(url).hostname.toLowerCase();
                const needHeadless = (!image && images.length === 0) || !title || !price;
                const enabled = String(process.env.HEADLESS_SCRAPER_ENABLED || '0').toLowerCase();
                const allow = enabled === '1' || enabled === 'true' || enabled === 'yes' || enabled === 'on';
                if (allow && allowHeadlessHost(host) && needHeadless) {
                    const engine = String(process.env.HEADLESS_SCRAPER_ENGINE || 'auto').toLowerCase();
                    let extra = null;
                    if (engine === 'playwright' || engine === 'auto') {
                        extra = await tryPlaywrightScrape(url);
                    }
                    if ((!extra || ((!extra.image && !extra.images?.length) && !extra.title && !extra.price)) && (engine === 'puppeteer' || engine === 'auto')) {
                        extra = await tryPuppeteerScrape(url);
                    }
                    if (extra) {
                        if (!title && extra.title)
                            title = extra.title;
                        if (!price && extra.price)
                            price = extra.price;
                        const add = (arr) => { if (Array.isArray(arr))
                            for (const s of arr)
                                pushImg(s); };
                        if (!image && extra.image)
                            pushImg(extra.image);
                        add(extra.images);
                    }
                }
            }
            catch (_e) { }
            if (!description)
                description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
            images = dedupe(images.filter(isValidImageUrl)).slice(0, 20);
            if (!image && images.length)
                image = images[0];
            title = title.replace(/\s+/g, ' ').trim();
            const normalizePrice = (t) => {
                const s0 = String(t || '');
                const s = s0.replace(/\s+/g, '').replace(/([.,])-\b/g, '$100');
                const m = s.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
                if (!m)
                    return '';
                const p = m[0];
                const lastComma = p.lastIndexOf(',');
                const lastDot = p.lastIndexOf('.');
                const decPos = Math.max(lastComma, lastDot);
                if (decPos === -1)
                    return p.replace(/\D/g, '');
                let intPart = p.slice(0, decPos).replace(/\D/g, '');
                let fracPart = p.slice(decPos + 1).replace(/\D/g, '');
                if (fracPart.length > 2)
                    fracPart = fracPart.slice(0, 2);
                return intPart + '.' + fracPart;
            };
            const normalizedPrice = normalizePrice(price);
            price = (normalizedPrice || price.replace(/\s+/g, ' ').trim());
            console.log(`Scraped data from ${url}:`, { title, price, image, images: images.length });
            return {
                title: title || 'Product',
                price: price || 'Prijs onbekend',
                brand: brand || undefined,
                currency: currency || undefined,
                image: image || undefined,
                images: images && images.length ? images : undefined,
                description: description || undefined,
                url
            };
        }
        catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }
    }
    catch (error) {
        console.error('Scraping error:', error);
        try {
            const host = new URL(url).hostname.toLowerCase();
            const enabled = String(process.env.HEADLESS_SCRAPER_ENABLED || '0').toLowerCase();
            const allow = enabled === '1' || enabled === 'true' || enabled === 'yes' || enabled === 'on';
            if (allow || allowHeadlessHost(host)) {
                console.log('Headless (post-error) invoked for', url);
                const engine = String(process.env.HEADLESS_SCRAPER_ENGINE || 'auto').toLowerCase();
                let extra = null;
                if (engine === 'playwright' || engine === 'auto') {
                    extra = await tryPlaywrightScrape(url);
                }
                if ((!extra || ((!extra.image && !extra.images?.length) && !extra.title && !extra.price)) && (engine === 'puppeteer' || engine === 'auto')) {
                    extra = await tryPuppeteerScrape(url);
                }
                if (extra && (extra.image || (extra.images && extra.images.length))) {
                    const imgs = dedupe([...(extra.images || []), extra.image || ''].filter(isValidImageUrl)).slice(0, 20);
                    const image = imgs[0] || undefined;
                    const priceNorm = (() => {
                        const t = String(extra.price || '').trim();
                        if (!t)
                            return '';
                        const m = t.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
                        if (!m)
                            return t;
                        const s = m[0];
                        const lastComma = s.lastIndexOf(',');
                        const lastDot = s.lastIndexOf('.');
                        const decPos = Math.max(lastComma, lastDot);
                        if (decPos === -1)
                            return s.replace(/\D/g, '');
                        let intPart = s.slice(0, decPos).replace(/\D/g, '');
                        let fracPart = s.slice(decPos + 1).replace(/\D/g, '');
                        if (fracPart.length > 2)
                            fracPart = fracPart.slice(0, 2);
                        return intPart + '.' + fracPart;
                    })();
                    return {
                        title: (extra.title || 'Product'),
                        price: (priceNorm || (extra.price || 'Prijs onbekend')),
                        image,
                        images: imgs.length ? imgs : undefined,
                        description: undefined,
                        url
                    };
                }
            }
        }
        catch { }
        return {
            title: 'Product',
            price: 'Prijs onbekend',
            image: undefined,
            images: undefined,
            description: undefined,
            url
        };
    }
}
function validateUrl(url) {
    try {
        const validUrl = new URL(url);
        if (!['http:', 'https:'].includes(validUrl.protocol)) {
            return { isValid: false, error: 'Invalid protocol' };
        }
        return { isValid: true };
    }
    catch {
        return { isValid: false, error: 'Invalid URL format' };
    }
}
//# sourceMappingURL=widgetScraper.js.map