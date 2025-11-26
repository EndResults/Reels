export declare const supabaseAdmin: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare const uploadFile: (bucket: string, fileName: string, fileBuffer: Buffer, contentType?: string) => Promise<{
    data: {
        id: string;
        path: string;
        fullPath: string;
    } | null;
    error: import("@supabase/storage-js").StorageError | null;
}>;
export declare const deleteFile: (bucket: string, fileName: string) => Promise<{
    data: import("@supabase/storage-js").FileObject[] | null;
    error: import("@supabase/storage-js").StorageError | null;
}>;
export declare const getUserById: (id: string) => Promise<any>;
export declare const updateUser: (id: string, updates: any) => Promise<any>;
export declare const createRetailer: (retailerData: any) => Promise<any>;
export declare const getRetailerByEmail: (email: string) => Promise<any>;
export declare const getRetailerById: (id: string) => Promise<any>;
export declare const updateRetailer: (id: string, updates: any) => Promise<any>;
export declare const createFitSession: (sessionData: any) => Promise<any>;
export declare const getFitSessionById: (id: string) => Promise<any>;
export declare const updateFitSession: (id: string, updates: any) => Promise<any>;
export declare const getFitSessionsByUser: (userId: string) => Promise<any[]>;
export declare const getRetailer: (id: string) => Promise<any>;
export declare const getRetailerSubscription: (retailerId: string) => Promise<any>;
export declare const createSubscription: (subscriptionData: any) => Promise<any>;
export declare const updateSubscription: (id: string, updates: any) => Promise<any>;
export declare const getUserFitSessions: (userId: string, limit: number, offset: number) => Promise<any[]>;
export declare const getRetailerFitSessions: (retailerId: string, limit: number, offset: number) => Promise<any[]>;
export declare class Database {
    getUserByEmail(email: string): Promise<any>;
    getUserById(id: string): Promise<any>;
    createUser(userData: any): Promise<any>;
    updateUser(id: string, updates: any): Promise<any>;
    getUser(id: string): Promise<any>;
    createRetailer(retailerData: any): Promise<any>;
    getRetailerByEmail(email: string): Promise<any>;
    getRetailerById(id: string): Promise<any>;
    getRetailer(id: string): Promise<any>;
    updateRetailer(id: string, updates: any): Promise<any>;
    createFitSession(sessionData: any): Promise<any>;
    getFitSessionById(id: string): Promise<any>;
    getFitSession(id: string): Promise<any>;
    updateFitSession(id: string, updates: any): Promise<any>;
    getFitSessionsByUser(userId: string): Promise<any[]>;
    getFitSessionsByRetailer(retailerId: string): Promise<any[]>;
    getUserFitSessions(userId: string, limit: number, offset: number): Promise<any[]>;
    getRetailerFitSessions(retailerId: string, limit: number, offset: number): Promise<any[]>;
    getRetailerSubscription(retailerId: string): Promise<any>;
    createSubscription(subscriptionData: any): Promise<any>;
    updateSubscription(id: string, updates: any): Promise<any>;
    deleteFitSession(id: string): Promise<null>;
}
export declare const db: Database;
//# sourceMappingURL=supabase.d.ts.map