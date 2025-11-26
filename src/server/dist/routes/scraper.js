"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adaptiveScraper_1 = require("../services/adaptiveScraper");
const scrapeLogger_1 = require("../services/scrapeLogger");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    const url = String(req.query.url || '');
    if (!/^https?:\/\//i.test(url)) {
        res.status(400).json({ error: 'Invalid URL' });
        return;
    }
    try {
        const start = Date.now();
        const data = await (0, adaptiveScraper_1.scrapeProduct)(url, { locale: 'nl-NL', currencyHint: 'EUR', aiEnabled: true });
        const duration = Date.now() - start;
        await (0, scrapeLogger_1.logScrape)(data, duration);
        res.json(data);
    }
    catch (e) {
        try {
            const urlStr = String(req.query.url || '');
            await (0, scrapeLogger_1.logScrape)({
                url: urlStr,
                title: undefined,
                priceRaw: undefined,
                price: undefined,
                currency: 'EUR',
                images: [],
                source: 'dom',
                confidence: 0,
                notes: [`error:${String(e?.message || e).slice(0, 120)}`]
            }, 0, (e && typeof e.status === 'number') ? e.status : undefined);
        }
        catch { }
        res.status(500).json({ error: 'Scrape failed', detail: String(e?.message || e) });
    }
});
exports.default = router;
//# sourceMappingURL=scraper.js.map