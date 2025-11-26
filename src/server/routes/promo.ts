import express from 'express';
import { supabaseAdmin } from '../lib/supabase';

const router = express.Router();

// GET /api/widget/promo-check/:retailerId - Check if promo should show
router.get('/promo-check/:retailerId', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { retailerId } = req.params as { retailerId: string };
    
    console.log('🔍 Promo check voor retailer:', retailerId);
    
    const { data: retailer, error } = await supabaseAdmin
      .from('retailers')
      .select('promo_enabled, promo_start_date, promo_end_date')
      .eq('id', retailerId)
      .single();
    
    if (error || !retailer) {
      console.log('❌ Retailer niet gevonden voor promo check:', retailerId);
      res.json({ enabled: false });
      return;
    }
    
    // Check if promo is enabled
    if (!retailer.promo_enabled) {
      console.log('❌ Promo uitgeschakeld voor retailer:', retailerId);
      res.json({ enabled: false });
      return;
    }
    
    // Check date range if set
    const now = new Date();
    
    if (retailer.promo_start_date) {
      const startDate = new Date(retailer.promo_start_date);
      if (now < startDate) {
        console.log('❌ Promo nog niet gestart voor retailer:', retailerId, 'start:', startDate);
        res.json({ enabled: false });
        return;
      }
    }
    
    if (retailer.promo_end_date) {
      const endDate = new Date(retailer.promo_end_date);
      if (now > endDate) {
        console.log('❌ Promo verlopen voor retailer:', retailerId, 'eind:', endDate);
        res.json({ enabled: false });
        return;
      }
    }
    
    console.log('✅ Promo actief voor retailer:', retailerId);
    res.json({ enabled: true });
    return;
    
  } catch (error) {
    console.error('💥 Fout bij promo check:', error);
    res.json({ enabled: false });
    return;
  }
});

// NEW: GET /api/widget/promo-check/shop/:shopId - Check promo per shop
router.get('/promo-check/shop/:shopId', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { shopId } = req.params as { shopId: string };

    console.log('🔍 Promo check voor shop:', shopId);

    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .select('promo_enabled, promo_start_date, promo_end_date')
      .eq('id', shopId)
      .single();

    if (error || !shop) {
      console.log('❌ Shop niet gevonden voor promo check:', shopId);
      res.json({ enabled: false });
      return;
    }

    if (!shop.promo_enabled) {
      console.log('❌ Promo uitgeschakeld voor shop:', shopId);
      res.json({ enabled: false });
      return;
    }

    const now = new Date();

    if (shop.promo_start_date) {
      const startDate = new Date(shop.promo_start_date);
      if (now < startDate) {
        console.log('❌ Promo nog niet gestart voor shop:', shopId, 'start:', startDate);
        res.json({ enabled: false });
        return;
      }
    }

    if (shop.promo_end_date) {
      const endDate = new Date(shop.promo_end_date);
      if (now > endDate) {
        console.log('❌ Promo verlopen voor shop:', shopId, 'eind:', endDate);
        res.json({ enabled: false });
        return;
      }
    }

    console.log('✅ Promo actief voor shop:', shopId);
    res.json({ enabled: true });
    return;

  } catch (error) {
    console.error('💥 Fout bij promo check (shop):', error);
    res.json({ enabled: false });
    return;
  }
});

export default router;
