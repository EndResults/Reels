import * as cheerio from 'cheerio';
import fs from 'fs';

// Platform-specifieke selectors
function getPlatformSelectors(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Zalando specifieke selectors
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

  // Bonprix specifieke selectors
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

  // JD Sports specifieke selectors
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

  // Wehkamp specifieke selectors  
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

  // We Fashion specifieke selectors
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
  
  // Bol.com specifieke selectors
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

  // Zara specifieke selectors
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

  // H&M specifieke selectors (www2.hm.com)
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

  // TopShoe (NextChapter) specifieke selectors
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

  // Algemene selectors als fallback
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

// Hosts that often require headless browser to render product details
function allowHeadlessHost(hostname: string): boolean {
  try {
    const h = hostname.toLowerCase();
    return ['zalando', 'mytheresa', 'farfetch', 'debijenkorf', 'nike', 'hm.com', 'iqueens', 'zara', 'c-and-a.com', 'c-and-a', 'seabirr', 'shopify', 'myshopify', 'vanarendonk']
      .some(d => h.includes(d));
  } catch { return false; }
}

function extractXooonData($: any, html: string, baseUrl: string): { price?: string; images?: string[] } | null {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    if (!host.includes('xooon')) return null;
    const images: string[] = [];
    let price: string | undefined;
    const push = (u?: string) => {
      const s = typeof u === 'string' ? u.trim() : '';
      if (!s) return;
      try {
        const x = new URL(s, baseUrl);
        x.search = '';
        const v = x.toString();
        if (isValidImageUrl(v)) images.push(v);
      } catch {
        if (isValidImageUrl(s)) images.push(s);
      }
    };
    const scripts = $('script').toArray().map((el: any) => String($(el).html() || ''));
    for (const txt of scripts) {
      if (!txt) continue;
      const m1 = txt.match(/var\s+jsonVariation\s*=\s*(\{[\s\S]*?\});/i);
      if (m1 && m1[1]) {
        try {
          const obj = JSON.parse(m1[1]);
          if (!price) price = String(obj.price || obj.priceAmount || '');
          const lists = [obj.productFullSizeAssetList, obj.productAssetList, obj.productThumbnailAssetList];
          for (const arr of lists) {
            if (Array.isArray(arr)) {
              for (const it of arr) push((it && (it.href || it.src || it.url)) || '');
            }
          }
        } catch {
          try {
            const reImg = /https?:\/\/[^"'\s>]+cloudinary[^"'\s>]+\.(?:jpg|jpeg|png|webp)(?:\?[^"'\s>]*)?/ig;
            const found = m1[1].match(reImg) || [];
            for (const u of found) push(u);
            const pm = m1[1].match(/"price"\s*:\s*"([^"]+)"|"priceAmount"\s*:\s*(\d+(?:\.\d+)?)/i);
            if (pm) price = pm[1] || pm[2] || price;
          } catch {}
        }
      }
      const m2 = txt.match(/var\s+pdpViewItem\s*=\s*(\{[\s\S]*?\});/i);
      if (m2 && m2[1]) {
        try {
          const obj2 = JSON.parse(m2[1]);
          if (!price) {
            const p = obj2?.value ?? obj2?.items?.[0]?.price;
            if (p != null) price = String(p);
          }
        } catch {}
      }
      if (images.length >= 20 && price) break;
    }
    const uniq = dedupe(images);
    if (uniq.length || price) return { price, images: uniq.slice(0, 20) };
  } catch {}
  return null;
}
// Extract JSON-LD structured data
function extractJsonLdData($: any) {
  try {
    const scripts = $('script[type="application/ld+json"]');
    
    for (let i = 0; i < scripts.length; i++) {
      try {
        const jsonContent = $(scripts[i]).html();
        if (!jsonContent) continue;
        
        const data = JSON.parse(jsonContent);

        // Helper to deeply search for a Product node in JSON-LD
        const asArray = (x: any) => Array.isArray(x) ? x : [x];
        const visit = (node: any): any | null => {
          if (!node || typeof node !== 'object') return null;
          // Item is a Product
          const types = asArray((node['@type'] || node.type || '')).map((t: any) => String(t));
          if (types.includes('Product')) {
            return {
              name: node.name,
              price: node.offers?.price || node.price || node.offers?.[0]?.price,
              image: node.image,
              description: node.description
            };
          }
          // Recurse common containers
          const containers = [
            node['@graph'], node.graph, node.itemListElement, node.mainEntity,
            node.offers, node.brand, node.isRelatedTo, node.about
          ];
          for (const c of containers) {
            const arr = asArray(c).filter(Boolean);
            for (const it of arr) {
              const found = visit(it);
              if (found) return found;
            }
          }
          return null;
        };

        const rootItems = asArray(data);
        for (const root of rootItems) {
          const found = visit(root);
          if (found) return found;
        }
      } catch (e) {
        continue;
      }
    }
  } catch (error) {
    console.error('Error extracting JSON-LD:', error);
  }
  
  return null;
}

// Extract from Next.js data blobs (__NEXT_DATA__ or other application/json scripts)
function extractNextData($: any) {
  try {
    const candidates = [
      '#__NEXT_DATA__',
      'script[id="__NEXT_DATA__"][type="application/json"]',
      'script[type="application/json"]'
    ];
    const asArray = (x: any) => Array.isArray(x) ? x : [x];
    const tryParse = (txt?: string) => {
      if (!txt) return null;
      try { return JSON.parse(txt); } catch { return null; }
    };
    const visit = (node: any): any | null => {
      if (!node || typeof node !== 'object') return null;
      // Detect product-like objects
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
        const val = (node as any)[key];
        const arr = asArray(val).filter((v: any) => typeof v === 'object');
        for (const it of arr) {
          const found = visit(it);
          if (found) return found;
        }
      }
      return null;
    };

    for (const sel of candidates) {
      const el = $(sel).first();
      if (!el || el.length === 0) continue;
      const jsonText = el.attr('type') === 'application/json' ? el.html() : el.text();
      const data = tryParse(jsonText || '');
      if (!data) continue;
      const found = visit(data);
      if (found) return found;
    }
  } catch {}
  return null;
}

// Detect React/Next.js hydration found in inline scripts (server-side HTML)
function pageHasPreloadedStateHtml(html: string): boolean {
  try {
    return /__(PRELOADED_STATE|INITIAL_STATE)__\s*=\s*\{/.test(html);
  } catch { return false; }
}

// Generic hydration extractor for MyTheresa/Farfetch/Nike/Bijenkorf-like stores
function reactHydrationExtractorHtml($: any, html: string, baseUrl: string): { brand?: string; title?: string; price?: number; currency?: string; images?: string[] } | null {
  try {
    let stateData: any = null;
    // Look in all <script> tags for __PRELOADED_STATE__ or __INITIAL_STATE__
    const scripts = $('script').toArray();
    for (const el of scripts) {
      const txt = $(el).html() || '';
      if (!txt) continue;
      const m = txt.match(/(__PRELOADED_STATE__|__INITIAL_STATE__)\s*=\s*(\{[\s\S]*?\});/);
      if (m && m[2]) {
        try { stateData = JSON.parse(m[2]); break; } catch {}
      }
    }
    if (stateData) {
      const product = stateData?.product || stateData?.pageData?.product || stateData?.data?.product;
      if (product) {
        const toUrl = (v: any): string => {
          if (!v) return '';
          if (typeof v === 'string') return v;
          if (Array.isArray(v)) return (v.map(toUrl).find(Boolean) || '');
          if (typeof v === 'object') return (v.url || v.src || v.contentUrl || v['@id'] || '').toString();
          return '';
        };
        const imgsRaw = Array.isArray(product.images) ? product.images.map(toUrl) : [toUrl(product.images)];
        const uniqImgs = Array.from(new Set((imgsRaw.filter(Boolean) as string[]))) as string[];
        const imgs = uniqImgs.slice(0, 20).map((u) => {
          try { const x = new URL(u as string, baseUrl); x.search = ''; return x.toString(); } catch { return String(u); }
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
    // Second attempt: generic application/json scripts containing price and image
    try {
      const jsonScripts = $('script[type="application/json"]').toArray();
      for (const el of jsonScripts) {
        const raw = $(el).html() || '';
        if (!raw) continue;
        if (raw.includes('"price"') && raw.includes('"image"')) {
          try {
            const data = JSON.parse(raw);
            const images: string[] = (data.images || []).map((i: any) => (i?.url || i)).filter(Boolean);
            const imgs = Array.from(new Set(images)).slice(0, 20).map((u: string) => {
              try { const x = new URL(u, baseUrl); x.search=''; return x.toString(); } catch { return u; }
            });
            const priceNum = Number(data.price?.value ?? data.offers?.price ?? NaN);
            return {
              brand: data.brand?.name || data.brand,
              title: data.name,
              price: Number.isFinite(priceNum) ? priceNum : undefined,
              currency: data.price?.currency || data.offers?.priceCurrency,
              images: imgs
            };
          } catch {}
        }
      }
    } catch {}
    // Fallback DOM analysis
    const title = ($('h1').first().text() || '').trim();
    const brand = ($('a[data-testid*="brand"], [itemprop=\"brand\"]').first().text() || '').trim();
    const priceText = ($('[data-testid*="price"], .price, [itemprop=\"price\"]').first().text() || '').trim();
    const priceNum = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
    const imgs2 = $('img').toArray().map((el: any) => {
      const $el = $(el);
      return $el.attr('src') || '';
    }).filter((src: string) => /\/media\/|\/products\//.test(src)).filter((src: string) => /\.(jpg|jpeg|png|webp|avif)$/i.test(src) && !/icon|logo|banner/i.test(src));
    const uniqImgs2 = Array.from(new Set(imgs2)) as string[];
    const imgs = uniqImgs2.slice(0, 20).map((u) => { try { const x = new URL(u as string, baseUrl); x.search=''; return x.toString(); } catch { return String(u); } });
    return { brand, title, price: Number.isFinite(priceNum) ? priceNum : undefined, currency: 'EUR', images: imgs };
  } catch { return null; }
}

// Resolve relative image URLs
function resolveImageUrl(src: string, baseUrl: string): string {
  if (src.startsWith('//')) {
    return 'https:' + src;
  } else if (src.startsWith('/')) {
    const urlObj = new URL(baseUrl);
    return urlObj.origin + src;
  } else if (src.startsWith('http')) {
    return src;
  } else {
    const urlObj = new URL(baseUrl);
    return urlObj.origin + '/' + src;
  }
}

// Normalize various JSON-LD image shapes to a single URL string when possible
// Accepts: string | { url|contentUrl|src } | Array<...>
function toFirstImageUrl(img: any): string | null {
  try {
    if (!img) return null;
    if (typeof img === 'string') {
      const s = String(img).trim();
      if (!s || s === '[object Object]') return null;
      return s;
    }
    if (Array.isArray(img)) {
      for (const it of img) {
        const u = toFirstImageUrl(it);
        if (u) return u;
      }
      return null;
    }
    if (typeof img === 'object') {
      const candidate = (img.url || img.contentUrl || img.src || img['@id'] || '').toString().trim();
      if (candidate && candidate !== '[object Object]') return candidate;
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

// Simple dedupe helper for URLs
function dedupe(arr: string[]): string[] {
  const out: string[] = [];
  const seen: Record<string, 1> = {} as any;
  for (const raw of arr) {
    const s = String(raw || '').trim();
    if (!s) continue;
    if (!seen[s]) { seen[s] = 1 as any; out.push(s); }
  }
  return out;
}

// Filter invalid/placeholder image URLs
function isValidImageUrl(u?: string): boolean {
  if (!u) return false;
  const s = String(u).trim();
  if (!s) return false;
  // Ignore data: images, trackers, and common non-product assets
  if (s.startsWith('data:') || s.includes('data:image')) return false;
  if (/facebook\.com\/tr\b|connect\.facebook\.net|google-analytics|googletagmanager|doubleclick\.net|fbevents\.js|\/gtag\/js/i.test(s)) return false;
  if (/placeholder|spacer|blank\.gif|1x1\.png|svg\+xml|\b(icon|logo|sprite|banner|thumb|generic|avatar|badge|advert)\b/i.test(s)) return false;
  // Basic extension or query heuristics
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(s)) return true;
  // Some CDNs omit extensions but still valid
  if (/\bimages\b|\/image\/|cdn|media|asset|img/i.test(s)) return true;
  return false;
}

// Simple sleep helper usable across Playwright and Puppeteer code paths
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Build realistic request headers (avoid Sec-Fetch-* which can look suspicious in server context)
function buildRequestHeaders(url: string): Record<string, string> {
  const origin = (() => { try { return new URL(url).origin + '/'; } catch { return 'https://www.google.com/'; } })();
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

// Extract cookie header string from a fetch Response
function extractCookieString(resp: any): string {
  try {
    const h: any = resp && resp.headers;
    const arr: string[] = h?.getSetCookie ? (h.getSetCookie() as string[]) : (h?.get('set-cookie') ? [String(h.get('set-cookie'))] : []);
    const pairs: string[] = [];
    for (const c of arr) {
      const p = String(c || '').split(';')[0];
      if (p) pairs.push(p.trim());
    }
    return pairs.join('; ');
  } catch { return ''; }
}

// Prime a basic session cookie by hitting the origin first (helps with Akamai/anti-bot on some sites)
async function primeSession(url: string): Promise<string> {
  try {
    const origin = new URL(url).origin + '/';
    const resp = await fetch(origin, { headers: buildRequestHeaders(url), redirect: 'follow' as any });
    return extractCookieString(resp);
  } catch { return ''; }
}

// Interface for scraped product data
export interface ScrapedProductData {
  title?: string;
  price?: string;
  brand?: string;
  currency?: string;
  image?: string;
  images?: string[];
  description?: string;
  url: string;
}

// --- Headless browser fallbacks (Playwright first, then Puppeteer) ---
async function tryPlaywrightScrape(url: string): Promise<Partial<ScrapedProductData> | null> {
  try {
    // Dynamic import to avoid hard dependency at compile time (prefer playwright-extra + stealth)
    let chromiumLib: any = null;
    try {
      const pe: any = await import('playwright-extra');
      try {
        const stealthMod: any = await import('puppeteer-extra-plugin-stealth');
        const stealth = (stealthMod && (stealthMod.default || stealthMod)) as any;
        if (stealth && typeof stealth === 'function') pe.chromium.use(stealth());
      } catch {}
      chromiumLib = pe.chromium;
    } catch {
      const pw: any = await import('playwright');
      chromiumLib = pw.chromium;
    }
    try {
      fs.mkdirSync('/tmp/playwright_chromiumdev_profile', { recursive: true });
      fs.chmodSync('/tmp/playwright_chromiumdev_profile', 0o777);
    } catch {}
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
    if (proxy) argsList.push(`--proxy-server=${proxy}`);
    const launchOpts: any = { headless: true, args: argsList };
    if (proxy) {
      launchOpts.proxy = { server: proxy };
      if (proxyUser && proxyPass) launchOpts.proxy = { server: proxy, username: proxyUser, password: proxyPass };
    }
    const browser = await chromiumLib.launch(launchOpts);
    try { console.log('Chromium launched successfully (Playwright headless)'); } catch {}
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
    // Reduce network noise: block heavy resources (images/media/fonts). We only need HTML/JSON/meta to extract URLs.
    try {
      await context.route('**/*', (route: any) => {
        try {
          const type = route.request().resourceType();
          if (type === 'image' || type === 'media' || type === 'font') {
            return route.abort();
          }
        } catch {}
        return route.continue();
      });
    } catch {}
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
      } as any);
    } catch {}
    // Minimal stealth for Playwright
    try {
      await page.addInitScript(() => {
        try {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          // @ts-ignore
          (window as any).chrome = { runtime: {} };
          try { Object.defineProperty(navigator, 'languages', { get: () => ['nl-NL','nl','en-US','en'] }); } catch {}
          try { Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3] as any }); } catch {}
        } catch {}
      });
    } catch {}
    await page.setViewportSize({ width: 1366, height: 900 });
    const collected: string[] = [];
    try {
      await page.setRequestInterception(true);
      page.on('request', (req: any) => {
        try {
          const type = req.resourceType();
          if (type === 'image' || type === 'media' || type === 'font') return req.abort();
        } catch {}
        return req.continue();
      });
    } catch {}
    page.on('response', async (resp: any) => {
      try {
        // Log failing responses for diagnostics
        try {
          const st = typeof resp.status === 'function' ? resp.status() : 0;
          if (st >= 400) {
            const body = await resp.text().catch(() => '');
            try { console.warn('Playwright failed resp', { url: resp.url(), status: st, headers: resp.headers(), body: (body || '').slice(0, 1000) }); } catch {}
            if (st === 403) saw403 = true;
          }
        } catch {}
        const ct = (resp.headers()?.['content-type'] || resp.headers()?.['Content-Type'] || '').toString();
        const u = resp.url();
        if (ct.startsWith('image/')) {
          if (isValidImageUrl(u)) collected.push(u);
        } else {
          const rt = resp.request()?.resourceType?.() || '';
          if (rt === 'xhr' || rt === 'fetch') {
            const text = await resp.text().catch(() => '');
            const m = (text || '').match(/https?:\/\/[^"'\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s>]*)?/ig);
            if (m) {
              for (const x of m) { if (collected.length >= 40) break; if (isValidImageUrl(x)) collected.push(x); }
            }
            // Try structured JSON parse for media arrays
            try {
              const isJson = (ct.includes('application/json') || (/^\s*[\[{]/.test(text)));
              if (isJson) {
                const obj = JSON.parse(text);
                const visit = (node: any) => {
                  try {
                    if (!node) return;
                    if (typeof node === 'string') { if (isValidImageUrl(node)) collected.push(node); return; }
                    if (Array.isArray(node)) { for (const it of node) visit(it); return; }
                    if (typeof node === 'object') {
                      const direct = (node.url || node.src || node.contentUrl);
                      if (typeof direct === 'string' && isValidImageUrl(direct)) collected.push(direct);
                      const keys = ['image','images','media','gallery','variants','resources','assets','sources','pictures','thumbnails'];
                      for (const k of keys) if (k in node) visit((node as any)[k]);
                      for (const k of Object.keys(node)) { const v = (node as any)[k]; if (v && typeof v === 'object') visit(v); }
                    }
                  } catch {}
                };
                visit(obj);
              }
            } catch {}
          }
        }
      } catch {}
    });
    // Pre-navigate to origin to reduce bot challenges, accept cookies, then go to product
    try {
      const origin = new URL(url).origin + '/';
      await page.goto(origin, { waitUntil: 'networkidle', timeout: 45000 });
      try {
        const cookieSel = 'button[data-testid="uc-accept-all-button"], #uc-btn-accept-banner, #onetrust-accept-btn-handler';
        const el = await page.$(cookieSel);
        if (el) { await el.click().catch(() => {}); await sleep(300); }
      } catch {}
    } catch {}
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    try {
      await page.waitForFunction(() => {
        try { return !/just a moment/i.test(document.title || ''); } catch { return true; }
      }, { timeout: 10000 });
    } catch {}
    try { if (saw403) console.error('Playwright failed, triggering Gemini fallback'); } catch {}
    // Accept cookie banners if present (Usercentrics / OneTrust variants)
    try {
      const cookieSel = 'button[data-testid="uc-accept-all-button"], #uc-btn-accept-banner, #onetrust-accept-btn-handler';
      const el = await page.$(cookieSel);
      if (el) { await el.click().catch(() => {}); await sleep(300); }
    } catch {}
    // Wait for key elements and trigger lazy-loading by scrolling
    try { await page.waitForSelector('[data-testid="product-detail-price"], meta[property="og:image"]', { timeout: 15000 }); } catch {}
    for (let i = 0; i < 4; i++) {
      try { await page.mouse.wheel(0, 1000); await sleep(200); } catch {}
    }
    await sleep(800);
    const data = await page.evaluate(() => {
      const pick = (sel: string) => {
        const el = document.querySelector(sel) as HTMLMetaElement | HTMLElement | null;
        if (!el) return '';
        if ((el as HTMLMetaElement).content != null) return ((el as HTMLMetaElement).content || '').trim();
        return (el.textContent || '').trim();
      };
      const title = pick('[data-testid="product-detail-name"], h1');
      const priceText = pick('[data-testid="product-detail-price"], [class*="Price"], .price');
      const og1 = (document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null)?.content || '';
      const og2 = (document.querySelector('meta[property="og:image:secure_url"]') as HTMLMetaElement | null)?.content || '';
      const imgs = Array.from(document.images || []).map(i => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src).filter(Boolean);
      // Try Next.js data
      let nextImgs: string[] = [];
      try {
        const el = document.querySelector('#__NEXT_DATA__');
        if (el && el.textContent) {
          const json = JSON.parse(el.textContent);
          const s = JSON.stringify(json);
          const re = /https?:\/\/[^"'\\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\\s>]*)?/ig;
const m = s.match(re) || [];
nextImgs = m as any;
        }
      } catch {}
      return { title, priceText, og: og1 || og2, imgs, nextImgs };
    });
    const stripQs = (u: string) => { try { const x = new URL(u); x.search = ''; return x.toString(); } catch { return u; } };
    const rawImgs = dedupe([...(data?.imgs || []), ...(data?.nextImgs || []), data?.og || '', ...collected].filter(isValidImageUrl)).map(stripQs);
    const productImgs = rawImgs.filter(u => {
      const s = u.toLowerCase();
      return /(\.jpg|\.jpeg|\.png|\.webp|\.avif|\.gif)(\?|$)/.test(s)
        && !s.includes('logo') && !s.includes('icon') && !s.includes('banner')
        && !s.includes('placeholder') && !s.includes('sprite') && !s.includes('avatar')
        && !s.includes('badge') && !s.includes('advert');
    }).slice(0, 20);
    let out: Partial<ScrapedProductData> = {
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
        if (!out.title && (ld as any).name) out.title = String((ld as any).name).trim();
        if (!out.price && (ld as any).price) out.price = String((ld as any).price).trim();
        const rawLdImg: any = (ld as any).image;
        const addOne = (val?: any) => {
          const one = toFirstImageUrl(val);
          if (!one) return;
          const norm = stripQs(one);
          if (isValidImageUrl(norm)) {
            const merged = dedupe([norm, ...(out.images || [])]);
            out.image = merged[0];
            out.images = merged;
          }
        };
        if (Array.isArray(rawLdImg)) { for (const it of rawLdImg) addOne(it); }
        else { addOne(rawLdImg); }
      }
      if (!out.price) {
        const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[itemprop="price"]').attr('content') || '';
        const extraSel = ['[data-testid*="price"]', '.price', '.PriceText', '[class*="price"]', '[itemprop="price"]'];
        let text = metaPrice;
        if (!text) {
          for (const sel of extraSel) {
            const el = $(sel).first();
            if (el && el.text()) { text = el.text().trim(); break; }
          }
        }
        if (text) {
          const normalized = (() => {
            const stripped = text.replace(/[^0-9,\.]/g, '');
            if (!stripped) return '';
            const lastComma = stripped.lastIndexOf(',');
            const lastDot = stripped.lastIndexOf('.');
            const decPos = Math.max(lastComma, lastDot);
            if (decPos === -1) return stripped.replace(/\D/g, '');
            let intPart = stripped.slice(0, decPos).replace(/\D/g, '');
            let fracPart = stripped.slice(decPos + 1).replace(/\D/g, '');
            if (fracPart.length > 2) fracPart = fracPart.slice(-2);
            return intPart + '.' + fracPart;
          })();
          if (normalized) out.price = normalized;
        }
      }
      try {
        const section = $('main, [data-testid*="product"], [class*="product"], [class*="gallery"]').first();
        const imgEls = (section && section.length ? section : $('body')).find('img, source').toArray();
        const imgs2 = imgEls.map((el: any) => {
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
      } catch {}
    } catch {}
    await browser.close();
    return out;
  } catch (e) {
    try { console.warn('Playwright scrape failed:', e); } catch {}
    return null;
  }
}

async function tryPuppeteerScrape(url: string): Promise<Partial<ScrapedProductData> | null> {
  try {
    const puppeteer: any = await import('puppeteer');
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    try {
      const referer = (() => { try { const u = new URL(url); return u.origin + '/'; } catch { return 'https://www.zalando.nl/'; } })();
      await page.setExtraHTTPHeaders({ referer: referer, 'accept-language': 'nl-NL,n;q=0.9,en;q=0.8' });
    } catch {}
    await page.setViewport({ width: 1366, height: 900 });
    await page.evaluateOnNewDocument(() => {
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // @ts-ignore
        (window as any).chrome = { runtime: {} };
        try { Object.defineProperty(navigator, 'languages', { get: () => ['nl-NL','nl','en-US','en'] }); } catch {}
        try { Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3] as any }); } catch {}
      } catch {}
    });
    const collected: string[] = [];
    page.on('response', async (resp: any) => {
      try {
        // Log failing responses for diagnostics
        try {
          const st = typeof resp.status === 'function' ? resp.status() : 0;
          if (st >= 400) {
            const body = await resp.text().catch(() => '');
            try { console.warn('Puppeteer failed resp', { url: resp.url(), status: st, headers: resp.headers(), body: (body || '').slice(0, 1000) }); } catch {}
          }
        } catch {}
        const ct = (resp.headers()?.['content-type'] || resp.headers()?.['Content-Type'] || '').toString();
        const u = resp.url();
        if (ct.startsWith('image/')) {
          if (isValidImageUrl(u)) collected.push(u);
        } else {
          const req = resp.request?.();
          const rt = req && typeof req.resourceType === 'function' ? req.resourceType() : '';
          if (rt === 'xhr' || rt === 'fetch') {
            const text = await resp.text().catch(() => '');
            const m = (text || '').match(/https?:\/\/[^"'\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\s>]*)?/ig);
            if (m) {
              for (const x of m) if (isValidImageUrl(x)) collected.push(x);
            }
            // Try structured JSON parse for media arrays
            try {
              const isJson = (ct.includes('application/json') || (/^\s*[\[{]/.test(text)));
              if (isJson) {
                const obj = JSON.parse(text);
                const visit = (node: any) => {
                  try {
                    if (!node) return;
                    if (typeof node === 'string') { if (isValidImageUrl(node)) collected.push(node); return; }
                    if (Array.isArray(node)) { for (const it of node) visit(it); return; }
                    if (typeof node === 'object') {
                      const direct = (node.url || node.src || node.contentUrl);
                      if (typeof direct === 'string' && isValidImageUrl(direct)) collected.push(direct);
                      const keys = ['image','images','media','gallery','variants','resources','assets','sources','pictures','thumbnails'];
                      for (const k of keys) if (k in node) visit((node as any)[k]);
                      for (const k of Object.keys(node)) { const v = (node as any)[k]; if (v && typeof v === 'object') visit(v); }
                    }
                  } catch {}
                };
                visit(obj);
              }
            } catch {}
          }
        }
      } catch {}
    });
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    // Accept cookie banners if present (Usercentrics / OneTrust variants)
    try {
      const handles = await page.$$('button[data-testid="uc-accept-all-button"], #uc-btn-accept-banner, #onetrust-accept-btn-handler');
      if (handles && handles.length) { await handles[0].click().catch(() => {}); await sleep(300); }
    } catch {}
    // Wait for key elements and trigger lazy-loading by scrolling
    try { await page.waitForSelector('[data-testid="product-detail-price"], meta[property="og:image"]', { timeout: 15000 }); } catch {}
    for (let i = 0; i < 4; i++) {
      try { await page.evaluate(() => window.scrollBy(0, window.innerHeight)); await sleep(200); } catch {}
    }
    await sleep(800);
    const data = await page.evaluate(() => {
      const pick = (sel: string) => {
        const el = document.querySelector(sel) as HTMLMetaElement | HTMLElement | null;
        if (!el) return '';
        if ((el as HTMLMetaElement).content != null) return ((el as HTMLMetaElement).content || '').trim();
        return (el.textContent || '').trim();
      };
      const title = pick('[data-testid="product-detail-name"], h1');
      const priceText = pick('[data-testid="product-detail-price"], [class*="Price"], .price');
      const og1 = (document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null)?.content || '';
      const og2 = (document.querySelector('meta[property="og:image:secure_url"]') as HTMLMetaElement | null)?.content || '';
      const imgs = Array.from(document.images || []).map(i => (i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src).filter(Boolean);
      let nextImgs: string[] = [];
      try {
        const el = document.querySelector('#__NEXT_DATA__');
        if (el && el.textContent) {
          const json = JSON.parse(el.textContent);
          const s = JSON.stringify(json);
          const re = /https?:\/\/[^"'\\s>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"'\\s>]*)?/ig;
const m = s.match(re) || [];
nextImgs = m as any;
        }
      } catch {}
      return { title, priceText, og: og1 || og2, imgs, nextImgs };
    });
    const stripQs = (u: string) => { try { const x = new URL(u); x.search = ''; return x.toString(); } catch { return u; } };
    const rawImgs = dedupe([...(data?.imgs || []), ...(data?.nextImgs || []), data?.og || '', ...collected].filter(isValidImageUrl)).map(stripQs);
    const productImgs = rawImgs.filter(u => {
      const s = u.toLowerCase();
      return /(\.jpg|\.jpeg|\.png|\.webp|\.avif|\.gif)(\?|$)/.test(s)
        && !s.includes('logo') && !s.includes('icon') && !s.includes('banner')
        && !s.includes('placeholder') && !s.includes('sprite') && !s.includes('avatar')
        && !s.includes('badge') && !s.includes('advert');
    }).slice(0, 20);
    let out: Partial<ScrapedProductData> = {
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
        if (!out.title && (ld as any).name) out.title = String((ld as any).name).trim();
        if (!out.price && (ld as any).price) out.price = String((ld as any).price).trim();
        const rawLdImg: any = (ld as any).image;
        const addOne = (val?: any) => {
          const one = toFirstImageUrl(val);
          if (!one) return;
          const norm = stripQs(one);
          if (isValidImageUrl(norm)) {
            const merged = dedupe([norm, ...(out.images || [])]);
            out.image = merged[0];
            out.images = merged;
          }
        };
        if (Array.isArray(rawLdImg)) { for (const it of rawLdImg) addOne(it); }
        else { addOne(rawLdImg); }
      }
      if (!out.price) {
        const metaPrice = $('meta[property="product:price:amount"]').attr('content') || $('meta[itemprop="price"]').attr('content') || '';
        const extraSel = ['[data-testid*="price"]', '.price', '.PriceText', '[class*="price"]', '[itemprop="price"]'];
        let text = metaPrice;
        if (!text) {
          for (const sel of extraSel) {
            const el = $(sel).first();
            if (el && el.text()) { text = el.text().trim(); break; }
          }
        }
        if (text) {
          const normalized = (() => {
            const stripped = text.replace(/[^0-9,\.]/g, '');
            if (!stripped) return '';
            const lastComma = stripped.lastIndexOf(',');
            const lastDot = stripped.lastIndexOf('.');
            const decPos = Math.max(lastComma, lastDot);
            if (decPos === -1) return stripped.replace(/\D/g, '');
            let intPart = stripped.slice(0, decPos).replace(/\D/g, '');
            let fracPart = stripped.slice(decPos + 1).replace(/\D/g, '');
            if (fracPart.length > 2) fracPart = fracPart.slice(-2);
            return intPart + '.' + fracPart;
          })();
          if (normalized) out.price = normalized;
        }
      }
      try {
        const section = $('main, [data-testid*="product"], [class*="product"], [class*="gallery"]').first();
        const imgEls = (section && section.length ? section : $('body')).find('img, source').toArray();
        const imgs2 = imgEls.map((el: any) => {
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
      } catch {}
    } catch {}
    await browser.close();
    return out;
  } catch (e) {
    try { console.warn('Puppeteer scrape failed:', e); } catch {}
    return null;
  }
}

// Main scraping function
export async function scrapeProductData(url: string): Promise<ScrapedProductData> {
  try {
    // Headers
    const baseHeaders = buildRequestHeaders(url);

    // Early headless attempt for Zalando (avoid fetch AbortError blocking fallback)
    try {
      const host = new URL(url).hostname.toLowerCase();
      const enabled = String(process.env.HEADLESS_SCRAPER_ENABLED || '0').toLowerCase();
      const allow = enabled === '1' || enabled === 'true' || enabled === 'yes' || enabled === 'on';
      if (allow && allowHeadlessHost(host)) {
        console.log('Headless (early) invoked for', url);
        const engine = String(process.env.HEADLESS_SCRAPER_ENGINE || 'auto').toLowerCase();
        let extra: Partial<ScrapedProductData> | null = null;
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
            if (!t) return '';
            const m = t.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
            if (!m) return t;
            const s = m[0];
            const lastComma = s.lastIndexOf(',');
            const lastDot = s.lastIndexOf('.');
            const decPos = Math.max(lastComma, lastDot);
            if (decPos === -1) return s.replace(/\D/g, '');
            let intPart = s.slice(0, decPos).replace(/\D/g, '');
            let fracPart = s.slice(decPos + 1).replace(/\D/g, '');
            if (fracPart.length > 2) fracPart = fracPart.slice(0, 2);
            return intPart + '.' + fracPart;
          })();
          return {
            title: (extra.title || 'Product') as string,
            price: (priceNorm || (extra.price || 'Prijs onbekend')) as string,
            brand: (extra as any).brand || undefined,
            currency: (extra as any).currency || undefined,
            image,
            images: imgs.length ? imgs : undefined,
            description: undefined,
            url
          };
        }
      }
    } catch {}

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Extended timeout for slower shops

    try {
      let response = await fetch(url, { headers: baseHeaders, signal: controller.signal, redirect: 'follow' });

      clearTimeout(timeoutId);

      let textBody = await response.text();
      const cfMitigated = (response.headers.get('cf-mitigated') || '').toLowerCase();
      const serverHdr = (response.headers.get('server') || '').toLowerCase();
      const isCF = serverHdr.includes('cloudflare');
      const isCFChallenge = /<title>\s*just a moment/i.test(textBody) || /cf-browser-verification|managed_challenge/i.test(textBody) || cfMitigated.includes('challenge');
      if (!response.ok || /Access Denied|akamai/i.test(textBody) || (isCF && isCFChallenge)) {
        try { console.warn('Fetch failed', { url, status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers as any), body: (textBody || '').slice(0, 1000) }); } catch {}
        // Try priming a session cookie and retry once
        try {
          const cookie = await primeSession(url);
          if (cookie) {
            const retryHeaders = { ...baseHeaders, Cookie: cookie } as any;
            response = await fetch(url, { headers: retryHeaders, redirect: 'follow' });
            textBody = await response.text();
          }
        } catch {}
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

      // Platform-specifieke selectors
      const platformSelectors = getPlatformSelectors(url);

      // Extract title
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

      // Extract price
      let price = '';
      for (const selector of platformSelectors.price) {
        const element = $(selector).first();
        if (!element || element.length === 0) continue;
        const contentAttr = (element.attr('content') || element.attr('data-price') || '').trim();
        const txt = (element.text() || '').trim();
        const val = contentAttr || txt;
        if (val) { price = val; break; }
      }
      // Domain-specifieke en generieke fallback voor prijzen met losse integer/decimal spans
      try {
        const host = new URL(url).hostname.toLowerCase();
        const hasDecimal = /\d[\.,]\d{2}/.test(price);
        if (!price || !hasDecimal) {
          if (host.includes('bonprix')) {
            const intPart = $('.price-tag .integer-place').first().text().trim();
            const decPart = $('.price-tag .decimal-place').first().text().trim();
            if (intPart && decPart) price = `${intPart}.${decPart}`;
          }
          if ((!price || !/\d/.test(price)) && host.includes('jdsports')) {
            const el = $('[data-e2e="product-price"]').first();
            const contentAttr = (el.attr('content') || '').trim();
            const txt = (el.text() || '').trim();
            const val = contentAttr || txt;
            if (val) price = val;
          }
          if (!price) {
            const genInt = $('.integer-place').first().text().trim();
            const genDec = $('.decimal-place').first().text().trim();
            if (genInt && genDec) price = `${genInt}.${genDec}`;
          }
        }
      } catch {}
      // Extract images (collect many) and primary image
      let image = '';
      let images: string[] = [];
      const pushImg = (src?: any) => {
        if (images.length >= 20) return;
        const raw = toFirstImageUrl(src);
        if (!raw) return;
        try {
          let resolved = resolveImageUrl(raw, url);
          // Strip querystring to normalize CDN URLs (improves dedupe and matches local saved pages)
          try {
            const u = new URL(resolved);
            u.search = '';
            resolved = u.toString();
          } catch {}
          if (isValidImageUrl(resolved) && resolved !== '[object Object]') images.push(resolved);
        } catch {}
      };
      // From platform-specific selectors
      for (const selector of platformSelectors.image) {
        const list = $(selector);
        if (list && list.length) {
          list.each((_, el) => {
            const $el = $(el as any);
            // Also capture <meta content> and <a href>
            try {
              const content = ($el.attr('content') || '').trim();
              if (content) pushImg(content);
              const href = ($el.attr('href') || '').trim();
              if (href) pushImg(href);
            } catch {}
            // For <img> or <source>
            const srcset = $el.attr('srcset') || $el.attr('data-srcset');
            if (srcset) {
              const first = srcset.split(',')[0]?.trim().split(' ')[0];
              pushImg(first);
            }
            pushImg($el.attr('src'));
            pushImg($el.attr('data-src'));
            pushImg($el.attr('data-lazy-src'));
            // WooCommerce full-size hint
            pushImg($el.attr('data-large_image'));
            pushImg($el.attr('data-zoom-image'));
            if (images.length >= 20) return false;
            return true;
          });
        }
        if (images.length >= 20 && title && price) break;
      }
      // picture > source anywhere on page
      $('picture source').each((_, el) => {
        const $el = $(el as any);
        const s = $el.attr('srcset') || $el.attr('data-srcset');
        if (s) {
          const first = s.split(',')[0]?.trim().split(' ')[0];
          pushImg(first);
        }
        if (images.length >= 20 && title && price) return false;
        return true;
      });
      // WooCommerce gallery links (full-size images)
      $('.woocommerce-product-gallery__wrapper a[href], .woocommerce-product-gallery__image a[href]').each((_, el) => {
        const href = $(el as any).attr('href');
        pushImg(href);
        if (images.length >= 20 && title && price) return false;
        return true;
      });
      // noscript fallbacks
      $('noscript').each((_, el) => {
        const inner = $(el).html() || '';
        if (!inner) return;
        try {
          const $$ = cheerio.load(inner);
          $$('img').each((__, imgEl) => {
            const $i = $$(imgEl as any);
            pushImg($i.attr('src'));
            pushImg($i.attr('data-src'));
            const ss = $i.attr('srcset') || $i.attr('data-srcset');
            if (ss) {
              const first = ss.split(',')[0]?.trim().split(' ')[0];
              pushImg(first);
            }
            if (images.length >= 20) return false;
            return true;
          });
        } catch {}
        if (images.length >= 20 && title && price) return false;
        return true;
      });
      // Structured data (JSON-LD)
      try {
        const jsonLdData = extractJsonLdData($);
        if (jsonLdData) {
          title = title || (jsonLdData as any).name || '';
          price = price || (jsonLdData as any).price || '';
          const jdImg = (jsonLdData as any).image;
          if (Array.isArray(jdImg)) { for (const s of jdImg) pushImg(s); }
          else if (jdImg) { pushImg(jdImg); }
          description = (jsonLdData as any).description || description;
        }
      } catch {}
      // XOOON-specific data in inline scripts
      try {
        const xo = extractXooonData($, html, url);
        if (xo) {
          if (!price && xo.price) price = String(xo.price);
          if (Array.isArray(xo.images)) { for (const s of xo.images) pushImg(s); }
        }
      } catch {}
      // Fallback naar Next.js data blobs (zoals Zalando)
      if ((!title || !price || images.length === 0)) {
        const nextData = extractNextData($);
        if (nextData) {
          title = title || (nextData as any).name || '';
          price = price || (nextData as any).price || '';
          const ndImg = (nextData as any).image;
          if (Array.isArray(ndImg)) { for (const s of ndImg) pushImg(s); }
          else if (ndImg) { pushImg(ndImg); }
          description = (nextData as any).description || description;
        }
      }
      // Early stop if we already have enough for UX/perf
      if (title && price && images.length >= 20) {
        images = dedupe(images.filter(isValidImageUrl)).slice(0, 20);
        if (!image && images.length) image = images[0];
        // Normalize price to standard decimal
        const normalizePrice = (t: string) => {
          const s0 = String(t || '');
          // Convert European pattern like "1.299,-" => "1.299,00"
          const s = s0.replace(/\s+/g, '').replace(/([.,])-\b/g, '$100');
          const m = s.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
          if (!m) return '';
          const p = m[0];
          const lastComma = p.lastIndexOf(',');
          const lastDot = p.lastIndexOf('.');
          const decPos = Math.max(lastComma, lastDot);
          if (decPos === -1) return p.replace(/\D/g, '');
          let intPart = p.slice(0, decPos).replace(/\D/g, '');
          let fracPart = p.slice(decPos + 1).replace(/\D/g, '');
          if (fracPart.length > 2) fracPart = fracPart.slice(0, 2);
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
      // React/Next hydration-based extractor (MyTheresa/Farfetch/Nike/Bijenkorf)
      if (!title || !price || images.length === 0) {
        const hyd = reactHydrationExtractorHtml($, html, url);
        if (hyd) {
          if (!title && hyd.title) title = hyd.title;
          const hydPriceStr = hyd.price != null ? String(hyd.price) : '';
          if (!price && hydPriceStr) price = hydPriceStr;
          if (!brand && hyd.brand) brand = hyd.brand;
          if (!currency && hyd.currency) currency = hyd.currency;
          if (Array.isArray(hyd.images)) {
            for (const s of hyd.images) pushImg(s);
          }
        }
      }

      // Headless-browser fallback voor Zalando indien nog steeds onvoldoende data
      try {
        const host = new URL(url).hostname.toLowerCase();
        const needHeadless = (!image && images.length === 0) || !title || !price;
        const enabled = String(process.env.HEADLESS_SCRAPER_ENABLED || '0').toLowerCase();
        const allow = enabled === '1' || enabled === 'true' || enabled === 'yes' || enabled === 'on';
        if (allow && allowHeadlessHost(host) && needHeadless) {
          const engine = String(process.env.HEADLESS_SCRAPER_ENGINE || 'auto').toLowerCase();
          let extra: Partial<ScrapedProductData> | null = null;
          if (engine === 'playwright' || engine === 'auto') {
            extra = await tryPlaywrightScrape(url);
          }
          if ((!extra || ((!extra.image && !extra.images?.length) && !extra.title && !extra.price)) && (engine === 'puppeteer' || engine === 'auto')) {
            extra = await tryPuppeteerScrape(url);
          }
          if (extra) {
            if (!title && extra.title) title = extra.title;
            if (!price && extra.price) price = extra.price as any;
            const add = (arr?: string[]) => { if (Array.isArray(arr)) for (const s of arr) pushImg(s); };
            if (!image && extra.image) pushImg(extra.image);
            add(extra.images);
          }
        }
      } catch (_e) {}
      // Meta description fallback
      if (!description) description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

      // Final filtering & dedupe (cap to 20 images)
      images = dedupe(images.filter(isValidImageUrl)).slice(0, 20);
      if (!image && images.length) image = images[0];

      // Clean up data and normalize price to numeric-like string
      title = title.replace(/\s+/g, ' ').trim();
      const normalizePrice = (t: string) => {
        const s0 = String(t || '');
        // Convert European pattern like "1.299,-" => "1.299,00"
        const s = s0.replace(/\s+/g, '').replace(/([.,])-\b/g, '$100');
        const m = s.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
        if (!m) return '';
        const p = m[0];
        const lastComma = p.lastIndexOf(',');
        const lastDot = p.lastIndexOf('.');
        const decPos = Math.max(lastComma, lastDot);
        if (decPos === -1) return p.replace(/\D/g, '');
        let intPart = p.slice(0, decPos).replace(/\D/g, '');
        let fracPart = p.slice(decPos + 1).replace(/\D/g, '');
        if (fracPart.length > 2) fracPart = fracPart.slice(0, 2);
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

    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('Scraping error:', error);
    // Attempt headless after error for Zalando
    try {
      const host = new URL(url).hostname.toLowerCase();
      const enabled = String(process.env.HEADLESS_SCRAPER_ENABLED || '0').toLowerCase();
      const allow = enabled === '1' || enabled === 'true' || enabled === 'yes' || enabled === 'on';
      if (allow || allowHeadlessHost(host)) {
        console.log('Headless (post-error) invoked for', url);
        const engine = String(process.env.HEADLESS_SCRAPER_ENGINE || 'auto').toLowerCase();
        let extra: Partial<ScrapedProductData> | null = null;
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
            if (!t) return '';
            const m = t.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/);
            if (!m) return t;
            const s = m[0];
            const lastComma = s.lastIndexOf(',');
            const lastDot = s.lastIndexOf('.');
            const decPos = Math.max(lastComma, lastDot);
            if (decPos === -1) return s.replace(/\D/g, '');
            let intPart = s.slice(0, decPos).replace(/\D/g, '');
            let fracPart = s.slice(decPos + 1).replace(/\D/g, '');
            if (fracPart.length > 2) fracPart = fracPart.slice(0, 2);
            return intPart + '.' + fracPart;
          })();
          return {
            title: (extra.title || 'Product') as string,
            price: (priceNorm || (extra.price || 'Prijs onbekend')) as string,
            image,
            images: imgs.length ? imgs : undefined,
            description: undefined,
            url
          };
        }
      }
    } catch {}
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

// Validate URL helper
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  try {
    const validUrl = new URL(url);
    if (!['http:', 'https:'].includes(validUrl.protocol)) {
      return { isValid: false, error: 'Invalid protocol' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
