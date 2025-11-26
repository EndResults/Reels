import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, supabaseAdmin } from '../lib/supabase';

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

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = (req as any).cookies?.fit_session as string | undefined;
  const token = cookieToken || headerToken;

  console.log(' Auth Debug - Headers:', req.headers['authorization'] ? 'Present' : 'Missing');
  console.log(' Auth Debug - Cookie present:', !!cookieToken);
  console.log(' Auth Debug - Token extracted (header||cookie):', !!token);
  console.log(' Auth Debug - JWT_SECRET exists:', !!process.env.JWT_SECRET);


  if (!token) {
    console.log(' No token provided');
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    console.log('🔐 Attempting JWT verification...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log('✅ JWT verified successfully. Role:', decoded.role || decoded.userType, 'ID:', decoded.id || decoded.userId);
    
    const userRole = decoded.role || decoded.userType;
    const userId = decoded.id || decoded.userId;
    
    if (userRole === 'user') {
      console.log('🔍 Looking up user in database...');
      const user = await db.getUserById(userId);
      if (!user) {
        console.log('❌ User not found in database');
        res.status(401).json({ error: 'User not found' });
        return;
      }
      console.log('✅ User found:', user.email);
      req.user = { ...user, role: 'user' };
    } else if (userRole === 'retailer') {
      console.log('🔍 Looking up retailer in database...');
      let retailer: any = null;
      try {
        retailer = await db.getRetailerById(userId);
      } catch (e) {
        // ignore and fallback
      }
      if (!retailer) {
        try {
          const byAuth = await supabaseAdmin
            .from('retailers')
            .select('*')
            .eq('auth_id', userId)
            .maybeSingle();
          retailer = byAuth.data || null;
        } catch {}
      }
      if (!retailer) {
        try {
          const email = (decoded && (decoded as any).email) as string | undefined;
          if (email) {
            const byEmail = await supabaseAdmin
              .from('retailers')
              .select('*')
              .eq('email', email)
              .maybeSingle();
            retailer = byEmail.data || null;
          }
        } catch {}
      }
      if (!retailer) {
        console.log('❌ Retailer not found in database');
        res.status(401).json({ error: 'Retailer not found' });
        return;
      }
      if (retailer && retailer.is_active === false) {
        // Allow only specific flow when account is scheduled for deletion but subscription still active (non-STARTER)
        try {
          const { data: sub } = await supabaseAdmin
            .from('subscriptions')
            .select('plan_type, status, current_period_end')
            .eq('retailer_id', retailer.id)
            .eq('status', 'ACTIVE')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          const hasGraceLogin = !!sub && (sub as any).plan_type && String((sub as any).plan_type).toUpperCase() !== 'STARTER';
          const path = (req as any).originalUrl || req.path || '';
          if (hasGraceLogin && /\/api\/retailer\/undo-close(\b|\/|\?|$)/.test(String(path || ''))) {
            console.log('⚠️ Retailer inactive but grace login allowed for undo-close');
            req.user = { ...retailer, role: 'retailer' } as any;
            req.retailer = { ...retailer, role: 'retailer' } as any;
            return next();
          }
        } catch {}
        console.log('⛔ Retailer inactive');
        res.status(403).json({ error: 'Retailer inactive' });
        return;
      }
      console.log('✅ Retailer found:', retailer.email);
      req.user = { ...retailer, role: 'retailer' };
      req.retailer = { ...retailer, role: 'retailer' };
    } else {
      console.log('❌ Invalid token role:', userRole);
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    console.log(' Authentication successful');
    next();
  } catch (error) {
    console.log('❌ JWT verification failed:', (error as Error).message);
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const requireUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.role !== 'user' && decoded.userType !== 'user') {
      res.status(403).json({ error: 'User access required' });
      return;
    }

    const user = await db.getUserById(decoded.userId || decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    req.user = { ...user, role: 'user' };
    next();
  } catch (error) {
    console.log('❌ JWT verification failed:', (error as Error).message);
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  const cookieToken = (req as any).cookies?.fit_session as string | undefined;
  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const role = decoded.role || decoded.userType;

    // 1) Allow explicit admin role in JWT
    if (role === 'admin') {
      return next();
    }

    // 2) Fallback: allow Supabase users with user_type = 'ADMIN'
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    try {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, user_type, email')
        .eq('id', userId)
        .maybeSingle();

      if (!user || String((user as any).user_type || '').toUpperCase() !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    } catch {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    console.log('❌ JWT verification failed (admin):', (error as Error).message);
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const requireRetailer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.role !== 'retailer' && decoded.userType !== 'retailer') {
      res.status(403).json({ error: 'Retailer access required' });
      return;
    }

    const rid = decoded.userId || decoded.id;
    let retailer: any = null;
    try { retailer = await db.getRetailerById(rid); } catch {}
    if (!retailer) {
      try {
        const byAuth = await supabaseAdmin
          .from('retailers')
          .select('*')
          .eq('auth_id', rid)
          .maybeSingle();
        retailer = byAuth.data || null;
      } catch {}
    }
    if (!retailer) {
      const email = (decoded && (decoded as any).email) as string | undefined;
      if (email) {
        try {
          const byEmail = await supabaseAdmin
            .from('retailers')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          retailer = byEmail.data || null;
        } catch {}
      }
    }
    if (!retailer) {
      res.status(401).json({ error: 'Retailer not found' });
      return;
    }
    if (retailer && retailer.is_active === false) {
      res.status(403).json({ error: 'Retailer inactive' });
      return;
    }
    req.user = { ...retailer, role: 'retailer' };
    req.retailer = { ...retailer, role: 'retailer' };
    next();
  } catch (error) {
    console.log('❌ JWT verification failed:', (error as Error).message);
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};