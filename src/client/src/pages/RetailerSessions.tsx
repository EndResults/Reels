import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI, authStorage, shopsAPI, retailerAPI } from '../services/api';
import RetailerNav from '../components/RetailerNav';
import { Calendar, ExternalLink, Users, Lock } from 'lucide-react';

interface FitSession {
  id: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  shopId?: string | null;
  shop?: { id: string; name: string; url?: string | null } | null;
  itemsCount?: number | null;
  user?: { gender?: string | null; country?: string | null } | null;
  productUrl?: string | null;
  productName?: string | null;
  productImageUrl?: string | null;
}

interface ShopOption { id: string; name: string }

const PAGE_LIMIT = 20;

const RetailerSessions: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<FitSession[]>([]);
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [planType, setPlanType] = useState<'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE' | null>(null);

  useEffect(() => {
    const init = async () => {
      const token = authStorage.getToken();
      const userData = authStorage.getUser();
      if (!token || !userData) {
        navigate('/login/retailer');
        return;
      }
      setUser(userData);

      try {
        const resp = await shopsAPI.list();
        const list = Array.isArray(resp.data?.data) ? resp.data.data : [];
        setShops(list.map((s: any) => ({ id: s.id, name: s.name })));
      } catch {}

      // Load plan type via branding settings (returns { plan })
      try {
        const b = await retailerAPI.getBrandingSettings();
        const p = b?.data?.data?.plan;
        if (p && ['STARTER','BASIC','PREMIUM','ENTERPRISE'].includes(String(p).toUpperCase())) {
          setPlanType(String(p).toUpperCase() as any);
        }
      } catch {}

      await loadPage(1, selectedShopId, dateFrom || undefined, dateTo || undefined);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const loadPage = async (p: number, shopId?: string, startDate?: string, endDate?: string, srt: 'asc' | 'desc' = sort) => {
    try {
      setLoading(true);
      setError(null);
      setForbidden(false);
      const resp = await analyticsAPI.getRecentSessions({ page: p, limit: PAGE_LIMIT, shopId, startDate, endDate, status: 'COMPLETED', sort: srt });
      const data = resp.data?.data;
      const list: FitSession[] = (data?.sessions || []).map((s: any) => ({
        id: s.id,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        shopId: s.shopId,
        shop: s.shop || null,
        itemsCount: s.itemsCount,
        user: s.user || null,
        productUrl: s.productUrl || null,
        productName: s.productName || null,
        productImageUrl: s.productImageUrl || null
      }));
      // Ensure only COMPLETED shown even if backend fallback returns more
      setSessions(list.filter(x => String(x.status).toUpperCase() === 'COMPLETED'));
      setPage(data?.pagination?.page || p);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setForbidden(true);
        setError(null);
      } else {
        setError(e?.response?.data?.message || e?.message || 'Fout bij laden sessies');
      }
    } finally {
      setLoading(false);
    }
  };

  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => page < totalPages, [page, totalPages]);

  if (!user) {
    return null;
  }

  // Client-side search over visible fields
  const filteredSessions = sessions.filter((s) => {
    if (!search) return true;
    const hay = [
      s.user?.gender || '',
      s.user?.country || '',
      s.shop?.name || '',
      s.productUrl || '',
      s.productName || ''
    ].join(' ').toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <RetailerNav title="Alle FiT Sessies" backTo="/dashboard" />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {forbidden && (
          <div className="bg-white border border-blue-200 rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-blue-700" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Premium feature</h3>
                <p className="mt-1 text-sm text-gray-600">Het volledige overzicht van FiT sessies is beschikbaar vanaf het Premium abonnement.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => navigate('/retailer/settings')} className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700">Upgrade naar Premium</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Filters */}
        <div className={`flex flex-wrap items-center gap-3 mb-6 ${forbidden ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Zoeken..."
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
          <div className="inline-flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600">Periode:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
            <span className="text-gray-400">—</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
          </div>
          <button
            onClick={() => loadPage(1, selectedShopId || undefined, dateFrom || undefined, dateTo || undefined, sort)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Toepassen
          </button>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); loadPage(1, selectedShopId || undefined, undefined, undefined, sort); }}
            className="px-3 py-1.5 rounded border text-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            Reset
          </button>
          <div className="inline-flex items-center gap-2">
            <label className="text-sm text-gray-600">Webshop:</label>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={selectedShopId}
              onChange={(e) => { const v = e.target.value; setSelectedShopId(v); loadPage(1, v || undefined, dateFrom || undefined, dateTo || undefined, sort); }}
            >
              <option value="">Totaal (alle webshops)</option>
              {shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="inline-flex items-center gap-2">
            <label className="text-sm text-gray-600">Sorteer:</label>
            <select
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={sort}
              onChange={(e) => { const v = (e.target.value as 'asc' | 'desc'); setSort(v); loadPage(1, selectedShopId || undefined, dateFrom || undefined, dateTo || undefined, v); }}
            >
              <option value="desc">Nieuw → Oud</option>
              <option value="asc">Oud → Nieuw</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className={`bg-white shadow overflow-hidden sm:rounded-md ${forbidden ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Overzicht sessies</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Filter en bekijk alle FiT sessies</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {loading && (
              <li className="px-4 py-6 text-sm text-gray-500">Laden...</li>
            )}
            {error && (
              <li className="px-4 py-6 text-sm text-red-600">{error}</li>
            )}
            {!loading && !error && filteredSessions.length === 0 && (
              <li className="px-4 py-6 text-sm text-gray-500">Geen sessies gevonden voor deze filter</li>
            )}
            {!loading && !error && filteredSessions.map((s) => (
              <li key={s.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {s.productImageUrl ? (
                          <img src={s.productImageUrl} alt={s.productName || 'Product'} className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm text-gray-700">
                          {s.user?.gender ? `Geslacht: ${s.user.gender}` : 'Geslacht: onbekend'}
                          {s.user?.country ? ` · Land: ${s.user.country}` : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          {s.shop?.name ? `Webshop: ${s.shop.name}` : ''}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span>Product: {s.productName || 'n/b'}</span>
                          {s.productUrl && (
                            <a href={s.productUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800" title="bekijk artikel">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {typeof s.itemsCount === 'number' && (
                            <span className="text-xs text-gray-400">({s.itemsCount} items)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                        {s.status}
                      </span>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(s.createdAt).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="px-4 py-3 bg-gray-50 flex items-center justify-between sm:px-6">
            <div className="text-xs text-gray-500">Pagina {page} van {totalPages}</div>
            <div className="space-x-2">
              <button
                onClick={() => canPrev && loadPage(page - 1, selectedShopId || undefined, dateFrom || undefined, dateTo || undefined)}
                disabled={!canPrev}
                className={`px-3 py-1.5 rounded border text-sm ${canPrev ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Vorige
              </button>
              <button
                onClick={() => canNext && loadPage(page + 1, selectedShopId || undefined, dateFrom || undefined, dateTo || undefined)}
                disabled={!canNext}
                className={`px-3 py-1.5 rounded border text-sm ${canNext ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Volgende
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerSessions;
