import { supabaseAdmin } from './supabase';
import { randomUUID } from 'crypto';
import path from 'path';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  size?: number;
}

export class SupabaseStorageHelper {
  private static readonly BUCKET_NAME = 'profile-images';
  private static readonly PRODUCT_BUCKET_NAME = 'product-images';

  /**
   * Upload a profile photo to Supabase Storage
   * @param file - The file to upload (from multer)
   * @param photoType - Type of photo: 'front', 'side', 'fullbody_front', 'fullbody_side'
   * @returns Promise with upload result
   */
  static async uploadPasPhoto(
    file: Express.Multer.File, 
    photoType: 'front' | 'side' | 'fullbody_front' | 'fullbody_side' | 'spouse' | 'member1' | 'member2' | 'member3' | 'member4' | 'room_1'
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename with specific naming convention
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const uniqueId = randomUUID();
      const fileName = `pasPhoto_${photoType}_${uniqueId}${fileExtension}`;

      console.log(` Uploading pasPhoto (${photoType}):`, fileName);

      // Upload to Supabase Storage
      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }
      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      console.log(` PasPhoto (${photoType}) uploaded successfully:`, urlData.publicUrl);

      return {
        success: true,
        fileName: fileName,
        url: urlData.publicUrl,
        size: file.size
      };

    } catch (error) {
      console.error(` Error uploading pasPhoto (${photoType}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Upload a product image to Supabase Storage (bucket: product-images)
   * Constraints: PNG or JPG only, max 3MB
   */
  static async uploadProductImage(
    file: Express.Multer.File
  ): Promise<UploadResult> {
    try {
      if (!file) {
        throw new Error('Geen bestand ontvangen');
      }
      // Validate type and size
      const allowed = ['image/png', 'image/jpeg'];
      if (!allowed.includes(file.mimetype)) {
        throw new Error('Bestand moet PNG of JPG zijn');
      }
      const MAX = 3 * 1024 * 1024; // 3MB
      if (file.size > MAX) {
        throw new Error('Bestand mag niet groter zijn dan 3MB');
      }

      const fileExtension = (path.extname(file.originalname || '').toLowerCase()) || '.jpg';
      const uniqueId = randomUUID();
      const fileName = `product_${uniqueId}${fileExtension}`;

      const { error } = await supabaseAdmin.storage
        .from(this.PRODUCT_BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase product-image upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(this.PRODUCT_BUCKET_NAME)
        .getPublicUrl(fileName);

      return {
        success: true,
        fileName,
        url: urlData.publicUrl,
        size: file.size
      };
    } catch (error) {
      console.error(' Error uploading product image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a pasPhoto from Supabase Storage
   * @param photoUrl - The public URL of the photo to delete
   * @returns Promise with deletion result
   */
  static async deletePasPhoto(photoUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!photoUrl) {
        return { success: true }; // Nothing to delete
      }

      // Extract filename from URL
      const fileName = this.extractFileNameFromUrl(photoUrl);
      if (!fileName) {
        throw new Error('Could not extract filename from URL');
      }

      console.log(` Deleting pasPhoto:`, fileName);

      const { error } = await supabaseAdmin.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        console.error('Supabase deletion error:', error);
        throw new Error(`Deletion failed: ${error.message}`);
      }

      console.log(` PasPhoto deleted successfully:`, fileName);
      return { success: true };

    } catch (error) {
      console.error(' Error deleting pasPhoto:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static validateFile(file: Express.Multer.File): void {
    if (!file) throw new Error('Geen bestand ontvangen');
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      throw new Error('Alleen afbeeldingen toegestaan (JPEG, PNG, WebP, GIF)');
    }
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) throw new Error('Bestand te groot');
  }

  private static extractFileNameFromUrl(url: string): string | null {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
