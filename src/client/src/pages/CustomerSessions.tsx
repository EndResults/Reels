import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Camera, 
  Calendar, 
  Search,
  Eye,
  Heart,
  ShoppingBag,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Info,
  Sparkles
} from 'lucide-react';
import { CustomerLayout } from '../components/CustomerLayout';
import { authStorage } from '../services/api';
import { fitSessionsAPI, FitSessionWithProducts } from '../services/fitSessionsAPI';
import { pickDisplayImage } from '../utils/image';
import { getCategoryLabel } from '../constants/categories';
import { useToast } from '../components/ToastProvider';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '../hooks/useAnalytics';

// Allow TSX to render the lottie-player web component
declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface IntrinsicElements {
      'lottie-player': any;
    }
  }
}

const CustomerSessions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<FitSessionWithProducts[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<FitSessionWithProducts[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'store_asc' | 'store_desc'>('date_desc');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'up' | 'down' | 'none'>('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false); // accordion collapsed by default
  // Scroll restore keys & UI state
  const SCROLL_KEY = 'customerSessions.scrollY';
  const FROM_ID_KEY = 'customerSessions.fromId';
  const FILTERS_KEY = 'customerSessions.filters';
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [restoredScroll, setRestoredScroll] = useState(false);
  // Deletion modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  // Bottom actions root for portal (created after mount to avoid initial null)
  const [actionsRoot, setActionsRoot] = useState<HTMLElement | null>(null);
  const locale = i18n.language && i18n.language.toLowerCase().startsWith('en') ? 'en-US' : 'nl-NL';
  const userType = (user?.user_type || user?.userType || '').toString().toUpperCase();
  const canStartFit = userType === 'PAYED' || userType === 'ADMIN';

  useEffect(() => {
    const ensureRoot = () => {
      let el = document.getElementById('fit-bottom-actions') as HTMLElement | null;
      if (!el) {
        el = document.createElement('div');
        el.id = 'fit-bottom-actions';
        el.className = 'fixed bottom-6 left-6 z-50 flex items-center gap-2 sm:gap-3';
        document.body.appendChild(el);
      }
      setActionsRoot(el);
    };
    ensureRoot();
  }, []);

  // Count of COMPLETED sessions within current filters
  const completedCount = useMemo(() => {
    return filteredSessions.filter(s => s.status === 'COMPLETED').length;
  }, [filteredSessions]);

  // Ensure lottie web component is available
  useEffect(() => {
    const existing = document.querySelector('script[data-lottie-player]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
      s.async = true;
      s.setAttribute('data-lottie-player', '');
      document.head.appendChild(s);
    }
  }, []);

  // Resolve UI language (defaults to NL). Only nl/en supported for labels.
  const lang = useMemo(() => {
    const l = (user?.language || 'nl').toString().toLowerCase();
    return (l === 'en' ? 'en' : 'nl') as 'nl' | 'en';
  }, [user]);

  const storeOptions = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach(s => {
      const name = s.shop?.name || s.retailer?.shop_name;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }));
  }, [sessions]);

  const activeFilters = useMemo(() => {
    let c = 0;
    if (searchTerm) c++;
    if (storeFilter !== 'all') c++;
    if (categoryFilter !== 'all') c++;
    if (startDate) c++;
    if (endDate) c++;
    if (favoritesOnly) c++;
    if (ratingFilter !== 'all') c++;
    return c;
  }, [searchTerm, storeFilter, categoryFilter, startDate, endDate, favoritesOnly, ratingFilter]);

  // Category options present in user's sessions, restricted to known DB categories
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    sessions.forEach(s => {
      const key = (s.category || '').toString().trim().toUpperCase();
      // Only count categories that have a valid translation (getCategoryLabel returns the key when missing)
      if (key && getCategoryLabel(key, lang) !== key) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return Array.from(counts.keys()).sort((a, b) =>
      getCategoryLabel(a, lang).localeCompare(getCategoryLabel(b, lang), 'nl', { sensitivity: 'base' })
    );
  }, [sessions, lang]);

  const clearFilters = () => {
    setSearchTerm('');
    setStoreFilter('all');
    setCategoryFilter('all');
    setStartDate('');
    setEndDate('');
    setFavoritesOnly(false);
    setSortOption('date_desc');
    setRatingFilter('all');
    try { sessionStorage.removeItem(FILTERS_KEY); } catch {}
  };

  useEffect(() => {
    // Restore persisted filters/search/sort/view state
    try {
      const raw = sessionStorage.getItem(FILTERS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.searchTerm === 'string') setSearchTerm(saved.searchTerm);
        if (typeof saved.storeFilter === 'string') setStoreFilter(saved.storeFilter);
        if (typeof saved.categoryFilter === 'string') setCategoryFilter(saved.categoryFilter);
        if (typeof saved.startDate === 'string') setStartDate(saved.startDate);
        if (typeof saved.endDate === 'string') setEndDate(saved.endDate);
        if (typeof saved.favoritesOnly === 'boolean') setFavoritesOnly(saved.favoritesOnly);
        if (typeof saved.sortOption === 'string') setSortOption(saved.sortOption);
        if (saved.ratingFilter === 'all' || saved.ratingFilter === 'up' || saved.ratingFilter === 'down' || saved.ratingFilter === 'none') setRatingFilter(saved.ratingFilter);
        if (saved.viewMode === 'grid' || saved.viewMode === 'list') setViewMode(saved.viewMode);
        if (typeof saved.filtersOpen === 'boolean') setFiltersOpen(saved.filtersOpen);
      }
    } catch {}

    // Derive backend base for SSO bridge
    const RAW_API_URL = (import.meta.env.VITE_API_URL || 'https://fit-production.up.railway.app').replace(/\/+$/, '');
    const SERVER_BASE = RAW_API_URL.endsWith('/api') ? RAW_API_URL.slice(0, -4) : RAW_API_URL;

    // Attempt to acquire a short-lived token via SSO bridge popup
    const attemptSSOBridge = (): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;
        const wantsOrigin = window.location.origin;
        const url = `${SERVER_BASE}/api/auth-supabase/sso-bridge?target=${encodeURIComponent(wantsOrigin)}`;
        const popup = window.open(
          url,
          'fit_sso_bridge',
          'width=420,height=520,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
        );

        const cleanup = () => {
          try { window.removeEventListener('message', onMessage); } catch {}
          try { if (popup && !popup.closed) popup.close(); } catch {}
        };

        const onMessage = (e: MessageEvent) => {
          try {
            const d: any = e.data;
            if (!d || typeof d !== 'object') return;
            if (d.type !== 'FIT_SSO_BRIDGE') return;
            if (resolved) return;
            if (d.status === 'ok' && d.token) {
              try { authStorage.setToken(d.token); } catch {}
              try { if (d.user) authStorage.setUser(d.user); } catch {}
              resolved = true;
              cleanup();
              resolve(true);
              return;
            }
            // No active session in cookie
            resolved = true;
            cleanup();
            resolve(false);
          } catch {}
        };

        window.addEventListener('message', onMessage);

        // Fallback timeout
        setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          resolve(false);
        }, 6500);
      });
    };

    const loadSessionsData = async () => {
      // 1) Ingest token/user from URL if provided (widget fallback when cookies/popup are blocked)
      try {
        const urlNow = new URL(window.location.href);
        const t = urlNow.searchParams.get('t');
        const u = urlNow.searchParams.get('u');
        if (t) {
          authStorage.setToken(t);
        }
        if (u) {
          try {
            const json = decodeURIComponent(escape(atob(u)));
            const parsed = JSON.parse(json);
            // Ensure minimal fields
            const minimalUser: any = {
              id: parsed?.id || parsed?.userId || parsed?.user_id || undefined,
              email: parsed?.email || parsed?.emailAddress || undefined,
              role: 'user'
            };
            authStorage.setUser(minimalUser);
          } catch {}
        }
        if (t || u) {
          urlNow.searchParams.delete('t');
          urlNow.searchParams.delete('u');
          // keep sso flag for now; we may still run popup if needed later
          window.history.replaceState({}, '', urlNow.toString());
        }
      } catch {}

      // 2) Check if user is authenticated (after URL ingestion)
      let token = authStorage.getToken();
      let userData = authStorage.getUser();

      // 3) If unauthenticated, try SSO bridge only when explicitly requested via query param
      const params = new URLSearchParams(location.search || '');
      const wantsSSO = params.get('sso') === '1';
      if ((!token || !userData) && wantsSSO) {
        const bridged = await attemptSSOBridge();
        if (bridged) {
          // Remove sso flag from URL to avoid re-triggering the bridge on refresh
          try {
            const u2 = new URL(window.location.href);
            u2.searchParams.delete('sso');
            window.history.replaceState({}, '', u2.toString());
          } catch {}
          token = authStorage.getToken();
          userData = authStorage.getUser();
        }
      }

      if (!token || !userData) {
        navigate('/login/consumer');
        return;
      }

      setUser(userData);

      try {
        // Load real FiT sessions from Supabase
        const sessionsData = await fitSessionsAPI.getUserSessions();
        setSessions(sessionsData);
        // Hide PROCESSING sessions by default
        setFilteredSessions(sessionsData.filter(s => s.status !== 'PROCESSING'));
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
        setFilteredSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessionsData();
  }, [navigate]);

  // Persist filters/search/sort/view state on change
  useEffect(() => {
    try {
      const payload = {
        searchTerm,
        storeFilter,
        categoryFilter,
        startDate,
        endDate,
        favoritesOnly,
        sortOption,
        ratingFilter,
        viewMode,
        filtersOpen,
      };
      sessionStorage.setItem(FILTERS_KEY, JSON.stringify(payload));
    } catch {}
  }, [searchTerm, storeFilter, categoryFilter, startDate, endDate, favoritesOnly, sortOption, ratingFilter, viewMode, filtersOpen]);

  // Show/hide "Back to top" button based on scroll
  useEffect(() => {
    const onScroll = () => setShowBackToTop((window.scrollY || window.pageYOffset) > 400);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Restore scroll position when returning from detail page
  useEffect(() => {
    if (restoredScroll) return;
    if (loading) return; // wait until content is ready
    const saved = sessionStorage.getItem(SCROLL_KEY);
    const navState = (location && (location as any).state) || undefined;
    const stateId = navState?.fromSessionId as string | undefined;
    const fromId = stateId || sessionStorage.getItem(FROM_ID_KEY);
    const hasSaved = typeof saved === 'string' && saved !== '' && !Number.isNaN(Number(saved));

    let attempts = 0;
    const maxAttempts = 20; // ~1s with 50ms interval

    const tryRestore = () => {
      attempts++;
      // Prefer scrolling to the exact tile when we know the originating session id
      if (fromId) {
        const el = document.getElementById(`session-tile-${fromId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'auto', block: 'start' });
          // Double-check after a tick to reduce layout shift effects
          requestAnimationFrame(() => el.scrollIntoView({ behavior: 'auto', block: 'start' }));
          setRestoredScroll(true);
          sessionStorage.removeItem(SCROLL_KEY);
          sessionStorage.removeItem(FROM_ID_KEY);
          // Clear location state to avoid future unintended restores
          try { window.history.replaceState({}, '', location.pathname + location.search); } catch {}
          return;
        }
      }

      // If we didn't find the element yet, retry for a short while
      if (attempts < maxAttempts) {
        setTimeout(tryRestore, 50);
        return;
      }

      // Fallback to absolute Y position if we have it
      if (hasSaved) {
        const y = parseInt(saved as string, 10) || 0;
        window.scrollTo({ top: y, behavior: 'auto' });
        setRestoredScroll(true);
        sessionStorage.removeItem(SCROLL_KEY);
        sessionStorage.removeItem(FROM_ID_KEY);
        try { window.history.replaceState({}, '', location.pathname + location.search); } catch {}
        return;
      }

      // Fresh visit: go to top
      window.scrollTo({ top: 0, behavior: 'auto' });
      setRestoredScroll(true);
      try { window.history.replaceState({}, '', location.pathname + location.search); } catch {}
    };

    // Defer first attempt to next frame so DOM has rendered
    requestAnimationFrame(tryRestore);
  }, [loading, filteredSessions.length, restoredScroll, location]);

  // Filter & sort sessions based on search term, store, category and date range
  useEffect(() => {
    let filtered = [...sessions];

    // Always hide sessions that are still processing
    filtered = filtered.filter(session => session.status !== 'PROCESSING');

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(session => {
        const firstProduct = session.products?.[0];
        const productName = firstProduct?.product_name || '';
        const retailerName = session.shop?.name || session.retailer?.shop_name || '';
        return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               retailerName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(session => ((session.shop?.name || session.retailer?.shop_name || '')).toLowerCase() === storeFilter.toLowerCase());
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(session => session.category === categoryFilter);
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      filtered = filtered.filter(session => new Date(session.created_at) >= start);
    }

    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.998');
      filtered = filtered.filter(session => new Date(session.created_at) <= end);
    }

    // Favorites filter
    if (favoritesOnly) {
      filtered = filtered.filter(session => !!session.favorite);
    }

    // Rating filter (satisfied)
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'up') {
        filtered = filtered.filter(session => session.satisfied === true);
      } else if (ratingFilter === 'down') {
        filtered = filtered.filter(session => session.satisfied === false);
      } else if (ratingFilter === 'none') {
        filtered = filtered.filter(session => session.satisfied === null || typeof session.satisfied === 'undefined');
      }
    }

    // Sorting
    switch (sortOption) {
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'store_asc':
        filtered.sort((a, b) => ((a.shop?.name || a.retailer?.shop_name || '')).localeCompare((b.shop?.name || b.retailer?.shop_name || ''), 'nl', { sensitivity: 'base' }));
        break;
      case 'store_desc':
        filtered.sort((a, b) => ((b.shop?.name || b.retailer?.shop_name || '')).localeCompare((a.shop?.name || a.retailer?.shop_name || ''), 'nl', { sensitivity: 'base' }));
        break;
      case 'date_desc':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredSessions(filtered);
  }, [sessions, searchTerm, categoryFilter, storeFilter, startDate, endDate, sortOption, favoritesOnly, ratingFilter]);

  // Count of unrated in current non-rating filters (to show next to the button)
  const unratedCount = useMemo(() => {
    let list = [...sessions];
    list = list.filter(s => s.status !== 'PROCESSING');
    if (searchTerm) {
      list = list.filter(session => {
        const firstProduct = session.products?.[0];
        const productName = firstProduct?.product_name || '';
        const retailerName = session.shop?.name || session.retailer?.shop_name || '';
        return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               retailerName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    if (storeFilter !== 'all') {
      list = list.filter(session => ((session.shop?.name || session.retailer?.shop_name || '')).toLowerCase() === storeFilter.toLowerCase());
    }
    if (categoryFilter !== 'all') {
      list = list.filter(session => session.category === categoryFilter);
    }
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      list = list.filter(session => new Date(session.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.998');
      list = list.filter(session => new Date(session.created_at) <= end);
    }
    if (favoritesOnly) {
      list = list.filter(session => !!session.favorite);
    }
    return list.filter(s => s.satisfied === null || typeof s.satisfied === 'undefined').length;
  }, [sessions, searchTerm, storeFilter, categoryFilter, startDate, endDate, favoritesOnly]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'PROCESSING': return <Clock className="h-4 w-4" />;
      case 'FAILED': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Navigate to detail while storing current scroll position
  const handleOpenDetail = (id: string) => {
    try {
      const y = String(window.scrollY || window.pageYOffset || 0);
      sessionStorage.setItem(SCROLL_KEY, y);
      sessionStorage.setItem(FROM_ID_KEY, id);
    } catch {}
    try { trackEvent('fit_detail_open', { consumer_id: user?.id, fit_session_id: id }); } catch {}
    navigate(`/customer/sessions/${id}`);
  };

  const toggleFavorite = async (sessionId: string) => {
    try {
      const current = sessions.find(s => s.id === sessionId);
      const nextFav = !Boolean(current?.favorite);

      // Optimistic UI update
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: nextFav } : s));
      setFilteredSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: nextFav } : s));

      await fitSessionsAPI.toggleFavorite(sessionId, nextFav);
      showToast({ type: 'success', text: nextFav ? t('customer.sessions.toast.favoriteAdded') : t('customer.sessions.toast.favoriteRemoved') });
    } catch (e) {
      // Revert on error by flipping again from current filtered state snapshot
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: !s.favorite } : s));
      setFilteredSessions(prev => prev.map(s => s.id === sessionId ? { ...s, favorite: !s.favorite } : s));
      showToast({ type: 'error', text: t('customer.sessions.toast.favUpdateFailed') });
    }
  };

  const askDelete = (sessionId: string) => {
    setDeletingId(sessionId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      const ok = await fitSessionsAPI.deleteSession(deletingId);
      if (ok) {
        // Update local lists
        setSessions(prev => prev.filter(s => s.id !== deletingId));
        setFilteredSessions(prev => prev.filter(s => s.id !== deletingId));
        showToast({ type: 'success', text: t('customer.sessions.toast.deleted') });
      } else {
        showToast({ type: 'error', text: t('customer.sessions.toast.deleteFailed') });
      }
    } catch (e) {
      console.error('Delete failed', e);
      showToast({ type: 'error', text: t('customer.sessions.toast.deleteFailed') });
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{t('customer.sessions.title')}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                {t('customer.sessions.badge', { count: completedCount })}
              </span>
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
          <p className="mt-1 text-sm text-gray-600">{t('customer.sessions.subtitle')}</p>
        </div>

        {/* Filters & Sort - Accordion */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          {/* Accordion Header */}
          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 sm:py-4 border-b text-left hover:bg-gray-50"
            aria-expanded={filtersOpen}
            aria-controls="filters-content"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">{t('customer.sessions.filters.title')}</span>
              {activeFilters > 0 && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{t('customer.sessions.filters.active', { count: activeFilters })}</span>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Accordion Content */}
          {filtersOpen && (
            <div id="filters-content" className="px-4 py-5 sm:p-6">
              {/* Row 1: Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={t('customer.sessions.search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Winkel Filter */}
                <div>
                  <select
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">{t('customer.sessions.filter.storeAll')}</option>
                    {storeOptions.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">{t('customer.sessions.filter.categoryAll')}</option>
                    {categoryOptions.map((key) => (
                      <option key={key} value={key}>{getCategoryLabel(key, lang)}</option>
                    ))}
                  </select>
                </div>

                {/* Datum van */}
                <div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Datum t/m */}
                <div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Actions, Sorting, Favorites & View */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  disabled={!(searchTerm || startDate || endDate || favoritesOnly || storeFilter !== 'all' || categoryFilter !== 'all' || sortOption !== 'date_desc' || ratingFilter !== 'all')}
                >
                  {t('customer.sessions.clearFilters')}
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  {/* Favorites filter */}
                  <button
                    onClick={() => setFavoritesOnly(v => !v)}
                    aria-pressed={favoritesOnly}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm ${favoritesOnly ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    title={favoritesOnly ? t('customer.sessions.favoritesTooltipOn') : t('customer.sessions.favoritesTooltipOff')}
                  >
                    <Heart
                      className={`h-4 w-4 ${favoritesOnly ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                      fill={favoritesOnly ? 'currentColor' : 'none'}
                    />
                    <span>{t('customer.sessions.favorites')}</span>
                  </button>

                  {/* Rating filters */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRatingFilter(prev => prev === 'up' ? 'all' : 'up')}
                      aria-pressed={ratingFilter === 'up'}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm ${ratingFilter === 'up' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      title={ratingFilter === 'up' ? t('customer.sessions.ratingFilter.showAll') : t('customer.sessions.ratingFilter.up')}
                    >
                      <ThumbsUp className={`h-4 w-4 ${ratingFilter === 'up' ? 'text-green-600' : 'text-gray-400'}`} />
                    </button>
                    <button
                      onClick={() => setRatingFilter(prev => prev === 'down' ? 'all' : 'down')}
                      aria-pressed={ratingFilter === 'down'}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm ${ratingFilter === 'down' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      title={ratingFilter === 'down' ? t('customer.sessions.ratingFilter.showAll') : t('customer.sessions.ratingFilter.down')}
                    >
                      <ThumbsDown className={`h-4 w-4 ${ratingFilter === 'down' ? 'text-red-600' : 'text-gray-400'}`} />
                    </button>
                    <button
                      onClick={() => setRatingFilter(prev => prev === 'none' ? 'all' : 'none')}
                      aria-pressed={ratingFilter === 'none'}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm ${ratingFilter === 'none' ? 'bg-gray-50 text-gray-700 border-gray-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      title={ratingFilter === 'none' ? t('customer.sessions.ratingFilter.showAll') : t('customer.sessions.ratingFilter.none')}
                    >
                      <HelpCircle className={`h-4 w-4 ${ratingFilter === 'none' ? 'text-gray-700' : 'text-gray-400'}`} />
                    </button>
                  </div>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="hidden sm:inline text-sm text-gray-600">{t('customer.sessions.view.label')}</span>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'grid'}
                    title={t('customer.sessions.view.grid')}
                    onClick={() => setViewMode('grid')}
                    className={`p-2 border rounded-md ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'list'}
                    title={t('customer.sessions.view.list')}
                    onClick={() => setViewMode('list')}
                    className={`p-2 border rounded-md ${viewMode === 'list' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('customer.sessions.no.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {sessions.length === 0 ? t('customer.sessions.no.empty') : t('customer.sessions.no.filtered')}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.map((session) => {
                const firstProduct = session.products?.[0];
                const productName = firstProduct?.product_name || t('customer.common.unknownProduct');
                const productPrice = firstProduct?.product_price || '';
                const retailerName = session.shop?.name || session.retailer?.shop_name || t('customer.common.unknownStore');
                const productImage = pickDisplayImage(
                  session.status,
                  session.generated_image_url,
                  firstProduct?.product_image_url
                );
                const itemCount = Array.isArray(session.products) ? session.products.length : 0;
                const isGenerated = session.status === 'COMPLETED' && !!session.generated_image_url;
                return (
                  <div id={`session-tile-${session.id}`} key={session.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                    <div className="relative">
                      {productImage ? (
                        <img src={productImage} alt={productName} className="w-full h-48 object-cover" style={isGenerated ? { objectPosition: '50% 15%' } : undefined} />
                      ) : (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                          <ShoppingBag className="h-12 w-12 text-gray-400" />
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusIcon(session.status)}
                          <span className="ml-1">{getStatusText(session.status)}</span>
                        </span>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(session.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50"
                        aria-label="favorite"
                      >
                        <Heart className={`h-4 w-4 ${session.favorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                      </button>
                    </div>

                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 truncate">{productName}</h3>
                          {productPrice && (
                            <p className="text-sm font-medium text-green-600">{productPrice}</p>
                          )}
                          <p className="text-sm text-gray-500 truncate">
                            {retailerName}
                          </p>
                          {(session.category || 'Algemeen') && (
                            <p className="mt-1 text-xs inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                              {getCategoryLabel(session.category, lang)}
                            </p>
                          )}
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-1">
                          {itemCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                              <ShoppingBag className="h-3 w-3 mr-1" />
                              {itemCount}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            {session.satisfied === true ? (
                              <ThumbsUp className="h-4 w-4 text-green-600" />
                            ) : session.satisfied === false ? (
                              <ThumbsDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <HelpCircle className="h-4 w-4 text-gray-500" />
                            )}
                            {String(session.feedback || '').trim().length > 0 && (
                              <button
                                type="button"
                                className="p-0.5 rounded hover:bg-gray-50"
                                title={session.feedback as string}
                              >
                                <Info className="h-4 w-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                        <span>{new Date(session.created_at).toLocaleDateString(locale)}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex space-x-2">
                        {session.status === 'COMPLETED' && session.generated_image_url && (
                          <button
                            onClick={() => handleOpenDetail(session.id)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('customer.sessions.actions.view')}
                          </button>
                        )}
                        {firstProduct?.product_url && (
                          <button
                            onClick={() => window.open(firstProduct.product_url, '_blank')}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {t('customer.sessions.actions.product')}
                          </button>
                        )}
                        <button
                          onClick={() => askDelete(session.id)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm rounded-md text-white bg-orange-500 hover:bg-orange-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          {t('customer.sessions.actions.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
            {filteredSessions.map((session) => {
              const firstProduct = session.products?.[0];
              const productName = firstProduct?.product_name || t('customer.common.unknownProduct');
              const productPrice = firstProduct?.product_price || '';
              const retailerName = session.shop?.name || session.retailer?.shop_name || t('customer.common.unknownStore');
              const itemCount = Array.isArray(session.products) ? session.products.length : 0;
              const displayImage = pickDisplayImage(
                session.status,
                session.generated_image_url,
                firstProduct?.product_image_url
              );
              const isGenerated = session.status === 'COMPLETED' && !!session.generated_image_url;

              return (
                <div id={`session-tile-${session.id}`} key={session.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {displayImage ? (
                        <img 
                          src={displayImage} 
                          alt={productName}
                          className="w-16 h-16 object-cover rounded-lg"
                          style={isGenerated ? { objectPosition: '50% 15%' } : undefined}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {productName}
                          </h3>
                          <p className="text-sm text-gray-500 truncate flex items-center gap-2">
                            <span className="truncate">{retailerName}</span>
                            {(session.category || 'Algemeen') && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                {getCategoryLabel(session.category, lang)}
                              </span>
                            )}
                            {itemCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                <ShoppingBag className="h-3 w-3 mr-1" />
                                {itemCount}
                              </span>
                            )}
                          </p>
                          {productPrice && (
                            <p className="text-sm font-medium text-green-600">
                              {productPrice}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            {session.satisfied === true ? (
                              <ThumbsUp className="h-4 w-4 text-green-600" />
                            ) : session.satisfied === false ? (
                              <ThumbsDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <HelpCircle className="h-4 w-4 text-gray-500" />
                            )}
                            {String(session.feedback || '').trim().length > 0 && (
                              <button
                                type="button"
                                className="p-0.5 rounded hover:bg-gray-50"
                                title={session.feedback as string}
                              >
                                <Info className="h-4 w-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Actions for list view */}
                        <div className="flex items-center gap-2 shrink-0">
                          {session.status === 'COMPLETED' && session.generated_image_url && (
                            <button
                              onClick={() => handleOpenDetail(session.id)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('customer.sessions.actions.view')}
                            </button>
                          )}
                          {firstProduct?.product_url && (
                            <button
                              onClick={() => window.open(firstProduct.product_url, '_blank')}
                              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              {t('customer.sessions.actions.product')}
                            </button>
                          )}
                          <button
                            onClick={() => askDelete(session.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm text-white bg-orange-500 hover:bg-orange-600"
                          >
                            {t('customer.sessions.actions.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>
      {/* Confirm deletion modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !isDeleting && setConfirmOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('customer.sessions.confirmDelete.title')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('customer.sessions.confirmDelete.text')}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {t('customer.sessions.confirmDelete.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? t('customer.sessions.confirmDelete.deleting') : t('customer.sessions.confirmDelete.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Back to top floating button rendered into global bottom actions container */}
      {showBackToTop && actionsRoot && createPortal(
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex items-center px-3 py-2 rounded-full shadow-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none pointer-events-auto"
          aria-label={t('customer.sessions.backToTop.aria')}
        >
          <ChevronUp className="h-5 w-5 mr-1" />
          <span className="text-sm font-medium">{t('customer.sessions.backToTop.label')}</span>
        </button>,
        actionsRoot
      )}
    </CustomerLayout>
  );
};

export default CustomerSessions;
