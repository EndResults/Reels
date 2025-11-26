"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const emailService_1 = require("../services/emailService");
const router = express_1.default.Router();
const emailService = new emailService_1.EmailService();
router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body || {};
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Naam, e-mailadres en bericht zijn verplicht.' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Ongeldig e-mailadres.' });
        }
        const ok = await emailService.sendContactEmail(name, email, message);
        if (!ok) {
            return res.status(500).json({ success: false, message: 'Kon e-mail niet versturen. Probeer later opnieuw.' });
        }
        return res.json({ success: true });
    }
    catch (err) {
        console.error('❌ /api/contact error:', err);
        return res.status(500).json({ success: false, message: 'Interne serverfout.' });
    }
});
exports.default = router;
//# sourceMappingURL=contact.js.map