import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import RetailerNav from '../components/RetailerNav';
import SubscriptionTabs from '../components/SubscriptionTabs';
import api, { authStorage, billingAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

// Allow TSX to render the lottie-player web component if reused later
declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface IntrinsicElements {
      'lottie-player': any;
    }
  }
}

// Normalize plan to canonical codes
const normalizePlan = (p?: string) => {
  if (!p) return 'STARTER';
  const up = String(p).toUpperCase();
  if (up === 'FREEMIUM' || up === 'STARTER') return 'STARTER';
  if (up === 'BASIC') return 'BASIC';
  if (up === 'PREMIUM') return 'PREMIUM';
  if (up === 'ENTERPRISE') return 'ENTERPRISE';
  return 'STARTER';
};

const Subscription = () => {
  type Billing = 'monthly' | 'yearly';
  type CurrencyCode = 'EUR' | 'USD' | 'GBP';

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [billing, setBilling] = useState<Billing>('monthly');
  const detectedCurrency: CurrencyCode = useMemo(() => {
    const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : 'nl-nl';
    if (lang.includes('nl') || lang.includes('be') || lang.includes('de') || lang.includes('fr')) return 'EUR';
    if (lang.includes('gb') || lang.includes('en-gb')) return 'GBP';
    if (lang.includes('us')) return 'USD';
    return 'EUR';
  }, []);
  const [currency, setCurrency] = useState<CurrencyCode>(detectedCurrency);
  const [currentPlan, setCurrentPlan] = useState<'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('STARTER');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planLabel = (code: 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE') => {
    switch (code) {
      case 'STARTER':
        return t('retailer.nav.starter');
      case 'BASIC':
        return t('retailer.nav.basic');
      case 'PREMIUM':
        return t('retailer.nav.premium');
      case 'ENTERPRISE':
        return t('retailer.nav.enterprise');
      default:
        return t('retailer.nav.starter');
    }
  };

  const downgradeToStarter = async () => {
    try {
      setCheckoutBusy(true);
      setError(null);
      await billingAPI.downgradeToStarter();
      setCurrentPlan('STARTER');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Downgrade mislukt');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const openPortal = async () => {
    try {
      setCheckoutBusy(true);
      setError(null);
      const r = await billingAPI.portal();
      const url = (r?.data?.url) || (r?.data?.data?.url);
      if (typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url;
      } else {
        setError('Kon Stripe portal URL niet ophalen');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Kon Stripe portal niet openen');
    } finally {
      setCheckoutBusy(false);
    }
  };

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

  const [plans, setPlans] = useState<{
    STARTER: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null };
    BASIC: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null };
    PREMIUM: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null };
    ENTERPRISE: { included: number; priceMonthlyEUR: number | null; priceYearlyEUR: number | null };
  } | null>(null);

  const planRank = (p: 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE') => ({ STARTER: 0, BASIC: 1, PREMIUM: 2, ENTERPRISE: 3 }[p]);

  const isUpgrade = (target: 'BASIC' | 'PREMIUM' | 'ENTERPRISE') => planRank(target as any) > planRank(currentPlan);

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

  useEffect(() => {
    const init = async () => {
      const token = authStorage.getToken();
      if (!token) {
        navigate('/login/retailer');
        return;
      }
      try {
        const { data: result } = await api.get('/auth-supabase/profile');
        const plan = normalizePlan(result?.data?.plan || result?.data?.planType);
        setCurrentPlan(plan as any);
      } catch (e) {
        // best-effort
      }
    };
    init();
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await billingAPI.publicPlansConfig();
        if (!mounted) return;
        const data = r?.data?.data;
        if (data) setPlans(data);
      } catch {
        if (mounted) setPlans(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getPlanPriceEUR = (plan: 'STARTER'|'BASIC'|'PREMIUM'|'ENTERPRISE', b: 'monthly'|'yearly'): number | null => {
    const p = plans?.[plan];
    if (p) {
      const val = b === 'monthly' ? p.priceMonthlyEUR : p.priceYearlyEUR;
      return val == null ? null : Number(val);
    }
    if (plan === 'STARTER') return 0;
    if (plan === 'BASIC') return b === 'monthly' ? 29.95 : 25.0;
    if (plan === 'PREMIUM') return b === 'monthly' ? 99.0 : 89.0;
    return null;
  };

  const getIncluded = (plan: 'STARTER'|'BASIC'|'PREMIUM'|'ENTERPRISE'): number => {
    const p = plans?.[plan];
    if (p && typeof p.included === 'number' && Number.isFinite(Number(p.included))) return Number(p.included);
    if (plan === 'STARTER') return 50;
    if (plan === 'BASIC') return 500;
    if (plan === 'PREMIUM') return 2500;
    if (plan === 'ENTERPRISE') return 2500;
    return 50;
  };
  const fmtInc = (n: number) => n.toLocaleString('nl-NL');

  return (
    <div className="min-h-screen bg-gray-50">
      <RetailerNav title={t('retailer.subscription.title')} backTo="/retailer/settings" />

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-2">{t('retailer.subscription.header.title')}</h1>
          <p className="text-gray-600">{t('retailer.subscription.header.subtitle', { plan: planLabel(currentPlan) })}</p>
        </div>

        {currentPlan !== 'STARTER' && (
          <div className="mb-6 flex flex-col items-center">
            <button
              onClick={downgradeToStarter}
              disabled={checkoutBusy}
              className={`px-4 py-2 rounded-lg font-medium ${checkoutBusy ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-primary-600 border border-primary-500 hover:bg-primary-50'}`}
            >
              Abonnement stopzetten (naar Starter)
            </button>
            <div className="text-xs text-gray-500 mt-2">Je betaalde abonnement wordt aan het einde van de lopende periode beëindigd.</div>
          </div>
        )}

        {/* Sub navigation */}
        <SubscriptionTabs />

        {/* Billing toggle + currency */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="inline-flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              className={`px-4 py-2 text-sm ${billing === 'monthly' ? 'bg-primary-500 text-white' : 'text-dark-900 hover:bg-gray-100'}`}
              onClick={() => setBilling('monthly')}
            >
              {t('retailer.subscription.billing.monthly')}
            </button>
            <button
              className={`px-4 py-2 text-sm ${billing === 'yearly' ? 'bg-primary-500 text-white' : 'text-dark-900 hover:bg-gray-100'}`}
              onClick={() => setBilling('yearly')}
            >
              {t('retailer.subscription.billing.yearly')}
            </button>
          </div>
          <div className="text-xs text-gray-500">{t('retailer.subscription.billing.note')}</div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{t('retailer.subscription.currency')}</span>
            <select
              className="bg-white border border-gray-200 rounded-md px-2 py-1 text-dark-900"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
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
          <div className={`relative bg-white border-2 rounded-xl p-8 ${currentPlan === 'STARTER' ? 'border-primary-500' : 'border-gray-200'}`}>
            {currentPlan === 'STARTER' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-3 py-1 rounded-full text-xs">{t('retailer.subscription.currentBadge')}</span>
            )}
            <h3 className="text-2xl font-bold text-dark-900 mb-2">{t('retailer.nav.starter')}</h3>
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
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.shopsOne')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{`${fmtInc(getIncluded('STARTER'))} FiTs (p/m)`}</span></li>
            </ul>
            {currentPlan === 'STARTER' ? (
              <button className="w-full bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-lg cursor-default">{t('pricing.buttons.active')}</button>
            ) : (
              <button
                onClick={downgradeToStarter}
                disabled={checkoutBusy}
                className={`w-full font-medium px-6 py-3 rounded-lg ${checkoutBusy ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-primary-500 text-white hover:bg-primary-600'}`}
              >
                {t('pricing.buttons.downgradeSoon')}
              </button>
            )}
          </div>

          {/* Basic */}
          <div className={`relative bg-white border-2 rounded-xl p-8 ${currentPlan === 'BASIC' ? 'border-primary-500' : 'border-gray-200'}`}>
            {currentPlan === 'BASIC' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-3 py-1 rounded-full text-xs">{t('retailer.subscription.currentBadge')}</span>
            )}
            <h3 className="text-2xl font-bold text-dark-900 mb-2">{t('retailer.nav.basic')}</h3>
            <div className="text-4xl font-bold text-dark-900 mb-4">
              {formatMoney(getPlanPriceEUR('BASIC', billing) as number)}<span className="text-lg text-gray-500">{t('pricing.perMonth')}</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.fittingRoom')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.insightsCounts')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.shopsThree')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.supportBasic')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{`${fmtInc(getIncluded('BASIC'))} FiTs (p/m)`}</span></li>
            </ul>
            {currentPlan === 'BASIC' ? (
              <button className="w-full bg-gray-100 text-gray-600 font-medium px-6 py-3 rounded-lg cursor-default">{t('pricing.buttons.active')}</button>
            ) : (
              isUpgrade('BASIC') ? (
                <button
                  disabled={checkoutBusy}
                  onClick={() => startCheckout('BASIC', billing === 'yearly' ? 'year' : 'month')}
                  className={`w-full font-medium px-6 py-3 rounded-lg ${checkoutBusy ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-primary-500 text-white hover:bg-primary-600'}`}
                >
                  {t('pricing.buttons.upgrade')}
                </button>
              ) : (
                <button
                  disabled={checkoutBusy}
                  onClick={openPortal}
                  className={`w-full font-medium px-6 py-3 rounded-lg ${checkoutBusy ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white text-primary-600 border border-primary-500 hover:bg-primary-50'}`}
                >
                  {t('pricing.buttons.downgradeSoon')}
                </button>
              )
            )}
          </div>

          {/* Premium */}
          <div className={`relative rounded-xl p-8 ${currentPlan === 'PREMIUM' ? 'bg-primary-500 text-white' : 'bg-white border-2 border-gray-200 text-dark-900'}`}>
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className={`${currentPlan === 'PREMIUM' ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-700'} px-4 py-1 rounded-full text-sm font-medium`}>
                {t('pricing.popular')}
              </span>
            </div>
            {currentPlan === 'PREMIUM' && (
              <div className="mb-2">
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">{t('retailer.subscription.currentBadge')}</span>
              </div>
            )}
            <h3 className={`text-2xl font-bold mb-2`}>{t('retailer.nav.premium')}</h3>
            <div className="text-4xl font-bold mb-4">
              {formatMoney(getPlanPriceEUR('PREMIUM', billing) as number)}<span className={`text-lg ${currentPlan === 'PREMIUM' ? 'opacity-75' : 'text-gray-500'}`}>{t('pricing.perMonth')}</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center"><Check className={`h-5 w-5 mr-3 ${currentPlan === 'PREMIUM' ? 'text-white' : 'text-green-500'}`} /><span>{t('pricing.list.fittingRoom')}</span></li>
              <li className="flex items-center"><Check className={`h-5 w-5 mr-3 ${currentPlan === 'PREMIUM' ? 'text-white' : 'text-green-500'}`} /><span>{t('pricing.list.insightsVisitors')}</span></li>
              <li className="flex items-center"><Check className={`h-5 w-5 mr-3 ${currentPlan === 'PREMIUM' ? 'text-white' : 'text-green-500'}`} /><span>{t('pricing.list.shopsTwelve')}</span></li>
              <li className="flex items-center"><Check className={`h-5 w-5 mr-3 ${currentPlan === 'PREMIUM' ? 'text-white' : 'text-green-500'}`} /><span>{t('pricing.list.brandingHideBrendr')}</span></li>
              <li className="flex items-center"><Check className={`h-5 w-5 mr-3 ${currentPlan === 'PREMIUM' ? 'text-white' : 'text-green-500'}`} /><span>{t('pricing.list.support247')}</span></li>
              <li className="flex items-center"><Check className={`h-5 w-5 mr-3 ${currentPlan === 'PREMIUM' ? 'text-white' : 'text-green-500'}`} /><span>{`${fmtInc(getIncluded('PREMIUM'))} FiTs (p/m)`}</span></li>
            </ul>
            {currentPlan === 'PREMIUM' ? (
              <button className="w-full bg-white text-primary-500 font-medium px-6 py-3 rounded-lg cursor-default">{t('pricing.buttons.active')}</button>
            ) : (
              isUpgrade('PREMIUM') ? (
                <button
                  disabled={checkoutBusy}
                  onClick={() => startCheckout('PREMIUM', billing === 'yearly' ? 'year' : 'month')}
                  className={`w-full font-medium px-6 py-3 rounded-lg ${checkoutBusy ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-primary-500 text-white hover:bg-primary-600'}`}
                >
                  {t('pricing.buttons.upgrade')}
                </button>
              ) : (
                <button
                  disabled={checkoutBusy}
                  onClick={openPortal}
                  className={`w-full font-medium px-6 py-3 rounded-lg ${checkoutBusy ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white text-primary-600 border border-primary-500 hover:bg-primary-50'}`}
                >
                  {t('pricing.buttons.downgradeSoon')}
                </button>
              )
            )}
          </div>

          {/* Enterprise */}
          <div className={`relative bg-white border-2 rounded-xl p-8 ${currentPlan === 'ENTERPRISE' ? 'border-primary-500' : 'border-gray-200'}`}>
            {currentPlan === 'ENTERPRISE' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-3 py-1 rounded-full text-xs">{t('retailer.subscription.currentBadge')}</span>
            )}
            <h3 className="text-2xl font-bold text-dark-900 mb-2">{t('retailer.nav.enterprise')}</h3>
            <div className="text-4xl font-bold text-dark-900 mb-4">{t('pricing.customPrice')}</div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.fittingRoom')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.analytics')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.shopsInfinite')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.customBranding')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.customIntegration')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.accountManager')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{t('pricing.list.sla')}</span></li>
              <li className="flex items-center"><Check className="h-5 w-5 text-green-500 mr-3" /><span>{`> ${fmtInc(getIncluded('ENTERPRISE'))} FiTs (p/m)`}</span></li>
            </ul>
            <Link to="/contact" className="w-full btn-secondary text-center">{t('pricing.buttons.contact')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
