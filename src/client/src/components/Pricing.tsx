import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import api, { authStorage, billingAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

export type PlanCode = 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

const normalizePlan = (p?: string): PlanCode => {
  if (!p) return 'STARTER';
  const up = String(p).toUpperCase();
  if (up === 'FREEMIUM' || up === 'STARTER') return 'STARTER';
  if (up === 'BASIC') return 'BASIC';
  if (up === 'PREMIUM') return 'PREMIUM';
  if (up === 'ENTERPRISE') return 'ENTERPRISE';
  return 'STARTER';
};

const planRank = (p: PlanCode) => ({ STARTER: 0, BASIC: 1, PREMIUM: 2, ENTERPRISE: 3 }[p]);

interface PricingProps {
  mode?: 'auto' | 'public' | 'retailer';
  withHeader?: boolean;
  id?: string;
}

const Pricing: React.FC<PricingProps> = ({ mode = 'auto', withHeader = true, id }) => {
  const { t, i18n } = useTranslation();
  type Billing = 'monthly' | 'yearly';
  type CurrencyCode = 'EUR' | 'USD' | 'GBP';

  const [billing, setBilling] = useState<Billing>('monthly');
  const detectedCurrency: CurrencyCode = useMemo(() => {
    const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : 'nl-nl';
    if (lang.includes('nl') || lang.includes('be') || lang.includes('de') || lang.includes('fr')) return 'EUR';
    if (lang.includes('gb') || lang.includes('en-gb')) return 'GBP';
    if (lang.includes('us')) return 'USD';
    return 'EUR';
  }, []);
  const [currency, setCurrency] = useState<CurrencyCode>(detectedCurrency);

  const conversion: Record<CurrencyCode, number> = useMemo(() => ({
    EUR: 1,
    USD: 1.08,
    GBP: 0.86,
  }), []);

  const formatMoney = (amountEUR: number) => {
    if (amountEUR === 0 && currency === 'EUR') return '€0,-';
    const value = amountEUR * conversion[currency];
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const [isRetailerMode, setIsRetailerMode] = useState(false);
  const [plans, setPlans] = useState<{
    STARTER: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
    BASIC: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
    PREMIUM: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
    ENTERPRISE: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null; shopsLimit?: number | null; allowSubdomains?: boolean };
  } | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanCode>('STARTER');
  const [planLoaded, setPlanLoaded] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const decideMode = async () => {
      if (mode === 'public') {
        setIsRetailerMode(false);
        setPlanLoaded(true);
        return;
      }
      const token = authStorage.getToken();
      if (mode === 'retailer') {
        setIsRetailerMode(true);
      } else {
        // auto
        setIsRetailerMode(!!token);
      }

      // Only attempt to fetch profile when explicitly retailer mode or a token is present.
      if (mode === 'retailer' || !!token) {
        try {
          const { data: result } = await api.get('/auth-supabase/profile');
          const plan = normalizePlan(result?.data?.plan || result?.data?.planType || result?.profile?.plan);
          setCurrentPlan(plan);
        } catch (_e) {
          if (mode === 'auto') setIsRetailerMode(false);
        } finally {
          setPlanLoaded(true);
        }
      } else {
        setPlanLoaded(true);
      }
    };
    decideMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await billingAPI.publicPlansConfig();
        if (!mounted) return;
        const data = r?.data?.data;
        if (data) setPlans(data);
      } catch {
        // fallback to local defaults
        if (!mounted) return;
        setPlans(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isUpgrade = (target: PlanCode) => planRank(target) > planRank(currentPlan);

  const startCheckout = async (targetPlan: 'BASIC' | 'PREMIUM', interval: 'month' | 'year' = 'month') => {
    try {
      setCheckoutBusy(true);
      setError(null);
      const lang = ((i18n && i18n.language) || (typeof navigator !== 'undefined' && navigator.language) || 'auto').toString().substring(0, 2).toLowerCase();
      const resp = await billingAPI.checkout({ planType: targetPlan, interval, lang });
      const url = (resp?.data?.url) || (resp?.data?.data?.url);
      if (typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url;
      } else {
        setError('Kon Stripe checkout URL niet ophalen');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Checkout mislukt');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const getPlanPriceEUR = (plan: PlanCode, b: 'monthly' | 'yearly'): number | null => {
    const p = plans?.[plan];
    if (p) {
      const val = b === 'monthly' ? p.priceMonthlyEUR : p.priceYearlyEUR;
      return val == null ? null : Number(val);
    }
    // legacy fallbacks
    if (plan === 'STARTER') return 0;
    if (plan === 'BASIC') return b === 'monthly' ? 29.95 : 25.0;
    if (plan === 'PREMIUM') return b === 'monthly' ? 99.0 : 89.0;
    return null;
  };

  const getIncluded = (plan: PlanCode): number => {
    const p = plans?.[plan];
    if (p && typeof p.included === 'number' && Number.isFinite(Number(p.included))) {
      return Number(p.included);
    }
    // defaults
    if (plan === 'STARTER') return 50;
    if (plan === 'BASIC') return 500;
    if (plan === 'PREMIUM') return 2500;
    if (plan === 'ENTERPRISE') return 2500;
    return 50;
  };

  const formatIncluded = (n: number) => n.toLocaleString('nl-NL');

  const getShopsLimit = (plan: PlanCode): number | null => {
    const p = plans?.[plan];
    if (p && ('shopsLimit' in p)) {
      const v = (p as any).shopsLimit;
      if (v == null || v === '') return null; // ∞
      const n = Number(v);
      if (Number.isFinite(n)) return Math.max(0, Math.floor(n));
    }
    // defaults matching public site
    if (plan === 'STARTER') return 1;
    if (plan === 'BASIC') return 3;
    if (plan === 'PREMIUM') return 12;
    return null; // ENTERPRISE ∞
  };

  const shopsLabel = (plan: PlanCode): string => {
    const v = getShopsLimit(plan);
    if (v == null) return t('pricing.list.shopsInfinite');
    // Singular for 1
    if (v === 1) return t('pricing.list.shopsOne');
    // If it matches known 3/12 labels, use translations
    if (v === 3) return t('pricing.list.shopsThree');
    if (v === 12) return t('pricing.list.shopsTwelve');
    // Fallback dynamic
    return `${v} webshops`;
  };

  return (
    <section className="py-20" id={id}>
      <div className="container-max section-padding">
        {withHeader && (
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark-900 mb-4">{t('pricing.header.title')}</h2>
            <p className="text-xl text-gray-600">{t('pricing.header.subtitle')}</p>
          </div>
        )}

        {/* Billing toggle + currency */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="inline-flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${billing === 'monthly' ? 'bg-primary-500 text-white' : 'text-dark-900 hover:bg-gray-100'}`}
              onClick={() => setBilling('monthly')}
            >
              {t('pricing.billing.monthly')}
            </button>
            <button
              className={`px-4 py-2 text-sm ${billing === 'yearly' ? 'bg-primary-500 text-white' : 'text-dark-900 hover:bg-gray-100'}`}
              onClick={() => setBilling('yearly')}
            >
              {t('pricing.billing.yearly')}
            </button>
          </div>
          <div className="text-xs text-gray-500">{t('pricing.note')}</div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{t('pricing.currency')}</span>
            <select
              className="bg-white border border-gray-200 rounded-md px-2 py-1 text-dark-900"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Starter */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-dark-900 mb-2">Starter</h3>
            <div className="text-4xl font-bold text-dark-900 mb-4">
              {getPlanPriceEUR('STARTER', billing) == null ? (
                'GRATIS'
              ) : (
                <>
                  {formatMoney(getPlanPriceEUR('STARTER', billing) as number)}
                  <span className="text-lg text-gray-500">{t('pricing.perMonth')}</span>
                </>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.fittingRoom')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{shopsLabel('STARTER')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{`${formatIncluded(getIncluded('STARTER'))} FiTs (p/m)`}</span></li>
            </ul>
            {isRetailerMode ? (
              !planLoaded ? (
                <button className="w-full bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-lg" disabled>{t('pricing.buttons.loading')}</button>
              ) : currentPlan === 'STARTER' ? (
                <button className="w-full bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-lg" disabled>{t('pricing.buttons.active')}</button>
              ) : (
                <button className="w-full bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-lg cursor-not-allowed" disabled>{t('pricing.buttons.downgradeSoon')}</button>
              )
            ) : (
              <Link to="/register" className="w-full btn-secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}>{t('pricing.buttons.startFree')}</Link>
            )}
          </div>

          {/* Basic */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-dark-900 mb-2">Basic</h3>
            <div className="text-4xl font-bold text-dark-900 mb-4">
              {getPlanPriceEUR('BASIC', billing) == null ? (
                'GRATIS'
              ) : (
                <>
                  {formatMoney(getPlanPriceEUR('BASIC', billing) as number)}
                  <span className="text-lg text-gray-500">{t('pricing.perMonth')}</span>
                </>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.fittingRoom')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.insightsCounts')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{shopsLabel('BASIC')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.supportBasic')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{`${formatIncluded(getIncluded('BASIC'))} FiTs (p/m)`}</span></li>
            </ul>
            {isRetailerMode ? (
              !planLoaded ? (
                <button className="w-full bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-lg" disabled>{t('pricing.buttons.loading')}</button>
              ) : currentPlan === 'BASIC' ? (
                <button className="w-full bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-lg" disabled>{t('pricing.buttons.active')}</button>
              ) : (
                <button
                  disabled={!isUpgrade('BASIC') || checkoutBusy}
                  onClick={() => startCheckout('BASIC', billing === 'yearly' ? 'year' : 'month')}
                  className={`w-full font-medium px-6 py-3 rounded-lg ${isUpgrade('BASIC') ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-gray-100 text-gray-600 cursor-not-allowed'}`}
                >
                  {isUpgrade('BASIC') ? t('pricing.buttons.upgrade') : t('pricing.buttons.downgradeSoon')}
                </button>
              )
            ) : (
              <Link to="/register" className="w-full btn-secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}>{t('pricing.buttons.startFree')}</Link>
            )}
          </div>

          {/* Premium */}
          <div className="bg-primary-500 text-white rounded-xl p-8 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">{t('pricing.popular')}</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            <div className="text-4xl font-bold mb-4">
              {getPlanPriceEUR('PREMIUM', billing) == null ? (
                'GRATIS'
              ) : (
                <>
                  {formatMoney(getPlanPriceEUR('PREMIUM', billing) as number)}
                  <span className="text-lg opacity-75">{t('pricing.perMonth')}</span>
                </>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center"><Check className="h-5 w-5 text-white mr-3" /><span>{t('pricing.list.fittingRoom')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-white mr-3" /><span>{t('pricing.list.insightsVisitors')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-white mr-3" /><span>{shopsLabel('PREMIUM')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-white mr-3" /><span>{t('pricing.list.brandingHideBrendr')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-white mr-3" /><span>{t('pricing.list.support247')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-white mr-3" /><span>{`${formatIncluded(getIncluded('PREMIUM'))} FiTs (p/m)`}</span></li>
            </ul>
            {isRetailerMode ? (
              !planLoaded ? (
                <button className="w-full bg-white/80 text-primary-600 font-medium px-6 py-3 rounded-lg" disabled>{t('pricing.buttons.loading')}</button>
              ) : currentPlan === 'PREMIUM' ? (
                <button className="w-full bg-white text-primary-500 font-medium px-6 py-3 rounded-lg cursor-default">{t('pricing.buttons.active')}</button>
              ) : (
                <button
                  disabled={!isUpgrade('PREMIUM') || checkoutBusy}
                  onClick={() => startCheckout('PREMIUM', billing === 'yearly' ? 'year' : 'month')}
                  className={`w-full font-medium px-6 py-3 rounded-lg ${isUpgrade('PREMIUM') ? 'bg-white text-primary-500 hover:bg-gray-100' : 'bg-white/80 text-primary-600 cursor-not-allowed'}`}
                >
                  {isUpgrade('PREMIUM') ? t('pricing.buttons.upgrade') : t('pricing.buttons.downgradeSoon')}
                </button>
              )
            ) : (
              <Link to="/register" className="w-full bg-white text-primary-500 font-medium px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors text-center" onClick={() => window.scrollTo({ top: 0, behavior: 'auto' })}>{t('pricing.buttons.startFree')}</Link>
            )}
          </div>

          {/* Enterprise */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-dark-900 mb-2">Enterprise</h3>
            <div className="text-4xl font-bold text-dark-900 mb-4">{t('pricing.customPrice')}</div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.fittingRoom')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.analytics')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{shopsLabel('ENTERPRISE')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.customBranding')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.customIntegration')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.accountManager')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.sla')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{`> ${formatIncluded(getIncluded('ENTERPRISE'))} FiTs (p/m)`}</span></li>
            </ul>
            <Link to="/contact" className="w-full btn-secondary text-center">{t('pricing.buttons.contact')}</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
