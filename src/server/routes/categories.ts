import express from 'express';
import { supabaseAdmin } from '../lib/supabase';

const router = express.Router();

// GET /api/categories/active - public list of active categories
router.get('/active', async (_req, res) => {
  try {
    // Try to read keys and status; if status column missing, treat all as ACTIVE
    let rows: any[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('category_settings')
        .select('key, status');
      if (error) throw error;
      rows = data || [];
    } catch (err: any) {
      if ((err && (err.code === '42703' || /column\s+"?status"?/i.test(String(err.message)))) || /column\s+status\s+does\s+not\s+exist/i.test(String(err))) {
        const { data, error } = await supabaseAdmin
          .from('category_settings')
          .select('key');
        if (error) throw error;
        rows = data || [];
      } else {
        throw err;
      }
    }

    // Filter out INACTIVE
    const active = (rows || [])
      .filter((r: any) => String(r?.status || 'ACTIVE').toUpperCase() !== 'INACTIVE')
      .map((r: any) => String(r?.key || '').toUpperCase())
      .filter(Boolean);

    res.json({ success: true, categories: active });
  } catch (e) {
    console.warn('[public] GET /categories/active failed, returning default known categories as fallback');
    // Fallback to known list to not block UI
    const fallback = ['FASHION','BIKES','SHOES','MOTORS','GLASSES','JEWELRY','WATCHES','AUTOMOTIVE','FURNITURE','BAGS'];
    res.json({ success: true, categories: fallback });
  }
});

export default router;
