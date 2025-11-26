import express from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { supabaseAdmin } from '../lib/supabase';

const router = express.Router();

// Multer in-memory uploader for small files (e.g., logos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB
});

// Helper: verify retailer JWT and return retailer id
async function getRetailerIdFromAuth(req: express.Request, res: express.Response): Promise<string | null> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return null;
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId;

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authUser.user) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return null;
    }

    let retailerIdToUse: string | null = null;
    // Try by id first
    {
      const { data: retailerById } = await supabaseAdmin
        .from('retailers')
        .select('id, is_active')
        .eq('id', userId)
        .eq('is_active', true)
        .single();
      if (retailerById && retailerById.id) retailerIdToUse = retailerById.id as string;
    }
    // Fallback by email for older records
    if (!retailerIdToUse) {
      const email = authUser.user.email as string | null | undefined;
      if (email) {
        const { data: retailerByEmail } = await supabaseAdmin
          .from('retailers')
          .select('id, is_active')
          .eq('email', email)
          .eq('is_active', true)
          .single();
        if (retailerByEmail && retailerByEmail.id) retailerIdToUse = retailerByEmail.id as string;
      }
    }
    if (!retailerIdToUse) {
      res.status(403).json({ success: false, message: 'Retailer not found or inactive' });
      return null;
    }

    return retailerIdToUse;
  } catch (err) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return null;
  }
}

// Helper: determine max allowed shops
async function resolveMaxShops(retailerId: string): Promise<number> {
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('retailer_id', retailerId)
      .single();
    if (sub && typeof (sub as any).max_shops === 'number') return (sub as any).max_shops as number;

    const { data: retailer } = await supabaseAdmin
      .from('retailers')
      .select('plan_type')
      .eq('id', retailerId)
      .single();
    const plan = (retailer as any)?.plan_type;
    if (plan === 'BASIC') return 2;
    if (plan === 'PREMIUM') return 10;
    if (plan === 'ENTERPRISE') return 999999;
    return 1; // default minimal
  } catch {
    return 1;
  }
}

// GET / - list shops for current retailer
router.get('/', async (req, res): Promise<void> => {
  try {
    const retailerId = await getRetailerIdFromAuth(req, res);
    if (!retailerId) return;

    const { data: shops, error } = await supabaseAdmin
      .from('shops')
      .select('id, name, category, url, domain, language, logo_url, is_active, api_key, branding_hide_logo, promo_enabled, promo_start_date, promo_end_date, widget_color_gradient_from, widget_color_gradient_to, widget_color_shadow, widget_color_button_bg, widget_color_button_border, widget_color_tile_text, widget_color_tile_border, widget_button_color_from, widget_button_color_to, widget_button_label_color, widget_button_icon, widget_button_labels, created_at, updated_at')
      .eq('retailer_id', retailerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Auto-create a default shop for new retailers with zero shops
    if (!shops || shops.length === 0) {
      try {
        const { data: r } = await supabaseAdmin
          .from('retailers')
          .select('shop_name, shop_type, shop_url')
          .eq('id', retailerId)
          .single();
        if (r) {
          const supported = ['FASHION','BIKES','SHOES','MOTORS','GLASSES','JEWELRY','WATCHES','AUTOMOTIVE','FURNITURE','BAGS'];
          const category = supported.includes((r as any).shop_type) ? (r as any).shop_type : 'FASHION';
          // Derive canonical domain from retailer.shop_url if present
          let domainVal: string | null = null;
          try {
            const d = (r as any).shop_url as string | undefined;
            if (d) {
              const urlObj = new URL(/^https?:\/\//i.test(d) ? d : `https://${d}`);
              const host = urlObj.hostname.replace(/^www\./i, '').toLowerCase();
              domainVal = `https://${host}`;
            }
          } catch {}
          const apiKey = crypto.randomBytes(32).toString('hex');
          const urlVal = (r as any).shop_url || null;
          // Try with domain/url, fallback if columns don't exist
          let { data: defaultShop, error: dErr } = await supabaseAdmin
            .from('shops')
            .insert({
              retailer_id: retailerId,
              name: (r as any).shop_name || 'Webshop',
              category,
              ...(domainVal ? { domain: domainVal } : {}),
              // include URL when possible
              ...(urlVal ? { url: urlVal } : {}),
              is_active: true,
              api_key: apiKey
            })
            .select()
            .single();
          if (dErr && ((dErr as any)?.code === '42703' || /column\s+"?(domain|url)"?/i.test((dErr as any)?.message || ''))) {
            const retryPayload: any = {
              retailer_id: retailerId,
              name: (r as any).shop_name || 'Webshop',
              category,
              is_active: true,
              api_key: apiKey
            };
            const retry = await supabaseAdmin
              .from('shops')
              .insert(retryPayload)
              .select()
              .single();
            defaultShop = retry.data as any;
            dErr = retry.error as any;
          }
          if (defaultShop) {
            res.json({ success: true, data: [defaultShop] });
            return;
          }
        }
      } catch {}
    }
    res.json({ success: true, data: shops || [] });
  } catch (error) {
    console.error('List shops error:', error);
    res.status(500).json({ success: false, message: 'Failed to list shops' });
  }
});

// GET /public - list all active shops (PUBLIC, no auth)
router.get('/public', async (_req, res): Promise<void> => {
  try {
    const { data: shops, error } = await supabaseAdmin
      .from('shops')
      .select('id, name, category, url, language, logo_url, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: shops || [] });
  } catch (error) {
    console.error('List public shops error:', error);
    res.status(500).json({ success: false, message: 'Failed to list shops' });
  }
});

// POST / - create shop
router.post('/', async (req, res): Promise<void> => {
  try {
    const retailerId = await getRetailerIdFromAuth(req, res);
    if (!retailerId) return;

    const schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      category: Joi.string().valid('FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS').required(),
      url: Joi.string().uri().required(),
      domain: Joi.string().uri().optional(),
      isActive: Joi.boolean().default(true),
      language: Joi.string().valid('nl','en').default('nl'),
      brandingHideLogo: Joi.boolean().optional(),
      promoEnabled: Joi.boolean().optional(),
      promoStartDate: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional().allow(null),
      promoEndDate: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional().allow(null),
      widgetColorGradientFrom: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorGradientTo: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorShadow: Joi.string().max(64).optional().allow(null),
      widgetColorButtonBg: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorButtonBorder: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorTileText: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorTileBorder: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetButtonColorFrom: Joi.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
      widgetButtonColorTo: Joi.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
      widgetButtonLabelColor: Joi.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
      widgetButtonIcon: Joi.string().valid('white', 'color').optional().allow(null),
      widgetButtonLabels: Joi.object({ nl: Joi.string().max(20).allow('', null), en: Joi.string().max(20).allow('', null) }).optional().allow(null)
    });
    const { error: vErr, value } = schema.validate(req.body);
    if (vErr) { res.status(400).json({ success: false, message: vErr.details[0].message }); return; }

    const maxShops = await resolveMaxShops(retailerId);
    const { count } = await supabaseAdmin
      .from('shops')
      .select('id', { count: 'exact', head: true })
      .eq('retailer_id', retailerId);
    if (typeof count === 'number' && count >= maxShops) {
      res.status(403).json({ success: false, message: 'Shop limiet bereikt voor huidig abonnement' });
      return;
    }

    const apiKey = crypto.randomBytes(32).toString('hex');

    // Compute canonical domain (https://hostname w/out www)
    const rawDomainInput = (value.domain as string | undefined) || (value.url as string | undefined);
    let domainNormalized: string | null = null;
    try {
      if (rawDomainInput) {
        const withScheme = /^https?:\/\//i.test(rawDomainInput) ? rawDomainInput : `https://${rawDomainInput}`;
        const parsed = new URL(withScheme);
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
        domainNormalized = `https://${host}`;
      }
    } catch {}

    const basePayload: any = {
      retailer_id: retailerId,
      name: value.name,
      category: value.category,
      url: value.url,
      ...(domainNormalized ? { domain: domainNormalized } : {}),
      language: value.language || 'nl',
      is_active: !!value.isActive,
      api_key: apiKey
    };
    // Optional branding/promo fields
    if (typeof value.brandingHideLogo === 'boolean') basePayload.branding_hide_logo = !!value.brandingHideLogo;
    if (typeof value.promoEnabled === 'boolean') basePayload.promo_enabled = !!value.promoEnabled;
    if (value.promoStartDate != null) {
      const d = new Date(value.promoStartDate);
      basePayload.promo_start_date = isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (value.promoEndDate != null) {
      const d = new Date(value.promoEndDate);
      basePayload.promo_end_date = isNaN(d.getTime()) ? null : d.toISOString();
    }

    // Optional widget color fields (Enterprise only)
    // Determine current plan for gating color customization
    let planIsEnterprise = false;
    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_type, status')
        .eq('retailer_id', retailerId)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const plan = (sub && (sub as any).plan_type ? String((sub as any).plan_type).toUpperCase() : 'FREEMIUM');
      planIsEnterprise = plan === 'ENTERPRISE';
    } catch {}

    const hasAnyWidgetColors = (
      value.widgetColorGradientFrom != null ||
      value.widgetColorGradientTo != null ||
      value.widgetColorShadow != null ||
      value.widgetColorButtonBg != null ||
      value.widgetColorButtonBorder != null ||
      value.widgetColorTileText != null ||
      value.widgetColorTileBorder != null
    );
    if (hasAnyWidgetColors) {
      if (!planIsEnterprise) {
        res.status(403).json({ success: false, message: 'Kleurcustomization is alleen beschikbaar voor Enterprise' });
        return;
      }
      if (value.widgetColorGradientFrom !== undefined) basePayload.widget_color_gradient_from = value.widgetColorGradientFrom;
      if (value.widgetColorGradientTo !== undefined) basePayload.widget_color_gradient_to = value.widgetColorGradientTo;
      if (value.widgetColorShadow !== undefined) basePayload.widget_color_shadow = value.widgetColorShadow;
      if (value.widgetColorButtonBg !== undefined) basePayload.widget_color_button_bg = value.widgetColorButtonBg;
      if (value.widgetColorButtonBorder !== undefined) basePayload.widget_color_button_border = value.widgetColorButtonBorder;
      if (value.widgetColorTileText !== undefined) basePayload.widget_color_tile_text = value.widgetColorTileText;
      if (value.widgetColorTileBorder !== undefined) basePayload.widget_color_tile_border = value.widgetColorTileBorder;
    }

    // Optional widget button customization (Enterprise only)
    const hasAnyWidgetButton = (
      value.widgetButtonColorFrom != null ||
      value.widgetButtonColorTo != null ||
      value.widgetButtonLabelColor != null ||
      value.widgetButtonIcon != null ||
      value.widgetButtonLabels != null
    );
    if (hasAnyWidgetButton) {
      if (!planIsEnterprise) {
        res.status(403).json({ success: false, message: 'Knopcustomization is alleen beschikbaar voor Enterprise' });
        return;
      }
      if (value.widgetButtonColorFrom !== undefined) basePayload.widget_button_color_from = value.widgetButtonColorFrom;
      if (value.widgetButtonColorTo !== undefined) basePayload.widget_button_color_to = value.widgetButtonColorTo;
      if (value.widgetButtonLabelColor !== undefined) basePayload.widget_button_label_color = value.widgetButtonLabelColor;
      if (value.widgetButtonIcon !== undefined) basePayload.widget_button_icon = value.widgetButtonIcon;
      if (value.widgetButtonLabels !== undefined) basePayload.widget_button_labels = value.widgetButtonLabels;
    }

    // Try insert, fallback without domains/url if the column doesn't exist
    let { data: shop, error } = await supabaseAdmin
      .from('shops')
      .insert(basePayload)
      .select()
      .single();

    if (error && ((error as any)?.code === '42703' || /column\s+"?(domain|url)"?/i.test((error as any)?.message || ''))) {
      // Retry without domains and url
      const retryPayload = { ...basePayload } as any;
      delete retryPayload.domain;
      delete retryPayload.url;
      const retry = await supabaseAdmin
        .from('shops')
        .insert(retryPayload)
        .select()
        .single();
      shop = retry.data as any;
      error = retry.error as any;
    }

    if (error) throw error;
    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({ success: false, message: 'Failed to create shop' });
  }
});
// PUT /:shopId - update shop
router.put('/:shopId', async (req, res): Promise<void> => {
  try {
    const retailerId = await getRetailerIdFromAuth(req, res);
    if (!retailerId) return;

    const schema = Joi.object({
      name: Joi.string().min(2).max(100).optional(),
      category: Joi.string().valid('FASHION', 'BIKES', 'SHOES', 'MOTORS', 'GLASSES', 'JEWELRY', 'WATCHES', 'AUTOMOTIVE', 'FURNITURE', 'BAGS').optional(),
      url: Joi.string().uri().optional(),
      domain: Joi.string().uri().optional(),
      isActive: Joi.boolean().optional(),
      language: Joi.string().valid('nl','en').optional(),
      brandingHideLogo: Joi.boolean().optional(),
      promoEnabled: Joi.boolean().optional(),
      promoStartDate: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional().allow(null),
      promoEndDate: Joi.alternatives().try(Joi.date().iso(), Joi.string()).optional().allow(null),
      widgetColorGradientFrom: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorGradientTo: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorShadow: Joi.string().max(64).optional().allow(null),
      widgetColorButtonBg: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorButtonBorder: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorTileText: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetColorTileBorder: Joi.string().pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional().allow(null),
      widgetButtonColorFrom: Joi.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
      widgetButtonColorTo: Joi.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
      widgetButtonLabelColor: Joi.string().pattern(/^(#([0-9a-fA-F]{3,8})|rgba?\([^\)]+\)|hsla?\([^\)]+\))$/).optional().allow(null),
      widgetButtonIcon: Joi.string().valid('white', 'color').optional().allow(null),
      widgetButtonLabels: Joi.object({ nl: Joi.string().max(20).allow('', null), en: Joi.string().max(20).allow('', null) }).optional().allow(null)
    });
    const { error: vErr, value } = schema.validate(req.body);
    if (vErr) { res.status(400).json({ success: false, message: vErr.details[0].message }); return; }

    const shopId = req.params.shopId;
    const { data: shop, error: sErr } = await supabaseAdmin
      .from('shops')
      .select('id, retailer_id')
      .eq('id', shopId)
      .single();
    if (sErr || !shop || shop.retailer_id !== retailerId) {
      res.status(404).json({ success: false, message: 'Shop niet gevonden' });
      return;
    }

    const updates: any = {};
    if (value.name !== undefined) updates.name = value.name;
    if (value.category !== undefined) updates.category = value.category;
    if (value.url !== undefined) updates.url = value.url;
    if (value.domain !== undefined) {
      // Normalize incoming domain or derive from value.url
      let domainNormalized: string | null = null;
      try {
        const raw = value.domain || value.url;
        if (raw) {
          const withScheme = /^https?:\/\//i.test(String(raw)) ? String(raw) : `https://${String(raw)}`;
          const parsed = new URL(withScheme);
          const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
          domainNormalized = `https://${host}`;
        }
      } catch {}
      if (domainNormalized) updates.domain = domainNormalized;
    }
    if (value.isActive !== undefined) updates.is_active = !!value.isActive;
    if (value.language !== undefined) updates.language = value.language;
    if (typeof value.brandingHideLogo === 'boolean') updates.branding_hide_logo = !!value.brandingHideLogo;
    if (typeof value.promoEnabled === 'boolean') updates.promo_enabled = !!value.promoEnabled;
    if (value.promoStartDate !== undefined) {
      if (value.promoStartDate === null) updates.promo_start_date = null;
      else {
        const d = new Date(value.promoStartDate);
        updates.promo_start_date = isNaN(d.getTime()) ? null : d.toISOString();
      }
    }
    if (value.promoEndDate !== undefined) {
      if (value.promoEndDate === null) updates.promo_end_date = null;
      else {
        const d = new Date(value.promoEndDate);
        updates.promo_end_date = isNaN(d.getTime()) ? null : d.toISOString();
      }
    }
    updates.updated_at = new Date().toISOString();

    // Enforce Enterprise-only gating for widget colors on update
    const updatingAnyWidgetColors = (
      value.widgetColorGradientFrom !== undefined ||
      value.widgetColorGradientTo !== undefined ||
      value.widgetColorShadow !== undefined ||
      value.widgetColorButtonBg !== undefined ||
      value.widgetColorButtonBorder !== undefined ||
      value.widgetColorTileText !== undefined ||
      value.widgetColorTileBorder !== undefined
    );
    if (updatingAnyWidgetColors) {
      let isEnterprise = false;
      try {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('plan_type, status')
          .eq('retailer_id', retailerId)
          .eq('status', 'ACTIVE')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const plan = (sub && (sub as any).plan_type ? String((sub as any).plan_type).toUpperCase() : 'FREEMIUM');
        isEnterprise = plan === 'ENTERPRISE';
      } catch {}
      if (!isEnterprise) {
        res.status(403).json({ success: false, message: 'Kleurcustomization is alleen beschikbaar voor Enterprise' });
        return;
      }
      if (value.widgetColorGradientFrom !== undefined) updates.widget_color_gradient_from = value.widgetColorGradientFrom;
      if (value.widgetColorGradientTo !== undefined) updates.widget_color_gradient_to = value.widgetColorGradientTo;
      if (value.widgetColorShadow !== undefined) updates.widget_color_shadow = value.widgetColorShadow;
      if (value.widgetColorButtonBg !== undefined) updates.widget_color_button_bg = value.widgetColorButtonBg;
      if (value.widgetColorButtonBorder !== undefined) updates.widget_color_button_border = value.widgetColorButtonBorder;
      if (value.widgetColorTileText !== undefined) updates.widget_color_tile_text = value.widgetColorTileText;
      if (value.widgetColorTileBorder !== undefined) updates.widget_color_tile_border = value.widgetColorTileBorder;
    }

    // Enforce Enterprise-only gating for widget button customization on update
    const updatingAnyWidgetButton = (
      value.widgetButtonColorFrom !== undefined ||
      value.widgetButtonColorTo !== undefined ||
      value.widgetButtonLabelColor !== undefined ||
      value.widgetButtonIcon !== undefined ||
      value.widgetButtonLabels !== undefined
    );
    if (updatingAnyWidgetButton) {
      let isEnterpriseBtn = false;
      try {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('plan_type, status')
          .eq('retailer_id', retailerId)
          .eq('status', 'ACTIVE')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const plan = (sub && (sub as any).plan_type ? String((sub as any).plan_type).toUpperCase() : 'FREEMIUM');
        isEnterpriseBtn = plan === 'ENTERPRISE';
      } catch {}
      if (!isEnterpriseBtn) {
        res.status(403).json({ success: false, message: 'Knopcustomization is alleen beschikbaar voor Enterprise' });
        return;
      }
      if (value.widgetButtonColorFrom !== undefined) updates.widget_button_color_from = value.widgetButtonColorFrom;
      if (value.widgetButtonColorTo !== undefined) updates.widget_button_color_to = value.widgetButtonColorTo;
      if (value.widgetButtonLabelColor !== undefined) updates.widget_button_label_color = value.widgetButtonLabelColor;
      if (value.widgetButtonIcon !== undefined) updates.widget_button_icon = value.widgetButtonIcon;
      if (value.widgetButtonLabels !== undefined) updates.widget_button_labels = value.widgetButtonLabels;
    }
    // Enforce plan gating for branding_hide_logo: only PREMIUM/ENTERPRISE may set true
    if (updates.branding_hide_logo === true) {
      try {
        const { data: sub } = await supabaseAdmin
          .from('subscriptions')
          .select('plan_type, status')
          .eq('retailer_id', retailerId)
          .eq('status', 'ACTIVE')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const plan = (sub && (sub as any).plan_type ? String((sub as any).plan_type).toUpperCase() : 'FREEMIUM');
        const allowed = plan === 'PREMIUM' || plan === 'ENTERPRISE';
        if (!allowed) {
          res.status(403).json({ success: false, message: 'Branding verbergen is alleen beschikbaar voor Premium/Enterprise' });
          return;
        }
      } catch {
        // If subscription lookup fails, do not allow enabling
        res.status(403).json({ success: false, message: 'Kan abonnement niet verifiëren voor branding optie' });
        return;
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('shops')
      .update(updates)
      .eq('id', shopId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ success: false, message: 'Failed to update shop' });
  }
});

// POST /:shopId/rotate-key - rotate shop api key
router.post('/:shopId/rotate-key', async (req, res): Promise<void> => {
  try {
    const retailerId = await getRetailerIdFromAuth(req, res);
    if (!retailerId) return;

    const shopId = req.params.shopId;
    const { data: shop, error: sErr } = await supabaseAdmin
      .from('shops')
      .select('id, retailer_id')
      .eq('id', shopId)
      .single();
    if (sErr || !shop || shop.retailer_id !== retailerId) {
      res.status(404).json({ success: false, message: 'Shop niet gevonden' });
      return;
    }

    const apiKey = crypto.randomBytes(32).toString('hex');
    const { data: updated, error } = await supabaseAdmin
      .from('shops')
      .update({ api_key: apiKey, updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .select('id, api_key')
      .single();

    if (error) throw error;
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Rotate shop api key error:', error);
    res.status(500).json({ success: false, message: 'Failed to rotate API key' });
  }
});

// DELETE /:shopId - delete shop
router.delete('/:shopId', async (req, res): Promise<void> => {
  try {
    const retailerId = await getRetailerIdFromAuth(req, res);
    if (!retailerId) return;

    const shopId = req.params.shopId;
    const { data: shop, error: sErr } = await supabaseAdmin
      .from('shops')
      .select('id, retailer_id')
      .eq('id', shopId)
      .single();
    if (sErr || !shop || shop.retailer_id !== retailerId) {
      res.status(404).json({ success: false, message: 'Shop niet gevonden' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('shops')
      .delete()
      .eq('id', shopId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Delete shop error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete shop' });
  }
});

export default router;

// POST /:shopId/logo - upload or replace shop logo (png/svg, <= 2MB)
router.post('/:shopId/logo', upload.single('logo'), async (req, res): Promise<void> => {
  try {
    const retailerId = await getRetailerIdFromAuth(req, res);
    if (!retailerId) return;

    const shopId = req.params.shopId;
    const { data: shop, error: sErr } = await supabaseAdmin
      .from('shops')
      .select('id, retailer_id')
      .eq('id', shopId)
      .single();
    if (sErr || !shop || shop.retailer_id !== retailerId) {
      res.status(404).json({ success: false, message: 'Shop niet gevonden' });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'Geen bestand geüpload' });
      return;
    }

    // Validate type and size
    const allowed = ['image/png', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) {
      res.status(400).json({ success: false, message: 'Alleen PNG of SVG toegestaan' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      res.status(400).json({ success: false, message: 'Bestand mag niet groter zijn dan 2MB' });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype === 'image/svg+xml' ? '.svg' : '.png');
    const fileName = `brandLogo_${shopId}${ext}`;

    // Upload to Supabase Storage
    const { error: upErr } = await supabaseAdmin.storage
      .from('shop_logos')
      .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
    if (upErr) {
      res.status(500).json({ success: false, message: `Upload mislukt: ${upErr.message}` });
      return;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('shop_logos')
      .getPublicUrl(fileName);
    const logoUrl = urlData.publicUrl;

    const { error: updErr } = await supabaseAdmin
      .from('shops')
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq('id', shopId);
    if (updErr) throw updErr;

    res.json({ success: true, url: logoUrl, fileName });
  } catch (error) {
    console.error('Upload shop logo error:', error);
    res.status(500).json({ success: false, message: 'Upload mislukt' });
  }
});
