"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShopCategoryKey = getShopCategoryKey;
exports.getShopOverrideSettings = getShopOverrideSettings;
exports.getCategorySettingsByKey = getCategorySettingsByKey;
exports.getEffectiveCategoryConfig = getEffectiveCategoryConfig;
exports.localizeLabel = localizeLabel;
exports.localizeSettings = localizeSettings;
exports.getPhotoOrderForStyle = getPhotoOrderForStyle;
exports.getDefaultStyleId = getDefaultStyleId;
const supabase_1 = require("./supabase");
async function getShopCategoryKey(shopId) {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('category')
            .eq('id', shopId)
            .maybeSingle();
        if (error)
            return null;
        const key = (data?.category || 'FASHION').toString().trim().toUpperCase();
        return key || 'FASHION';
    }
    catch {
        return 'FASHION';
    }
}
async function getShopOverrideSettings(shopId) {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('shop_category_overrides')
            .select('settings')
            .eq('shop_id', shopId)
            .maybeSingle();
        if (error)
            return null;
        return (data?.settings || null);
    }
    catch {
        return null;
    }
}
async function getCategorySettingsByKey(key) {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('category_settings')
            .select('settings')
            .eq('key', key)
            .maybeSingle();
        if (error)
            return null;
        return (data?.settings || null);
    }
    catch {
        return null;
    }
}
async function getEffectiveCategoryConfig(params) {
    const fallbackKey = 'FASHION';
    const shopId = params.shopId;
    let key = (params.categoryKey || '').trim().toUpperCase();
    try {
        if (shopId) {
            const override = await getShopOverrideSettings(shopId);
            if (override) {
                const k = await getShopCategoryKey(shopId);
                return { key: (k || fallbackKey), settings: normalizeSettings(override) };
            }
            const k = await getShopCategoryKey(shopId);
            key = k || fallbackKey;
        }
        if (!key)
            key = fallbackKey;
        const base = await getCategorySettingsByKey(key);
        if (base)
            return { key, settings: normalizeSettings(base) };
        const fb = await getCategorySettingsByKey(fallbackKey);
        return { key: fallbackKey, settings: normalizeSettings(fb || {}) };
    }
    catch {
        const fb = await getCategorySettingsByKey(fallbackKey);
        return { key: fallbackKey, settings: normalizeSettings(fb || {}) };
    }
}
function normalizeSettings(s) {
    const settings = s || {};
    settings.photoSlots = Array.isArray(settings.photoSlots) ? settings.photoSlots : [];
    settings.styles = Array.isArray(settings.styles) ? settings.styles : [];
    settings.limits = settings.limits || {};
    settings.n8n = settings.n8n || {};
    settings.n8n.defaultPhotoOrder = Array.isArray(settings.n8n.defaultPhotoOrder) ? settings.n8n.defaultPhotoOrder : [];
    settings.n8n.perStylePhotoOrder = settings.n8n.perStylePhotoOrder || {};
    settings.infoBoxHeader = settings.infoBoxHeader || {};
    settings.infoBoxBody = settings.infoBoxBody || (settings.infoBox || {});
    settings.tipBoxHeader = settings.tipBoxHeader || {};
    settings.tipBoxBody = settings.tipBoxBody || {};
    return settings;
}
function localizeLabel(lbl, lang, fallbackLang = 'nl') {
    if (!lbl)
        return '';
    if (typeof lbl === 'string')
        return lbl;
    const l = (lang || '').toLowerCase();
    const fb = (fallbackLang || 'nl').toLowerCase();
    return lbl[l] || lbl[fb] || '';
}
function localizeSettings(settings, lang) {
    const out = JSON.parse(JSON.stringify(settings || {}));
    if (out.infoBox) {
        out.infoBox = localizeLabel(out.infoBox, lang);
    }
    if (out.infoBoxHeader) {
        out.infoBoxHeader = localizeLabel(out.infoBoxHeader, lang);
    }
    if (out.infoBoxBody) {
        out.infoBoxBody = localizeLabel(out.infoBoxBody, lang);
    }
    if (out.tipBoxHeader) {
        out.tipBoxHeader = localizeLabel(out.tipBoxHeader, lang);
    }
    if (out.tipBoxBody) {
        out.tipBoxBody = localizeLabel(out.tipBoxBody, lang);
    }
    if (Array.isArray(out.photoSlots)) {
        out.photoSlots = out.photoSlots.map((slot) => ({
            ...slot,
            label: localizeLabel(slot?.label, lang)
        }));
    }
    if (Array.isArray(out.styles)) {
        out.styles = out.styles.map((st) => ({
            ...st,
            label: localizeLabel(st?.label, lang),
            info: localizeLabel(st?.info, lang)
        }));
    }
    return out;
}
function getPhotoOrderForStyle(settings, styleId) {
    const sId = styleId == null ? undefined : String(styleId);
    const per = (settings?.n8n?.perStylePhotoOrder || {});
    if (sId && Array.isArray(per[sId]) && per[sId].length)
        return per[sId];
    const def = settings?.n8n?.defaultPhotoOrder || [];
    return Array.isArray(def) ? def : [];
}
function getDefaultStyleId(settings) {
    const styles = Array.isArray(settings?.styles) ? settings.styles : [];
    if (!styles.length)
        return null;
    const first = styles[0];
    return first && first.id != null ? String(first.id) : null;
}
//# sourceMappingURL=categoryConfig.js.map