"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const joi_1 = __importDefault(require("joi"));
const multer_1 = __importDefault(require("multer"));
const supabaseStorage_1 = require("../lib/supabaseStorage");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            cb(null, true);
        }
        else {
            cb(new Error('Alleen afbeeldingen zijn toegestaan (jpeg, jpg, png, gif, webp)'));
        }
    }
});
router.delete('/profile/pasphoto/:type', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const photoType = req.params.type;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        if (req.user?.role !== 'user') {
            res.status(403).json({ success: false, message: 'Alleen gebruikers kunnen pasfoto\'s verwijderen' });
            return;
        }
        const validTypes = ['front', 'side', 'fullbody_front', 'fullbody_side', 'spouse', 'member1', 'member2', 'member3', 'member4', 'room_1'];
        if (!validTypes.includes(photoType)) {
            res.status(400).json({ success: false, message: 'Ongeldig foto type' });
            return;
        }
        const columnName = `pasphoto_${photoType}`;
        const { data: current, error: selErr } = await supabase_1.supabaseAdmin
            .from('users')
            .select(columnName)
            .eq('id', userId)
            .single();
        if (selErr) {
            console.warn('Select current pasphoto failed', selErr);
        }
        const { error: updErr } = await supabase_1.supabaseAdmin
            .from('users')
            .update({ [columnName]: null, updated_at: new Date().toISOString() })
            .eq('id', userId);
        if (updErr) {
            res.status(500).json({ success: false, message: 'Fout bij verwijderen van foto in database' });
            return;
        }
        try {
            const url = current ? current[columnName] : undefined;
            if (url)
                await supabaseStorage_1.SupabaseStorageHelper.deletePasPhoto(url);
        }
        catch (e) {
            console.warn('Delete storage pasphoto failed', e);
        }
        res.json({ success: true, message: 'PasPhoto verwijderd', photoType: photoType });
    }
    catch (error) {
        console.error('PasPhoto delete error:', error);
        res.status(500).json({ success: false, message: 'Interne serverfout' });
    }
});
router.delete('/fit-sessions/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        const { data: session, error: sErr } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('id, user_id, active')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();
        if (sErr || !session) {
            res.status(404).json({ success: false, message: 'Sessie niet gevonden' });
            return;
        }
        if (session.active === false) {
            res.json({ success: true });
            return;
        }
        const { error: uErr } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', userId);
        if (uErr) {
            console.error('Error soft-deleting session:', uErr);
            res.status(500).json({ success: false, message: 'Verwijderen mislukt' });
            return;
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error in DELETE /fit-sessions/:sessionId:', error);
        res.status(500).json({ success: false, message: 'Interne serverfout' });
    }
});
router.put('/fit-sessions/:sessionId/feedback', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        const { satisfied, feedback } = req.body;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        const { data: session, error: selectError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .eq('active', true)
            .single();
        if (selectError || !session) {
            res.status(404).json({ success: false, message: 'Sessie niet gevonden' });
            return;
        }
        const updateData = { updated_at: new Date().toISOString() };
        if (typeof satisfied === 'boolean')
            updateData.satisfied = satisfied;
        if (feedback !== undefined)
            updateData.feedback = feedback;
        const { data: updated, error: updateError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .update(updateData)
            .eq('id', sessionId)
            .eq('user_id', userId)
            .eq('active', true)
            .select()
            .single();
        if (updateError) {
            console.error('Error updating feedback:', updateError);
            res.status(500).json({ success: false, message: 'Fout bij opslaan van feedback' });
            return;
        }
        res.json({ success: true, session: updated });
    }
    catch (error) {
        console.error('Error in fit-sessions/:sessionId/feedback:', error);
        res.status(500).json({ success: false, message: 'Interne serverfout' });
    }
});
const updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(1).max(100).required(),
    lastName: joi_1.default.string().min(1).max(100).required(),
    dateOfBirth: joi_1.default.date().iso().allow(null),
    gender: joi_1.default.string().valid('MALE', 'FEMALE', 'OTHER').allow(null)
});
router.get('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        if (req.user?.role !== 'user') {
            res.status(403).json({ success: false, message: 'Alleen gebruikers kunnen hun profiel ophalen' });
            return;
        }
        const { data: authUserData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.getUserById(userId);
        if (authError || !authUserData.user) {
            res.status(404).json({
                success: false,
                message: 'Gebruiker niet gevonden'
            });
            return;
        }
        const { data: profile } = await supabase_1.supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        const responseData = {
            id: authUserData.user.id,
            email: authUserData.user.email,
            firstName: profile?.first_name || authUserData.user.user_metadata?.firstName || '',
            lastName: profile?.last_name || authUserData.user.user_metadata?.lastName || '',
            dateOfBirth: profile?.date_of_birth || authUserData.user.user_metadata?.date_of_birth || null,
            gender: profile?.gender || authUserData.user.user_metadata?.gender || null,
            user_type: profile?.user_type || null,
            country: profile?.country || null,
            language: profile?.language || 'nl',
            height_cm: profile?.height_cm || null,
            weight_kg: profile?.weight_kg || null,
            profile_image_url: profile?.profile_image_url || null,
            pasPhoto_front: profile?.pasphoto_front || null,
            pasPhoto_side: profile?.pasphoto_side || null,
            pasPhoto_fullBody_front: profile?.pasphoto_fullbody_front || null,
            pasPhoto_fullBody_side: profile?.pasphoto_fullbody_side || null,
            pasPhoto_spouse: profile?.pasphoto_spouse || null,
            pasPhoto_member1: profile?.pasphoto_member1 || null,
            pasPhoto_member2: profile?.pasphoto_member2 || null,
            pasPhoto_member3: profile?.pasphoto_member3 || null,
            pasPhoto_member4: profile?.pasphoto_member4 || null,
            pasPhoto_room_1: profile?.pasphoto_room_1 || null,
            acceptedTermsAt: profile?.accepted_terms_at || null,
            termsVersion: profile?.terms_version || null,
            createdAt: authUserData.user.created_at,
            updatedAt: profile?.updated_at || authUserData.user.updated_at
        };
        res.json({
            success: true,
            profile: responseData
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
router.put('/profile', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        if (req.user?.role !== 'user') {
            res.status(403).json({ success: false, message: 'Alleen gebruikers kunnen hun profiel bijwerken' });
            return;
        }
        const profileUpdateSchema = joi_1.default.object({
            firstName: joi_1.default.string().min(1).max(100),
            lastName: joi_1.default.string().min(1).max(100),
            dateOfBirth: joi_1.default.date().iso().allow(null),
            gender: joi_1.default.string().valid('MALE', 'FEMALE', 'OTHER').allow(null),
            country: joi_1.default.string().max(100).allow(null),
            language: joi_1.default.string().length(2),
            height_cm: joi_1.default.number().integer().min(50).max(300).allow(null),
            weight_kg: joi_1.default.number().integer().min(20).max(500).allow(null),
            accepted_terms_at: joi_1.default.date().iso().allow(null),
            terms_version: joi_1.default.string().max(50)
        });
        const { error, value } = profileUpdateSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: 'Ongeldige gegevens',
                details: error.details.map(d => d.message)
            });
            return;
        }
        const updateData = {
            updated_at: new Date().toISOString()
        };
        if (value.firstName !== undefined)
            updateData.first_name = value.firstName;
        if (value.lastName !== undefined)
            updateData.last_name = value.lastName;
        if (value.dateOfBirth !== undefined)
            updateData.date_of_birth = value.dateOfBirth;
        if (value.gender !== undefined)
            updateData.gender = value.gender;
        if (value.country !== undefined)
            updateData.country = value.country;
        if (value.language !== undefined)
            updateData.language = value.language;
        if (value.height_cm !== undefined)
            updateData.height_cm = value.height_cm;
        if (value.weight_kg !== undefined)
            updateData.weight_kg = value.weight_kg;
        if (value.accepted_terms_at !== undefined)
            updateData.accepted_terms_at = value.accepted_terms_at;
        if (value.terms_version !== undefined)
            updateData.terms_version = value.terms_version;
        const { data, error: upsertError } = await supabase_1.supabaseAdmin
            .from('users')
            .upsert({ id: userId, ...updateData })
            .select()
            .single();
        if (upsertError) {
            console.error('Profile upsert error:', upsertError);
            res.status(500).json({
                success: false,
                message: 'Fout bij het bijwerken van profiel'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Profiel succesvol bijgewerkt',
            profile: data
        });
    }
    catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het bijwerken van het profiel'
        });
    }
});
router.post('/profile/photo', auth_1.authenticateToken, upload.single('profilePhoto'), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Geen bestand geüpload' });
            return;
        }
        console.log(`📸 Uploading profile photo for user ${userId}`);
        const { data: currentProfile } = await supabase_1.supabaseAdmin
            .from('users')
            .select('profile_image_url')
            .eq('id', userId)
            .single();
        const uploadResult = await supabaseStorage_1.SupabaseStorageHelper.uploadPasPhoto(req.file, 'front');
        if (!uploadResult.success) {
            res.status(500).json({
                success: false,
                message: 'Fout bij uploaden van foto',
                error: uploadResult.error
            });
            return;
        }
        const { error: updateError } = await supabase_1.supabaseAdmin
            .from('users')
            .upsert({
            id: userId,
            profile_image_url: uploadResult.url,
            updated_at: new Date().toISOString()
        });
        if (updateError) {
            console.error('Database update error:', updateError);
            await supabaseStorage_1.SupabaseStorageHelper.deletePasPhoto(uploadResult.url);
            res.status(500).json({
                success: false,
                message: 'Fout bij opslaan van foto in database'
            });
            return;
        }
        if (currentProfile?.profile_image_url) {
            await supabaseStorage_1.SupabaseStorageHelper.deletePasPhoto(currentProfile.profile_image_url);
        }
        res.json({
            success: true,
            message: 'Profielfoto succesvol geüpload',
            data: {
                profileImageUrl: uploadResult.url
            }
        });
    }
    catch (error) {
        console.error('Profile photo upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het uploaden van de foto'
        });
    }
});
const pasPhotoUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            cb(null, true);
        }
        else {
            cb(new Error('Alleen afbeeldingen zijn toegestaan (jpeg, jpg, png, gif, webp)'));
        }
    }
});
router.post('/profile/pasphoto/:type', auth_1.authenticateToken, pasPhotoUpload.single('pasPhoto'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const photoType = req.params.type;
        console.log(`🔐 Auth check - User ID: ${userId}, Role: ${req.user?.role}`);
        if (!userId) {
            console.log('❌ No user ID found in request');
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        if (req.user?.role !== 'user') {
            console.log('❌ Invalid user role:', req.user?.role);
            res.status(403).json({ success: false, message: 'Alleen gebruikers kunnen pasfoto\'s uploaden' });
            return;
        }
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Geen bestand geüpload' });
            return;
        }
        const validTypes = ['front', 'side', 'fullbody_front', 'fullbody_side', 'spouse', 'member1', 'member2', 'member3', 'member4', 'room_1'];
        if (!validTypes.includes(photoType)) {
            res.status(400).json({ success: false, message: 'Ongeldig foto type' });
            return;
        }
        console.log(`📸 Uploading pasPhoto ${photoType} for user ${userId}`);
        const columnName = `pasphoto_${photoType}`;
        console.log(`🔍 Looking up current photo in column: ${columnName}`);
        const { data: currentProfile, error: selectError } = await supabase_1.supabaseAdmin
            .from('users')
            .select(columnName)
            .eq('id', userId)
            .single();
        if (selectError) {
            console.log(`❌ Error selecting current profile:`, selectError);
        }
        else {
            console.log(`✅ Current profile data:`, currentProfile);
        }
        console.log(`📤 Starting file upload to Supabase Storage...`);
        const uploadResult = await supabaseStorage_1.SupabaseStorageHelper.uploadPasPhoto(req.file, photoType);
        console.log(`📤 Upload result:`, uploadResult);
        if (!uploadResult.success) {
            console.log(`❌ Upload failed:`, uploadResult.error);
            res.status(500).json({
                success: false,
                message: 'Fout bij uploaden van foto',
                error: uploadResult.error
            });
            return;
        }
        const updateData = {
            [columnName]: uploadResult.url,
            updated_at: new Date().toISOString()
        };
        const { error: updateError } = await supabase_1.supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', userId);
        if (updateError) {
            console.error('Database update error:', updateError);
            await supabaseStorage_1.SupabaseStorageHelper.deletePasPhoto(uploadResult.url);
            res.status(500).json({
                success: false,
                message: 'Fout bij opslaan van foto in database'
            });
            return;
        }
        if (currentProfile && currentProfile[columnName]) {
            await supabaseStorage_1.SupabaseStorageHelper.deletePasPhoto(currentProfile[columnName]);
        }
        res.json({
            success: true,
            message: 'PasPhoto succesvol geüpload',
            photoUrl: uploadResult.url,
            photoType: photoType
        });
    }
    catch (error) {
        console.error('PasPhoto upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het uploaden van de foto'
        });
    }
});
router.put('/fit-sessions/:sessionId/favorite', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        const favorite = !!(req.body?.favorite);
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        const { data: session, error: selectError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('id, user_id, active')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single();
        if (selectError || !session || session.active === false) {
            res.status(404).json({ success: false, message: 'Sessie niet gevonden' });
            return;
        }
        const { data: updated, error: updateError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .update({ favorite, updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', userId)
            .select()
            .single();
        if (updateError) {
            console.error('Error updating favorite:', updateError);
            res.status(500).json({ success: false, message: 'Fout bij opslaan van favoriet' });
            return;
        }
        res.json({ success: true, session: updated });
    }
    catch (error) {
        console.error('Error in PUT /fit-sessions/:sessionId/favorite:', error);
        res.status(500).json({ success: false, message: 'Interne serverfout' });
    }
});
router.get('/fit-sessions', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        let query = supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select(`
        *,
        shop:shop_id ( id, name, url, logo_url ),
        retailer:retailers!fit_sessions_retailer_id_fkey (
          shop_name,
          shop_url
        )
      `)
            .eq('user_id', userId)
            .eq('active', true);
        const favoritesOnly = req.query?.favorites === 'true';
        if (favoritesOnly) {
            query = query.eq('favorite', true);
        }
        const { data: sessions, error: sessionsError } = await query
            .order('created_at', { ascending: false });
        if (sessionsError) {
            res.status(500).json({ success: false, message: 'Fout bij ophalen van sessies' });
            return;
        }
        const sessionsWithProducts = await Promise.all((sessions || []).map(async (session) => {
            const { data: products, error: productsError } = await supabase_1.supabaseAdmin
                .from('fit_session_products')
                .select('*')
                .eq('session_id', session.id)
                .order('created_at', { ascending: true });
            if (productsError) {
                console.error('Error fetching products for session:', session.id, productsError);
            }
            return {
                ...session,
                products: products || []
            };
        }));
        res.json({
            success: true,
            sessions: sessionsWithProducts
        });
    }
    catch (error) {
        console.error('FiT sessions fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van je FiT sessies'
        });
    }
});
router.get('/fit-sessions/stats', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { data: sessions, error } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('active', true);
        if (error) {
            console.error('Error fetching sessions stats:', error);
            res.status(500).json({ error: 'Failed to fetch sessions statistics' });
            return;
        }
        const totalSessions = (sessions || []).length;
        const completedSessions = (sessions || []).filter((s) => s.status === 'COMPLETED').length;
        const processingSessions = (sessions || []).filter((s) => s.status === 'PROCESSING').length;
        const lastSessionDate = totalSessions > 0
            ? (sessions || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null;
        const stats = {
            totalSessions,
            completedSessions,
            processingSessions,
            lastSessionDate
        };
        res.json({ stats });
    }
    catch (error) {
        console.error('Error in fit-sessions/stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/fit-sessions/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { sessionId } = req.params;
        const { data: session, error: sessionError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select(`
        *,
        shop:shop_id ( id, name, url, logo_url ),
        retailer:retailers!fit_sessions_retailer_id_fkey (shop_name, shop_url)
      `)
            .eq('id', sessionId)
            .eq('user_id', userId)
            .eq('active', true)
            .single();
        if (sessionError) {
            console.error('Error fetching session:', sessionError);
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        const { data: products, error: productsError } = await supabase_1.supabaseAdmin
            .from('fit_session_products')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });
        if (productsError) {
            console.error('Error fetching session products:', productsError);
            res.status(500).json({ error: 'Failed to fetch session products' });
            return;
        }
        const sessionWithProducts = {
            ...session,
            products: products || []
        };
        res.json({ session: sessionWithProducts });
    }
    catch (error) {
        console.error('Error in fit-sessions/:sessionId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.delete('/account', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Gebruiker niet geauthenticeerd' });
            return;
        }
        if (req.user?.role !== 'user') {
            res.status(403).json({ success: false, message: 'Alleen gebruikers kunnen hun account verwijderen' });
            return;
        }
        const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
            .from('users')
            .select('profile_image_url, pasphoto_front, pasphoto_side, pasphoto_fullbody_front, pasphoto_fullbody_side, pasphoto_spouse, pasphoto_member1, pasphoto_member2, pasphoto_member3, pasphoto_member4, pasphoto_room_1')
            .eq('id', userId)
            .single();
        if (profileError) {
            console.warn('Could not load user profile for deletion:', profileError);
        }
        const { data: sessions, error: sessionsError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('id, user_image_url, generated_image_url')
            .eq('user_id', userId);
        if (sessionsError) {
            console.warn('Could not load user sessions for deletion:', sessionsError);
        }
        const extractName = (url) => {
            if (!url)
                return null;
            try {
                const last = url.split('/').pop() || '';
                return last.split('?')[0] || null;
            }
            catch (e) {
                return null;
            }
        };
        const profileImageUrls = [
            profile?.profile_image_url,
            profile?.pasphoto_front,
            profile?.pasphoto_side,
            profile?.pasphoto_fullbody_front,
            profile?.pasphoto_fullbody_side,
            profile?.pasphoto_spouse,
            profile?.pasphoto_member1,
            profile?.pasphoto_member2,
            profile?.pasphoto_member3,
            profile?.pasphoto_member4,
            profile?.pasphoto_room_1,
        ];
        const profileImagePaths = profileImageUrls
            .map((u) => extractName(u))
            .filter((p) => !!p);
        if (profileImagePaths.length > 0) {
            try {
                await supabase_1.supabaseAdmin.storage.from('profile-images').remove(profileImagePaths);
            }
            catch (err) {
                console.error('Failed to delete profile images from storage:', err);
            }
        }
        const fitResultPaths = [];
        (sessions || []).forEach((s) => {
            const u1 = extractName(s.user_image_url);
            const u2 = extractName(s.generated_image_url);
            if (u1)
                fitResultPaths.push(u1);
            if (u2)
                fitResultPaths.push(u2);
        });
        if (fitResultPaths.length > 0) {
            try {
                await supabase_1.supabaseAdmin.storage.from('fit-results').remove(fitResultPaths);
            }
            catch (err) {
                console.error('Failed to delete fit result images from storage:', err);
            }
        }
        const anonymizeUpdate = {
            email: null,
            password_hash: null,
            first_name: null,
            last_name: null,
            profile_image_url: null,
            pasphoto_front: null,
            pasphoto_side: null,
            pasphoto_fullbody_front: null,
            pasphoto_fullbody_side: null,
            pasphoto_spouse: null,
            pasphoto_member1: null,
            pasphoto_member2: null,
            pasphoto_member3: null,
            pasphoto_member4: null,
            pasphoto_room_1: null,
            device_id: null,
            ip_address: null,
            is_active: false,
            updated_at: new Date().toISOString()
        };
        const { error: anonError } = await supabase_1.supabaseAdmin
            .from('users')
            .update(anonymizeUpdate)
            .eq('id', userId);
        if (anonError) {
            console.error('Anonymize user error:', anonError);
            res.status(500).json({ success: false, message: 'Fout bij anonimiseren van gegevens' });
            return;
        }
        const { error: deleteAuthError } = await supabase_1.supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteAuthError) {
            console.error('Supabase auth user deletion error:', deleteAuthError);
            res.status(500).json({ success: false, message: 'Fout bij verwijderen van account (auth)' });
            return;
        }
        res.json({ success: true, message: 'Account en gegevens verwijderd' });
    }
    catch (error) {
        console.error('Error in DELETE /account:', error);
        res.status(500).json({ success: false, message: 'Interne serverfout' });
    }
});
exports.default = router;
//# sourceMappingURL=consumer.js.map