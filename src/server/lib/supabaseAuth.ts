import { createClient } from '@supabase/supabase-js';

// Environment
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase environment variables are missing. Please check your Railway environment variables.');
}

// Guard against environment mismatch (fail-fast)
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
} catch {}

// Debug which Supabase URL is used (use LOG_SUPABASE_URL=true to force in prod)
if (process.env.NODE_ENV !== 'production' || String(process.env.LOG_SUPABASE_URL).toLowerCase() === 'true') {
  try {
    console.log(`🔗 Using Supabase URL (lib/supabaseAuth): ${supabaseUrl}`);
  } catch {}
}

// Clients
export const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
export const supabaseClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helpers
export const authHelpers = {
  async createAuthUser(email: string, password: string, metadata: any, emailRedirectTo?: string) {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: metadata, emailRedirectTo: emailRedirectTo || undefined }
      });
      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (/Error sending confirmation email|unexpected_failure|535|email\s*.*failed|over_email_send_rate_limit/i.test(msg)) {
        const isRetailer = String((metadata && (metadata.userType || metadata.role)) || '').toLowerCase() === 'retailer';
        console.warn(
          isRetailer
            ? '⚠️ Supabase email failed for retailer. Falling back to admin.createUser WITHOUT email_confirm (Brevo zal verificatie sturen).'
            : '⚠️ Supabase email failed. Falling back to admin.createUser(email_confirm=true)'
        );
        try {
          const payload: any = {
            email,
            password,
            user_metadata: metadata
          };
          // Alleen voor niet-retailers direct als geverifieerd markeren
          if (!isRetailer) {
            payload.email_confirm = true;
          }

          const { data, error } = await supabaseAuth.auth.admin.createUser(payload as any);
          if (error) throw error;
          return { user: (data as any)?.user, session: null };
        } catch (adminErr: any) {
          const aMsg = String(adminErr?.message || '');
          // If the user already exists, fetch it and return
          if (/user.*exists|already\s*registered|duplicate/i.test(aMsg)) {
            try {
              const { data: users, error: listErr } = await supabaseAuth.auth.admin.listUsers();
              if (listErr) throw listErr;
              const existing = users.users.find(u => u.email === email);
              if (existing) return { user: existing as any, session: null };
            } catch (listCatch) {
              console.warn('⚠️ Could not list users after duplicate error:', listCatch);
            }
          }
          throw adminErr;
        }
      }
      throw err;
    }
  },

  async getUserByEmail(email: string) {
    const { data, error } = await supabaseAuth.auth.admin.listUsers();
    if (error) throw error;
    return data.users.find(user => user.email === email);
  },

  async getUserById(userId: string) {
    const { data, error } = await supabaseAuth.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user;
  },

  async updateUserMetadata(userId: string, metadata: any) {
    const { data, error } = await supabaseAuth.auth.admin.updateUserById(userId, { user_metadata: metadata });
    if (error) throw error;
    return data.user;
  },

  async updateUser(userId: string, updates: any) {
    const { data, error } = await supabaseAuth.auth.admin.updateUserById(userId, updates);
    if (error) throw error;
    return data.user;
  },

  async deleteUser(userId: string) {
    const { error } = await supabaseAuth.auth.admin.deleteUser(userId);
    if (error) throw error;
  },

  async generatePasswordResetLink(email: string) {
    const { data, error } = await supabaseAuth.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${process.env.CLIENT_URL}/reset-password` }
    });
    if (error) throw error;
    return data.properties?.action_link;
  },

  async verifyToken(token: string) {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error) throw error;
    return data.user;
  },

  async signInUser(email: string, password: string) {
    try {
      console.log('🔐 Attempting Supabase client login for:', email);
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('❌ Supabase client login error:', error);
        throw error;
      }
      console.log('✅ Supabase client login successful:', data.user?.id);
      return data;
    } catch (error) {
      console.error('💥 signInUser catch block:', error);
      throw error;
    }
  }
};
