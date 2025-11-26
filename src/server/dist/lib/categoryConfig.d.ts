export type LocalizedLabel = {
    nl?: string;
    en?: string;
} | string | undefined;
export interface CategorySettings {
    infoBox?: {
        nl?: string;
        en?: string;
    };
    infoBoxHeader?: LocalizedLabel;
    infoBoxBody?: LocalizedLabel;
    tipBoxHeader?: LocalizedLabel;
    tipBoxBody?: LocalizedLabel;
    photoSlots?: Array<{
        id: string;
        label?: LocalizedLabel;
        required?: boolean;
        sendToN8n?: boolean;
    }>;
    styles?: Array<{
        id: string;
        key?: string;
        label?: LocalizedLabel;
        icon?: string;
        color?: string;
        info?: LocalizedLabel;
    }>;
    limits?: {
        maxItemsRegistered?: number;
        maxItemsGuest?: number;
        guestCanChooseStyle?: boolean;
    };
    n8n?: {
        defaultPhotoOrder?: string[];
        perStylePhotoOrder?: Record<string, string[]>;
    };
    [key: string]: any;
}
export interface EffectiveCategoryConfig {
    key: string;
    settings: CategorySettings;
}
export declare function getShopCategoryKey(shopId: string): Promise<string | null>;
export declare function getShopOverrideSettings(shopId: string): Promise<CategorySettings | null>;
export declare function getCategorySettingsByKey(key: string): Promise<CategorySettings | null>;
export declare function getEffectiveCategoryConfig(params: {
    shopId?: string;
    categoryKey?: string;
}): Promise<EffectiveCategoryConfig>;
export declare function localizeLabel(lbl: LocalizedLabel, lang: string, fallbackLang?: string): string;
export declare function localizeSettings(settings: CategorySettings, lang: string): any;
export declare function getPhotoOrderForStyle(settings: CategorySettings, styleId?: string | number): string[];
export declare function getDefaultStyleId(settings: CategorySettings): string | null;
//# sourceMappingURL=categoryConfig.d.ts.map