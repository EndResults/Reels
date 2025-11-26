"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHelpers = exports.supabaseClient = exports.supabaseAuth = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are missing. Please check your Railway environment variables.');
}
try {
    const serverUrl = process.env.SERVER_URL || '';
    const isUAT = /fit-uat/i.test(serverUrl);
    const isPROD = /fit-production/i.test(serverUrl);
    if (isPROD && /ygmaxy/i.test(supabaseUrl)) {
        throw new Error('Wrong Supabase URL for production build (lib/supabaseAuth)');
    }
    if (isUAT && /hrulegh/i.test(supabaseUrl)) {
        throw new Error('Wrong Supabase URL for UAT build (lib/supabaseAuth)');
    }
}
catch { }
if (process.env.NODE_ENV !== 'production' || String(process.env.LOG_SUPABASE_URL).toLowerCase() === 'true') {
    try {
        console.log(`🔗 Using Supabase URL (lib/supabaseAuth): ${supabaseUrl}`);
    }
    catch { }
}
exports.supabaseAuth = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});
exports.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});
exports.authHelpers = {
    async createAuthUser(email, password, metadata, emailRedirectTo) {
        try {
            const { data, error } = await exports.supabaseClient.auth.signUp({
                email,
                password,
                options: { data: metadata, emailRedirectTo: emailRedirectTo || undefined }
            });
            if (error)
                throw error;
            return { user: data.user, session: data.session };
        }
        catch (err) {
            const msg = String(err?.message || '');
            if (/Error sending confirmation email|unexpected_failure|535|email\s*.*failed|over_email_send_rate_limit/i.test(msg)) {
                const isRetailer = String((metadata && (metadata.userType || metadata.role)) || '').toLowerCase() === 'retailer';
                console.warn(isRetailer
                    ? '⚠️ Supabase email failed for retailer. Falling back to admin.createUser WITHOUT email_confirm (Brevo zal verificatie sturen).'
                    : '⚠️ Supabase email failed. Falling back to admin.createUser(email_confirm=true)');
                try {
                    const payload = {
                        email,
                        password,
                        user_metadata: metadata
                    };
                    if (!isRetailer) {
                        payload.email_confirm = true;
                    }
                    const { data, error } = await exports.supabaseAuth.auth.admin.createUser(payload);
                    if (error)
                        throw error;
                    return { user: data?.user, session: null };
                }
                catch (adminErr) {
                    const aMsg = String(adminErr?.message || '');
                    if (/user.*exists|already\s*registered|duplicate/i.test(aMsg)) {
                        try {
                            const { data: users, error: listErr } = await exports.supabaseAuth.auth.admin.listUsers();
                            if (listErr)
                                throw listErr;
                            const existing = users.users.find(u => u.email === email);
                            if (existing)
                                return { user: existing, session: null };
                        }
                        catch (listCatch) {
                            console.warn('⚠️ Could not list users after duplicate error:', listCatch);
                        }
                    }
                    throw adminErr;
                }
            }
            throw err;
        }
    },
    async getUserByEmail(email) {
        const { data, error } = await exports.supabaseAuth.auth.admin.listUsers();
        if (error)
            throw error;
        return data.users.find(user => user.email === email);
    },
    async getUserById(userId) {
        const { data, error } = await exports.supabaseAuth.auth.admin.getUserById(userId);
        if (error)
            throw error;
        return data.user;
    },
    async updateUserMetadata(userId, metadata) {
        const { data, error } = await exports.supabaseAuth.auth.admin.updateUserById(userId, { user_metadata: metadata });
        if (error)
            throw error;
        return data.user;
    },
    async updateUser(userId, updates) {
        const { data, error } = await exports.supabaseAuth.auth.admin.updateUserById(userId, updates);
        if (error)
            throw error;
        return data.user;
    },
    async deleteUser(userId) {
        const { error } = await exports.supabaseAuth.auth.admin.deleteUser(userId);
        if (error)
            throw error;
    },
    async generatePasswordResetLink(email) {
        const { data, error } = await exports.supabaseAuth.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo: `${process.env.CLIENT_URL}/reset-password` }
        });
        if (error)
            throw error;
        return data.properties?.action_link;
    },
    async verifyToken(token) {
        const { data, error } = await exports.supabaseAuth.auth.getUser(token);
        if (error)
            throw error;
        return data.user;
    },
    async signInUser(email, password) {
        try {
            console.log('🔐 Attempting Supabase client login for:', email);
            const { data, error } = await exports.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                console.error('❌ Supabase client login error:', error);
                throw error;
            }
            console.log('✅ Supabase client login successful:', data.user?.id);
            return data;
        }
        catch (error) {
            console.error('💥 signInUser catch block:', error);
            throw error;
        }
    }
};
//# sourceMappingURL=supabaseAuth.js.map