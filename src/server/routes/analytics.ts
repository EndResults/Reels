import express from 'express';
import { supabaseAdmin } from '../lib/supabase';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify retailer JWT token
const authenticateRetailer = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Geen authenticatie token gevonden'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.userType !== 'retailer') {
      return res.status(403).json({
        success: false,
        message: 'Alleen retailers hebben toegang tot analytics'
      });
    }

    req.retailer = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Ongeldige authenticatie token'
    });
  }
};

// GET /dashboard - Get retailer dashboard analytics
router.get('/dashboard', authenticateRetailer, async (req: any, res) => {
  try {
    const retailerId = req.retailer.userId;
    const shopId = (req.query.shopId as string) || '';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Normalize date filters to ISO bounds if provided (inclusive day range)
    const formattedStartDate = startDate
      ? (startDate.includes('T') ? startDate : new Date(startDate + 'T00:00:00.000Z').toISOString())
      : undefined;
    const formattedEndDate = endDate
      ? (endDate.includes('T') ? endDate : new Date(endDate + 'T23:59:59.999Z').toISOString())
      : undefined;

    console.log('🔍 Dashboard analytics request:', { retailerId, shopId, userType: req.retailer.userType });

    // Get basic retailer info (retailers table doesn't have sessions_used, sessions_limit, plan_type)
    const { data: retailer, error: retailerError } = await supabaseAdmin
      .from('retailers')
      .select('shop_name, created_at')
      .eq('id', retailerId)
      .single();

    console.log('👤 Retailer query result:', { retailer, retailerError });

    if (retailerError || !retailer) {
      return res.status(404).json({
        success: false,
        message: 'Retailer niet gevonden'
      });
    }

    // Get shops for this retailer to calculate total usage
    const { data: shops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('id, sessions_used, sessions_limit')
      .eq('retailer_id', retailerId);

    if (shopsError) {
      console.error('Error fetching shops:', shopsError);
    }

    // Calculate total usage across all shops
    const totalSessionsUsed = (shops || []).reduce((sum, shop) => sum + (shop.sessions_used || 0), 0);
    const totalSessionsLimit = (shops || []).reduce((sum, shop) => sum + (shop.sessions_limit || 0), 0);

    // Get session statistics (optionally filter by shop)
    let sessions: any[] = [];
    if (shopId) {
      // When a specific shop is selected, filter by that shop (and retailer for safety)
      let byShopQuery = supabaseAdmin
        .from('fit_sessions')
        .select('id, user_id, status, created_at, shop_id')
        .eq('retailer_id', retailerId)
        .eq('shop_id', shopId);
      if (formattedStartDate) byShopQuery = byShopQuery.gte('created_at', formattedStartDate);
      if (formattedEndDate) byShopQuery = byShopQuery.lte('created_at', formattedEndDate);
      const { data: byShop, error: byShopError } = await byShopQuery;
      if (byShopError) {
        console.error('❌ Sessions by shop query error:', byShopError);
        throw byShopError;
      }
      sessions = byShop || [];
    } else {
      // No shop filter: fetch by retailer_id first
      let byRetailerQuery = supabaseAdmin
        .from('fit_sessions')
        .select('id, user_id, status, created_at, shop_id')
        .eq('retailer_id', retailerId);
      if (formattedStartDate) byRetailerQuery = byRetailerQuery.gte('created_at', formattedStartDate);
      if (formattedEndDate) byRetailerQuery = byRetailerQuery.lte('created_at', formattedEndDate);
      const { data: byRetailer, error: byRetailerError } = await byRetailerQuery;
      if (byRetailerError) {
        console.error('❌ Sessions by retailer query error:', byRetailerError);
        throw byRetailerError;
      }
      sessions = byRetailer || [];

      // Fallback: also include sessions linked via shop_id (in case retailer_id wasn't populated)
      const shopIds = (shops || []).map((s: any) => s.id).filter(Boolean);
      if (shopIds.length > 0) {
        let byShopsOnlyQuery = supabaseAdmin
          .from('fit_sessions')
          .select('id, user_id, status, created_at, shop_id')
          .in('shop_id', shopIds);
        if (formattedStartDate) byShopsOnlyQuery = byShopsOnlyQuery.gte('created_at', formattedStartDate);
        if (formattedEndDate) byShopsOnlyQuery = byShopsOnlyQuery.lte('created_at', formattedEndDate);
        const { data: byShopsOnly, error: byShopsOnlyError } = await byShopsOnlyQuery;
        if (byShopsOnlyError) {
          console.warn('⚠️ Sessions by shops fallback error (non-fatal):', byShopsOnlyError);
        } else if (byShopsOnly && byShopsOnly.length) {
          const map: Record<string, any> = {};
          [...sessions, ...byShopsOnly].forEach((s: any) => { if (s && s.id) map[String(s.id)] = s; });
          sessions = Object.values(map);
        }
      }
    }

    console.log('📊 Sessions aggregation:', {
      sessionsCount: sessions.length,
      retailerId,
      shopId: shopId || 'all'
    });

    // Calculate statistics
    const safeSessions = (sessions || []) as any[];
    const totalSessions = safeSessions.length;
    const uniqueUsers = Array.from(new Set(safeSessions.map((s: any) => s.user_id).filter(Boolean))).length;
    const completedSessions = safeSessions.filter(s => s.status === 'COMPLETED').length;
    const pendingSessions = safeSessions.filter(s => s.status === 'PENDING').length;
    const processingSessions = safeSessions.filter(s => s.status === 'PROCESSING').length;
    const failedSessions = safeSessions.filter(s => s.status === 'FAILED').length;

    console.log('📈 Calculated statistics:', {
      totalSessions,
      uniqueUsers,
      completedSessions,
      pendingSessions,
      processingSessions,
      failedSessions
    });

    // Calculate success rate
    const successRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Build chart and recents within selected range (default last 30 days)
    const now = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const fromRange = formattedStartDate ? new Date(formattedStartDate) : defaultFrom;
    const toRange = formattedEndDate ? new Date(formattedEndDate) : now;

    const recentSessions = safeSessions.filter(s => {
      const d = new Date(s.created_at);
      return d >= fromRange && d <= toRange;
    });

    // Group sessions by day
    const sessionsByDay = recentSessions.reduce((acc: any, session) => {
      const date = new Date(session.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Create array of last 30 days with session counts
    const chartData = [];
    // Build chart points based on selected range (max 90 days to keep payload small)
    const maxDays = 90;
    const daysDiff = Math.min(
      Math.max(1, Math.ceil((toRange.getTime() - fromRange.getTime()) / (1000 * 60 * 60 * 24)) + 1),
      maxDays
    );
    for (let i = daysDiff - 1; i >= 0; i--) {
      const date = new Date(toRange);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      chartData.push({
        date: dateStr,
        sessions: sessionsByDay[dateStr] || 0
      });
    }

    // Calculate usage percentage
    const usagePercentage = totalSessionsLimit > 0 
      ? (totalSessionsUsed / totalSessionsLimit) * 100 
      : 0;

    // Determine plan type strictly from active subscription (no heuristic)
    let derivedPlan: 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' = 'STARTER';
    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_type, status')
        .eq('retailer_id', retailerId)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub && sub.plan_type) {
        const p = String(sub.plan_type).toUpperCase();
        if (p === 'STARTER' || p === 'BASIC' || p === 'PREMIUM' || p === 'ENTERPRISE') {
          derivedPlan = p as any;
        }
      }
    } catch {}

    // Apply plan-based gating to statistics
    const gatedUniqueUsers = (derivedPlan === 'STARTER') ? null : uniqueUsers;

    const dashboardData = {
      retailer: {
        shopName: retailer.shop_name,
        planType: derivedPlan,
        memberSince: retailer.created_at
      },
      usage: {
        sessionsUsed: totalSessionsUsed,
        sessionsLimit: totalSessionsLimit,
        usagePercentage: Math.round(usagePercentage * 100) / 100
      },
      statistics: {
        totalSessions,
        uniqueUsers: gatedUniqueUsers,
        // Backward compatibility: activeUsers mirrors uniqueUsers
        activeUsers: gatedUniqueUsers,
        completedSessions,
        pendingSessions,
        processingSessions,
        failedSessions,
        successRate: Math.round(successRate * 100) / 100
      },
      chartData,
      filter: { shopId: shopId || null, startDate: formattedStartDate || null, endDate: formattedEndDate || null }
    };

    return res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van analytics'
    });
  }
});

// GET /sessions - Get detailed session list for retailer
router.get('/sessions', authenticateRetailer, async (req: any, res) => {
  try {
    const retailerId = req.retailer.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const shopId = (req.query.shopId as string) || '';
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const sortParam = (req.query.sort as string) || 'desc';
    const ascending = String(sortParam).toLowerCase() === 'asc';

    const formattedStartDate = startDate
      ? (startDate.includes('T') ? startDate : new Date(startDate + 'T00:00:00.000Z').toISOString())
      : undefined;
    const formattedEndDate = endDate
      ? (endDate.includes('T') ? endDate : new Date(endDate + 'T23:59:59.999Z').toISOString())
      : undefined;

    const offset = (page - 1) * limit;

    // Resolve plan for hard gating: sessions list only for PREMIUM/ENTERPRISE
    let plan: 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' = 'STARTER';
    try {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_type, status')
        .eq('retailer_id', retailerId)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sub && sub.plan_type) {
        const p = String(sub.plan_type).toUpperCase();
        if (p === 'STARTER' || p === 'BASIC' || p === 'PREMIUM' || p === 'ENTERPRISE') plan = p as any;
      }
    } catch {}
    // Allow limited access for non-premium: only the first page with max 4 items (for dashboard recents)
    if (plan !== 'PREMIUM' && plan !== 'ENTERPRISE') {
      if (page > 1 || limit > 4) {
        return res.status(403).json({ success: false, message: 'Alleen beschikbaar voor Premium abonnement' });
      }
    }

    // Build query
    let query = supabaseAdmin
      .from('fit_sessions')
      .select(`
        id,
        ai_processing_data,
        status,
        created_at,
        updated_at,
        shop_id,
        shops:shop_id ( id, name, url ),
        fit_session_products ( product_name, product_url, product_price, product_image_url ),
        users (
          gender,
          country
        )
      `)
      .eq('retailer_id', retailerId)
      .order('created_at', { ascending })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      query = query.eq('status', status);
    }
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }
    if (formattedStartDate) query = query.gte('created_at', formattedStartDate);
    if (formattedEndDate) query = query.lte('created_at', formattedEndDate);

    let { data: sessions, error: sessionsError } = await query;

    if (sessionsError) {
      // Fallback if some columns don't exist in current DB (e.g., shops.url or users.country)
      const msg = String((sessionsError as any)?.message || '');
      if ((sessionsError as any)?.code === '42703' || /column\s+.+\s+does\s+not\s+exist/i.test(msg)) {
        let fallback = supabaseAdmin
          .from('fit_sessions')
          .select(`
            id,
            ai_processing_data,
            status,
            created_at,
            updated_at,
            shop_id,
            shops:shop_id ( id, name ),
            fit_session_products ( product_name, product_url ),
            users (
              gender
            )
          `)
          .eq('retailer_id', retailerId)
          .order('created_at', { ascending })
          .range(offset, offset + limit - 1);
        if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
          fallback = fallback.eq('status', status);
        }
        if (shopId) fallback = fallback.eq('shop_id', shopId);
        if (formattedStartDate) fallback = fallback.gte('created_at', formattedStartDate);
        if (formattedEndDate) fallback = fallback.lte('created_at', formattedEndDate);
        const fb = await fallback;
        sessions = fb.data as any;
        sessionsError = fb.error as any;
      }
    }

    if (sessionsError) {
      throw sessionsError;
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('fit_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('retailer_id', retailerId);

    if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      countQuery = countQuery.eq('status', status);
    }
    if (shopId) {
      countQuery = countQuery.eq('shop_id', shopId);
    }
    if (formattedStartDate) countQuery = countQuery.gte('created_at', formattedStartDate);
    if (formattedEndDate) countQuery = countQuery.lte('created_at', formattedEndDate);

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    const totalPages = Math.ceil((count || 0) / limit);

    const safeSessions = (sessions || []) as any[];
    const formattedSessions = safeSessions.map((session: any) => {
      const shopRel = Array.isArray(session.shops) ? session.shops[0] : session.shops;
      const products = Array.isArray(session.fit_session_products) ? session.fit_session_products : [];
      const firstProduct = products.length > 0 ? products[0] : null;
      // Derive itemsCount: prefer products relation, fallback to AI data
      let itemsCount = products.length || 1;
      const aid = session.ai_processing_data;
      try {
        if (!products.length) {
          if (aid && Array.isArray(aid.items)) itemsCount = aid.items.length || 1;
          else if (aid && typeof aid.itemsCount === 'number') itemsCount = aid.itemsCount || 1;
        }
      } catch {}
      // Derive a product URL if present either from relation or AI data
      let productUrl: string | null = null;
      if (firstProduct && firstProduct.product_url) {
        productUrl = String(firstProduct.product_url);
      } else if (aid) {
        try {
          if (typeof aid.productUrl === 'string') productUrl = aid.productUrl;
          else if (aid.product && typeof aid.product.url === 'string') productUrl = aid.product.url;
        } catch {}
      }
      // Derive a product name (relation preferred, fallback to AI data)
      let productName: string | null = null;
      try {
        if (firstProduct && firstProduct.product_name) {
          productName = String(firstProduct.product_name);
        } else if (aid) {
          if (typeof aid.productName === 'string') productName = aid.productName;
          else if (aid.product && typeof aid.product.name === 'string') productName = aid.product.name;
          else if (aid.product && typeof aid.product.title === 'string') productName = aid.product.title;
        }
      } catch {}
      // Derive a product image URL (relation preferred, fallback across common AI shapes)
      let productImageUrl: string | null = null;
      try {
        if (firstProduct && firstProduct.product_image_url) {
          productImageUrl = String(firstProduct.product_image_url);
        } else if (aid) {
          if (typeof aid.productImageUrl === 'string') productImageUrl = aid.productImageUrl;
          else if (aid.product && typeof aid.product.imageUrl === 'string') productImageUrl = aid.product.imageUrl;
          else if (Array.isArray(aid.images) && aid.images.length) {
            const firstImg = aid.images[0];
            if (typeof firstImg === 'string') productImageUrl = firstImg;
            else if (firstImg && typeof firstImg.url === 'string') productImageUrl = firstImg.url;
            else if (firstImg && typeof firstImg.contentUrl === 'string') productImageUrl = firstImg.contentUrl;
            else if (firstImg && typeof firstImg.src === 'string') productImageUrl = firstImg.src;
          }
        }
      } catch {}

      const userRel = session.users && Array.isArray(session.users) && session.users.length > 0 ? session.users[0] : null;
      return {
        id: session.id,
        productId: null as any, // no product_id column in schema; keep key for UI fallback
        status: session.status,
        shopId: session.shop_id,
        shop: shopRel ? { id: shopRel.id, name: shopRel.name, url: shopRel.url || null } : null,
        itemsCount,
        user: userRel ? { gender: userRel.gender || null, country: userRel.country || null } : null,
        productUrl,
        productName,
        productImageUrl,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      };
    });

    return res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        pagination: {
          page,
          limit,
          totalPages,
          totalCount: count || 0
        },
        filter: { shopId: shopId || null, startDate: formattedStartDate || null, endDate: formattedEndDate || null }
      }
    });

  } catch (error) {
    console.error('Get sessions analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van sessie gegevens'
    });
  }
});

// GET /export - Export session data as CSV
router.get('/export', authenticateRetailer, async (req: any, res) => {
  try {
    const retailerId = req.retailer.userId;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const shopId = (req.query.shopId as string) || '';

    // Build query with date filters
    let query = supabaseAdmin
      .from('fit_sessions')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        shop_id,
        shops:shop_id ( id, name ),
        fit_session_products ( product_name, product_url ),
        users (
          first_name,
          last_name
        )
      `)
      .eq('retailer_id', retailerId)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      throw error;
    }

    // Generate CSV content
    const csvHeaders = 'Sessie ID,Shop ID,Shop Naam,Product Naam,Product URL,Status,Gebruiker,Aangemaakt,Bijgewerkt\n';
    const csvRows = sessions.map(session => {
      const shopRel = Array.isArray(session.shops) ? session.shops[0] : session.shops;
      const userRel = session.users && Array.isArray(session.users) && session.users.length > 0 ? session.users[0] : null;
      const userName = userRel ? `${userRel.first_name || ''} ${userRel.last_name || ''}`.trim() || 'Onbekend' : 'Onbekend';
      const products = Array.isArray(session.fit_session_products) ? session.fit_session_products : [];
      const firstProduct = products.length > 0 ? products[0] : null;
      const productName = firstProduct?.product_name || '';
      const productUrl = firstProduct?.product_url || '';

      return [
        session.id,
        session.shop_id || (shopRel ? shopRel.id : ''),
        shopRel ? shopRel.name : '',
        productName,
        productUrl,
        session.status,
        userName,
        new Date(session.created_at).toLocaleString('nl-NL'),
        new Date(session.updated_at).toLocaleString('nl-NL')
      ].join(',');
    }).join('\n');

    const csvContent = csvHeaders + csvRows;

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fit-sessions-export.csv');
    
    return res.send(csvContent);

  } catch (error) {
    console.error('Export sessions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het exporteren van gegevens'
    });
  }
});

// DEBUG: Test endpoint to check fit_sessions data
router.get('/debug/sessions/:retailerId', async (req: any, res) => {
  try {
    const retailerId = req.params.retailerId;
    
    console.log('🔍 Debug: Checking fit_sessions for retailer:', retailerId);
    
    // Get all sessions for this retailer
    const { data: sessions, error } = await supabaseAdmin
      .from('fit_sessions')
      .select('*')
      .eq('retailer_id', retailerId);
    
    console.log('📊 Debug sessions result:', { 
      count: sessions?.length || 0, 
      error,
      sessions: sessions?.slice(0, 3) // Show first 3 sessions
    });
    
    return res.json({
      success: true,
      retailerId,
      sessionsCount: sessions?.length || 0,
      sessions: sessions || [],
      error
    });
    
  } catch (error) {
    console.error('Debug sessions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Debug error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
