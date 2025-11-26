import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  Calendar,
  Eye,
  User,
  ShoppingBag,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { CustomerLayout } from '../components/CustomerLayout';
import { authStorage, consumerAPI } from '../services/api';
import { fitSessionsAPI, FitSessionWithProducts } from '../services/fitSessionsAPI';
import { pickDisplayImage } from '../utils/image';
import { useTranslation } from 'react-i18next';

interface CustomerStats {
  totalSessions: number;
  completedSessions: number;
  processingSessions: number;
  lastSessionDate: string | null;
}

const CustomerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<CustomerStats>({
    totalSessions: 0,
    completedSessions: 0,
    processingSessions: 0,
    lastSessionDate: null
  });
  const [recentSessions, setRecentSessions] = useState<FitSessionWithProducts[]>([]);
  const [ratingCounts, setRatingCounts] = useState<{ up: number; down: number; none: number }>({ up: 0, down: 0, none: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const cookies = typeof document !== 'undefined' ? document.cookie : '';
        const match = cookies.match(/(?:^|; )fit_token=([^;]+)/);
        if (match && !authStorage.getToken()) {
          const v = decodeURIComponent(match[1]);
          if (v) authStorage.setToken(v);
        }
      } catch {}

      try {
        const profileResponse = await consumerAPI.getProfile();
        const fullUserData = profileResponse.data.profile;
        setUser(fullUserData);
        authStorage.setUser({ ...(authStorage.getUser() || {}), ...fullUserData, firstName: fullUserData.firstName || fullUserData.first_name, lastName: fullUserData.lastName || fullUserData.last_name });
        
        // Load real session statistics
        const statsData = await fitSessionsAPI.getDashboardStats();
        setStats(statsData);
        
        // Load recent sessions (limit to 4 for dashboard) and compute rating counts
        const sessionsData = await fitSessionsAPI.getUserSessions();
        // Handle both array and object response formats, hide PROCESSING status
        const sessionsArray = Array.isArray(sessionsData) ? sessionsData : ((sessionsData as any)?.sessions || []);
        const nonProcessing = sessionsArray.filter((s: any) => s.status !== 'PROCESSING');
        setRecentSessions(nonProcessing.slice(0, 4));

        // Compute rating counts
        let up = 0, down = 0, none = 0;
        for (const s of nonProcessing) {
          if (s.satisfied === true) up++;
          else if (s.satisfied === false) down++;
          else none++;
        }
        setRatingCounts({ up, down, none });
        
      } catch (error: any) {
        console.error('Error loading dashboard data:', error);
        if (error?.response?.status === 401) {
          navigate('/login/consumer');
          return;
        }
        setUser(authStorage.getUser());
        setStats({ totalSessions: 0, completedSessions: 0, processingSessions: 0, lastSessionDate: null });
        setRecentSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  useEffect(() => {
    try {
      const existing = document.querySelector('script[data-lottie-player]');
      if (!existing) {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
        s.async = true;
        s.setAttribute('data-lottie-player', '');
        document.head.appendChild(s);
      }
    } catch {}
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'PROCESSING': return 'text-yellow-600 bg-yellow-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return t('customer.status.completed');
      case 'PROCESSING': return t('customer.status.processing');
      case 'FAILED': return t('customer.status.failed');
      default: return t('customer.status.unknown');
    }
  };

  const locale = i18n.language && i18n.language.toLowerCase().startsWith('en') ? 'en-US' : 'nl-NL';
  const userType = (user?.user_type || user?.userType || '').toString().toUpperCase();
  const canStartFit = userType === 'PAYED' || userType === 'ADMIN';

  if (!user || loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </CustomerLayout>
    );
  }
  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {(() => {
                  const avatarUrl = user?.profile_image_url || user?.pasphoto_front || user?.pasPhoto_front;
                  return avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={t('customer.common.profilePhotoAlt')}
                      className="h-16 w-16 rounded-full object-cover border-2 border-blue-200"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                  );
                })()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('customer.dashboard.welcome', { name: (user.firstName || user.first_name || '').toString() || 'User' })}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {t('customer.dashboard.subtitle')}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {canStartFit && (
                <button
                  type="button"
                  onClick={() => navigate('/customer/fit-widget')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {i18n.language && i18n.language.toLowerCase().startsWith('en') ? 'Start a FiT' : 'Start een FiT'}
                </button>
              )}
              <lottie-player
                src="https://hruleghaabwolyrkzzoc.supabase.co/storage/v1/object/public/logos/Loading%20Bubbles.json"
                background="transparent"
                speed="1"
                style={{ width: '56px', height: '56px' }}
                loop
                autoplay
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Camera className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('customer.dashboard.stats.total')}</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalSessions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('customer.dashboard.stats.completed')}</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.completedSessions}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <ThumbsUp className="h-6 w-6 text-green-500" />
                </div>
                <div className="w-0 flex-1">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{t('customer.dashboard.ratings.title')}</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-900 font-medium">{ratingCounts.up}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-gray-900 font-medium">{ratingCounts.down}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-900 font-medium">{ratingCounts.none}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('customer.dashboard.stats.last')}</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.lastSessionDate ? new Date(stats.lastSessionDate).toLocaleDateString(locale) : t('customer.common.never')}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{t('customer.dashboard.recent.title')}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{t('customer.dashboard.recent.subtitle')}</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {recentSessions.map((session) => {
              const firstProduct = session.products?.[0];
              const productName = firstProduct?.product_name || t('customer.common.unknownProduct');
              const retailerName = (session as any).shop?.name || (session as any).retailer?.shop_name || t('customer.common.unknownStore');
              const productImage = pickDisplayImage(
                session.status,
                session.generated_image_url,
                firstProduct?.product_image_url
              );
              const isGenerated = session.status === 'COMPLETED' && !!session.generated_image_url;
              
              return (
                <li key={session.id}>
                  <div
                    className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/customer/sessions/${session.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {productImage ? (
                            <img 
                              src={productImage} 
                              alt={productName}
                              className="h-12 w-12 rounded-lg object-cover"
                              style={isGenerated ? { objectPosition: 'center top' } : undefined}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-gray-300 flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {productName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {retailerName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(session.created_at).toLocaleDateString(locale)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              onClick={() => navigate('/customer/sessions')}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('customer.dashboard.recent.viewAll')}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('customer.dashboard.profile.title')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('customer.dashboard.profile.subtitle')}
              </p>
              <button
                onClick={() => navigate('/customer/profile')}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <User className="h-4 w-4 mr-2" />
                {t('customer.dashboard.profile.button')}
              </button>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('customer.dashboard.newFit.title')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('customer.dashboard.newFit.subtitle')}
              </p>
              <button onClick={() => navigate('/customer/partners')} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Camera className="h-4 w-4 mr-2" />
                {t('customer.dashboard.newFit.button')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerDashboard;
