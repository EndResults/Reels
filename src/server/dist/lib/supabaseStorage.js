"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseStorageHelper = void 0;
const supabase_1 = require("./supabase");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
class SupabaseStorageHelper {
    static async uploadPasPhoto(file, photoType) {
        try {
            this.validateFile(file);
            const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
            const uniqueId = (0, crypto_1.randomUUID)();
            const fileName = `pasPhoto_${photoType}_${uniqueId}${fileExtension}`;
            console.log(` Uploading pasPhoto (${photoType}):`, fileName);
            const { error } = await supabase_1.supabaseAdmin.storage
                .from(this.BUCKET_NAME)
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });
            if (error) {
                console.error('Supabase upload error:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }
            const { data: urlData } = supabase_1.supabaseAdmin.storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(fileName);
            console.log(` PasPhoto (${photoType}) uploaded successfully:`, urlData.publicUrl);
            return {
                success: true,
                fileName: fileName,
                url: urlData.publicUrl,
                size: file.size
            };
        }
        catch (error) {
            console.error(` Error uploading pasPhoto (${photoType}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    static async uploadProductImage(file) {
        try {
            if (!file) {
                throw new Error('Geen bestand ontvangen');
            }
            const allowed = ['image/png', 'image/jpeg'];
            if (!allowed.includes(file.mimetype)) {
                throw new Error('Bestand moet PNG of JPG zijn');
            }
            const MAX = 3 * 1024 * 1024;
            if (file.size > MAX) {
                throw new Error('Bestand mag niet groter zijn dan 3MB');
            }
            const fileExtension = (path_1.default.extname(file.originalname || '').toLowerCase()) || '.jpg';
            const uniqueId = (0, crypto_1.randomUUID)();
            const fileName = `product_${uniqueId}${fileExtension}`;
            const { error } = await supabase_1.supabaseAdmin.storage
                .from(this.PRODUCT_BUCKET_NAME)
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });
            if (error) {
                console.error('Supabase product-image upload error:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }
            const { data: urlData } = supabase_1.supabaseAdmin.storage
                .from(this.PRODUCT_BUCKET_NAME)
                .getPublicUrl(fileName);
            return {
                success: true,
                fileName,
                url: urlData.publicUrl,
                size: file.size
            };
        }
        catch (error) {
            console.error(' Error uploading product image:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    static async deletePasPhoto(photoUrl) {
        try {
            if (!photoUrl) {
                return { success: true };
            }
            const fileName = this.extractFileNameFromUrl(photoUrl);
            if (!fileName) {
                throw new Error('Could not extract filename from URL');
            }
            console.log(` Deleting pasPhoto:`, fileName);
            const { error } = await supabase_1.supabaseAdmin.storage
                .from(this.BUCKET_NAME)
                .remove([fileName]);
            if (error) {
                console.error('Supabase deletion error:', error);
                throw new Error(`Deletion failed: ${error.message}`);
            }
            console.log(` PasPhoto deleted successfully:`, fileName);
            return { success: true };
        }
        catch (error) {
            console.error(' Error deleting pasPhoto:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    static validateFile(file) {
        if (!file)
            throw new Error('Geen bestand ontvangen');
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
            throw new Error('Alleen afbeeldingen toegestaan (JPEG, PNG, WebP, GIF)');
        }
        const MAX = 5 * 1024 * 1024;
        if (file.size > MAX)
            throw new Error('Bestand te groot');
    }
    static extractFileNameFromUrl(url) {
        const urlParts = url.split('/');
        return urlParts[urlParts.length - 1];
    }
}
exports.SupabaseStorageHelper = SupabaseStorageHelper;
SupabaseStorageHelper.BUCKET_NAME = 'profile-images';
SupabaseStorageHelper.PRODUCT_BUCKET_NAME = 'product-images';
//# sourceMappingURL=supabaseStorage.js.map