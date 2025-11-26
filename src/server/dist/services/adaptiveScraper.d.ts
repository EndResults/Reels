export type SourceKind = 'jsonld' | 'meta' | 'dom' | 'ai';
export interface ExtractResult {
    title?: string;
    priceRaw?: string;
    price?: number;
    currency?: string;
    images: string[];
    source: SourceKind;
    confidence: number;
    url: string;
    notes?: string[];
}
export interface ScrapeOptions {
    locale?: string;
    currencyHint?: string;
    timeoutMs?: number;
    userAgent?: string;
    aiEnabled?: boolean;
}
export declare function scrapeProduct(url: string, opts?: ScrapeOptions): Promise<ExtractResult>;
//# sourceMappingURL=adaptiveScraper.d.ts.map