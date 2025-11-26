"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../lib/supabase");
const fileUpload_1 = require("../lib/fileUpload");
const joi_1 = __importDefault(require("joi"));
const router = express_1.default.Router();
const webhookSchema = joi_1.default.object({
    sessionId: joi_1.default.string().uuid().required(),
    status: joi_1.default.string().valid('COMPLETED', 'FAILED').required(),
    resultUrl: joi_1.default.string().optional(),
    aiProcessingData: joi_1.default.object().optional(),
    error: joi_1.default.string().optional()
});
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;
    const expectedApiKey = process.env.N8N_API_KEY;
    if (!expectedApiKey) {
        console.error('N8N_API_KEY not configured');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error'
        });
    }
    if (apiKey !== expectedApiKey) {
        console.error('Invalid API key for n8n webhook');
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }
    next();
};
router.post('/ai-processing-complete', verifyApiKey, async (req, res) => {
    try {
        console.log('🔔 Received AI processing webhook:', req.body);
        const { error: validationError, value } = webhookSchema.validate(req.body);
        if (validationError) {
            console.error('Webhook validation error:', validationError.details);
            return res.status(400).json({
                success: false,
                message: 'Invalid webhook data',
                errors: validationError.details.map(detail => detail.message)
            });
        }
        const { sessionId, status, resultUrl, aiProcessingData, error: processingError } = value;
        const { data: session, error: sessionError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('id, status, user_id, retailer_id')
            .eq('id', sessionId)
            .single();
        if (sessionError || !session) {
            console.error('Session not found:', sessionId);
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        const updateData = {
            status: status,
            updated_at: new Date().toISOString()
        };
        if (status === 'COMPLETED') {
            if (resultUrl) {
                updateData.result_url = resultUrl;
            }
            if (aiProcessingData) {
                updateData.ai_processing_data = aiProcessingData;
            }
            console.log(`✅ Session ${sessionId} completed successfully`);
        }
        else if (status === 'FAILED') {
            if (processingError) {
                updateData.ai_processing_data = { error: processingError };
            }
            console.log(`❌ Session ${sessionId} failed:`, processingError);
        }
        const { error: updateError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .update(updateData)
            .eq('id', sessionId);
        if (updateError) {
            console.error('Failed to update session:', updateError);
            throw updateError;
        }
        return res.json({
            success: true,
            message: 'Session updated successfully'
        });
    }
    catch (error) {
        console.error('💥 Webhook processing error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
router.get('/session-status/:sessionId', async (req, res) => {
    try {
        const sessionId = req.params.sessionId;
        const { data: session, error } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('id, status, result_url, ai_processing_data, updated_at')
            .eq('id', sessionId)
            .single();
        if (error || !session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }
        const response = {
            id: session.id,
            status: session.status,
            resultUrl: session.result_url ? (0, fileUpload_1.getFileUrl)(session.result_url) : null,
            aiProcessingData: session.ai_processing_data,
            updatedAt: session.updated_at
        };
        return res.json({
            success: true,
            data: response
        });
    }
    catch (error) {
        console.error('Get session status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Er is een fout opgetreden bij het ophalen van de sessie status'
        });
    }
});
exports.default = router;
//# sourceMappingURL=n8nWebhook.js.map