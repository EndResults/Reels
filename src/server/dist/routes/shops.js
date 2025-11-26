"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../lib/supabase");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
});
async function getRetailerIdFromAuth(req, res) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ success: false, message: 'No token provided' });
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const { data: authUser, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUser.user) {
            res.status(401).json({ success: false, message: 'Invalid token' });
            return null;
        }
        let retailerIdToUse = null;
        {
            const { data: retailerById } = await supabase_1.supabaseAdmin
                .from('retailers')
                .select('id, is_active')
                .eq('id', userId)
                .eq('is_active', true)
                .single();
            if (retailerById && retailerById.id)
                retailerIdToUse = retailerById.id;
        }
        if (!retailerIdToUse) {
            const email = authUser.user.email;
            if (email) {
                const { data: retailerByEmail } = await supabase_1.supabaseAdmin
                    .from('retailers')
                    .select('id, is_active')
                    .eq('email', email)
                    .eq('is_active', true)
                    .single();
                if (retailerByEmail && retailerByEmail.id)
                    retailerIdToUse = retailerByEmail.id;
            }
        }
        if (!retailerIdToUse) {
            res.status(403).json({ success: false, message: 'Retailer not found or inactive' });
            return null;
        }
        return retailerIdToUse;
    }
    catch (err) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return null;
    }
}
async function resolveMaxShops(retailerId) {
    try {
        const { data: sub } = await supabase_1.supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('retailer_id', retailerId)
            .single();
        if (sub && typeof sub.max_shops === 'number')
            return sub.max_shops;
        const { data: retailer } = await supabase_1.supabaseAdmin
            .from('retailers')
            .select('plan_type')
            .eq('id', retailerId)
            .single();
        const plan = retailer?.plan_type;
        if (plan === 'BASIC')
            return 2;
        if (plan === 'PREMIUM')
            return 10;
        if (plan === 'ENTERPRISE')
            return 999999;
        return 1;
    }
    catch {
        return 1;
    }
}
router.get('/', async (req, res) => {
    try {
        const retailerId = await getRetailerIdFromAuth(req, res);
        if (!retailerId)
            return;
        const { data: shops, error } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, name, category, url, domain, language, logo_url, is_active, api_key, branding_hide_logo, promo_enabled, promo_start_date, promo_end_date, widget_color_gradient_from, widget_color_gradient_to, widget_color_shadow, widget_color_button_bg, widget_color_button_border, widget_color_tile_text, widget_color_tile_border, widget_button_color_from, widget_button_color_to, widget_button_label_color, widget_button_icon, widget_button_labels, created_at, updated_at')
            .eq('retailer_id', retailerId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        if (!shops || shops.length === 0) {
            try {
                const { data: r } = await supabase_1.supabaseAdmin
                    .from('retailers')
                    .select('shop_name, shop_type, shop_url')
                    .eq('id', retailerId)
                    .single();
                if (r) {
                    const supported = ['FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS'];
                    const category = supported.includes(r.shop_type) ? r.shop_type : 'FASHION';
                    let domainVal = null;
                    try {
                        const d = r.shop_url;
                        if (d) {
                            const urlObj = new URL(/^https?:\/\//i.test(d) ? d : `https://${d}`);
                            const host = urlObj.hostname.replace(/^www\./i, '').toLowerCase();
                            domainVal = `https://${host}`;
                        }
                    }
                    catch { }
                    const apiKey = crypto_1.default.randomBytes(32).toString('hex');
                    const urlVal = r.shop_url || null;
                    let { data: defaultShop, error: dErr } = await supabase_1.supabaseAdmin
                        .from('shops')
                        .insert({
                        retailer_id: retailerId,
                        name: r.shop_name || 'Webshop',
                        category,
                        ...(domainVal ? { domain: domainVal } : {}),
                        ...(urlVal ? { url: urlVal } : {}),
                        is_active: true,
                        api_key: apiKey
                    })
                        .select()
                        .single();
                    if (dErr && (dErr?.code === '42703' || /column\s+"?(domain|url)"?/i.test(dErr?.message || ''))) {
                        const retryPayload = {
                            retailer_id: retailerId,
                            name: r.shop_name || 'Webshop',
                            category,
                            is_active: true,
                            api_key: apiKey
                        };
                        const retry = await supabase_1.supabaseAdmin
                            .from('shops')
                            .insert(retryPayload)
                            .select()
                            .single();
                        defaultShop = retry.data;
                        dErr = retry.error;
                    }
                    if (defaultShop) {
                        res.json({ success: true, data: [defaultShop] });
                        return;
                    }
                }
            }
            catch { }
        }
        res.json({ success: true, data: shops || [] });
    }
    catch (error) {
        console.error('List shops error:', error);
        res.status(500).json({ success: false, message: 'Failed to list shops' });
    }
});
router.get('/public', async (_req, res) => {
    try {
        const { data: shops, error } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, name, category, url, language, logo_url, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true });
        if (error)
            throw error;
        res.json({ success: true, data: shops || [] });
    }
    catch (error) {
        console.error('List public shops error:', error);
        res.status(500).json({ success: false, message: 'Failed to list shops' });
    }
});
router.post('/', async (req, res) => {
    try {
        const retailerId = await getRetailerIdFromAuth(req, res);
        if (!retailerId)
            return;
        const schema = joi_1.default.object({
            name: joi_1.default.string().min(2).max(100).required(),
            category: joi_1.default.string().valid('FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS').required(),
            url: joi_1.default.string().uri().required(),
            domain: joi_1.default.string().uri().optional(),
            isActive: joi_1.default.boolean().default(true),
            language: joi_1.default.string().valid('nl', 'en').default('nl'),
            brandingHideLogo: joi_1.default.boolean().optional(),
            promoEnabled: joi_1.default.boolean().optional(),
            promoStartDate: joi_1.default.alternatives().try(joi_1.default.date().iso(), joi_1.default.string()).optional().allow(null),
            promoEndDate: joi_1.default.alternatives().try(joi_1.default.date().iso(), joi_1.default.string()).optional().allow(null),
            widgetColorGradientFrom: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorGradientTo: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorShadow: joi_1.default.string().max(64).optional().allow(null),
            widgetColorButtonBg: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorButtonBorder: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorTileText: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorTileBorder: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetButtonColorFrom: joi_1.default.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
            widgetButtonColorTo: joi_1.default.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
            widgetButtonLabelColor: joi_1.default.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
            widgetButtonIcon: joi_1.default.string().valid('white', 'color').optional().allow(null),
            widgetButtonLabels: joi_1.default.object({ nl: joi_1.default.string().max(20).allow('', null), en: joi_1.default.string().max(20).allow('', null) }).optional().allow(null)
        });
        const { error: vErr, value } = schema.validate(req.body);
        if (vErr) {
            res.status(400).json({ success: false, message: vErr.details[0].message });
            return;
        }
        const maxShops = await resolveMaxShops(retailerId);
        const { count } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id', { count: 'exact', head: true })
            .eq('retailer_id', retailerId);
        if (typeof count === 'number' && count >= maxShops) {
            res.status(403).json({ success: false, message: 'Shop limiet bereikt voor huidig abonnement' });
            return;
        }
        const apiKey = crypto_1.default.randomBytes(32).toString('hex');
        const rawDomainInput = value.domain || value.url;
        let domainNormalized = null;
        try {
            if (rawDomainInput) {
                const withScheme = /^https?:\/\//i.test(rawDomainInput) ? rawDomainInput : `https://${rawDomainInput}`;
                const parsed = new URL(withScheme);
                const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
                domainNormalized = `https://${host}`;
            }
        }
        catch { }
        const basePayload = {
            retailer_id: retailerId,
            name: value.name,
            category: value.category,
            url: value.url,
            ...(domainNormalized ? { domain: domainNormalized } : {}),
            language: value.language || 'nl',
            is_active: !!value.isActive,
            api_key: apiKey
        };
        if (typeof value.brandingHideLogo === 'boolean')
            basePayload.branding_hide_logo = !!value.brandingHideLogo;
        if (typeof value.promoEnabled === 'boolean')
            basePayload.promo_enabled = !!value.promoEnabled;
        if (value.promoStartDate != null) {
            const d = new Date(value.promoStartDate);
            basePayload.promo_start_date = isNaN(d.getTime()) ? null : d.toISOString();
        }
        if (value.promoEndDate != null) {
            const d = new Date(value.promoEndDate);
            basePayload.promo_end_date = isNaN(d.getTime()) ? null : d.toISOString();
        }
        let planIsEnterprise = false;
        try {
            const { data: sub } = await supabase_1.supabaseAdmin
                .from('subscriptions')
                .select('plan_type, status')
                .eq('retailer_id', retailerId)
                .eq('status', 'ACTIVE')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            const plan = (sub && sub.plan_type ? String(sub.plan_type).toUpperCase() : 'FREEMIUM');
            planIsEnterprise = plan === 'ENTERPRISE';
        }
        catch { }
        const hasAnyWidgetColors = (value.widgetColorGradientFrom != null ||
            value.widgetColorGradientTo != null ||
            value.widgetColorShadow != null ||
            value.widgetColorButtonBg != null ||
            value.widgetColorButtonBorder != null ||
            value.widgetColorTileText != null ||
            value.widgetColorTileBorder != null);
        if (hasAnyWidgetColors) {
            if (!planIsEnterprise) {
                res.status(403).json({ success: false, message: 'Kleurcustomization is alleen beschikbaar voor Enterprise' });
                return;
            }
            if (value.widgetColorGradientFrom !== undefined)
                basePayload.widget_color_gradient_from = value.widgetColorGradientFrom;
            if (value.widgetColorGradientTo !== undefined)
                basePayload.widget_color_gradient_to = value.widgetColorGradientTo;
            if (value.widgetColorShadow !== undefined)
                basePayload.widget_color_shadow = value.widgetColorShadow;
            if (value.widgetColorButtonBg !== undefined)
                basePayload.widget_color_button_bg = value.widgetColorButtonBg;
            if (value.widgetColorButtonBorder !== undefined)
                basePayload.widget_color_button_border = value.widgetColorButtonBorder;
            if (value.widgetColorTileText !== undefined)
                basePayload.widget_color_tile_text = value.widgetColorTileText;
            if (value.widgetColorTileBorder !== undefined)
                basePayload.widget_color_tile_border = value.widgetColorTileBorder;
        }
        const hasAnyWidgetButton = (value.widgetButtonColorFrom != null ||
            value.widgetButtonColorTo != null ||
            value.widgetButtonLabelColor != null ||
            value.widgetButtonIcon != null ||
            value.widgetButtonLabels != null);
        if (hasAnyWidgetButton) {
            if (!planIsEnterprise) {
                res.status(403).json({ success: false, message: 'Knopcustomization is alleen beschikbaar voor Enterprise' });
                return;
            }
            if (value.widgetButtonColorFrom !== undefined)
                basePayload.widget_button_color_from = value.widgetButtonColorFrom;
            if (value.widgetButtonColorTo !== undefined)
                basePayload.widget_button_color_to = value.widgetButtonColorTo;
            if (value.widgetButtonLabelColor !== undefined)
                basePayload.widget_button_label_color = value.widgetButtonLabelColor;
            if (value.widgetButtonIcon !== undefined)
                basePayload.widget_button_icon = value.widgetButtonIcon;
            if (value.widgetButtonLabels !== undefined)
                basePayload.widget_button_labels = value.widgetButtonLabels;
        }
        let { data: shop, error } = await supabase_1.supabaseAdmin
            .from('shops')
            .insert(basePayload)
            .select()
            .single();
        if (error && (error?.code === '42703' || /column\s+"?(domain|url)"?/i.test(error?.message || ''))) {
            const retryPayload = { ...basePayload };
            delete retryPayload.domain;
            delete retryPayload.url;
            const retry = await supabase_1.supabaseAdmin
                .from('shops')
                .insert(retryPayload)
                .select()
                .single();
            shop = retry.data;
            error = retry.error;
        }
        if (error)
            throw error;
        res.status(201).json({ success: true, data: shop });
    }
    catch (error) {
        console.error('Create shop error:', error);
        res.status(500).json({ success: false, message: 'Failed to create shop' });
    }
});
router.put('/:shopId', async (req, res) => {
    try {
        const retailerId = await getRetailerIdFromAuth(req, res);
        if (!retailerId)
            return;
        const schema = joi_1.default.object({
            name: joi_1.default.string().min(2).max(100).optional(),
            category: joi_1.default.string().valid('FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS').optional(),
            url: joi_1.default.string().uri().optional(),
            domain: joi_1.default.string().uri().optional(),
            isActive: joi_1.default.boolean().optional(),
            language: joi_1.default.string().valid('nl', 'en').optional(),
            brandingHideLogo: joi_1.default.boolean().optional(),
            promoEnabled: joi_1.default.boolean().optional(),
            promoStartDate: joi_1.default.alternatives().try(joi_1.default.date().iso(), joi_1.default.string()).optional().allow(null),
            promoEndDate: joi_1.default.alternatives().try(joi_1.default.date().iso(), joi_1.default.string()).optional().allow(null),
            widgetColorGradientFrom: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorGradientTo: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorShadow: joi_1.default.string().max(64).optional().allow(null),
            widgetColorButtonBg: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorButtonBorder: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorTileText: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetColorTileBorder: joi_1.default.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
            widgetButtonColorFrom: joi_1.default.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
            widgetButtonColorTo: joi_1.default.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
            widgetButtonLabelColor: joi_1.default.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
            widgetButtonIcon: joi_1.default.string().valid('white', 'color').optional().allow(null),
            widgetButtonLabels: joi_1.default.object({ nl: joi_1.default.string().max(20).allow('', null), en: joi_1.default.string().max(20).allow('', null) }).optional().allow(null)
        });
        const { error: vErr, value } = schema.validate(req.body);
        if (vErr) {
            res.status(400).json({ success: false, message: vErr.details[0].message });
            return;
        }
        const shopId = req.params.shopId;
        const { data: shop, error: sErr } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, retailer_id')
            .eq('id', shopId)
            .single();
        if (sErr || !shop || shop.retailer_id !== retailerId) {
            res.status(404).json({ success: false, message: 'Shop niet gevonden' });
            return;
        }
        const updates = {};
        if (value.name !== undefined)
            updates.name = value.name;
        if (value.category !== undefined)
            updates.category = value.category;
        if (value.url !== undefined)
            updates.url = value.url;
        if (value.domain !== undefined) {
            let domainNormalized = null;
            try {
                const raw = value.domain || value.url;
                if (raw) {
                    const withScheme = /^https?:\/\//i.test(String(raw)) ? String(raw) : `https://${String(raw)}`;
                    const parsed = new URL(withScheme);
                    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
                    domainNormalized = `https://${host}`;
                }
            }
            catch { }
            if (domainNormalized)
                updates.domain = domainNormalized;
        }
        if (value.isActive !== undefined)
            updates.is_active = !!value.isActive;
        if (value.language !== undefined)
            updates.language = value.language;
        if (typeof value.brandingHideLogo === 'boolean')
            updates.branding_hide_logo = !!value.brandingHideLogo;
        if (typeof value.promoEnabled === 'boolean')
            updates.promo_enabled = !!value.promoEnabled;
        if (value.promoStartDate !== undefined) {
            if (value.promoStartDate === null)
                updates.promo_start_date = null;
            else {
                const d = new Date(value.promoStartDate);
                updates.promo_start_date = isNaN(d.getTime()) ? null : d.toISOString();
            }
        }
        if (value.promoEndDate !== undefined) {
            if (value.promoEndDate === null)
                updates.promo_end_date = null;
            else {
                const d = new Date(value.promoEndDate);
                updates.promo_end_date = isNaN(d.getTime()) ? null : d.toISOString();
            }
        }
        updates.updated_at = new Date().toISOString();
        const updatingAnyWidgetColors = (value.widgetColorGradientFrom !== undefined ||
            value.widgetColorGradientTo !== undefined ||
            value.widgetColorShadow !== undefined ||
            value.widgetColorButtonBg !== undefined ||
            value.widgetColorButtonBorder !== undefined ||
            value.widgetColorTileText !== undefined ||
            value.widgetColorTileBorder !== undefined);
        if (updatingAnyWidgetColors) {
            let isEnterprise = false;
            try {
                const { data: sub } = await supabase_1.supabaseAdmin
                    .from('subscriptions')
                    .select('plan_type, status')
                    .eq('retailer_id', retailerId)
                    .eq('status', 'ACTIVE')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                const plan = (sub && sub.plan_type ? String(sub.plan_type).toUpperCase() : 'FREEMIUM');
                isEnterprise = plan === 'ENTERPRISE';
            }
            catch { }
            if (!isEnterprise) {
                res.status(403).json({ success: false, message: 'Kleurcustomization is alleen beschikbaar voor Enterprise' });
                return;
            }
            if (value.widgetColorGradientFrom !== undefined)
                updates.widget_color_gradient_from = value.widgetColorGradientFrom;
            if (value.widgetColorGradientTo !== undefined)
                updates.widget_color_gradient_to = value.widgetColorGradientTo;
            if (value.widgetColorShadow !== undefined)
                updates.widget_color_shadow = value.widgetColorShadow;
            if (value.widgetColorButtonBg !== undefined)
                updates.widget_color_button_bg = value.widgetColorButtonBg;
            if (value.widgetColorButtonBorder !== undefined)
                updates.widget_color_button_border = value.widgetColorButtonBorder;
            if (value.widgetColorTileText !== undefined)
                updates.widget_color_tile_text = value.widgetColorTileText;
            if (value.widgetColorTileBorder !== undefined)
                updates.widget_color_tile_border = value.widgetColorTileBorder;
        }
        const updatingAnyWidgetButton = (value.widgetButtonColorFrom !== undefined ||
            value.widgetButtonColorTo !== undefined ||
            value.widgetButtonLabelColor !== undefined ||
            value.widgetButtonIcon !== undefined ||
            value.widgetButtonLabels !== undefined);
        if (updatingAnyWidgetButton) {
            let isEnterpriseBtn = false;
            try {
                const { data: sub } = await supabase_1.supabaseAdmin
                    .from('subscriptions')
                    .select('plan_type, status')
                    .eq('retailer_id', retailerId)
                    .eq('status', 'ACTIVE')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                const plan = (sub && sub.plan_type ? String(sub.plan_type).toUpperCase() : 'FREEMIUM');
                isEnterpriseBtn = plan === 'ENTERPRISE';
            }
            catch { }
            if (!isEnterpriseBtn) {
                res.status(403).json({ success: false, message: 'Knopcustomization is alleen beschikbaar voor Enterprise' });
                return;
            }
            if (value.widgetButtonColorFrom !== undefined)
                updates.widget_button_color_from = value.widgetButtonColorFrom;
            if (value.widgetButtonColorTo !== undefined)
                updates.widget_button_color_to = value.widgetButtonColorTo;
            if (value.widgetButtonLabelColor !== undefined)
                updates.widget_button_label_color = value.widgetButtonLabelColor;
            if (value.widgetButtonIcon !== undefined)
                updates.widget_button_icon = value.widgetButtonIcon;
            if (value.widgetButtonLabels !== undefined)
                updates.widget_button_labels = value.widgetButtonLabels;
        }
        if (updates.branding_hide_logo === true) {
            try {
                const { data: sub } = await supabase_1.supabaseAdmin
                    .from('subscriptions')
                    .select('plan_type, status')
                    .eq('retailer_id', retailerId)
                    .eq('status', 'ACTIVE')
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                const plan = (sub && sub.plan_type ? String(sub.plan_type).toUpperCase() : 'FREEMIUM');
                const allowed = plan === 'PREMIUM' || plan === 'ENTERPRISE';
                if (!allowed) {
                    res.status(403).json({ success: false, message: 'Branding verbergen is alleen beschikbaar voor Premium/Enterprise' });
                    return;
                }
            }
            catch {
                res.status(403).json({ success: false, message: 'Kan abonnement niet verifiëren voor branding optie' });
                return;
            }
        }
        const { data: updated, error } = await supabase_1.supabaseAdmin
            .from('shops')
            .update(updates)
            .eq('id', shopId)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Update shop error:', error);
        res.status(500).json({ success: false, message: 'Failed to update shop' });
    }
});
router.post('/:shopId/rotate-key', async (req, res) => {
    try {
        const retailerId = await getRetailerIdFromAuth(req, res);
        if (!retailerId)
            return;
        const shopId = req.params.shopId;
        const { data: shop, error: sErr } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, retailer_id')
            .eq('id', shopId)
            .single();
        if (sErr || !shop || shop.retailer_id !== retailerId) {
            res.status(404).json({ success: false, message: 'Shop niet gevonden' });
            return;
        }
        const apiKey = crypto_1.default.randomBytes(32).toString('hex');
        const { data: updated, error } = await supabase_1.supabaseAdmin
            .from('shops')
            .update({ api_key: apiKey, updated_at: new Date().toISOString() })
            .eq('id', shopId)
            .select('id, api_key')
            .single();
        if (error)
            throw error;
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Rotate shop api key error:', error);
        res.status(500).json({ success: false, message: 'Failed to rotate API key' });
    }
});
router.delete('/:shopId', async (req, res) => {
    try {
        const retailerId = await getRetailerIdFromAuth(req, res);
        if (!retailerId)
            return;
        const shopId = req.params.shopId;
        const { data: shop, error: sErr } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, retailer_id')
            .eq('id', shopId)
            .single();
        if (sErr || !shop || shop.retailer_id !== retailerId) {
            res.status(404).json({ success: false, message: 'Shop niet gevonden' });
            return;
        }
        const { error } = await supabase_1.supabaseAdmin
            .from('shops')
            .delete()
            .eq('id', shopId);
        if (error)
            throw error;
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete shop error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete shop' });
    }
});
exports.default = router;
router.post('/:shopId/logo', upload.single('logo'), async (req, res) => {
    try {
        const retailerId = await getRetailerIdFromAuth(req, res);
        if (!retailerId)
            return;
        const shopId = req.params.shopId;
        const { data: shop, error: sErr } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, retailer_id')
            .eq('id', shopId)
            .single();
        if (sErr || !shop || shop.retailer_id !== retailerId) {
            res.status(404).json({ success: false, message: 'Shop niet gevonden' });
            return;
        }
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, message: 'Geen bestand geüpload' });
            return;
        }
        const allowed = ['image/png', 'image/svg+xml'];
        if (!allowed.includes(file.mimetype)) {
            res.status(400).json({ success: false, message: 'Alleen PNG of SVG toegestaan' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            res.status(400).json({ success: false, message: 'Bestand mag niet groter zijn dan 2MB' });
            return;
        }
        const ext = path_1.default.extname(file.originalname).toLowerCase() || (file.mimetype === 'image/svg+xml' ? '.svg' : '.png');
        const fileName = `brandLogo_${shopId}${ext}`;
        const { error: upErr } = await supabase_1.supabaseAdmin.storage
            .from('shop_logos')
            .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
        if (upErr) {
            res.status(500).json({ success: false, message: `Upload mislukt: ${upErr.message}` });
            return;
        }
        const { data: urlData } = supabase_1.supabaseAdmin.storage
            .from('shop_logos')
            .getPublicUrl(fileName);
        const logoUrl = urlData.publicUrl;
        const { error: updErr } = await supabase_1.supabaseAdmin
            .from('shops')
            .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
            .eq('id', shopId);
        if (updErr)
            throw updErr;
        res.json({ success: true, url: logoUrl, fileName });
    }
    catch (error) {
        console.error('Upload shop logo error:', error);
        res.status(500).json({ success: false, message: 'Upload mislukt' });
    }
});
//# sourceMappingURL=shops.js.map