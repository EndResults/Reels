import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { supabaseAdmin, db } from '../lib/supabase';
import { EmailService } from '../services/emailService';
import { AuthRequest } from '../middleware/auth';

// Define PlanType locally to avoid path issues
type PlanType = 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

const router = express.Router();
const emailService = new EmailService();

async function getStarterIncluded(): Promise<number> {
  try {
    const { data: sys } = await supabaseAdmin
      .from('category_settings')
      .select('settings')
      .eq('key', 'SYSTEM')
      .maybeSingle();
    const plans = (sys as any)?.settings?.subscriptionPlans || {};
    const val = parseInt(String((plans as any).STARTER?.included ?? 50), 10);
    return Number.isFinite(val) ? Math.max(0, val) : 50;
  } catch {
    return 50;
  }
}

async function createStarterSubscriptionIfMissing(retailerId: string): Promise<void> {
  let hasActive = false;
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('retailer_id', retailerId)
      .eq('status', 'ACTIVE')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    hasActive = !!sub;
  } catch {}
  if (hasActive) return;
  const included = await getStarterIncluded();
  try {
    await supabaseAdmin.from('subscriptions').insert({
      retailer_id: retailerId,
      plan_type: 'STARTER',
      status: 'ACTIVE',
      stripe_subscription_id: null,
      stripe_customer_id: null,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      price_id: null,
      included_sessions: included,
      cancel_at_period_end: false,
      next_plan_type: null,
      metadata: {} as any
    } as any);
    console.info('[AutoPlan] Starter subscription created for retailer', retailerId);
  } catch (e) {
    console.warn('[AutoPlan] Failed to create Starter subscription', retailerId, e);
  }
  try {
    await supabaseAdmin.rpc('ensure_credit_row', { _retailer: retailerId, _included: included });
  } catch (e) {
    console.warn('ensure_credit_row on retailer create failed:', e);
  }
}

// Validation schemas
const retailerRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  shopName: Joi.string().min(2).max(100).required(),
  shopUrl: Joi.string().uri().required(),
  shopType: Joi.string().valid('FASHION', 'SPORTS', 'LIFESTYLE', 'OTHER').required()
});

const userRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  dateOfBirth: Joi.date().max('now').optional().allow(null, ''),
  gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER').optional().allow(null, '')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// Helper function to generate JWT
const generateToken = (id: string, role: 'retailer' | 'user'): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

// Retailer Registration
router.post('/retailer/register', async (req, res): Promise<void> => {
  console.log('🔵 Retailer registration attempt:', req.body);
  
  try {
    // Validate request body
    const { error, value } = retailerRegisterSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const { email, password, firstName, lastName, shopName, shopUrl, shopType } = value;
    console.log('✅ Validation passed for:', email);

    // Check if retailer already exists
    console.log('🔍 Checking if retailer exists...');
    const { data: existingRetailer, error: checkError } = await supabaseAdmin
      .from('retailers')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Database check error:', checkError);
      throw checkError;
    }

    if (existingRetailer) {
      console.log('❌ Retailer already exists:', email);
      res.status(400).json({
        success: false,
        message: 'Een account met dit emailadres bestaat al'
      });
      return;
    }

    console.log('✅ Retailer does not exist, proceeding with registration');

    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashed successfully');

    // Create retailer
    console.log('💾 Creating retailer in database...');
    const { data: newRetailer, error: createError } = await supabaseAdmin
      .from('retailers')
      .insert({
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        shop_name: shopName,
        shop_url: shopUrl,
        shop_type: shopType,
        plan_type: 'STARTER',
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Database creation error:', createError);
      throw createError;
    }

    console.log('✅ Retailer created successfully:', newRetailer.id);
    try { await createStarterSubscriptionIfMissing(newRetailer.id); } catch (e) { console.warn('[AutoPlan] createStarterSubscriptionIfMissing failed:', e); }

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log('❌ JWT_SECRET not configured');
      throw new Error('JWT_SECRET not configured');
    }

    const token = jwt.sign(
      { 
        id: newRetailer.id, 
        email: newRetailer.email, 
        role: 'retailer' 
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );
    console.log('✅ JWT token generated successfully');

    // Send welcome email
    console.log('📧 Sending welcome email...');
    try {
      await emailService.sendWelcomeEmail(email, firstName, 'retailer');
      console.log('✅ Welcome email sent successfully');
    } catch (emailError) {
      console.log('⚠️ Welcome email failed (non-critical):', emailError);
    }

    console.log('🎉 Registration completed successfully for:', email);

    res.status(201).json({
      success: true,
      message: 'Retailer account succesvol aangemaakt',
      data: {
        token,
        retailer: {
          id: newRetailer.id,
          email: newRetailer.email,
          firstName: newRetailer.first_name,
          lastName: newRetailer.last_name,
          shopName: newRetailer.shop_name,
          shopUrl: newRetailer.shop_url,
          shopType: newRetailer.shop_type,
          role: 'retailer'
        }
      }
    });

  } catch (error) {
    console.error('💥 Retailer registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het aanmaken van het account'
    });
  }
});

// User Registration
router.post('/user/register', async (req, res): Promise<void> => {
  try {
    const { error, value } = userRegisterSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const { email, password, firstName, lastName, dateOfBirth, gender } = value;

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Een gebruiker met dit e-mailadres bestaat al'
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.createUser({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      gender
    });

    // Generate JWT token
    const token = generateToken(user.id, 'user');

    // Send welcome email (don't block registration if email fails)
    try {
      await emailService.sendWelcomeEmail(email, firstName, 'user');
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Gebruikersaccount succesvol aangemaakt',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          dateOfBirth: user.date_of_birth,
          gender: user.gender,
          profileImageUrl: user.profile_image_url,
          role: 'user'
        }
      }
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het aanmaken van het account'
    });
  }
});

// Retailer Login
router.post('/retailer/login', async (req, res): Promise<void> => {
  console.log('🔵 Retailer login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
  
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      console.log('❌ Login validation error:', error.details[0].message);
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const { email, password } = value;
    console.log('✅ Login validation passed for:', email);

    // Find retailer
    console.log('🔍 Searching for retailer in database...');
    const { data: retailer, error: findError } = await supabaseAdmin
      .from('retailers')
      .select('*')
      .eq('email', email)
      .single();

    if (findError) {
      console.log('❌ Database search error:', findError);
      if (findError.code === 'PGRST116') {
        console.log('❌ Retailer not found:', email);
        res.status(401).json({
          success: false,
          message: 'Ongeldige inloggegevens'
        });
        return;
      }
      throw findError;
    }

    if (!retailer) {
      console.log('❌ Retailer not found (null result):', email);
      res.status(401).json({
        success: false,
        message: 'Ongeldige inloggegevens'
      });
      return;
    }

    console.log('✅ Retailer found:', { id: retailer.id, email: retailer.email, isActive: retailer.is_active });

    // Check password
    console.log('🔐 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, retailer.password_hash);
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email);
      res.status(401).json({
        success: false,
        message: 'Ongeldige inloggegevens'
      });
      return;
    }
    console.log('✅ Password verified successfully');

    // Check if account is active
    if (!retailer.is_active) {
      console.log('❌ Account is inactive:', email);
      res.status(401).json({
        success: false,
        message: 'Account is gedeactiveerd'
      });
      return;
    }
    console.log('✅ Account is active');

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = generateToken(retailer.id, 'retailer');
    console.log('✅ JWT token generated successfully');

    console.log('🎉 Login completed successfully for:', email);

    res.json({
      success: true,
      message: 'Succesvol ingelogd',
      data: {
        token,
        retailer: {
          id: retailer.id,
          email: retailer.email,
          firstName: retailer.first_name,
          lastName: retailer.last_name,
          shopName: retailer.shop_name,
          shopUrl: retailer.shop_url,
          shopType: retailer.shop_type,
          role: 'retailer'
        }
      }
    });

  } catch (error) {
    console.error('💥 Retailer login error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het inloggen'
    });
  }
});

// User Login
router.post('/user/login', async (req, res): Promise<void> => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const { email, password } = value;

    // Find user
    const user = await db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Ongeldige inloggegevens'
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Ongeldige inloggegevens'
      });
      return;
    }

    // Check if account is active
    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: 'Account is gedeactiveerd'
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id, 'user');

    res.json({
      success: true,
      message: 'Succesvol ingelogd',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          dateOfBirth: user.date_of_birth,
          gender: user.gender,
          profileImageUrl: user.profile_image_url,
          role: 'user'
        }
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het inloggen'
    });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res): Promise<void> => {
  console.log('🔵 Forgot password request:', { email: req.body.email });
  
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const { email } = value;
    console.log('✅ Validation passed for:', email);

    // Check if retailer exists
    console.log('🔍 Searching for retailer...');
    const { data: retailer, error: findError } = await supabaseAdmin
      .from('retailers')
      .select('id, email, first_name')
      .eq('email', email)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.log('❌ Database error:', findError);
      throw findError;
    }

    // Always return success for security (don't reveal if email exists)
    if (!retailer) {
      console.log('❌ Retailer not found, but returning success for security');
      res.json({
        success: true,
        message: 'Als dit emailadres bestaat, is er een reset link verstuurd'
      });
      return;
    }

    console.log('✅ Retailer found:', retailer.id);

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { 
        id: retailer.id, 
        email: retailer.email, 
        type: 'password_reset' 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' } as jwt.SignOptions
    );

    console.log('🎫 Reset token generated');

    // Send reset email (skip database storage for now)
    console.log('📧 Sending password reset email...');
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    
    // Test SMTP connection first
    const connectionTest = await emailService.testConnection();
    if (!connectionTest) {
      console.log('🔗 Reset URL for testing (SMTP failed):', resetUrl);
      res.json({
        success: true,
        message: 'Er is een reset link naar je emailadres verstuurd'
      });
      return;
    }
    
    try {
      await emailService.sendPasswordResetEmail(email, resetUrl);
      console.log('✅ Reset email sent successfully');
    } catch (emailError) {
      console.log('❌ Failed to send reset email:', emailError);
      // For development: Don't fail the request if email fails
      console.log('🔗 Reset URL for testing:', resetUrl);
    }

    console.log('🎉 Password reset process completed for:', email);

    res.json({
      success: true,
      message: 'Er is een reset link naar je emailadres verstuurd'
    });

  } catch (error) {
    console.error('💥 Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden'
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res): Promise<void> => {
  console.log('🔵 Reset password attempt');
  
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      res.status(400).json({
        success: false,
        message: error.details[0].message
      });
      return;
    }

    const { token, newPassword } = value;
    console.log('✅ Validation passed');

    // Verify reset token
    console.log('🔐 Verifying reset token...');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
    } catch (tokenError) {
      console.log('❌ Invalid or expired token');
      res.status(400).json({
        success: false,
        message: 'Ongeldige of verlopen reset link'
      });
      return;
    }

    console.log('✅ Token verified for retailer:', decoded.id);

    // Find retailer and verify token is still valid
    const { data: retailer, error: findError } = await supabaseAdmin
      .from('retailers')
      .select('id, email, reset_token, reset_token_expires')
      .eq('id', decoded.id)
      .single();

    if (findError || !retailer) {
      console.log('❌ Retailer not found');
      res.status(400).json({
        success: false,
        message: 'Ongeldige reset link'
      });
      return;
    }

    // Check if token matches and hasn't expired
    if (retailer.reset_token !== token) {
      console.log('❌ Token mismatch');
      res.status(400).json({
        success: false,
        message: 'Ongeldige reset link'
      });
      return;
    }

    if (new Date() > new Date(retailer.reset_token_expires)) {
      console.log('❌ Token expired');
      res.status(400).json({
        success: false,
        message: 'Reset link is verlopen'
      });
      return;
    }

    console.log('✅ Token is valid and not expired');

    // Hash new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    const { error: updateError } = await supabaseAdmin
      .from('retailers')
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires: null
      })
      .eq('id', retailer.id);

    if (updateError) {
      console.log('❌ Failed to update password:', updateError);
      throw updateError;
    }

    console.log('✅ Password updated successfully');
    console.log('🎉 Password reset completed for:', retailer.email);

    res.json({
      success: true,
      message: 'Wachtwoord succesvol gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord.'
    });

  } catch (error) {
    console.error('💥 Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Er is een fout opgetreden bij het wijzigen van het wachtwoord'
    });
  }
});

// Get available plans
router.get('/plans', (req, res) => {
  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      type: 'BASIC' as PlanType,
      price: 49,
      currency: 'EUR',
      interval: 'month',
      features: [
        '10.000 FiT sessies per maand',
        'Basis analytics',
        'Email ondersteuning',
        'Widget integratie'
      ],
      stripePriceId: process.env.STRIPE_BASIC_PRICE_ID
    },
    {
      id: 'premium',
      name: 'Premium',
      type: 'PREMIUM' as PlanType,
      price: 99,
      currency: 'EUR',
      interval: 'month',
      features: [
        '20.000 FiT sessies per maand',
        'Uitgebreide analytics',
        'Geen FiT branding',
        'Priority ondersteuning',
        'Widget customization'
      ],
      stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      type: 'ENTERPRISE' as PlanType,
      price: 199,
      currency: 'EUR',
      interval: 'month',
      features: [
        '20.000+ FiT sessies per maand',
        'Volledige analytics suite',
        'Custom branding',
        'Dedicated account manager',
        'API toegang',
        'White-label oplossing'
      ],
      stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID
    }
  ];

  res.json({
    success: true,
    data: { plans }
  });
});

export default router;