// 🔹 Type declarations for modules without official typings

declare module 'playwright-extra';
declare module 'puppeteer-extra-plugin-stealth';

// Optional: fallback types for Playwright Extra usage in widgetScraper.ts
declare namespace PlaywrightExtra {
  interface PlaywrightExtra {
    use: (plugin: any) => void;
    launch: (options?: any) => Promise<any>;
  }
}

declare const playwrightExtra: PlaywrightExtra.PlaywrightExtra;
export = playwrightExtra;
declare module '@google/generative-ai';
