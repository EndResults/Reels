"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.Database = exports.getRetailerFitSessions = exports.getUserFitSessions = exports.updateSubscription = exports.createSubscription = exports.getRetailerSubscription = exports.getRetailer = exports.getFitSessionsByUser = exports.updateFitSession = exports.getFitSessionById = exports.createFitSession = exports.updateRetailer = exports.getRetailerById = exports.getRetailerByEmail = exports.createRetailer = exports.updateUser = exports.getUserById = exports.deleteFile = exports.uploadFile = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:');
    console.error('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
    throw new Error('Supabase environment variables are missing. Please check your Railway environment variables.');
}
try {
    const serverUrl = process.env.SERVER_URL || '';
    const isUAT = /fit-uat/i.test(serverUrl);
    const isPROD = /fit-production/i.test(serverUrl);
    if (isPROD && /ygmaxy/i.test(supabaseUrl || '')) {
        throw new Error('Wrong Supabase URL for production build (lib/supabase)');
    }
    if (isUAT && /hrulegh/i.test(supabaseUrl || '')) {
        throw new Error('Wrong Supabase URL for UAT build (lib/supabase)');
    }
}
catch { }
if (process.env.NODE_ENV !== 'production' || String(process.env.LOG_SUPABASE_URL).toLowerCase() === 'true') {
    try {
        console.log(`🔗 Using Supabase URL (lib/supabase): ${supabaseUrl}`);
    }
    catch { }
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
const uploadFile = async (bucket, fileName, fileBuffer, contentType) => {
    const { data, error } = await exports.supabaseAdmin.storage.from(bucket).upload(fileName, fileBuffer, {
        contentType: contentType || 'application/octet-stream'
    });
    return { data, error };
};
exports.uploadFile = uploadFile;
const deleteFile = async (bucket, fileName) => {
    const { data, error } = await exports.supabaseAdmin.storage.from(bucket).remove([fileName]);
    return { data, error };
};
exports.deleteFile = deleteFile;
const getUserById = async (id) => {
    const { data, error } = await exports.supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    return data;
};
exports.getUserById = getUserById;
const updateUser = async (id, updates) => {
    const { data, error } = await exports.supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.updateUser = updateUser;
const createRetailer = async (retailerData) => {
    const { data, error } = await exports.supabaseAdmin
        .from('retailers')
        .insert(retailerData)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.createRetailer = createRetailer;
const getRetailerByEmail = async (email) => {
    const { data, error } = await exports.supabaseAdmin
        .from('retailers')
        .select('*')
        .eq('email', email)
        .single();
    if (error && error.code !== 'PGRST116')
        throw error;
    return data;
};
exports.getRetailerByEmail = getRetailerByEmail;
const getRetailerById = async (id) => {
    const { data, error } = await exports.supabaseAdmin
        .from('retailers')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    return data;
};
exports.getRetailerById = getRetailerById;
const updateRetailer = async (id, updates) => {
    const { data, error } = await exports.supabaseAdmin
        .from('retailers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.updateRetailer = updateRetailer;
const createFitSession = async (sessionData) => {
    const { data, error } = await exports.supabaseAdmin
        .from('fit_sessions')
        .insert(sessionData)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.createFitSession = createFitSession;
const getFitSessionById = async (id) => {
    const { data, error } = await exports.supabaseAdmin
        .from('fit_sessions')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    return data;
};
exports.getFitSessionById = getFitSessionById;
const updateFitSession = async (id, updates) => {
    const { data, error } = await exports.supabaseAdmin
        .from('fit_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.updateFitSession = updateFitSession;
const getFitSessionsByUser = async (userId) => {
    const { data, error } = await exports.supabaseAdmin
        .from('fit_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data;
};
exports.getFitSessionsByUser = getFitSessionsByUser;
const getRetailer = async (id) => {
    const { data, error } = await exports.supabaseAdmin
        .from('retailers')
        .select('*')
        .eq('id', id)
        .single();
    if (error)
        throw error;
    return data;
};
exports.getRetailer = getRetailer;
const getRetailerSubscription = async (retailerId) => {
    const { data, error } = await exports.supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('retailer_id', retailerId)
        .single();
    if (error)
        throw error;
    return data;
};
exports.getRetailerSubscription = getRetailerSubscription;
const createSubscription = async (subscriptionData) => {
    const { data, error } = await exports.supabaseAdmin
        .from('subscriptions')
        .insert(subscriptionData)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.createSubscription = createSubscription;
const updateSubscription = async (id, updates) => {
    let query = exports.supabaseAdmin
        .from('subscriptions')
        .update(updates);
    if (typeof id === 'string' && id.startsWith('sub_')) {
        query = query.eq('stripe_subscription_id', id);
    }
    else {
        query = query.eq('id', id);
    }
    const { data, error } = await query.select().single();
    if (error)
        throw error;
    return data;
};
exports.updateSubscription = updateSubscription;
const getUserFitSessions = async (userId, limit, offset) => {
    const { data, error } = await exports.supabaseAdmin
        .from('fit_sessions')
        .select('*')
        .eq('user_id', userId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data;
};
exports.getUserFitSessions = getUserFitSessions;
const getRetailerFitSessions = async (retailerId, limit, offset) => {
    const { data, error } = await exports.supabaseAdmin
        .from('fit_sessions')
        .select('*')
        .eq('retailer_id', retailerId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return data;
};
exports.getRetailerFitSessions = getRetailerFitSessions;
class Database {
    async getUserByEmail(email) {
        const { data, error } = await exports.supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    async getUserById(id) {
        const { data, error } = await exports.supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        return data;
    }
    async createUser(userData) {
        const { data, error } = await exports.supabaseAdmin
            .from('users')
            .insert(userData)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateUser(id, updates) {
        const { data, error } = await exports.supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getUser(id) {
        return this.getUserById(id);
    }
    async createRetailer(retailerData) {
        const { data, error } = await exports.supabaseAdmin
            .from('retailers')
            .insert(retailerData)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getRetailerByEmail(email) {
        const { data, error } = await exports.supabaseAdmin
            .from('retailers')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        return data;
    }
    async getRetailerById(id) {
        const { data, error } = await exports.supabaseAdmin
            .from('retailers')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        return data;
    }
    async getRetailer(id) {
        return this.getRetailerById(id);
    }
    async updateRetailer(id, updates) {
        const { data, error } = await exports.supabaseAdmin
            .from('retailers')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async createFitSession(sessionData) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .insert(sessionData)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getFitSessionById(id) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        return data;
    }
    async getFitSession(id) {
        return this.getFitSessionById(id);
    }
    async updateFitSession(id, updates) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getFitSessionsByUser(userId) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getFitSessionsByRetailer(retailerId) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .select('*')
            .eq('retailer_id', retailerId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getUserFitSessions(userId, limit, offset) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .select('*')
            .eq('user_id', userId)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getRetailerFitSessions(retailerId, limit, offset) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .select('*')
            .eq('retailer_id', retailerId)
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async getRetailerSubscription(retailerId) {
        const { data, error } = await exports.supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('retailer_id', retailerId)
            .single();
        if (error)
            throw error;
        return data;
    }
    async createSubscription(subscriptionData) {
        const { data, error } = await exports.supabaseAdmin
            .from('subscriptions')
            .insert(subscriptionData)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateSubscription(id, updates) {
        let query = exports.supabaseAdmin
            .from('subscriptions')
            .update(updates);
        if (typeof id === 'string' && id.startsWith('sub_')) {
            query = query.eq('stripe_subscription_id', id);
        }
        else {
            query = query.eq('id', id);
        }
        const { data, error } = await query.select().single();
        if (error)
            throw error;
        return data;
    }
    async deleteFitSession(id) {
        const { data, error } = await exports.supabaseAdmin
            .from('fit_sessions')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return data;
    }
}
exports.Database = Database;
exports.db = new Database();
//# sourceMappingURL=supabase.js.map