import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerLayout } from '../components/CustomerLayout';
import { publicShopsAPI, authStorage } from '../services/api';
import { getCategoryLabel, Locale } from '../constants/categories';
import { ArrowLeft, ExternalLink, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTranslation } from 'react-i18next';

interface PublicShop {
  id: string;
  name: string;
  category: string;
  url?: string | null;
  language?: 'nl' | 'en' | null;
  logo_url?: string | null;
  is_active: boolean;
}

function getInitials(name?: string): string {
  if (!name) return 'WS';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || parts[0]?.[1] || '';
  return (a + b).toUpperCase();
}

const ALL_CATEGORY = 'ALL';

type SortBy = 'name' | 'category';

const CustomerPartners: React.FC = () => {
  const navigate = useNavigate();
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { trackEvent } = useAnalytics();
  const { t, i18n } = useTranslation();
  const lang: Locale = (i18n.language && i18n.language.toLowerCase().startsWith('en')) ? 'en' : 'nl';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL_CATEGORY);
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await publicShopsAPI.list();
        const data = resp.data;
        if (data?.success) {
          setShops(data.data || []);
        } else {
          setError(data?.message || 'Kon partners niet laden');
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Kon partners niet laden');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categoriesFromData = useMemo(() => {
    const set = new Set<string>();
    shops.forEach(s => s.category && set.add(String(s.category).toUpperCase()));
    return Array.from(set).sort();
  }, [shops]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return shops
      .filter(s => (category === ALL_CATEGORY ? true : String(s.category).toUpperCase() === category))
      .filter(s => (term ? s.name.toLowerCase().includes(term) : true))
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return String(a.category).localeCompare(String(b.category));
      });
  }, [shops, search, category, sortBy]);

  const activeFilters = useMemo(() => {
    let c = 0;
    if (search.trim()) c++;
    if (category !== ALL_CATEGORY) c++;
    if (sortBy !== 'name') c++;
    return c;
  }, [search, category, sortBy]);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> {t('customer.partners.back')}
          </button>
          <h1 className="text-xl font-bold text-gray-900">{t('customer.partners.title')}</h1>
          <div />
        </div>

        {/* Filters & Sort - Accordion (aligned with /customer/sessions) */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          {/* Accordion Header */}
          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 sm:py-4 border-b text-left hover:bg-gray-50"
            aria-expanded={filtersOpen}
            aria-controls="partners-filters-content"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-900">{t('customer.partners.filters.title')}</span>
              {activeFilters > 0 && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{activeFilters} {t('customer.partners.filters.active')}</span>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Accordion Content */}
          {filtersOpen && (
            <div id="partners-filters-content" className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('customer.partners.filters.searchLabel')}</label>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('customer.partners.filters.placeholder')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('customer.partners.filters.category')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value={ALL_CATEGORY}>{t('customer.partners.filters.allCategories')}</option>
                    {categoriesFromData.map((c) => (
                      <option key={c} value={c}>{getCategoryLabel(c, lang)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('customer.partners.filters.sortBy')}</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="name">{t('customer.partners.filters.nameAsc')}</option>
                    <option value="category">{t('customer.partners.filters.categoryAsc')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-500">{t('customer.partners.loading')}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error || t('customer.partners.error')}</div>
        )}

        {!loading && !error && (
          <>
            <div className="text-sm text-gray-500 mb-3">{t('customer.partners.results', { count: filtered.length })}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((shop) => (
                <div key={shop.id} className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col items-center text-center">
                  {/* Logo or initials */}
                  {shop.logo_url ? (
                    <div className="h-16 flex items-center justify-center">
                      <img src={shop.logo_url} alt={`${shop.name} logo`} className="h-16 object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-700 font-semibold text-base">{getInitials(shop.name)}</span>
                    </div>
                  )}

                  {/* Name and category */}
                  <h3 className="mt-3 text-base font-semibold text-gray-900 truncate max-w-[240px]">{shop.name}</h3>
                  <span className="mt-1 px-2.5 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                    {getCategoryLabel(shop.category, lang)}
                  </span>

                  {/* Visit button */}
                  <div className="mt-4">
                    <a
                      href={shop.url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!shop.url}
                      className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${shop.url ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                      onClick={(e) => {
                        if (!shop.url) {
                          e.preventDefault();
                        } else {
                          try {
                            const user = authStorage.getUser();
                            trackEvent('partner_link_click', {
                              consumer_id: user?.id,
                              partner_name: shop.name,
                              partner_url: shop.url
                            });
                          } catch {}
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> {t('customer.partners.visitShop')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CustomerPartners;
