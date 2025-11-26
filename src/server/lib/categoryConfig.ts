import { supabaseAdmin } from './supabase';

export type LocalizedLabel = { nl?: string; en?: string } | string | undefined;

export interface CategorySettings {
  infoBox?: { nl?: string; en?: string };
  infoBoxHeader?: LocalizedLabel;
  infoBoxBody?: LocalizedLabel;
  tipBoxHeader?: LocalizedLabel;
  tipBoxBody?: LocalizedLabel;
  photoSlots?: Array<{ id: string; label?: LocalizedLabel; required?: boolean; sendToN8n?: boolean }>;
  styles?: Array<{ id: string; key?: string; label?: LocalizedLabel; icon?: string; color?: string; info?: LocalizedLabel }>;
  limits?: { maxItemsRegistered?: number; maxItemsGuest?: number; guestCanChooseStyle?: boolean };
  n8n?: { defaultPhotoOrder?: string[]; perStylePhotoOrder?: Record<string, string[]> };
  [key: string]: any;
}

export interface EffectiveCategoryConfig {
  key: string;
  settings: CategorySettings;
}

export async function getShopCategoryKey(shopId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('shops')
      .select('category')
      .eq('id', shopId)
      .maybeSingle();
    if (error) return null;
    const key = (data?.category || 'FASHION').toString().trim().toUpperCase();
    return key || 'FASHION';
  } catch {
    return 'FASHION';
  }
}

export async function getShopOverrideSettings(shopId: string): Promise<CategorySettings | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('shop_category_overrides')
      .select('settings')
      .eq('shop_id', shopId)
      .maybeSingle();
    if (error) return null;
    return (data?.settings || null) as CategorySettings | null;
  } catch {
    return null;
  }
}

export async function getCategorySettingsByKey(key: string): Promise<CategorySettings | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', key)
      .maybeSingle();
    if (error) return null;
    return (data?.settings || null) as CategorySettings | null;
  } catch {
    return null;
  }
}

export async function getEffectiveCategoryConfig(params: { shopId?: string; categoryKey?: string }): Promise<EffectiveCategoryConfig> {
  const fallbackKey = 'FASHION';
  const shopId = params.shopId;
  let key = (params.categoryKey || '').trim().toUpperCase();
  try {
    if (shopId) {
      // Shop overrides take precedence
      const override = await getShopOverrideSettings(shopId);
      if (override) {
        const k = await getShopCategoryKey(shopId);
        return { key: (k || fallbackKey), settings: normalizeSettings(override) };
      }
      const k = await getShopCategoryKey(shopId);
      key = k || fallbackKey;
    }
    if (!key) key = fallbackKey;
    const base = await getCategorySettingsByKey(key);
    if (base) return { key, settings: normalizeSettings(base) };
    // Fallback to default when not found
    const fb = await getCategorySettingsByKey(fallbackKey);
    return { key: fallbackKey, settings: normalizeSettings(fb || {}) };
  } catch {
    const fb = await getCategorySettingsByKey(fallbackKey);
    return { key: fallbackKey, settings: normalizeSettings(fb || {}) };
  }
}

function normalizeSettings(s: CategorySettings | null | undefined): CategorySettings {
  const settings: CategorySettings = s || {};
  // Ensure arrays/objects exist
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

export function localizeLabel(lbl: LocalizedLabel, lang: string, fallbackLang = 'nl'): string {
  if (!lbl) return '';
  if (typeof lbl === 'string') return lbl;
  const l = (lang || '').toLowerCase();
  const fb = (fallbackLang || 'nl').toLowerCase();
  return (lbl as any)[l] || (lbl as any)[fb] || '';
}

export function localizeSettings(settings: CategorySettings, lang: string) {
  const out: any = JSON.parse(JSON.stringify(settings || {}));
  // infoBox
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
  // photoSlots labels
  if (Array.isArray(out.photoSlots)) {
    out.photoSlots = out.photoSlots.map((slot: any) => ({
      ...slot,
      label: localizeLabel(slot?.label, lang)
    }));
  }
  // styles labels
  if (Array.isArray(out.styles)) {
    out.styles = out.styles.map((st: any) => ({
      ...st,
      label: localizeLabel(st?.label, lang),
      info: localizeLabel(st?.info, lang)
    }));
  }
  return out;
}

export function getPhotoOrderForStyle(settings: CategorySettings, styleId?: string | number): string[] {
  const sId = styleId == null ? undefined : String(styleId);
  const per = (settings?.n8n?.perStylePhotoOrder || {}) as Record<string, string[]>;
  if (sId && Array.isArray(per[sId]) && per[sId].length) return per[sId];
  const def = settings?.n8n?.defaultPhotoOrder || [];
  return Array.isArray(def) ? def : [];
}

export function getDefaultStyleId(settings: CategorySettings): string | null {
  const styles = Array.isArray(settings?.styles) ? settings.styles : [];
  if (!styles.length) return null;
  const first = styles[0];
  return first && first.id != null ? String(first.id) : null;
}
