"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const router = express_1.default.Router();
router.get('/active', async (_req, res) => {
    try {
        let rows = [];
        try {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('category_settings')
                .select('key, status');
            if (error)
                throw error;
            rows = data || [];
        }
        catch (err) {
            if ((err && (err.code === '42703' || /column\s+"?status"?/i.test(String(err.message)))) || /column\s+status\s+does\s+not\s+exist/i.test(String(err))) {
                const { data, error } = await supabase_1.supabaseAdmin
                    .from('category_settings')
                    .select('key');
                if (error)
                    throw error;
                rows = data || [];
            }
            else {
                throw err;
            }
        }
        const active = (rows || [])
            .filter((r) => String(r?.status || 'ACTIVE').toUpperCase() !== 'INACTIVE')
            .map((r) => String(r?.key || '').toUpperCase())
            .filter(Boolean);
        res.json({ success: true, categories: active });
    }
    catch (e) {
        console.warn('[public] GET /categories/active failed, returning default known categories as fallback');
        const fallback = ['FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS'];
        res.json({ success: true, categories: fallback });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map