"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("../routes/auth"));
const authSupabase_1 = __importDefault(require("../routes/authSupabase"));
const consumer_1 = __importDefault(require("../routes/consumer"));
const sessions_1 = __importDefault(require("../routes/sessions"));
const n8nWebhook_1 = __importDefault(require("../routes/n8nWebhook"));
const analytics_1 = __importDefault(require("../routes/analytics"));
const shops_1 = __importDefault(require("../routes/shops"));
const retailer_1 = __importDefault(require("../routes/retailer"));
const contact_1 = __importDefault(require("../routes/contact"));
const billing_1 = __importDefault(require("../routes/billing"));
const webhook_1 = __importDefault(require("../routes/webhook"));
const subscription_1 = __importDefault(require("../routes/subscription"));
const emailService_1 = require("../services/emailService");
const scraper_1 = __importDefault(require("../routes/scraper"));
const owner_1 = __importDefault(require("../routes/owner"));
const categories_1 = __importDefault(require("../routes/categories"));
const app = (0, express_1.default)();
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
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            frameAncestors: ["'self'", "*"],
        },
    },
}));
app.use((0, cookie_parser_1.default)());
app.use((req, _res, next) => {
    if (req.url.startsWith('/api/api/')) {
        req.url = req.url.replace('/api/api/', '/api/');
    }
    else if (req.url === '/api/api') {
        req.url = '/api';
    }
    next();
});
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const envOrigins = [
        process.env.FRONTEND_ORIGIN,
        ...(process.env.FRONTEND_ORIGINS ? process.env.FRONTEND_ORIGINS.split(',').map(s => s.trim()) : []),
    ].filter(Boolean);
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://fit-production-0aea.up.railway.app',
        'https://fit-production.up.railway.app',
        'https://fit-uat.up.railway.app',
        'https://fit.brendr.io',
        'https://reels.brendr.io',
        'https://zoozoo.shop',
        'https://www.zoozoo.shop',
        ...envOrigins
    ];
    const isRailwayOrigin = (o) => !!o && /https?:\/\/[^\s]+\.up\.railway\.app$/i.test(o);
    const isAllowedOrigin = (o) => !!o && (allowedOrigins.includes(o) || isRailwayOrigin(o));
    if (req.path.startsWith('/api/')) {
        const ok = isAllowedOrigin(origin);
        if (ok && origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
        }
        else if (allowedOrigins.length > 0) {
            const fallback = allowedOrigins[0];
            res.setHeader('Access-Control-Allow-Origin', fallback);
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    else {
        if (isAllowedOrigin(origin) && origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary', 'Origin');
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});
app.use('/api/webhooks', webhook_1.default);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../../uploads')));
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use('/api/auth-supabase', authSupabase_1.default);
app.use('/api/auth-legacy', auth_1.default);
app.use('/api/consumer', consumer_1.default);
app.use('/api/sessions', sessions_1.default);
app.use('/api/webhooks', n8nWebhook_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/retailer', retailer_1.default);
app.use('/api/shops', shops_1.default);
app.use('/api/billing', billing_1.default);
app.use('/api/subscription', subscription_1.default);
app.use('/api/scrape', scraper_1.default);
app.use('/api/owner', owner_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/contact', contact_1.default);
app.get('/__hash-bridge.js', (req, res) => {
    const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const js = `!function(){try{var base=${JSON.stringify(process.env.CLIENT_URL || '')}||function(){try{var e=document.referrer||"";if(e)return e.split("/").slice(0,3).join("/")}catch(e){}return"http://localhost:5173"}(),h=(window.location.hash||"").replace(/^#/,'');window.location.replace(base+"/verify/consumer"+(h?"?"+h:""))}catch(e){window.location.href="${clientBase}/verify/consumer"}}();`;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.status(200).send(js);
});
app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
});
app.get('/', (req, res) => {
    const clientBase = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Redirect...</title></head><body>
  <script src="/__hash-bridge.js"></script>
  <noscript><meta http-equiv="refresh" content="0;url=${clientBase}/verify/consumer"/></noscript>
  </body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
});
app.use((err, req, res, next) => {
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
const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
app.listen(port, '0.0.0.0', async () => {
    console.log(`🚀 Server draait op poort ${port}`);
    console.log(`📍 Health check: http://0.0.0.0:${port}/health`);
    console.log(`🔐 Auth API: http://0.0.0.0:${port}/api/auth`);
    try {
        const srv = process.env.SERVER_URL || '(unset)';
        const su = process.env.SUPABASE_URL || '(unset)';
        const ref = (() => { try {
            const u = new URL(su);
            return u.hostname.split('.')[0];
        }
        catch {
            return '(invalid)';
        } })();
        console.log(`🌍 SERVER_URL: ${srv}`);
        console.log(`🔗 Using Supabase URL (startup): ${su}`);
        console.log(`🧭 Supabase project ref (host subdomain): ${ref}`);
    }
    catch { }
    console.log('📧 Testing SMTP connection (non-blocking)...');
    const emailService = new emailService_1.EmailService();
    emailService.testConnection()
        .then(() => console.log('✅ SMTP connection OK'))
        .catch((err) => console.warn('⚠️ SMTP test failed:', err?.message || err));
});
//# sourceMappingURL=index.js.map