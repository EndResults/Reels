import { api } from './api';

export interface FitSession {
  id: string;
  user_id: string;
  retailer_id: string;
  user_image_url: string | null;
  generated_image_url: string | null;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  category: string;
  session_id: string;
  satisfied?: boolean | null;
  feedback?: string | null;
  favorite?: boolean | null;
}

export interface FitSessionProduct {
  id: string;
  session_id: string;
  product_name: string;
  product_url: string;
  product_price: string;
  product_image_url: string;
  created_at: string;
}

export interface FitSessionWithProducts extends FitSession {
  products: FitSessionProduct[];
  shop?: {
    id: string;
    name: string;
    url?: string;
    logo_url?: string | null;
  };
  retailer?: {
    shop_name: string;
    shop_url?: string;
  };
}

export interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  processingSessions: number;
  lastSessionDate: string | null;
}

export const fitSessionsAPI = {
  // Get all sessions for the current user
  getUserSessions: async (): Promise<FitSessionWithProducts[]> => {
    const response = await api.get('/consumer/fit-sessions');
    // Backend returns shape: { success: boolean, sessions: FitSessionWithProducts[] }
    const sessions = response.data?.sessions;
    return Array.isArray(sessions) ? sessions : [];
  },

  // Toggle favorite on a session
  toggleFavorite: async (sessionId: string, favorite: boolean): Promise<FitSession | null> => {
    try {
      const response = await api.put(`/consumer/fit-sessions/${sessionId}/favorite`, { favorite });
      return response.data.session || null;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const response = await api.get('/consumer/fit-sessions/stats');
      return response.data.stats || {
        totalSessions: 0,
        completedSessions: 0,
        processingSessions: 0,
        lastSessionDate: null
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalSessions: 0,
        completedSessions: 0,
        processingSessions: 0,
        lastSessionDate: null
      };
    }
  },

  // Get session by ID with products
  getSessionById: async (sessionId: string): Promise<FitSessionWithProducts | null> => {
    try {
      const response = await api.get(`/consumer/fit-sessions/${sessionId}`);
      return response.data.session || null;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  },

  // Update feedback for a session
  updateFeedback: async (
    sessionId: string,
    payload: { satisfied?: boolean; feedback?: string | null }
  ): Promise<FitSession | null> => {
    try {
      const response = await api.put(`/consumer/fit-sessions/${sessionId}/feedback`, payload);
      return response.data.session || null;
    } catch (error) {
      console.error('Error updating session feedback:', error);
      throw error;
    }
  },

  // Soft delete a session (set active=false on server)
  deleteSession: async (sessionId: string): Promise<boolean> => {
    try {
      await api.delete(`/consumer/fit-sessions/${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
};
