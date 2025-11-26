export declare const supabaseAuth: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const supabaseClient: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const authHelpers: {
    createAuthUser(email: string, password: string, metadata: any, emailRedirectTo?: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser | null;
        session: import("@supabase/supabase-js").AuthSession | null;
    } | {
        user: any;
        session: null;
    }>;
    getUserByEmail(email: string): Promise<import("@supabase/supabase-js").AuthUser | undefined>;
    getUserById(userId: string): Promise<import("@supabase/supabase-js").AuthUser>;
    updateUserMetadata(userId: string, metadata: any): Promise<import("@supabase/supabase-js").AuthUser>;
    updateUser(userId: string, updates: any): Promise<import("@supabase/supabase-js").AuthUser>;
    deleteUser(userId: string): Promise<void>;
    generatePasswordResetLink(email: string): Promise<string>;
    verifyToken(token: string): Promise<import("@supabase/supabase-js").AuthUser>;
    signInUser(email: string, password: string): Promise<{
        user: import("@supabase/supabase-js").AuthUser;
        session: import("@supabase/supabase-js").AuthSession;
        weakPassword?: import("@supabase/supabase-js").WeakPassword;
    }>;
};
//# sourceMappingURL=supabaseAuth.d.ts.map