"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logScrape = logScrape;
const supabase_1 = require("../lib/supabase");
async function logScrape(res, loadTime, statusCode) {
    try {
        const priceFound = typeof res.price === 'number' && isFinite(res.price) && res.price > 0;
        const notes = Array.isArray(res.notes) ? res.notes : [];
        const aiAttempted = notes.some(n => /^(ai_on_error|ai_forced)/i.test(String(n)));
        await supabase_1.supabaseAdmin.from('scrape_results').insert({
            url: res.url,
            source: res.source,
            confidence: res.confidence,
            load_time_ms: Math.round(loadTime),
            success: res.confidence >= 0.5,
            images_count: Array.isArray(res.images) ? res.images.length : 0,
            ai_used: res.source === 'ai',
            status_code: statusCode ?? null,
            title: res.title ?? null,
            price_found: priceFound,
            notes,
        });
    }
    catch (e) {
        try {
            console.warn('[scrapeLogger] insert failed', e);
        }
        catch { }
    }
}
//# sourceMappingURL=scrapeLogger.js.map