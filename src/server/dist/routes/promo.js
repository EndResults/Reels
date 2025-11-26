"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const router = express_1.default.Router();
router.get('/promo-check/:retailerId', async (req, res) => {
    try {
        const { retailerId } = req.params;
        console.log('🔍 Promo check voor retailer:', retailerId);
        const { data: retailer, error } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('promo_enabled, promo_start_date, promo_end_date')
            .eq('id', retailerId)
            .single();
        if (error || !retailer) {
            console.log('❌ Retailer niet gevonden voor promo check:', retailerId);
            res.json({ enabled: false });
            return;
        }
        if (!retailer.promo_enabled) {
            console.log('❌ Promo uitgeschakeld voor retailer:', retailerId);
            res.json({ enabled: false });
            return;
        }
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
    }
    catch (error) {
        console.error('💥 Fout bij promo check:', error);
        res.json({ enabled: false });
        return;
    }
});
router.get('/promo-check/shop/:shopId', async (req, res) => {
    try {
        const { shopId } = req.params;
        console.log('🔍 Promo check voor shop:', shopId);
        const { data: shop, error } = await supabase_1.supabaseAdmin
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
    }
    catch (error) {
        console.error('💥 Fout bij promo check (shop):', error);
        res.json({ enabled: false });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=promo.js.map