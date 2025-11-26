import express from 'express';
import multer from 'multer';
import path from 'path';
import Joi from 'joi';
import { authenticateToken, requireUser, AuthRequest } from '../middleware/auth';
import { db, supabaseAdmin } from '../lib/supabase';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Alleen JPEG, PNG en WebP bestanden zijn toegestaan'));
    }
  }
});

// Validation schemas
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  dateOfBirth: Joi.date().max('now'),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER')
}).min(1);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required().min(8)
});

// Get user profile
router.get('/profile', authenticateToken, requireUser, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await db.getUser(userId);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          dateOfBirth: user.date_of_birth,
          gender: user.gender,
          profileImageUrl: user.profile_image_url,
          isActive: user.is_active,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van het profiel'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, requireUser, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const userId = req.user!.id;
    const updates: any = {};

    if (value.firstName) updates.first_name = value.firstName;
    if (value.lastName) updates.last_name = value.lastName;
    if (value.dateOfBirth) updates.date_of_birth = value.dateOfBirth;
    if (value.gender) updates.gender = value.gender;

    const updatedUser = await db.updateUser(userId, updates);

    res.json({
      success: true,
      message: 'Profiel succesvol bijgewerkt',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          dateOfBirth: updatedUser.date_of_birth,
          gender: updatedUser.gender,
          profileImageUrl: updatedUser.profile_image_url,
          isActive: updatedUser.is_active
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het bijwerken van het profiel'
    });
  }
});

// Change user password
router.put('/password', authenticateToken, requireUser, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const userId = req.user!.id;
    const { newPassword } = value;

    // Update user password using Supabase Auth admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      res.status(500).json({
        success: false,
        message: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Wachtwoord succesvol gewijzigd'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord'
    });
  }
});

// Upload profile photo
router.post('/profile/photo', authenticateToken, requireUser, upload.single('photo'), async (req: AuthRequest, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Geen bestand geüpload'
      });
      return;
    }

    const userId = req.user!.id;
    const file = req.file;
    const fileExtension = path.extname(file.originalname);
    const fileName = `${userId}-${Date.now()}${fileExtension}`;

    // Get current user to check for existing profile image
    const user = await db.getUser(userId);

    // Delete old profile image if exists
    if (user.profile_image_url) {
      try {
        const oldPath = user.profile_image_url.split('/').pop();
        if (oldPath) {
          await supabaseAdmin.storage.from('profile-images').remove([oldPath]);
        }
      } catch (deleteError) {
        console.error('Failed to delete old profile image:', deleteError);
      }
    }

    // Upload new image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('profile-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      res.status(500).json({
        success: false,
        message: 'Er is een fout opgetreden bij het uploaden van de foto'
      });
      return;
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from('profile-images')
      .getPublicUrl(fileName);

    // Update user profile with new image URL
    const updatedUser = await db.updateUser(userId, {
      profile_image_url: urlData.publicUrl
    });

    res.json({
      success: true,
      message: 'Profielfoto succesvol geüpload',
      data: {
        profileImageUrl: updatedUser.profile_image_url
      }
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het uploaden van de foto'
    });
  }
});

// Get user's FiT sessions
router.get('/fit-sessions', authenticateToken, requireUser, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const sessions = await db.getUserFitSessions(userId, limit, offset);

    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          productName: session.product_name,
          productUrl: session.product_url,
          productPrice: session.product_price,
          productImageUrl: session.product_image_url,
          userImageUrl: session.user_image_url,
          generatedImageUrl: session.generated_image_url,
          status: session.status,
          retailer: session.retailer ? {
            shopName: session.retailer.shop_name
          } : null,
          createdAt: session.created_at,
          processedAt: session.processed_at
        })),
        pagination: {
          page,
          limit,
          hasMore: sessions.length === limit
        }
      }
    });
  } catch (error) {
    console.error('Get user FiT sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van FiT sessies'
    });
  }
});

// Delete FiT session
router.delete('/fit-sessions/:sessionId', authenticateToken, requireUser, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.sessionId;

    // Get session to verify ownership and get file URLs
    const session = await db.getFitSession(sessionId);
    
    if (!session || session.user_id !== userId) {
      res.status(404).json({
        success: false,
        message: 'FiT sessie niet gevonden'
      });
      return;
    }

    // Delete associated files from Supabase Storage
    const filesToDelete = [];
    if (session.user_image_url) {
      const userImagePath = session.user_image_url.split('/').pop();
      if (userImagePath) filesToDelete.push(['fit-results', userImagePath]);
    }
    if (session.generated_image_url) {
      const generatedImagePath = session.generated_image_url.split('/').pop();
      if (generatedImagePath) filesToDelete.push(['fit-results', generatedImagePath]);
    }

    // Delete files (don't block deletion if file deletion fails)
    for (const [bucket, path] of filesToDelete) {
      try {
        await supabaseAdmin.storage.from(bucket as string).remove([path as string]);
      } catch (fileError) {
        console.error('Failed to delete file:', fileError);
      }
    }

    // Delete session from database
    await db.deleteFitSession(sessionId);

    res.json({
      success: true,
      message: 'FiT sessie succesvol verwijderd'
    });
  } catch (error) {
    console.error('Delete FiT session error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het verwijderen van de FiT sessie'
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, requireUser, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get user's session statistics
    const sessions = await db.getUserFitSessions(userId, 1000, 0); // Get all sessions
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(session => session.status === 'COMPLETED').length;
    const recentSessions = await db.getUserFitSessions(userId, 5, 0);

    res.json({
      success: true,
      data: {
        totalSessions,
        completedSessions,
        successRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        recentSessions: recentSessions.map(session => ({
          id: session.id,
          productName: session.product_name,
          status: session.status,
          retailer: session.retailer ? {
            shopName: session.retailer.shop_name
          } : null,
          createdAt: session.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het ophalen van statistieken'
    });
  }
});

// Delete user account
router.delete('/account', authenticateToken, requireUser, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Get user and their sessions
    const user = await db.getUser(userId);
    const sessions = await db.getUserFitSessions(userId, 1000, 0); // Get all sessions

    // Delete all associated files
    const filesToDelete = [];
    
    // Profile image
    if (user.profile_image_url) {
      const profileImagePath = user.profile_image_url.split('/').pop();
      if (profileImagePath) filesToDelete.push(['profile-images', profileImagePath]);
    }

    // Session files
    sessions.forEach(session => {
      if (session.user_image_url) {
        const userImagePath = session.user_image_url.split('/').pop();
        if (userImagePath) filesToDelete.push(['fit-results', userImagePath]);
      }
      if (session.generated_image_url) {
        const generatedImagePath = session.generated_image_url.split('/').pop();
        if (generatedImagePath) filesToDelete.push(['fit-results', generatedImagePath]);
      }
    });

    // Delete files (don't block account deletion if file deletion fails)
    for (const [bucket, path] of filesToDelete) {
      try {
        await supabaseAdmin.storage.from(bucket as string).remove([path as string]);
      } catch (fileError) {
        console.error('Failed to delete file:', fileError);
      }
    }

    // Deactivate user account (soft delete)
    await db.updateUser(userId, {
      is_active: false,
      email: `deleted_${userId}@deleted.com` // Anonymize email
    });

    res.json({
      success: true,
      message: 'Account succesvol verwijderd'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het verwijderen van het account'
    });
  }
});

export default router;