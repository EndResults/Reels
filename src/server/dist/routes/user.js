"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const joi_1 = __importDefault(require("joi"));
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880')
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Alleen JPEG, PNG en WebP bestanden zijn toegestaan'));
        }
    }
});
const updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50),
    lastName: joi_1.default.string().min(2).max(50),
    dateOfBirth: joi_1.default.date().max('now'),
    gender: joi_1.default.string().valid('MALE', 'FEMALE', 'OTHER')
}).min(1);
const changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().required().min(8)
});
router.get('/profile', auth_1.authenticateToken, auth_1.requireUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await supabase_1.db.getUser(userId);
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
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van het profiel'
        });
    }
});
router.put('/profile', auth_1.authenticateToken, auth_1.requireUser, async (req, res) => {
    try {
        const { error, value } = updateProfileSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const userId = req.user.id;
        const updates = {};
        if (value.firstName)
            updates.first_name = value.firstName;
        if (value.lastName)
            updates.last_name = value.lastName;
        if (value.dateOfBirth)
            updates.date_of_birth = value.dateOfBirth;
        if (value.gender)
            updates.gender = value.gender;
        const updatedUser = await supabase_1.db.updateUser(userId, updates);
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
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het bijwerken van het profiel'
        });
    }
});
router.put('/password', auth_1.authenticateToken, auth_1.requireUser, async (req, res) => {
    try {
        const { error, value } = changePasswordSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        const userId = req.user.id;
        const { newPassword } = value;
        const { error: updateError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(userId, {
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
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord'
        });
    }
});
router.post('/profile/photo', auth_1.authenticateToken, auth_1.requireUser, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'Geen bestand geüpload'
            });
            return;
        }
        const userId = req.user.id;
        const file = req.file;
        const fileExtension = path_1.default.extname(file.originalname);
        const fileName = `${userId}-${Date.now()}${fileExtension}`;
        const user = await supabase_1.db.getUser(userId);
        if (user.profile_image_url) {
            try {
                const oldPath = user.profile_image_url.split('/').pop();
                if (oldPath) {
                    await supabase_1.supabaseAdmin.storage.from('profile-images').remove([oldPath]);
                }
            }
            catch (deleteError) {
                console.error('Failed to delete old profile image:', deleteError);
            }
        }
        const { data: uploadData, error: uploadError } = await supabase_1.supabaseAdmin.storage
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
        const { data: urlData } = supabase_1.supabaseAdmin.storage
            .from('profile-images')
            .getPublicUrl(fileName);
        const updatedUser = await supabase_1.db.updateUser(userId, {
            profile_image_url: urlData.publicUrl
        });
        res.json({
            success: true,
            message: 'Profielfoto succesvol geüpload',
            data: {
                profileImageUrl: updatedUser.profile_image_url
            }
        });
    }
    catch (error) {
        console.error('Upload photo error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het uploaden van de foto'
        });
    }
});
router.get('/fit-sessions', auth_1.authenticateToken, auth_1.requireUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const sessions = await supabase_1.db.getUserFitSessions(userId, limit, offset);
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
    }
    catch (error) {
        console.error('Get user FiT sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van FiT sessies'
        });
    }
});
router.delete('/fit-sessions/:sessionId', auth_1.authenticateToken, auth_1.requireUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessionId = req.params.sessionId;
        const session = await supabase_1.db.getFitSession(sessionId);
        if (!session || session.user_id !== userId) {
            res.status(404).json({
                success: false,
                message: 'FiT sessie niet gevonden'
            });
            return;
        }
        const filesToDelete = [];
        if (session.user_image_url) {
            const userImagePath = session.user_image_url.split('/').pop();
            if (userImagePath)
                filesToDelete.push(['fit-results', userImagePath]);
        }
        if (session.generated_image_url) {
            const generatedImagePath = session.generated_image_url.split('/').pop();
            if (generatedImagePath)
                filesToDelete.push(['fit-results', generatedImagePath]);
        }
        for (const [bucket, path] of filesToDelete) {
            try {
                await supabase_1.supabaseAdmin.storage.from(bucket).remove([path]);
            }
            catch (fileError) {
                console.error('Failed to delete file:', fileError);
            }
        }
        await supabase_1.db.deleteFitSession(sessionId);
        res.json({
            success: true,
            message: 'FiT sessie succesvol verwijderd'
        });
    }
    catch (error) {
        console.error('Delete FiT session error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het verwijderen van de FiT sessie'
        });
    }
});
router.get('/stats', auth_1.authenticateToken, auth_1.requireUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await supabase_1.db.getUserFitSessions(userId, 1000, 0);
        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(session => session.status === 'COMPLETED').length;
        const recentSessions = await supabase_1.db.getUserFitSessions(userId, 5, 0);
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
    }
    catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van statistieken'
        });
    }
});
router.delete('/account', auth_1.authenticateToken, auth_1.requireUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await supabase_1.db.getUser(userId);
        const sessions = await supabase_1.db.getUserFitSessions(userId, 1000, 0);
        const filesToDelete = [];
        if (user.profile_image_url) {
            const profileImagePath = user.profile_image_url.split('/').pop();
            if (profileImagePath)
                filesToDelete.push(['profile-images', profileImagePath]);
        }
        sessions.forEach(session => {
            if (session.user_image_url) {
                const userImagePath = session.user_image_url.split('/').pop();
                if (userImagePath)
                    filesToDelete.push(['fit-results', userImagePath]);
            }
            if (session.generated_image_url) {
                const generatedImagePath = session.generated_image_url.split('/').pop();
                if (generatedImagePath)
                    filesToDelete.push(['fit-results', generatedImagePath]);
            }
        });
        for (const [bucket, path] of filesToDelete) {
            try {
                await supabase_1.supabaseAdmin.storage.from(bucket).remove([path]);
            }
            catch (fileError) {
                console.error('Failed to delete file:', fileError);
            }
        }
        await supabase_1.db.updateUser(userId, {
            is_active: false,
            email: `deleted_${userId}@deleted.com`
        });
        res.json({
            success: true,
            message: 'Account succesvol verwijderd'
        });
    }
    catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het verwijderen van het account'
        });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map