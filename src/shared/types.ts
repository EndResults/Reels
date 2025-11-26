import { Request } from 'express';

export enum PlanType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  profilePhotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Retailer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  shopName: string;
  shopUrl: string;
  shopType: 'FASHION' | 'SPORTS' | 'LIFESTYLE' | 'OTHER';
  planType?: PlanType;
  isActive: boolean;
  sessionsUsed: number;
  sessionsLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FitSession {
  id: string;
  userId: string;
  retailerId: string;
  productId?: string;
  photoUrl: string;
  resultUrl?: string;
  aiProcessingData?: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  favorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'user' | 'retailer';
    email?: string;
    first_name?: string;
    last_name?: string;
    shop_name?: string;
  };
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}
