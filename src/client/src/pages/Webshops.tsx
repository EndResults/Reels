import React, { useEffect, useMemo, useState } from 'react';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const VITE_SUPABASE_ASSETS_BASE = import.meta.env.VITE_SUPABASE_ASSETS_BASE as string | undefined;
const ASSETS_BASE = (VITE_SUPABASE_ASSETS_BASE || (VITE_SUPABASE_URL ? `${VITE_SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public` : '')).replace(/\/+$/,'');
import { useLocation } from 'react-router-dom';
import { shopsAPI, analyticsAPI, categoriesAPI } from '../services/api';
import RetailerNav from '../components/RetailerNav';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { getCategoryLabel } from '../constants/categories';

interface Shop {
  id: string;
  name: string;
  category: string;
  url?: string;
  language?: 'nl' | 'en';
  logo_url?: string | null;
  is_active: boolean;
  domains?: any[];
  api_key?: string;
  branding_hide_logo?: boolean;
  promo_enabled?: boolean;
  promo_start_date?: string | null;
  promo_end_date?: string | null;
  widget_color_gradient_from?: string | null;
  widget_color_gradient_to?: string | null;
  widget_color_shadow?: string | null;
  widget_color_button_bg?: string | null;
  widget_color_button_border?: string | null;
  widget_color_tile_text?: string | null;
  widget_color_tile_border?: string | null;
  widget_button_color_from?: string | null;
  widget_button_color_to?: string | null;
  widget_button_label_color?: string | null;
  widget_button_icon?: 'white' | 'color' | null;
  widget_button_labels?: { nl?: string | null; en?: string | null } | null;
  created_at?: string;
  updated_at?: string;
}

const CATEGORIES = [
  'FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS'
];

function maskKey(key?: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••' + key;
  return key.slice(0, 4) + '••••' + key.slice(-4);
}

function getInitials(name?: string): string {
  if (!name) return 'WS';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || parts[0]?.[1] || '';
  return (a + b).toUpperCase();
}

function normalizeDomain(url: string): string {
  try {
    const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const { hostname } = new URL(u);
    const host = hostname.replace(/^www\./i, '').toLowerCase();
    return `https://${host}`;
  } catch {
    return url;
  }
}

function useShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await shopsAPI.list();
      const data = resp.data;
      if (data && data.success) {
        setShops(data.data || []);
      } else {
        setError(data?.message || t('retailer.webshops.errorLoad'));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || t('retailer.webshops.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  return { shops, setShops, loading, error, load };
}

export default function Webshops() {
  const { shops, setShops, loading, error, load } = useShops();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language && i18n.language.toLowerCase().startsWith('en') ? 'en' : 'nl') as 'en' | 'nl';
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [planType, setPlanType] = useState<'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('STARTER');
  const [activeCategories, setActiveCategories] = useState<string[]>(CATEGORIES);
  const [createForm, setCreateForm] = useState<{ name: string; category: string; url: string; isActive: boolean; language: 'nl' | 'en'; domainInput: string; domains: string[]; brandingHideLogo: boolean; promoEnabled: boolean; promoStartDate: string; promoEndDate: string; widgetColorGradientFrom: string; widgetColorGradientTo: string; widgetColorShadow: string; widgetColorButtonBg: string; widgetColorButtonBorder: string; widgetColorTileText: string; widgetColorTileBorder: string; widgetButtonColorFrom: string; widgetButtonColorTo: string; widgetButtonLabelColor: string; widgetButtonIcon: 'white' | 'color'; widgetButtonLabelNl: string; widgetButtonLabelEn: string;}>({
    name: '', category: 'FASHION', url: '', isActive: true, language: 'nl', domainInput: '', domains: [], brandingHideLogo: false, promoEnabled: true, promoStartDate: '', promoEndDate: '',
    widgetColorGradientFrom: '', widgetColorGradientTo: '', widgetColorShadow: '', widgetColorButtonBg: '', widgetColorButtonBorder: '', widgetColorTileText: '', widgetColorTileBorder: '',
    widgetButtonColorFrom: '#ff7300', widgetButtonColorTo: '#ff9b00', widgetButtonLabelColor: '#ffffff', widgetButtonIcon: 'color', widgetButtonLabelNl: '', widgetButtonLabelEn: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; category: string; url: string; isActive: boolean; language: 'nl' | 'en'; domainInput: string; domains: string[]; brandingHideLogo: boolean; promoEnabled: boolean; promoStartDate: string; promoEndDate: string; widgetColorGradientFrom: string; widgetColorGradientTo: string; widgetColorShadow: string; widgetColorButtonBg: string; widgetColorButtonBorder: string; widgetColorTileText: string; widgetColorTileBorder: string; widgetButtonColorFrom: string; widgetButtonColorTo: string; widgetButtonLabelColor: string; widgetButtonIcon: 'white' | 'color'; widgetButtonLabelNl: string; widgetButtonLabelEn: string;}>({
    name: '', category: 'FASHION', url: '', isActive: true, language: 'nl', domainInput: '', domains: [], brandingHideLogo: false, promoEnabled: true, promoStartDate: '', promoEndDate: '',
    widgetColorGradientFrom: '', widgetColorGradientTo: '', widgetColorShadow: '', widgetColorButtonBg: '', widgetColorButtonBorder: '', widgetColorTileText: '', widgetColorTileBorder: '',
    widgetButtonColorFrom: '#ff7300', widgetButtonColorTo: '#ff9b00', widgetButtonLabelColor: '#ffffff', widgetButtonIcon: 'color', widgetButtonLabelNl: '', widgetButtonLabelEn: ''
  });
  const [logoUploading, setLogoUploading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isExpanded = (id: string) => expandedId === id;
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [unsavedTargetId, setUnsavedTargetId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [logoBustMap, setLogoBustMap] = useState<Record<string, number>>({});

  // Convert arbitrary color formats (hex/#RRGGBB[AA], rgba(), hsla()) to a safe #RRGGBB value for <input type="color">
  const toHexForPicker = (val?: string, fallback: string = '#000000'): string => {
    try {
      const v = String(val || '').trim();
      if (!v) return fallback;
      // #RGB or #RRGGBB or #RRGGBBAA
      if (/^#([0-9a-fA-F]{3}){1,2}([0-9a-fA-F]{2})?$/i.test(v)) {
        if (v.length === 4) {
          // #RGB -> #RRGGBB
          const r = v[1], g = v[2], b = v[3];
          return `#${r}${r}${g}${g}${b}${b}`;
        }
        return v.slice(0,7);
      }
      // rgba(r,g,b,a?) or rgb(r,g,b)
      const m = v.match(/^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\)$/i);
      if (m) {
        const r = Math.max(0, Math.min(255, parseInt(m[1],10)));
        const g = Math.max(0, Math.min(255, parseInt(m[2],10)));
        const b = Math.max(0, Math.min(255, parseInt(m[3],10)));
        const to2 = (x: number) => x.toString(16).padStart(2, '0');
        return `#${to2(r)}${to2(g)}${to2(b)}`;
      }
      // hsla/hsl - very rare; fallback
      return fallback;
    } catch { return fallback; }
  };

  const getShopLogoSrc = (s: Shop): string => {
    const src = s.logo_url || '';
    if (!src) return '';
    if (src.startsWith('blob:') || src.startsWith('data:')) return src;
    const v1 = s.updated_at ? new Date(s.updated_at).getTime() : 0;
    const v2 = logoBustMap[s.id] || 0;
    const v = Math.max(v1, v2);
    return v ? src + (src.includes('?') ? '&' : '?') + 'v=' + v : src;
  };

  const hasUnsavedChanges = (): boolean => {
    if (!editingId) return false;
    const s = shops.find(x => x.id === editingId);
    if (!s) return false;
    const normUrl = (u?: string) => {
      if (!u) return '';
      const t = u.trim();
      return /^https?:\/\//i.test(t) ? t : `https://${t}`;
    };
    const edDomains = (Array.isArray(editForm.domains) ? editForm.domains : [])
      .map(d => String(d).trim()).filter(Boolean).sort();
    const shDomains = (Array.isArray(s.domains) ? s.domains : [])
      .map((d: any) => typeof d === 'string' ? d : (d?.domain || d?.url || ''))
      .filter(Boolean).map(String).sort();
    const fmt = (d?: string | null) => d ? new Date(d).toISOString().slice(0,16) : '';
    const changed = (
      s.name !== editForm.name.trim() ||
      s.category !== editForm.category ||
      (s.url || '') !== normUrl(editForm.url || '').trim() ||
      !!s.is_active !== !!editForm.isActive ||
      (s.language || 'nl') !== editForm.language ||
      JSON.stringify(edDomains) !== JSON.stringify(shDomains) ||
      !!s.branding_hide_logo !== !!editForm.brandingHideLogo ||
      (s.promo_enabled !== undefined ? !!s.promo_enabled : true) !== !!editForm.promoEnabled ||
      (fmt(s.promo_start_date) !== (editForm.promoStartDate ? new Date(editForm.promoStartDate).toISOString().slice(0,16) : '')) ||
      (fmt(s.promo_end_date) !== (editForm.promoEndDate ? new Date(editForm.promoEndDate).toISOString().slice(0,16) : '')) ||
      (String(s.widget_color_gradient_from || '') !== String(editForm.widgetColorGradientFrom || '')) ||
      (String(s.widget_color_gradient_to || '') !== String(editForm.widgetColorGradientTo || '')) ||
      (String(s.widget_color_shadow || '') !== String(editForm.widgetColorShadow || '')) ||
      (String(s.widget_color_button_bg || '') !== String(editForm.widgetColorButtonBg || '')) ||
      (String(s.widget_color_button_border || '') !== String(editForm.widgetColorButtonBorder || '')) ||
      (String(s.widget_color_tile_text || '') !== String(editForm.widgetColorTileText || '')) ||
      (String(s.widget_color_tile_border || '') !== String(editForm.widgetColorTileBorder || '')) ||
      (String(s.widget_button_color_from || '') !== String(editForm.widgetButtonColorFrom || '')) ||
      (String(s.widget_button_color_to || '') !== String(editForm.widgetButtonColorTo || '')) ||
      (String(s.widget_button_label_color || '') !== String(editForm.widgetButtonLabelColor || '')) ||
      (String(s.widget_button_icon || '') !== String(editForm.widgetButtonIcon || '')) ||
      (JSON.stringify(s.widget_button_labels || {}) !== JSON.stringify({ nl: editForm.widgetButtonLabelNl || '', en: editForm.widgetButtonLabelEn || '' }))
    );
    return changed;
  };

  const handleHeaderClick = (id: string) => {
    if (editingId && id !== editingId) {
      if (hasUnsavedChanges()) {
        setUnsavedTargetId(id);
        setUnsavedOpen(true);
        return;
      } else {
        setEditingId(null);
      }
    }
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleUnsavedConfirm = async () => {
    const ok = await submitEdit();
    if (!ok) {
      setUnsavedTargetId(null);
      setUnsavedOpen(false);
      return;
    }
    if (unsavedTargetId) setExpandedId(unsavedTargetId);
    setUnsavedTargetId(null);
    setUnsavedOpen(false);
  };

  const handleUnsavedCancel = () => {
    if (unsavedTargetId) {
      setEditingId(null);
      setExpandedId(unsavedTargetId);
    }
    setUnsavedTargetId(null);
    setUnsavedOpen(false);
  };

  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await categoriesAPI.listActive();
        const list = Array.isArray(res.data?.categories) ? (res.data.categories as string[]) : CATEGORIES;
        setActiveCategories(list);
        setCreateForm(prev => ({ ...prev, category: list.includes(prev.category) ? prev.category : (list[0] || 'FASHION') }));
      } catch {
        setActiveCategories(CATEGORIES);
      }
    })();
  }, []);

  // Fetch plan type to gate Enterprise-only features (colors)
  useEffect(() => {
    (async () => {
      try {
        const resp = await analyticsAPI.getDashboard();
        const pt = resp?.data?.data?.retailer?.planType;
        if (pt && typeof pt === 'string') {
          const up = pt.toUpperCase();
          if (up === 'STARTER' || up === 'BASIC' || up === 'PREMIUM' || up === 'ENTERPRISE') setPlanType(up as any);
        }
      } catch {}
    })();
  }, []);

  // Expand first shop if requested via query param (expand=first)
  const [appliedExpandParam, setAppliedExpandParam] = useState(false);
  useEffect(() => {
    if (appliedExpandParam) return;
    const params = new URLSearchParams(location.search);
    if (params.get('expand') === 'first') {
      if (shops.length > 0) {
        // Use sorted list to determine "bovenaan"
        const sorted = [...shops].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
        setExpandedId(sorted[0].id);
        setAppliedExpandParam(true);
      } else if (!loading) {
        // No shops yet: open create panel to guide first setup
        setShowCreate(true);
        setAppliedExpandParam(true);
      }
    }
  }, [location.search, shops, loading, appliedExpandParam]);

  const onCreateAddDomain = () => {
    const v = createForm.domainInput.trim();
    if (!v) return;
    setCreateForm({ ...createForm, domains: [...createForm.domains, v], domainInput: '' });
  };
  const onEditAddDomain = () => {
    const v = editForm.domainInput.trim();
    if (!v) return;
    setEditForm({ ...editForm, domains: [...editForm.domains, v], domainInput: '' });
  };
  const removeCreateDomain = (index: number) => {
    const copy = [...createForm.domains];
    copy.splice(index, 1);
    setCreateForm({ ...createForm, domains: copy });
  };
  const removeEditDomain = (index: number) => {
    const copy = [...editForm.domains];
    copy.splice(index, 1);
    setEditForm({ ...editForm, domains: copy });
  };

  const submitCreate = async () => {
    try {
      setCreating(true);
      const payload: any = {
        name: createForm.name.trim(),
        category: createForm.category,
        url: /^https?:\/\//i.test(createForm.url.trim()) ? createForm.url.trim() : (createForm.url.trim() ? `https://${createForm.url.trim()}` : ''),
        isActive: createForm.isActive,
        language: createForm.language,
        brandingHideLogo: !!createForm.brandingHideLogo,
        promoEnabled: !!createForm.promoEnabled,
        promoStartDate: createForm.promoStartDate ? new Date(createForm.promoStartDate).toISOString() : null,
        promoEndDate: createForm.promoEndDate ? new Date(createForm.promoEndDate).toISOString() : null
      };
      if (planType === 'ENTERPRISE') {
        payload.widgetColorGradientFrom = createForm.widgetColorGradientFrom || null;
        payload.widgetColorGradientTo = createForm.widgetColorGradientTo || null;
        payload.widgetColorShadow = createForm.widgetColorShadow || null;
        payload.widgetColorButtonBg = createForm.widgetColorButtonBg || null;
        payload.widgetColorButtonBorder = createForm.widgetColorButtonBorder || null;
        payload.widgetColorTileText = createForm.widgetColorTileText || null;
        payload.widgetColorTileBorder = createForm.widgetColorTileBorder || null;
        payload.widgetButtonColorFrom = createForm.widgetButtonColorFrom || null;
        payload.widgetButtonColorTo = createForm.widgetButtonColorTo || null;
        payload.widgetButtonLabelColor = createForm.widgetButtonLabelColor || null;
        payload.widgetButtonIcon = createForm.widgetButtonIcon || null;
        const lbls: any = {};
        if (createForm.widgetButtonLabelNl && createForm.widgetButtonLabelNl.trim()) lbls.nl = createForm.widgetButtonLabelNl.trim().slice(0,20);
        if (createForm.widgetButtonLabelEn && createForm.widgetButtonLabelEn.trim()) lbls.en = createForm.widgetButtonLabelEn.trim().slice(0,20);
        payload.widgetButtonLabels = Object.keys(lbls).length ? lbls : null;
      }
      if (!payload.url) {
        showToast({ type: 'error', text: t('retailer.webshops.toasts.createUrlRequired') });
        setCreating(false);
        return;
      }
      if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/i.test(payload.url)) {
        showToast({ type: 'error', text: t('retailer.webshops.toasts.createUrlInvalid') });
        setCreating(false);
        return;
      }
      payload.domain = normalizeDomain(payload.url);
      const resp = await shopsAPI.create(payload);
      if (resp.data && resp.data.success) {
        setShowCreate(false);
        setCreateForm({ 
          name: '', category: 'FASHION', url: '', isActive: true, language: 'nl', domainInput: '', domains: [], brandingHideLogo: false, promoEnabled: true, promoStartDate: '', promoEndDate: '',
          widgetColorGradientFrom: '', widgetColorGradientTo: '', widgetColorShadow: '', widgetColorButtonBg: '', widgetColorButtonBorder: '', widgetColorTileText: '', widgetColorTileBorder: '',
          widgetButtonColorFrom: '#ff7300', widgetButtonColorTo: '#ff9b00', widgetButtonLabelColor: '#ffffff', widgetButtonIcon: 'color', widgetButtonLabelNl: '', widgetButtonLabelEn: ''
        });
        await load();
        showToast({ type: 'success', text: t('retailer.webshops.toasts.createSuccess') });
      } else {
        const msg = resp.data?.message || t('retailer.webshops.toasts.createError');
        if (/Shop limiet bereikt/i.test(msg)) {
          showToast({
            type: 'error',
            text: (
              <>
                {t('retailer.webshops.toasts.limitReached')}{' '}
                <a href="/retailer/abonnement" className="underline font-semibold text-white">{t('retailer.webshops.toasts.upgradeAccount')}</a>
              </>
            ),
            durationMs: 6000
          });
        } else {
          showToast({ type: 'error', text: msg });
        }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('retailer.webshops.toasts.createError');
      if (e?.response?.status === 403 && /Shop limiet bereikt/i.test(msg)) {
        showToast({
          type: 'error',
          text: (
            <>
              {t('retailer.webshops.toasts.limitReached')}{' '}
              <a href="/retailer/abonnement" className="underline font-semibold text-white">{t('retailer.webshops.toasts.upgradeAccount')}</a>
            </>
          ),
          durationMs: 6000
        });
      } else {
        showToast({ type: 'error', text: msg });
      }
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (shop: Shop) => {
    setEditingId(shop.id);
    setEditForm({
      name: shop.name,
      category: shop.category,
      url: shop.url || '',
      isActive: !!shop.is_active,
      language: (shop.language as any) || 'nl',
      domainInput: '',
      domains: (Array.isArray(shop.domains) ? shop.domains : [])
        .map((d: any) => typeof d === 'string' ? d : (d?.domain || d?.url || ''))
        .filter(Boolean),
      brandingHideLogo: !!shop.branding_hide_logo,
      promoEnabled: shop.promo_enabled !== false,
      promoStartDate: shop.promo_start_date ? new Date(shop.promo_start_date).toISOString().slice(0,16) : '',
      promoEndDate: shop.promo_end_date ? new Date(shop.promo_end_date).toISOString().slice(0,16) : '',
      widgetColorGradientFrom: String(shop.widget_color_gradient_from || ''),
      widgetColorGradientTo: String(shop.widget_color_gradient_to || ''),
      widgetColorShadow: String(shop.widget_color_shadow || ''),
      widgetColorButtonBg: String(shop.widget_color_button_bg || ''),
      widgetColorButtonBorder: String(shop.widget_color_button_border || ''),
      widgetColorTileText: String(shop.widget_color_tile_text || ''),
      widgetColorTileBorder: String(shop.widget_color_tile_border || ''),
      widgetButtonColorFrom: String(shop.widget_button_color_from || '#ff7300'),
      widgetButtonColorTo: String(shop.widget_button_color_to || '#ff9b00'),
      widgetButtonLabelColor: String(shop.widget_button_label_color || '#ffffff'),
      widgetButtonIcon: (shop.widget_button_icon as any) === 'white' ? 'white' : 'color',
      widgetButtonLabelNl: String((shop.widget_button_labels && (shop.widget_button_labels as any).nl) || ''),
      widgetButtonLabelEn: String((shop.widget_button_labels && (shop.widget_button_labels as any).en) || ''),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const submitEdit = async (): Promise<boolean> => {
    if (!editingId) return false;
    try {
      const payload: any = {
        name: editForm.name.trim(),
        category: editForm.category,
        url: editForm.url ? (/^https?:\/\//i.test(editForm.url.trim()) ? editForm.url.trim() : `https://${editForm.url.trim()}`) : undefined,
        isActive: editForm.isActive,
        language: editForm.language,
        brandingHideLogo: !!editForm.brandingHideLogo,
        promoEnabled: !!editForm.promoEnabled,
        promoStartDate: editForm.promoStartDate ? new Date(editForm.promoStartDate).toISOString() : null,
        promoEndDate: editForm.promoEndDate ? new Date(editForm.promoEndDate).toISOString() : null
      };
      if (payload.url) {
        payload.domain = normalizeDomain(payload.url);
      }
      // Include Enterprise-only widget colors when plan allows
      if (planType === 'ENTERPRISE') {
        payload.widgetColorGradientFrom = editForm.widgetColorGradientFrom || null;
        payload.widgetColorGradientTo = editForm.widgetColorGradientTo || null;
        payload.widgetColorShadow = editForm.widgetColorShadow || null;
        payload.widgetColorButtonBg = editForm.widgetColorButtonBg || null;
        payload.widgetColorButtonBorder = editForm.widgetColorButtonBorder || null;
        payload.widgetColorTileText = editForm.widgetColorTileText || null;
        payload.widgetColorTileBorder = editForm.widgetColorTileBorder || null;
        payload.widgetButtonColorFrom = editForm.widgetButtonColorFrom || null;
        payload.widgetButtonColorTo = editForm.widgetButtonColorTo || null;
        payload.widgetButtonLabelColor = editForm.widgetButtonLabelColor || null;
        payload.widgetButtonIcon = editForm.widgetButtonIcon || null;
        const lbls: any = {};
        if (editForm.widgetButtonLabelNl && editForm.widgetButtonLabelNl.trim()) lbls.nl = editForm.widgetButtonLabelNl.trim().slice(0,20);
        if (editForm.widgetButtonLabelEn && editForm.widgetButtonLabelEn.trim()) lbls.en = editForm.widgetButtonLabelEn.trim().slice(0,20);
        payload.widgetButtonLabels = Object.keys(lbls).length ? lbls : null;
      }
      const resp = await shopsAPI.update(editingId, payload);
      if (resp.data && resp.data.success) {
        setEditingId(null);
        await load();
        showToast({ type: 'success', text: t('retailer.webshops.toasts.editSuccess') });
        return true;
      } else {
        const msg = resp.data?.message || t('retailer.webshops.toasts.editError');
        if (/Branding verbergen/i.test(msg)) {
          showToast({
            type: 'error',
            text: (
              <>
                {t('retailer.webshops.toasts.brandingPremiumOnly')}{' '}
                <a href="/retailer/abonnement" className="underline font-semibold text-white">{t('retailer.webshops.toasts.upgradeAccount')}</a>
              </>
            ),
            durationMs: 6000
          });
        } else {
          showToast({ type: 'error', text: msg });
        }
        return false;
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t('retailer.webshops.toasts.editError');
      if (e?.response?.status === 403 && /Branding verbergen/i.test(msg)) {
        showToast({
          type: 'error',
          text: (
            <>
              {t('retailer.webshops.toasts.brandingPremiumOnly')}{' '}
              <a href="/retailer/abonnement" className="underline font-semibold text-white">{t('retailer.webshops.toasts.upgradeAccount')}</a>
            </>
          ),
          durationMs: 6000
        });
      } else {
        showToast({ type: 'error', text: msg });
      }
      return false;
    }
  };

  const rotateKey = async (id: string) => {
    try {
      const resp = await shopsAPI.rotateKey(id);
      if (resp.data && resp.data.success) {
        await load();
        showToast({ type: 'success', text: t('retailer.webshops.toasts.rotateSuccess') });
      } else {
        showToast({ type: 'error', text: resp.data?.message || t('retailer.webshops.toasts.rotateError') });
      }
    } catch (e: any) {
      showToast({ type: 'error', text: e?.response?.data?.message || e?.message || t('retailer.webshops.toasts.rotateError') });
    }
  };

  const removeShop = (id: string) => {
    setConfirmRemoveId(id);
    setConfirmOpen(true);
  };

  const confirmRemove = async () => {
    if (!confirmRemoveId) return;
    try {
      const resp = await shopsAPI.remove(confirmRemoveId);
      if (resp.data && resp.data.success) {
        setShops(shops.filter(s => s.id !== confirmRemoveId));
        showToast({ type: 'success', text: t('retailer.webshops.toasts.deleteSuccess') });
      } else {
        showToast({ type: 'error', text: resp.data?.message || t('retailer.webshops.toasts.deleteError') });
      }
    } catch (e: any) {
      showToast({ type: 'error', text: e?.response?.data?.message || e?.message || t('retailer.webshops.toasts.deleteError') });
    } finally {
      setConfirmRemoveId(null);
    }
  };

  const sortedShops = useMemo(() => {
    return [...shops].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
  }, [shops]);

  return (
    <div className="min-h-screen bg-gray-100">
      <RetailerNav title={t('retailer.webshops.title')} backTo="/dashboard" showSettingsLink icon="building" />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('retailer.webshops.title')}</h1>
            <p className="text-gray-600">{t('retailer.webshops.subtitle')}</p>
          </div>
          
          <div className="px-8 py-6">
            <div className="mb-6">
              <button 
                onClick={() => setShowCreate(v => !v)} 
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {showCreate ? t('retailer.webshops.toggle.close') : t('retailer.webshops.toggle.open')}
              </button>
            </div>

            {showCreate && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('retailer.webshops.create.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label>{t('retailer.webshops.create.fields.name')}</label>
                    <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder={t('retailer.webshops.create.fields.namePlaceholder')} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                  </div>
                  <div>
                    <label>{t('retailer.webshops.create.fields.category')}</label>
                    <select value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                      {activeCategories.map(c => <option key={c} value={c}>{getCategoryLabel(c, lang)}</option>)}
                    </select>
                    <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-2">
                      {t('retailer.webshops.create.help.chooseCategory')}
                    </div>
                  </div>
                  <div>
                    <label>{t('retailer.webshops.create.fields.language')}</label>
                    <select value={createForm.language} onChange={e => setCreateForm({ ...createForm, language: e.target.value as 'nl' | 'en' })} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
                      <option value="nl">Nederlands</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label>{t('retailer.webshops.create.fields.url')}</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ padding: '8px', color: '#6b7280' }}>https://</span>
                      <input value={createForm.url} onChange={e => setCreateForm({ ...createForm, url: e.target.value })} placeholder={t('retailer.webshops.create.fields.urlPlaceholder')} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                    </div>
                  </div>
                  <div>
                    <label>{t('retailer.webshops.create.fields.active')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" onClick={() => setCreateForm({ ...createForm, isActive: !createForm.isActive })} className={`relative inline-flex h-6 w-11 items-center rounded-full ${createForm.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${createForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className="text-sm text-gray-600">{createForm.isActive ? t('retailer.webshops.status.active') : t('retailer.webshops.status.inactive')}</span>
                    </div>
                  </div>
                  <div>
                    <label>{t('retailer.webshops.create.fields.domainAdd')}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={createForm.domainInput} onChange={e => setCreateForm({ ...createForm, domainInput: e.target.value })} placeholder={t('retailer.webshops.create.fields.domainPlaceholder')} style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                      <button onClick={onCreateAddDomain} type="button" style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ {t('retailer.webshops.create.fields.add')}</button>
                    </div>
                  </div>
                </div>
                {createForm.domains.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {createForm.domains.map((d, i) => (
                      <span key={i} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 999, padding: '4px 10px' }}>
                        {d} <button onClick={() => removeCreateDomain(i)} style={{ marginLeft: 6, border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                {planType === 'ENTERPRISE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.gradientFrom')}</label>
                      <input type="color" value={createForm.widgetColorGradientFrom || '#f91640'} onChange={e => setCreateForm({ ...createForm, widgetColorGradientFrom: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.gradientTo')}</label>
                      <input type="color" value={createForm.widgetColorGradientTo || '#0c5dea'} onChange={e => setCreateForm({ ...createForm, widgetColorGradientTo: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.buttonBg')}</label>
                      <input type="color" value={createForm.widgetColorButtonBg || '#f97316'} onChange={e => setCreateForm({ ...createForm, widgetColorButtonBg: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.buttonBorder')}</label>
                      <input type="color" value={createForm.widgetColorButtonBorder || '#f91647'} onChange={e => setCreateForm({ ...createForm, widgetColorButtonBorder: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.tileText')}</label>
                      <input type="color" value={createForm.widgetColorTileText || '#7eea0c'} onChange={e => setCreateForm({ ...createForm, widgetColorTileText: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.tileBorder')}</label>
                      <input type="color" value={createForm.widgetColorTileBorder || '#e2e8f0'} onChange={e => setCreateForm({ ...createForm, widgetColorTileBorder: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.shadowColor')}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={toHexForPicker(createForm.widgetColorShadow || '#000000')} onChange={e => setCreateForm({ ...createForm, widgetColorShadow: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                        <input type="text" value={createForm.widgetColorShadow} onChange={e => setCreateForm({ ...createForm, widgetColorShadow: e.target.value })} placeholder={t('retailer.webshops.colors.shadowPlaceholder')} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">{t('retailer.webshops.colors.tip')}</div>
                    </div>
                    {/* Button customization (Enterprise-only) */}
                    <div className="md:col-span-2 border-t pt-4">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Widget button customization (Enterprise)</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Button color FROM</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={toHexForPicker(createForm.widgetButtonColorFrom || '#ff7300')} onChange={e => setCreateForm({ ...createForm, widgetButtonColorFrom: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                            <input type="text" value={createForm.widgetButtonColorFrom} onChange={e => setCreateForm({ ...createForm, widgetButtonColorFrom: e.target.value })} placeholder="#ff7300 or rgba(...)" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Button color TO</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={toHexForPicker(createForm.widgetButtonColorTo || '#ff9b00')} onChange={e => setCreateForm({ ...createForm, widgetButtonColorTo: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                            <input type="text" value={createForm.widgetButtonColorTo} onChange={e => setCreateForm({ ...createForm, widgetButtonColorTo: e.target.value })} placeholder="#ff9b00 or rgba(...)" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Button label color</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={toHexForPicker(createForm.widgetButtonLabelColor || '#ffffff')} onChange={e => setCreateForm({ ...createForm, widgetButtonLabelColor: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                            <input type="text" value={createForm.widgetButtonLabelColor} onChange={e => setCreateForm({ ...createForm, widgetButtonLabelColor: e.target.value })} placeholder="#ffffff or rgba(...)" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Button icon</label>
                          <div className="flex items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                              <input type="radio" name="create_btn_icon" checked={createForm.widgetButtonIcon==='white'} onChange={() => setCreateForm({ ...createForm, widgetButtonIcon: 'white' })} />
                              <img src={`${ASSETS_BASE}/logos/FiT_Icon_White.svg`} alt="FiT_Icon_White" className="w-5 h-5" /> FiT_Icon_White
                            </label>
                            <label className="inline-flex items-center gap-2">
                              <input type="radio" name="create_btn_icon" checked={createForm.widgetButtonIcon==='color'} onChange={() => setCreateForm({ ...createForm, widgetButtonIcon: 'color' })} />
                              <img src={`${ASSETS_BASE}/logos/FiT_icon.svg`} alt="FiT_Icon" className="w-5 h-5" /> FiT_Icon
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">NL label (max 20)</label>
                          <input maxLength={20} value={createForm.widgetButtonLabelNl} onChange={e => setCreateForm({ ...createForm, widgetButtonLabelNl: e.target.value.slice(0,20) })} placeholder="Probeer met FiT" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">EN label (max 20)</label>
                          <input maxLength={20} value={createForm.widgetButtonLabelEn} onChange={e => setCreateForm({ ...createForm, widgetButtonLabelEn: e.target.value.slice(0,20) })} placeholder="Try with FiT" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <button disabled={creating || !createForm.name.trim()} onClick={submitCreate} style={{ padding: '10px 14px', background: '#f97316', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    {creating ? t('retailer.webshops.create.submitting') : t('retailer.webshops.create.submit')}
                  </button>
                </div>
              </div>
            )}

            {loading && <div className="text-center py-4 text-gray-500">{t('retailer.webshops.loading')}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

            <div className="space-y-6">
              {sortedShops.map(shop => (
                <div key={shop.id} className="bg-white border border-gray-200 rounded-lg p-0 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between cursor-pointer" onClick={() => handleHeaderClick(shop.id)}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-[3.75rem] h-[3.75rem] flex items-center justify-center flex-shrink-0">
                        {shop.logo_url ? (
                          <img 
                            src={getShopLogoSrc(shop)} 
                            alt={`${shop.name} logo`} 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gray-200 text-gray-700 flex items-center justify-center">
                            <span className="font-semibold text-base">{getInitials(shop.name)}</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-base font-semibold text-gray-900 truncate max-w-xs">{shop.name}</h3>
                          <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">{getCategoryLabel(shop.category, lang)}</span>
                          <span className={`px-2.5 py-0.5 text-xs rounded-full ${shop.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{shop.is_active ? t('retailer.webshops.status.active') : t('retailer.webshops.status.inactive')}</span>
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-md">
                          {shop.url ? <a href={shop.url} target="_blank" rel="noreferrer" className="hover:underline" onClick={(e) => e.stopPropagation()}>{shop.url}</a> : t('retailer.webshops.noUrl')}
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-500 ml-4">{isExpanded(shop.id) ? '▲' : '▼'}</span>
                  </div>

                  {isExpanded(shop.id) && (
                    <div className="px-6 pb-6 pt-4 border-t border-gray-200">
                      <div className="flex flex-col gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              {editingId === shop.id ? (
                                <div>
                                  <label className="text-sm font-medium text-gray-700 block mb-1">{t('retailer.webshops.create.fields.name')}</label>
                                  <input 
                                    value={editForm.name} 
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                                  />
                                </div>
                              ) : (
                                <h3 className="text-xl font-semibold text-gray-900">{shop.name}</h3>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                {editingId === shop.id ? (
                                  <div className="flex-1">
                                    <label className="text-sm font-medium text-gray-700 block mb-1">{t('retailer.webshops.create.fields.category')}</label>
                                    <select 
                                      value={editForm.category} 
                                      onChange={e => setEditForm({ ...editForm, category: e.target.value })} 
                                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                                    >
                                      {(
                                        (activeCategories.includes(editForm.category) ? activeCategories : [...activeCategories, editForm.category])
                                      ).map(c => (
                                        <option key={c} value={c} disabled={!activeCategories.includes(c) && c === editForm.category}>
                                          {getCategoryLabel(c, lang)}{!activeCategories.includes(c) ? ' (inactief)' : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{getCategoryLabel(shop.category, lang)}</span>
                                )}
                                {editingId === shop.id ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${editForm.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                                    aria-label={t('retailer.webshops.aria.activeToggle')}
                                  >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${editForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                  </button>
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shop.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {shop.is_active ? t('retailer.webshops.status.active') : t('retailer.webshops.status.inactive')}
                                  </span>
                                )}
                              </div>
                            </div>

                            
                          </div>

                          {/* Webshop logo + Widget kleuren on their own row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 items-stretch">
                            {/* Webshop logo block */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-gray-700">{t('retailer.webshops.logo.title')}</label>
                                {editingId !== shop.id && (
                                  <button
                                    type="button"
                                    onClick={() => startEdit(shop)}
                                    className="text-gray-600 hover:text-gray-900 text-xs"
                                    title={t('retailer.webshops.actions.edit')}
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              {editingId === shop.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="file"
                                    accept=".png,.svg,image/png,image/svg+xml"
                                    disabled={logoUploading}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file || !editingId) return;
                                      // Immediate local preview
                                      try {
                                        const previewUrl = URL.createObjectURL(file);
                                        setShops(prev => prev.map(s => s.id === editingId ? { ...s, logo_url: previewUrl } : s));
                                      } catch {}
                                      setLogoUploading(true);
                                      try {
                                        const resp = await shopsAPI.uploadLogo(editingId, file);
                                        if (resp.data && resp.data.success) {
                                          // Mark cache-bust for this shop and reload data
                                          setLogoBustMap(prev => ({ ...prev, [editingId]: Date.now() }));
                                          await load();
                                          showToast({ type: 'success', text: t('retailer.webshops.toasts.logoUploaded') });
                                        } else {
                                          showToast({ type: 'error', text: resp.data?.message || t('retailer.webshops.toasts.uploadError') });
                                        }
                                      } catch (err: any) {
                                        showToast({ type: 'error', text: err?.response?.data?.message || err?.message || t('retailer.webshops.toasts.uploadError') });
                                      } finally {
                                        setLogoUploading(false);
                                        (e.target as HTMLInputElement).value = '';
                                      }
                                    }}
                                    className="block w-full text-sm text-gray-700"
                                  />
                                  <div className="text-xs text-gray-500">{t('retailer.webshops.logo.hint')}</div>
                                  {shop.logo_url && (
                                    <div className="pt-1">
                                      <img src={getShopLogoSrc(shop)} alt={t('retailer.webshops.logo.alt')} className="h-80 w-auto max-w-full object-contain" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                shop.logo_url ? (
                                  <img src={getShopLogoSrc(shop)} alt={t('retailer.webshops.logo.alt')} className="h-80 w-auto max-w-full object-contain" />
                                ) : (
                                  <div className="text-xs text-gray-500">{t('retailer.webshops.logo.none')}</div>
                                )
                              )}
                            </div>

                            {/* Widget kleuren (Enterprise) */}
                            {planType === 'ENTERPRISE' && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">{t('retailer.webshops.colors.titleEnterprise')}</label>
                                  <div className="flex items-center gap-3">
                                    {editingId !== shop.id && (
                                      <button
                                        type="button"
                                        onClick={() => startEdit(shop)}
                                        className="text-gray-600 hover:text-gray-900 text-xs"
                                        title={t('retailer.webshops.actions.edit')}
                                      >
                                        ✏️
                                      </button>
                                    )}
                                    <button type="button" onClick={() => setLegendOpen(true)} className="text-gray-600 hover:text-gray-900 text-xs underline">i</button>
                                  </div>
                                </div>
                                {editingId === shop.id ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.gradientFrom')}</label>
                                      <input type="color" value={editForm.widgetColorGradientFrom || '#f91640'} onChange={e => setEditForm({ ...editForm, widgetColorGradientFrom: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.gradientTo')}</label>
                                      <input type="color" value={editForm.widgetColorGradientTo || '#0c5dea'} onChange={e => setEditForm({ ...editForm, widgetColorGradientTo: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.buttonBg')}</label>
                                      <input type="color" value={editForm.widgetColorButtonBg || '#f97316'} onChange={e => setEditForm({ ...editForm, widgetColorButtonBg: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.buttonBorder')}</label>
                                      <input type="color" value={editForm.widgetColorButtonBorder || '#f91647'} onChange={e => setEditForm({ ...editForm, widgetColorButtonBorder: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.tileText')}</label>
                                      <input type="color" value={editForm.widgetColorTileText || '#7eea0c'} onChange={e => setEditForm({ ...editForm, widgetColorTileText: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.tileBorder')}</label>
                                      <input type="color" value={editForm.widgetColorTileBorder || '#e2e8f0'} onChange={e => setEditForm({ ...editForm, widgetColorTileBorder: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-xs text-gray-600 mb-1">{t('retailer.webshops.colors.shadowColor')}</label>
                                      <div className="flex items-center gap-2">
                                        <input type="color" value={toHexForPicker(editForm.widgetColorShadow || '#000000')} onChange={e => setEditForm({ ...editForm, widgetColorShadow: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                        <input type="text" value={editForm.widgetColorShadow} onChange={e => setEditForm({ ...editForm, widgetColorShadow: e.target.value })} placeholder={t('retailer.webshops.colors.shadowPlaceholder')} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
                                      </div>
                                      <div className="text-[11px] text-gray-500 mt-1">{t('retailer.webshops.colors.tip')}</div>
                                    </div>
                                    {/* Button customization (Enterprise-only) */}
                                    <div className="md:col-span-2 border-t pt-4">
                                      <label className="block text-sm font-semibold text-gray-900 mb-2">Widget button customization (Enterprise)</label>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">Button color FROM</label>
                                          <div className="flex items-center gap-2">
                                            <input type="color" value={toHexForPicker(editForm.widgetButtonColorFrom || '#ff7300')} onChange={e => setEditForm({ ...editForm, widgetButtonColorFrom: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                            <input type="text" value={editForm.widgetButtonColorFrom} onChange={e => setEditForm({ ...editForm, widgetButtonColorFrom: e.target.value })} placeholder="#ff7300 or rgba(...)" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">Button color TO</label>
                                          <div className="flex items-center gap-2">
                                            <input type="color" value={toHexForPicker(editForm.widgetButtonColorTo || '#ff9b00')} onChange={e => setEditForm({ ...editForm, widgetButtonColorTo: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                            <input type="text" value={editForm.widgetButtonColorTo} onChange={e => setEditForm({ ...editForm, widgetButtonColorTo: e.target.value })} placeholder="#ff9b00 or rgba(...)" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">Button label color</label>
                                          <div className="flex items-center gap-2">
                                            <input type="color" value={editForm.widgetButtonLabelColor} onChange={e => setEditForm({ ...editForm, widgetButtonLabelColor: e.target.value })} className="w-16 h-10 p-0 border rounded" />
                                            <input type="text" value={editForm.widgetButtonLabelColor} onChange={e => setEditForm({ ...editForm, widgetButtonLabelColor: e.target.value })} placeholder="#ffffff or rgba(...)" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">Button icon</label>
                                          <div className="flex items-center gap-4 text-sm">
                                            <label className="inline-flex items-center gap-2">
                                              <input type="radio" name="edit_btn_icon" checked={editForm.widgetButtonIcon==='white'} onChange={() => setEditForm({ ...editForm, widgetButtonIcon: 'white' })} />
                                              <img src="https://hruleghaabwolyrkzzoc.supabase.co/storage/v1/object/public/logos/FiT_Icon_White.svg" alt="FiT_Icon_White" className="w-5 h-5" /> FiT_Icon_White
                                            </label>
                                            <label className="inline-flex items-center gap-2">
                                              <input type="radio" name="edit_btn_icon" checked={editForm.widgetButtonIcon==='color'} onChange={() => setEditForm({ ...editForm, widgetButtonIcon: 'color' })} />
                                              <img src="https://hruleghaabwolyrkzzoc.supabase.co/storage/v1/object/public/logos/FiT_icon.svg" alt="FiT_Icon" className="w-5 h-5" /> FiT_Icon
                                            </label>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">NL label (max 20)</label>
                                          <input maxLength={20} value={editForm.widgetButtonLabelNl} onChange={e => setEditForm({ ...editForm, widgetButtonLabelNl: e.target.value.slice(0,20) })} placeholder="Probeer met FiT" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">EN label (max 20)</label>
                                          <input maxLength={20} value={editForm.widgetButtonLabelEn} onChange={e => setEditForm({ ...editForm, widgetButtonLabelEn: e.target.value.slice(0,20) })} placeholder="Try with FiT" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded" style={{ background: shop.widget_color_gradient_from || '#f91640' }}></span> {t('retailer.webshops.colors.short.from')}</div>
                                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded" style={{ background: shop.widget_color_gradient_to || '#0c5dea' }}></span> {t('retailer.webshops.colors.short.to')}</div>
                                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded" style={{ background: shop.widget_color_button_bg || '#f97316' }}></span> {t('retailer.webshops.colors.short.buttonBg')}</div>
                                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded border" style={{ borderColor: shop.widget_color_button_border || '#f91647' }}></span> {t('retailer.webshops.colors.short.buttonBorder')}</div>
                                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded" style={{ background: shop.widget_color_tile_text || '#7eea0c' }}></span> {t('retailer.webshops.colors.short.tileText')}</div>
                                    <div className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded border" style={{ borderColor: shop.widget_color_tile_border || '#e2e8f0' }}></span> {t('retailer.webshops.colors.short.tileBorder')}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-700 block mb-1">{t('retailer.webshops.fields.websiteUrl')}</label>
                              {editingId === shop.id ? (
                                <div className="flex items-center">
                                  <span className="text-gray-500 text-sm mr-2">https://</span>
                                  <input 
                                    value={editForm.url} 
                                    onChange={e => setEditForm({ ...editForm, url: e.target.value })} 
                                    placeholder={t('retailer.webshops.create.fields.urlPlaceholder')} 
                                    className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                                  />
                                </div>
                              ) : (
                                <div>
                                  {shop.url ? (
                                    <a href={shop.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                      {shop.url}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">{t('retailer.webshops.noUrl')}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 block mb-1">{t('retailer.webshops.create.fields.language')}</label>
                              {editingId === shop.id ? (
                                <select
                                  value={editForm.language}
                                  onChange={e => setEditForm({ ...editForm, language: e.target.value as 'nl' | 'en' })}
                                  className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                                >
                                  <option value="nl">Nederlands</option>
                                  <option value="en">English</option>
                                </select>
                              ) : (
                                <span className="text-sm text-gray-700">{(shop.language || 'nl').toUpperCase()}</span>
                              )}
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-700 block mb-1">{t('retailer.webshops.fields.domains')}</label>
                              {editingId === shop.id ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input 
                                      value={editForm.domainInput} 
                                      onChange={e => setEditForm({ ...editForm, domainInput: e.target.value })} 
                                      placeholder={t('retailer.webshops.create.fields.domainPlaceholder')} 
                                      className="border border-gray-300 rounded-lg px-3 py-2 flex-1 w-full"
                                    />
                                    <button 
                                      onClick={onEditAddDomain} 
                                      type="button" 
                                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                    >
                                      + {t('retailer.webshops.create.fields.add')}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {editForm.domains.map((d, i) => (
                                      <span key={i} className="inline-flex items-center bg-gray-100 border border-gray-300 rounded-full px-3 py-1 text-sm">
                                        {d} 
                                        <button 
                                          onClick={() => removeEditDomain(i)} 
                                          className="ml-2 text-red-500 hover:text-red-700"
                                        >×</button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {(Array.isArray(shop.domains) ? shop.domains : [])
                                    .map((d: any) => typeof d === 'string' ? d : (d?.domain || d?.url || ''))
                                    .filter(Boolean)
                                    .map((d: string, i: number) => (
                                      <span key={i} className="inline-flex items-center bg-gray-100 border border-gray-300 rounded-full px-3 py-1 text-sm">
                                        {d}
                                      </span>
                                    ))}
                                  {(Array.isArray(shop.domains) ? shop.domains : []).length === 0 && (
                                    <span className="text-gray-400 text-sm">{t('retailer.webshops.fields.domainsNone')}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-5 text-base">
                              {t('retailer.webshops.create.help.chooseCategory')}
                            </div>

                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                <span className="text-gray-900">{t('retailer.webshops.widget.title')}</span>
                              </h4>
                              <p className="text-sm text-gray-600 mb-4">
                                {t('retailer.webshops.widget.desc')}
                              </p>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 block mb-1">{t('retailer.webshops.widget.apiKey')}</label>
                                  <div className="flex items-center gap-2">
                                    <code className="bg-white border border-gray-300 rounded px-3 py-2 text-sm font-mono flex-1 truncate">
                                      {maskKey(shop.api_key)}
                                    </code>
                                    {shop.api_key && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            await navigator.clipboard.writeText(shop.api_key!);
                                            showToast({ type: 'success', text: t('retailer.dashboard.toasts.apiKeyCopied') });
                                          } catch {
                                            showToast({ type: 'error', text: t('retailer.dashboard.toasts.copyFailed') });
                                          }
                                        }}
                                        className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                                        title={t('retailer.webshops.actions.copyApiKey')}
                                      >
                                        📋
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium text-gray-700 block mb-1">{t('retailer.webshops.widget.code')}</label>
                                  <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                                    <div className="whitespace-nowrap">
                                      {(() => {
                                        const envBase = (import.meta as any).env?.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
                                        const root = String(envBase || '').trim().replace(/\/+$/, '');
                                        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
                                        const base = root ? (root.endsWith('/api') ? root : `${root}/api`) : (origin ? `${origin.replace(/\/+$/, '')}/api` : '/api');
                                        const key = shop.api_key || 'YOUR_API_KEY';
                                        const url = `${base}/widget/script/${key}`;
                                        return `<script src="${url}" async></script>`;
                                      })()}
                                    </div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      const envBase = (import.meta as any).env?.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
                                      const root = String(envBase || '').trim().replace(/\/+$/, '');
                                      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
                                      const base = root ? (root.endsWith('/api') ? root : `${root}/api`) : (origin ? `${origin.replace(/\/+$/, '')}/api` : '/api');
                                      const widgetCode = `<script src="${base}/widget/script/${shop.api_key}" async></script>`;
                                      try {
                                        await navigator.clipboard.writeText(widgetCode);
                                        showToast({ type: 'success', text: t('retailer.dashboard.toasts.widgetCopied') });
                                      } catch {
                                        showToast({ type: 'error', text: t('retailer.dashboard.toasts.copyFailed') });
                                      }
                                    }}
                                    className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    disabled={!shop.api_key}
                                  >
                                    📋 {t('retailer.webshops.widget.copyCodeBtn')}
                                  </button>
                                </div>

                                <div className="pt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-500">
                                    <strong>{t('retailer.webshops.widget.installation')}</strong> {t('retailer.webshops.widget.installationNote')}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 items-stretch">
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full min-h-[120px]">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">{t('retailer.webshops.branding.title')}</label>
                                  {editingId !== shop.id && (
                                    <button
                                      type="button"
                                      onClick={() => startEdit(shop)}
                                      className="text-gray-600 hover:text-gray-900 text-xs"
                                      title={t('retailer.webshops.actions.edit')}
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </div>
                                {editingId === shop.id ? (
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setEditForm({ ...editForm, brandingHideLogo: !editForm.brandingHideLogo })}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${editForm.brandingHideLogo ? 'bg-green-500' : 'bg-gray-300'}`}
                                      aria-label={t('retailer.webshops.branding.aria')}
                                    >
                                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${editForm.brandingHideLogo ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                    <span className="text-sm text-gray-600">{t('retailer.webshops.branding.hideNote')}</span>
                                  </div>
                                ) : (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shop.branding_hide_logo ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {shop.branding_hide_logo ? t('retailer.webshops.branding.status.hidden') : t('retailer.webshops.branding.status.visible')}
                                  </span>
                                )}
                              </div>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">{t('retailer.webshops.promo.title')}</label>
                                  {editingId !== shop.id && (
                                    <button
                                      type="button"
                                      onClick={() => startEdit(shop)}
                                      className="text-gray-600 hover:text-gray-900 text-xs"
                                      title={t('retailer.webshops.actions.edit')}
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </div>
                                {editingId === shop.id ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, promoEnabled: !editForm.promoEnabled })}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${editForm.promoEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                        aria-label={t('retailer.webshops.promo.ariaOn')}
                                      >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${editForm.promoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                      </button>
                                      <span className="text-sm text-gray-600">{t('retailer.webshops.promo.onLabel')}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                      <div>
                                        <label className="text-xs text-gray-600">{t('retailer.webshops.promo.startOptional')}</label>
                                        <input
                                          type="datetime-local"
                                          value={editForm.promoStartDate}
                                          onChange={e => setEditForm({ ...editForm, promoStartDate: e.target.value })}
                                          className="mt-1 border border-gray-300 rounded px-2 py-1 w-full"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-600">{t('retailer.webshops.promo.endOptional')}</label>
                                        <input
                                          type="datetime-local"
                                          value={editForm.promoEndDate}
                                          onChange={e => setEditForm({ ...editForm, promoEndDate: e.target.value })}
                                          className="mt-1 border border-gray-300 rounded px-2 py-1 w-full"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-700">
                                    <div className="mb-1">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shop.promo_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {shop.promo_enabled ? t('retailer.webshops.promo.on') : t('retailer.webshops.promo.off')}
                                      </span>
                                    </div>
                                    {(shop.promo_start_date || shop.promo_end_date) ? (
                                      <div className="text-xs text-gray-600">
                                        {shop.promo_start_date && <div>{t('retailer.webshops.promo.start')}: {new Date(shop.promo_start_date).toLocaleString()}</div>}
                                        {shop.promo_end_date && <div>{t('retailer.webshops.promo.end')}: {new Date(shop.promo_end_date).toLocaleString()}</div>}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">{t('retailer.webshops.promo.noPeriod')}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-4">
                            {editingId === shop.id ? (
                              <>
                                <button 
                                  onClick={submitEdit} 
                                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                                >
                                  {t('retailer.webshops.actions.save')}
                                </button>
                                <button 
                                  onClick={cancelEdit} 
                                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                                >
                                  {t('retailer.webshops.actions.cancel')}
                                </button>
                              </>
                            ) : (
                              <>
                                <button 
                                  onClick={() => startEdit(shop)} 
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                >
                                  {t('retailer.webshops.actions.edit')}
                                </button>
                                <button 
                                  onClick={() => rotateKey(shop.id)} 
                                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium"
                                >
                                  {t('retailer.webshops.actions.rotateKey')}
                                </button>
                                <button 
                                  onClick={() => removeShop(shop.id)} 
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                                >
                                  {t('retailer.webshops.actions.delete')}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {sortedShops.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">🏪</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('retailer.webshops.empty.title')}</h3>
                  <p>{t('retailer.webshops.empty.desc')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal 
        open={confirmOpen}
        title={t('retailer.webshops.confirmDelete.title')}
        description={t('retailer.webshops.confirmDelete.description')}
        cancelText={t('retailer.webshops.confirmDelete.cancel')}
        confirmText={t('retailer.webshops.confirmDelete.confirm')}
        onConfirm={confirmRemove}
        onClose={() => { setConfirmOpen(false); setConfirmRemoveId(null); }}
      />

      {legendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLegendOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-[92vw]">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-medium text-gray-900">{t('retailer.webshops.colors.legendTitle')}</h3>
              <button onClick={() => setLegendOpen(false)} className="text-gray-500 hover:text-gray-800 text-xl leading-none">×</button>
            </div>
            <div className="p-4">
              <img src={`${ASSETS_BASE}/logos/Legenda.png`} alt={t('retailer.webshops.colors.legendAlt')} className="w-full h-auto" />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        open={unsavedOpen}
        title={t('retailer.webshops.unsaved.title')}
        description={t('retailer.webshops.unsaved.description')}
        cancelText={t('retailer.webshops.unsaved.cancel')}
        confirmText={t('retailer.webshops.unsaved.confirm')}
        onConfirm={handleUnsavedConfirm}
        onClose={handleUnsavedCancel}
      />
    </div>
  );
}