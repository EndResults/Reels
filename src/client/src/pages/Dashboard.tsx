import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Eye,
  Calendar,
  ExternalLink
} from 'lucide-react';
import Lottie from 'lottie-react';
import { authStorage, analyticsAPI, shopsAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import RetailerNav from '../components/RetailerNav';
import { useTranslation } from 'react-i18next';

interface DashboardStats {
  totalSessions: number;
  uniqueUsers: number;
}

interface FitSession {
  id: string;
  productId?: string | null;
  status: string;
  createdAt: string;
  itemsCount?: number | null;
  user?: { gender?: string | null; country?: string | null } | null;
  productUrl?: string | null;
  productName?: string | null;
  productImageUrl?: string | null;
}

interface ShopOption { id: string; name: string }

const Dashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({ totalSessions: 0, uniqueUsers: 0 });
  const [recentSessions, setRecentSessions] = useState<FitSession[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [planType, setPlanType] = useState<'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | null>(null);
  const [lottieData, setLottieData] = useState<any>(null);
  const [hasAnyFitUsage, setHasAnyFitUsage] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = authStorage.getToken();
        const userData = authStorage.getUser();
        if (!token || !userData) {
          navigate('/login/retailer');
          return;
        }
        setUser(userData);
        setApiKey(userData.apiKey || '');

        // Load shops for filter
        try {
          const resp = await shopsAPI.list();
          const list = Array.isArray(resp.data?.data) ? resp.data.data : [];
          setShops(list.map((s: any) => ({ id: s.id, name: s.name })));
        } catch {}

        // Load dashboard and recent sessions (no date filters initially)
        await refreshData('', dateFrom || undefined, dateTo || undefined);

        // Branding settings fetch removed (Restore Poging branding verwijderen Dashboard v4)
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Fout bij laden van het dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  // Load Lottie animation for zero-sessions callout (lazy, non-blocking)
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch('https://hruleghaabwolyrkzzoc.supabase.co/storage/v1/object/public/logos/Retailer_start.json', { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        setLottieData(json);
      } catch (e) {
        // ignore fetch errors (offline or aborted)
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const refreshData = async (shopId: string, startDate?: string, endDate?: string) => {
    try {
      const [dash, sessions] = await Promise.all([
        analyticsAPI.getDashboard({ shopId: shopId || undefined, startDate, endDate }),
        analyticsAPI
          .getRecentSessions({ limit: 10, shopId: shopId || undefined, startDate, endDate, status: 'COMPLETED', sort: 'desc' })
          .catch(() => null)
      ]);
      const d = dash.data?.data;
      const totalSessions = d?.statistics?.totalSessions || 0;
      const sessionsUsed = d?.usage?.sessionsUsed || 0;
      setStats({
        totalSessions,
        uniqueUsers: d?.statistics?.uniqueUsers || d?.statistics?.activeUsers || 0
      });
      setPlanType((d?.retailer?.planType as any) || null);
      setHasAnyFitUsage((totalSessions || 0) > 0 || (sessionsUsed || 0) > 0);

      const rawSessions = sessions && sessions.data && sessions.data.data && Array.isArray(sessions.data.data.sessions)
        ? sessions.data.data.sessions
        : [];
      const list: FitSession[] = rawSessions.map((s: any) => ({
        id: s.id,
        productId: s.productId,
        status: s.status,
        createdAt: s.createdAt,
        itemsCount: s.itemsCount,
        user: s.user,
        productUrl: s.productUrl,
        productName: s.productName,
        productImageUrl: s.productImageUrl
      }));
      // Only show COMPLETED sessions
      const onlyCompleted = list.filter((s) => String(s.status).toUpperCase() === 'COMPLETED');
      setRecentSessions(onlyCompleted.slice(0, 4));
    } catch (e: any) {
      // Als dashboard call zelf faalt, toon foutmelding
      setError(e?.response?.data?.message || e?.message || 'Fout bij laden van het dashboard');
    }
  };

  const handleLogout = () => {
    authStorage.clearAuth();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'completed': return 'text-green-600 bg-green-100';
      case 'PROCESSING':
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'PENDING':
      case 'pending': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    const up = String(status || '').toUpperCase();
    if (up === 'COMPLETED') return t('customer.status.completed');
    if (up === 'PROCESSING') return t('customer.status.processing');
    if (up === 'PENDING') return t('customer.status.pending');
    return t('customer.status.unknown');
  };

  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      showToast({ type: 'success', text: t('retailer.dashboard.toasts.apiKeyCopied') });
    } catch {
      showToast({ type: 'error', text: t('retailer.dashboard.toasts.copyFailed') });
    }
  };

  const handleCopyWidget = async () => {
    const code = `<script src="https://fit-production.up.railway.app/api/widget/bootstrap/${apiKey}" async></script>`;
    try {
      await navigator.clipboard.writeText(code);
      showToast({ type: 'success', text: t('retailer.dashboard.toasts.widgetCopied') });
    } catch {
      showToast({ type: 'error', text: t('retailer.dashboard.toasts.copyFailed') });
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user || loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <RetailerNav title={t('retailer.dashboard.title')} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 flex-wrap">
              <label className="text-sm text-gray-600">{t('retailer.dashboard.filter.period')}</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
              <span className="text-gray-400">—</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
            </div>
            <button
              onClick={() => refreshData(selectedShopId, dateFrom || undefined, dateTo || undefined)}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              {t('retailer.dashboard.filter.apply')}
            </button>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); refreshData(selectedShopId, undefined, undefined); }}
              className="px-3 py-1.5 rounded border text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              {t('retailer.dashboard.filter.reset')}
            </button>
            <div className="inline-flex items-center gap-2">
              <label className="text-sm text-gray-600">{t('retailer.dashboard.filter.shop')}</label>
              <select
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                value={selectedShopId}
                onChange={async (e) => {
                  const v = e.target.value;
                  setSelectedShopId(v);
                  await refreshData(v, dateFrom || undefined, dateTo || undefined);
                }}
              >
                <option value="">{t('retailer.dashboard.filter.total')}</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('retailer.dashboard.stats.totalSessions')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Number(stats.totalSessions || 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          {(planType && planType !== 'STARTER') && (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('retailer.dashboard.stats.uniqueUsers')}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {Number(stats.uniqueUsers || 0).toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Zero sessions callout */}
        {!hasAnyFitUsage && Number(stats.totalSessions || 0) === 0 && (
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0">
                {lottieData ? (
                  <Lottie animationData={lottieData} loop={true} autoplay={true} />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{t('retailer.dashboard.zero.title')}</h3>
                <p className="mt-2 text-sm text-gray-600">{t('retailer.dashboard.zero.desc')}</p>
                <div className="mt-4">
                  <button
                    onClick={() => navigate('/retailer/webshops')}
                    className="inline-flex items-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {t('retailer.dashboard.zero.cta')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {planType && planType !== 'STARTER' ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('retailer.dashboard.recent.title')}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {t('retailer.dashboard.recent.subtitle')}
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {recentSessions.map((session) => (
                <li key={session.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {session.productImageUrl ? (
                            <img
                              src={session.productImageUrl}
                              alt={session.productName || 'Product'}
                              className="h-10 w-10 rounded-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm text-gray-700">
                            {session.user?.gender ? `Gender: ${session.user.gender}` : ''}
                            {session.user?.country ? ` · ${session.user.country}` : ''}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span>{t('customer.common.product')}: {session.productName || 'n/b'}</span>
                            {session.productUrl && (
                              <a href={session.productUrl} target="_blank" rel="noreferrer" title={t('customer.common.view')} className="text-blue-600 hover:text-blue-800">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {typeof session.itemsCount === 'number' && (
                              <span className="text-xs text-gray-400">({session.itemsCount} items)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(session.createdAt).toLocaleDateString(i18n.language || 'nl-NL')}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              {(planType === 'PREMIUM' || planType === 'ENTERPRISE') ? (
                <button
                  onClick={() => navigate('/retailer/sessions')}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  {t('retailer.dashboard.recent.viewAll')}
                </button>
              ) : (
                <button
                  disabled
                  title={t('retailer.dashboard.recent.onlyPremiumTooltip')}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-500 bg-white cursor-not-allowed"
                >
                  {t('retailer.dashboard.recent.onlyPremium')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">{t('retailer.dashboard.recent.title')}</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">{t('retailer.dashboard.recent.onlyPremium')}</p>
            </div>
          </div>
        )}

        {/* Branding settings removed as dit is verplaatst naar Webshops */}
      </div>
    </div>
  );
};

export default Dashboard;
