import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: 'user' | 'retailer';
        email?: string;
        first_name?: string;
        last_name?: string;
        shop_name?: string;
    };
    retailer?: {
        id: string;
        role: 'retailer';
        email?: string;
        shop_name?: string;
    };
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireUser: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRetailer: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map