export interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
    fileName?: string;
    size?: number;
}
export declare class SupabaseStorageHelper {
    private static readonly BUCKET_NAME;
    private static readonly PRODUCT_BUCKET_NAME;
    static uploadPasPhoto(file: Express.Multer.File, photoType: 'front' | 'side' | 'fullbody_front' | 'fullbody_side' | 'spouse' | 'member1' | 'member2' | 'member3' | 'member4' | 'room_1'): Promise<UploadResult>;
    static uploadProductImage(file: Express.Multer.File): Promise<UploadResult>;
    static deletePasPhoto(photoUrl: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    private static validateFile;
    private static extractFileNameFromUrl;
}
//# sourceMappingURL=supabaseStorage.d.ts.map