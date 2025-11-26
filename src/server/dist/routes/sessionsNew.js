"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const feedbackSchema = joi_1.default.object({
    sessionId: joi_1.default.string().uuid().required(),
    satisfied: joi_1.default.boolean().required(),
    feedback: joi_1.default.string().allow('').max(1000).optional()
});
router.post('/feedback', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Niet geauthenticeerd' });
            return;
        }
        const { error, value } = feedbackSchema.validate(req.body);
        if (error) {
            res.status(400).json({ success: false, message: 'Ongeldige invoer', details: error.details.map(d => d.message) });
            return;
        }
        const { sessionId, satisfied, feedback } = value;
        const { data: session, error: sessionError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .single();
        if (sessionError || !session || session.user_id !== userId) {
            res.status(403).json({ success: false, message: 'Geen toegang tot deze sessie' });
            return;
        }
        const { error: updateError } = await supabase_1.supabaseAdmin
            .from('fit_sessions')
            .update({ satisfied, feedback: feedback ?? null, updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        if (updateError) {
            res.status(500).json({ success: false, message: 'Opslaan van feedback mislukt' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error('Feedback save error:', err);
        res.status(500).json({ success: false, message: 'Interne serverfout' });
    }
});
exports.default = router;
//# sourceMappingURL=sessionsNew.js.map