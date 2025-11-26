import { supabaseAdmin } from '../lib/supabase';
import type { ExtractResult } from './adaptiveScraper';

export async function logScrape(res: ExtractResult, loadTime: number, statusCode?: number) {
  try {
    const priceFound = typeof res.price === 'number' && isFinite(res.price) && res.price > 0;
    const notes = Array.isArray(res.notes) ? res.notes : [];
    const aiAttempted = notes.some(n => /^(ai_on_error|ai_forced)/i.test(String(n)));
    await supabaseAdmin.from('scrape_results').insert({
      url: res.url,
      source: res.source,
      confidence: res.confidence,
      load_time_ms: Math.round(loadTime),
      success: res.confidence >= 0.5,
      images_count: Array.isArray(res.images) ? res.images.length : 0,
      // Mark AI as used only when it contributed to the final result
      ai_used: res.source === 'ai',
      status_code: statusCode ?? null,
      title: res.title ?? null,
      price_found: priceFound,
      notes,
    });
  } catch (e) {
    try { console.warn('[scrapeLogger] insert failed', e); } catch {}
  }
}
