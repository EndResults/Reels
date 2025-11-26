import express from 'express';
import { EmailService } from '../services/emailService';

const router = express.Router();
const emailService = new EmailService();

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
  } catch (err: any) {
    console.error('❌ /api/contact error:', err);
    return res.status(500).json({ success: false, message: 'Interne serverfout.' });
  }
});

export default router;
