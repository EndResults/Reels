"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRetailer = exports.requireAdmin = exports.requireUser = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = require("../lib/supabase");
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.fit_session;
    const token = cookieToken || headerToken;
    console.log(' Auth Debug - Headers:', req.headers['authorization'] ? 'Present' : 'Missing');
    console.log(' Auth Debug - Cookie present:', !!cookieToken);
    console.log(' Auth Debug - Token extracted (header||cookie):', !!token);
    console.log(' Auth Debug - JWT_SECRET exists:', !!process.env.JWT_SECRET);
    if (!token) {
        console.log(' No token provided');
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        console.log('🔐 Attempting JWT verification...');
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        console.log('✅ JWT verified successfully. Role:', decoded.role || decoded.userType, 'ID:', decoded.id || decoded.userId);
        const userRole = decoded.role || decoded.userType;
        const userId = decoded.id || decoded.userId;
        if (userRole === 'user') {
            console.log('🔍 Looking up user in database...');
            const user = await supabase_1.db.getUserById(userId);
            if (!user) {
                console.log('❌ User not found in database');
                res.status(401).json({ error: 'User not found' });
                return;
            }
            console.log('✅ User found:', user.email);
            req.user = { ...user, role: 'user' };
        }
        else if (userRole === 'retailer') {
            console.log('🔍 Looking up retailer in database...');
            let retailer = null;
            try {
                retailer = await supabase_1.db.getRetailerById(userId);
            }
            catch (e) {
            }
            if (!retailer) {
                try {
                    const byAuth = await supabase_1.supabaseAdmin
                        .from('retailers')
                        .select('*')
                        .eq('auth_id', userId)
                        .maybeSingle();
                    retailer = byAuth.data || null;
                }
                catch { }
            }
            if (!retailer) {
                try {
                    const email = (decoded && decoded.email);
                    if (email) {
                        const byEmail = await supabase_1.supabaseAdmin
                            .from('retailers')
                            .select('*')
                            .eq('email', email)
                            .maybeSingle();
                        retailer = byEmail.data || null;
                    }
                }
                catch { }
            }
            if (!retailer) {
                console.log('❌ Retailer not found in database');
                res.status(401).json({ error: 'Retailer not found' });
                return;
            }
            if (retailer && retailer.is_active === false) {
                try {
                    const { data: sub } = await supabase_1.supabaseAdmin
                        .from('subscriptions')
                        .select('plan_type, status, current_period_end')
                        .eq('retailer_id', retailer.id)
                        .eq('status', 'ACTIVE')
                        .order('updated_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    const hasGraceLogin = !!sub && sub.plan_type && String(sub.plan_type).toUpperCase() !== 'STARTER';
                    const path = req.originalUrl || req.path || '';
                    if (hasGraceLogin && /\/api\/retailer\/undo-close(\b|\/|\?|$)/.test(String(path || ''))) {
                        console.log('⚠️ Retailer inactive but grace login allowed for undo-close');
                        req.user = { ...retailer, role: 'retailer' };
                        req.retailer = { ...retailer, role: 'retailer' };
                        return next();
                    }
                }
                catch { }
                console.log('⛔ Retailer inactive');
                res.status(403).json({ error: 'Retailer inactive' });
                return;
            }
            console.log('✅ Retailer found:', retailer.email);
            req.user = { ...retailer, role: 'retailer' };
            req.retailer = { ...retailer, role: 'retailer' };
        }
        else {
            console.log('❌ Invalid token role:', userRole);
            res.status(401).json({ error: 'Invalid token type' });
            return;
        }
        console.log(' Authentication successful');
        next();
    }
    catch (error) {
        console.log('❌ JWT verification failed:', error.message);
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};
exports.authenticateToken = authenticateToken;
const requireUser = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'user' && decoded.userType !== 'user') {
            res.status(403).json({ error: 'User access required' });
            return;
        }
        const user = await supabase_1.db.getUserById(decoded.userId || decoded.id);
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        req.user = { ...user, role: 'user' };
        next();
    }
    catch (error) {
        console.log('❌ JWT verification failed:', error.message);
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};
exports.requireUser = requireUser;
const requireAdmin = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.fit_session;
    const token = cookieToken || headerToken;
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const role = decoded.role || decoded.userType;
        if (role === 'admin') {
            return next();
        }
        const userId = decoded.id || decoded.userId;
        if (!userId) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        try {
            const { data: user } = await supabase_1.supabaseAdmin
                .from('users')
                .select('id, user_type, email')
                .eq('id', userId)
                .maybeSingle();
            if (!user || String(user.user_type || '').toUpperCase() !== 'ADMIN') {
                res.status(403).json({ error: 'Admin access required' });
                return;
            }
        }
        catch {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        next();
    }
    catch (error) {
        console.log('❌ JWT verification failed (admin):', error.message);
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};
exports.requireAdmin = requireAdmin;
const requireRetailer = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'retailer' && decoded.userType !== 'retailer') {
            res.status(403).json({ error: 'Retailer access required' });
            return;
        }
        const rid = decoded.userId || decoded.id;
        let retailer = null;
        try {
            retailer = await supabase_1.db.getRetailerById(rid);
        }
        catch { }
        if (!retailer) {
            try {
                const byAuth = await supabase_1.supabaseAdmin
                    .from('retailers')
                    .select('*')
                    .eq('auth_id', rid)
                    .maybeSingle();
                retailer = byAuth.data || null;
            }
            catch { }
        }
        if (!retailer) {
            const email = (decoded && decoded.email);
            if (email) {
                try {
                    const byEmail = await supabase_1.supabaseAdmin
                        .from('retailers')
                        .select('*')
                        .eq('email', email)
                        .maybeSingle();
                    retailer = byEmail.data || null;
                }
                catch { }
            }
        }
        if (!retailer) {
            res.status(401).json({ error: 'Retailer not found' });
            return;
        }
        if (retailer && retailer.is_active === false) {
            res.status(403).json({ error: 'Retailer inactive' });
            return;
        }
        req.user = { ...retailer, role: 'retailer' };
        req.retailer = { ...retailer, role: 'retailer' };
        next();
    }
    catch (error) {
        console.log('❌ JWT verification failed:', error.message);
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
    }
};
exports.requireRetailer = requireRetailer;
//# sourceMappingURL=auth.js.map