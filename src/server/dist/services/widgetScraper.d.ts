export interface ScrapedProductData {
    title?: string;
    price?: string;
    brand?: string;
    currency?: string;
    image?: string;
    images?: string[];
    description?: string;
    url: string;
}
export declare function scrapeProductData(url: string): Promise<ScrapedProductData>;
export declare function validateUrl(url: string): {
    isValid: boolean;
    error?: string;
};
//# sourceMappingURL=widgetScraper.d.ts.map