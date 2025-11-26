"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const joi_1 = __importDefault(require("joi"));
const axios_1 = __importDefault(require("axios"));
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
const createSessionSchema = joi_1.default.object({
    retailerId: joi_1.default.string().uuid().required(),
    shopId: joi_1.default.string().uuid().required(),
    productName: joi_1.default.string().min(1).max(255).required(),
    productUrl: joi_1.default.string().uri().allow(''),
    productPrice: joi_1.default.string().max(50).allow(''),
    productImageUrl: joi_1.default.string().uri().allow('')
});
router.post('/sessions', auth_1.authenticateToken, auth_1.requireUser, upload.single('userImage'), async (req, res) => {
    try {
        const { error, value } = createSessionSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: error.details[0].message
            });
            return;
        }
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'Gebruikersfoto is verplicht'
            });
            return;
        }
        const userId = req.user.id;
        const { retailerId, shopId, productName, productUrl, productPrice, productImageUrl } = value;
        const file = req.file;
        const retailer = await supabase_1.db.getRetailer(retailerId);
        if (!retailer) {
            res.status(404).json({
                success: false,
                message: 'Retailer niet gevonden'
            });
            return;
        }
        const { data: shop, error: shopError } = await supabase_1.supabaseAdmin
            .from('shops')
            .select('id, retailer_id, name, category, is_active')
            .eq('id', shopId)
            .single();
        if (shopError || !shop || shop.retailer_id !== retailerId || shop.is_active === false) {
            res.status(404).json({
                success: false,
                message: 'Webshop niet gevonden of niet actief'
            });
            return;
        }
        const { data: subscription } = await supabase_1.db.getRetailerSubscription(retailerId);
        if (!subscription) {
            res.status(403).json({
                success: false,
                message: 'Retailer heeft geen actief abonnement'
            });
            return;
        }
        const fileExtension = path_1.default.extname(file.originalname);
        const fileName = `${userId}-${Date.now()}${fileExtension}`;
        const userImageUrl = await (0, supabase_1.uploadFile)('fit-results', fileName, file.buffer, file.mimetype);
        const { data: createdSession, error: createSessionError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .insert({
            user_id: userId,
            retailer_id: retailerId,
            shop_id: shopId,
            user_image_url: userImageUrl,
            status: 'PROCESSING',
            category: shop.category || null
        })
            .select()
            .single();
        if (createSessionError || !createdSession) {
            throw createSessionError;
        }
        if (productName || productUrl || productPrice || productImageUrl) {
            await supabase_1.supabaseAdmin
                .from('fit_session_products')
                .insert({
                session_id: createdSession.id,
                product_name: productName || null,
                product_url: productUrl || null,
                product_price: productPrice || null,
                product_image_url: productImageUrl || null
            });
        }
        if (process.env.N8N_WEBHOOK_URL) {
            try {
                await axios_1.default.post(process.env.N8N_WEBHOOK_URL, {
                    sessionId: createdSession.id,
                    userImageUrl: userImageUrl,
                    productImageUrl: productImageUrl,
                    productName: productName,
                    retailerId: retailerId,
                    shopId: shopId,
                    category: shop.category || null,
                    userId: userId
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
            }
            catch (webhookError) {
                console.error('Failed to trigger AI processing:', webhookError);
            }
        }
        res.status(201).json({
            success: true,
            message: 'FiT sessie succesvol aangemaakt',
            data: {
                session: {
                    id: createdSession.id,
                    shopId: createdSession.shop_id,
                    retailerId: createdSession.retailer_id,
                    userImageUrl: createdSession.user_image_url,
                    status: createdSession.status,
                    category: createdSession.category,
                    createdAt: createdSession.created_at
                }
            }
        });
    }
    catch (error) {
        console.error('Create FiT session error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het aanmaken van de FiT sessie'
        });
    }
});
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await supabase_1.db.getFitSession(sessionId);
        if (!session) {
            res.status(404).json({
                success: false,
                message: 'FiT sessie niet gevonden'
            });
            return;
        }
        if (req.user) {
            const hasAccess = (req.user.role === 'user' && session.user_id === req.user.id) ||
                (req.user.role === 'retailer' && session.retailer_id === req.user.id);
            if (!hasAccess) {
                res.status(403).json({
                    success: false,
                    message: 'Geen toegang tot deze FiT sessie'
                });
                return;
            }
        }
        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    productName: session.product_name,
                    productUrl: session.product_url,
                    productPrice: session.product_price,
                    productImageUrl: session.product_image_url,
                    userImageUrl: session.user_image_url,
                    generatedImageUrl: session.generated_image_url,
                    status: session.status,
                    retailer: session.retailer ? {
                        id: session.retailer.id,
                        shopName: session.retailer.shop_name,
                        shopUrl: session.retailer.shop_url
                    } : null,
                    user: session.user ? {
                        id: session.user.id,
                        firstName: session.user.first_name,
                        lastName: session.user.last_name
                    } : null,
                    createdAt: session.created_at,
                    processedAt: session.processed_at
                }
            }
        });
    }
    catch (error) {
        console.error('Get FiT session error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van de FiT sessie'
        });
    }
});
router.get('/sessions/:sessionId/status', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const session = await supabase_1.db.getFitSession(sessionId);
        if (!session) {
            res.status(404).json({
                success: false,
                message: 'FiT sessie niet gevonden'
            });
            return;
        }
        res.json({
            success: true,
            data: {
                status: session.status,
                generatedImageUrl: session.generated_image_url,
                processedAt: session.processed_at
            }
        });
    }
    catch (error) {
        console.error('Get session status error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van de sessie status'
        });
    }
});
router.get('/sessions', auth_1.authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const userId = req.user.id;
        let sessions;
        if (req.user.role === 'user') {
            sessions = await supabase_1.db.getUserFitSessions(userId, limit, offset);
        }
        else if (req.user.role === 'retailer') {
            sessions = await supabase_1.db.getRetailerFitSessions(userId, limit, offset);
        }
        else {
            res.status(403).json({
                success: false,
                message: 'Ongeautoriseerd'
            });
            return;
        }
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
                    retailer: req.user.role === 'user' && session.retailer ? {
                        shopName: session.retailer.shop_name
                    } : null,
                    user: req.user.role === 'retailer' && session.user ? {
                        firstName: session.user.first_name,
                        lastName: session.user.last_name
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
        console.error('List FiT sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van FiT sessies'
        });
    }
});
router.delete('/sessions/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const userId = req.user.id;
        const session = await supabase_1.db.getFitSession(sessionId);
        if (!session) {
            res.status(404).json({
                success: false,
                message: 'FiT sessie niet gevonden'
            });
            return;
        }
        const hasAccess = (req.user.role === 'user' && session.user_id === userId) ||
            (req.user.role === 'retailer' && session.retailer_id === userId);
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                message: 'Geen toegang tot deze FiT sessie'
            });
            return;
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
exports.default = router;
//# sourceMappingURL=fit.js.map