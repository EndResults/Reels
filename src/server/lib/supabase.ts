import { createClient } from '@supabase/supabase-js';

// Use Railway environment variables directly - no dotenv needed in production
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
  throw new Error('Supabase environment variables are missing. Please check your Railway environment variables.');
}

// Guard against environment mismatch (fail-fast)
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
} catch {}

// Debug which Supabase URL is used (use LOG_SUPABASE_URL=true to force in prod)
if (process.env.NODE_ENV !== 'production' || String(process.env.LOG_SUPABASE_URL).toLowerCase() === 'true') {
  try {
    console.log(`🔗 Using Supabase URL (lib/supabase): ${supabaseUrl}`);
  } catch {}
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const uploadFile = async (bucket: string, fileName: string, fileBuffer: Buffer, contentType?: string) => {
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(fileName, fileBuffer, { 
    contentType: contentType || 'application/octet-stream' 
  });
  return { data, error };
};

export const deleteFile = async (bucket: string, fileName: string) => {
  const { data, error } = await supabaseAdmin.storage.from(bucket).remove([fileName]);
  return { data, error };
};

export const getUserById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export const updateUser = async (id: string, updates: any) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Retailers
export const createRetailer = async (retailerData: any) => {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .insert(retailerData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export const getRetailerByEmail = async (email: string) => {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export const getRetailerById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export const updateRetailer = async (id: string, updates: any) => {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// FiT Sessions
export const createFitSession = async (sessionData: any) => {
  const { data, error } = await supabaseAdmin
    .from('fit_sessions')
    .insert(sessionData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export const getFitSessionById = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('fit_sessions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export const updateFitSession = async (id: string, updates: any) => {
  const { data, error } = await supabaseAdmin
    .from('fit_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export const getFitSessionsByUser = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('fit_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export const getRetailer = async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from('retailers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export const getRetailerSubscription = async (retailerId: string) => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('retailer_id', retailerId)
    .single();
  
  if (error) throw error;
  return data;
}

export const createSubscription = async (subscriptionData: any) => {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .insert(subscriptionData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export const updateSubscription = async (id: string, updates: any) => {
  let query = supabaseAdmin
    .from('subscriptions')
    .update(updates);
  // If a Stripe subscription id is provided, update by stripe_subscription_id
  if (typeof id === 'string' && id.startsWith('sub_')) {
    query = query.eq('stripe_subscription_id', id);
  } else {
    query = query.eq('id', id);
  }
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export const getUserFitSessions = async (userId: string, limit: number, offset: number) => {
  const { data, error } = await supabaseAdmin
    .from('fit_sessions')
    .select('*')
    .eq('user_id', userId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export const getRetailerFitSessions = async (retailerId: string, limit: number, offset: number) => {
  const { data, error } = await supabaseAdmin
    .from('fit_sessions')
    .select('*')
    .eq('retailer_id', retailerId)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export class Database {
  async getUserByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
  
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getUserById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createUser(userData: any) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUser(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUser(id: string) {
    return this.getUserById(id);
  }

  // Retailers
  async createRetailer(retailerData: any) {
    const { data, error } = await supabaseAdmin
      .from('retailers')
      .insert(retailerData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getRetailerByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('retailers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getRetailerById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('retailers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getRetailer(id: string) {
    return this.getRetailerById(id);
  }

  async updateRetailer(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('retailers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // FiT Sessions
  async createFitSession(sessionData: any) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .insert(sessionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getFitSessionById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getFitSession(id: string) {
    return this.getFitSessionById(id);
  }

  async updateFitSession(id: string, updates: any) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getFitSessionsByUser(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getFitSessionsByRetailer(retailerId: string) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .select('*')
      .eq('retailer_id', retailerId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getUserFitSessions(userId: string, limit: number, offset: number) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async getRetailerFitSessions(retailerId: string, limit: number, offset: number) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .select('*')
      .eq('retailer_id', retailerId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Subscriptions
  async getRetailerSubscription(retailerId: string) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('retailer_id', retailerId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createSubscription(subscriptionData: any) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateSubscription(id: string, updates: any) {
    let query = supabaseAdmin
      .from('subscriptions')
      .update(updates);
    if (typeof id === 'string' && id.startsWith('sub_')) {
      query = query.eq('stripe_subscription_id', id);
    } else {
      query = query.eq('id', id);
    }
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async deleteFitSession(id: string) {
    const { data, error } = await supabaseAdmin
      .from('fit_sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return data;
  }
}

export const db = new Database()