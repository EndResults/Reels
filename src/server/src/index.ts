import express from 'express';
import helmet from 'helmet';
import path from 'path';
import cookieParser from 'cookie-parser';
import authRoutes from '../routes/auth';
import authSupabaseRoutes from '../routes/authSupabase';
import consumerRoutes from '../routes/consumer';
import sessionsRoutes from '../routes/sessions';
import n8nWebhookRoutes from '../routes/n8nWebhook';
import analyticsRoutes from '../routes/analytics';
import shopsRoutes from '../routes/shops';
import retailerRoutes from '../routes/retailer';
import contactRoutes from '../routes/contact';
import billingRoutes from '../routes/billing';
import webhookRoutes from '../routes/webhook';
import subscriptionRoutes from '../routes/subscription';

import { EmailService } from '../services/emailService'; // 👈 EmailService import toegevoegd
import scraperRoutes from '../routes/scraper';
import ownerRoutes from '../routes/owner';
import categoriesRoutes from '../routes/categories';

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  const serverUrl = process.env.SERVER_URL || '';
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const isUAT = /fit-uat/i.test(serverUrl);
  const isPROD = /fit-production/i.test(serverUrl);
  if (isPROD && /ygmaxy/i.test(supabaseUrl)) {
    throw new Error('Wrong Supabase URL for production build');
  }
  if (isUAT && /hrulegh/i.test(supabaseUrl)) {
    throw new Error('Wrong Supabase URL for UAT build');
  }
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      frameAncestors: ["'self'", "*"], // Allow iframe embedding from any domain
    },
  },
}));

// Parse cookies for HttpOnly session support
app.use(cookieParser());

// Normalize accidental double /api prefix from legacy clients (ensures CORS block matches intended routes)
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  } else if (req.url === '/api/api') {
    req.url = '/api';
  }
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  // Base allowlist + dynamic env-based origins
  const envOrigins = [
    process.env.FRONTEND_ORIGIN,
    ...(process.env.FRONTEND_ORIGINS ? process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim()) : []),
  ].filter(Boolean) as string[];
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://fit-production-0aea.up.railway.app', // legacy frontend
    'https://fit-production.up.railway.app',      // backend (same-site)
    'https://fit-uat.up.railway.app',
    'https://fit.brendr.io',                      // custom domain frontend
    'https://reels.brendr.io',
    'https://zoozoo.shop',
    'https://www.zoozoo.shop',
    ...envOrigins
  ];

  const isRailwayOrigin = (o?: string) => !!o && /https?:\/\/[^\s]+\.up\.railway\.app$/i.test(o);
  const isAllowedOrigin = (o?: string) => !!o && (allowedOrigins.includes(o) || isRailwayOrigin(o));

  if (req.path.startsWith('/api/')) {
    // All other API endpoints may use cookies or Authorization; allow credentials and echo specific Origin
    const ok = isAllowedOrigin(origin);
    if (ok && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else if (allowedOrigins.length > 0) {
      const fallback = allowedOrigins[0];
      res.setHeader('Access-Control-Allow-Origin', fallback);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  } else {
    // Non-API routes
    if (isAllowedOrigin(origin) && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Mount Stripe webhooks BEFORE JSON body parser to preserve raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth-supabase', authSupabaseRoutes);
app.use('/api/auth-legacy', authRoutes);

app.use('/api/consumer', consumerRoutes);

app.use('/api/sessions', sessionsRoutes);

app.use('/api/webhooks', n8nWebhookRoutes);

app.use('/api/analytics', analyticsRoutes);

app.use('/api/retailer', retailerRoutes);

app.use('/api/shops', shopsRoutes);

app.use('/api/billing', billingRoutes);

// Subscriptions (cancel/schedule endpoints)
app.use('/api/subscription', subscriptionRoutes);

// Adaptive product scraper
app.use('/api/scrape', scraperRoutes);

// Owner (admin) endpoints
app.use('/api/owner', ownerRoutes);

// Public categories endpoints (e.g., list active categories)
app.use('/api/categories', categoriesRoutes);

// Contact form
app.use('/api/contact', contactRoutes);

// Serve a tiny JS that moves the Supabase hash to the frontend verify page (no inline scripts => CSP-safe)
app.get('/__hash-bridge.js', (req, res) => {
  const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const js = `!function(){try{var base=${JSON.stringify(process.env.CLIENT_URL || '')}||function(){try{var e=document.referrer||"";if(e)return e.split("/").slice(0,3).join("/")}catch(e){}return"http://localhost:5173"}(),h=(window.location.hash||"").replace(/^#/,'');window.location.replace(base+"/verify/consumer"+(h?"?"+h:""))}catch(e){window.location.href="${clientBase}/verify/consumer"}}();`;
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.status(200).send(js);
});

// Favicon (avoid noisy 404 in consoles)
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

// Hash-bridge HTML that references the external JS (CSP-compliant)
app.get('/', (req, res) => {
  const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Redirect...</title></head><body>
  <script src="/__hash-bridge.js"></script>
  <noscript><meta http-equiv="refresh" content="0;url=${clientBase}/verify/consumer"/></noscript>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Er is een interne serverfout opgetreden'
      : err.message
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route niet gevonden'
  });
});

const port = typeof PORT === 'string' ? parseInt(PORT, 10) : (PORT as number);
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Server draait op poort ${port}`);
  console.log(`📍 Health check: http://0.0.0.0:${port}/health`);
  console.log(`🔐 Auth API: http://0.0.0.0:${port}/api/auth`);
  try {
    const srv = process.env.SERVER_URL || '(unset)';
    const su = process.env.SUPABASE_URL || '(unset)';
    const ref = (() => { try { const u = new URL(su); return u.hostname.split('.')[0]; } catch { return '(invalid)'; } })();
    console.log(`🌍 SERVER_URL: ${srv}`);
    console.log(`🔗 Using Supabase URL (startup): ${su}`);
    console.log(`🧭 Supabase project ref (host subdomain): ${ref}`);
  } catch {}
  
  // 👇 Test de SMTP-verbinding één keer bij opstart
  console.log('📧 Testing SMTP connection (non-blocking)...');
const emailService = new EmailService();
emailService.testConnection()
  .then(() => console.log('✅ SMTP connection OK'))
  .catch((err: any) => console.warn('⚠️ SMTP test failed:', err?.message || err));
});