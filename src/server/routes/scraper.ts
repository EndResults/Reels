import express, { Request, Response } from 'express';
import { scrapeProduct } from '../services/adaptiveScraper';
import { logScrape } from '../services/scrapeLogger';

const router = express.Router();

// GET /api/scrape?url=...
router.get('/', async (req: Request, res: Response) => {
  const url = String(req.query.url || '');
  if (!/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }
  try {
    const start = Date.now();
    const data = await scrapeProduct(url, { locale: 'nl-NL', currencyHint: 'EUR', aiEnabled: true });
    const duration = Date.now() - start;
    await logScrape(data, duration);
    res.json(data);
  } catch (e: any) {
    try {
      const urlStr = String(req.query.url || '');
      await logScrape({
        url: urlStr,
        title: undefined,
        priceRaw: undefined,
        price: undefined,
        currency: 'EUR',
        images: [],
        source: 'dom',
        confidence: 0,
        notes: [`error:${String(e?.message || e).slice(0, 120)}`]
      } as any, 0, (e && typeof e.status === 'number') ? e.status : undefined);
    } catch {}
    res.status(500).json({ error: 'Scrape failed', detail: String(e?.message || e) });
  }
});

export default router;
