import React, { useEffect, useMemo, useState } from 'react';
import RetailerNav from '../components/RetailerNav';
import SubscriptionTabs from '../components/SubscriptionTabs';
import api, { billingAPI, authStorage } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CreditBalance {
  retailer_id: string;
  period_month: string; // YYYY-MM-01
  included: number;
  purchased: number;
  consumed: number;
  available: number;
}

export default function SubscriptionCredits() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [plan, setPlan] = useState<'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('STARTER');

  useEffect(() => {
    const run = async () => {
      const token = authStorage.getToken();
      if (!token) {
        navigate('/login/retailer');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        // Load plan from profile
        try {
          const { data: profile } = await api.get('/auth-supabase/profile');
          const p = String(profile?.data?.plan || profile?.data?.planType || 'STARTER').toUpperCase();
          if (p === 'STARTER' || p === 'BASIC' || p === 'PREMIUM' || p === 'ENTERPRISE') setPlan(p as any);
        } catch {}
        const { data } = await billingAPI.credits();
        if (data?.success && data?.data) {
          setBalance(data.data as CreditBalance);
        } else {
          setBalance({ retailer_id: 'me', period_month: '', included: 0, purchased: 0, consumed: 0, available: 0 });
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Kon credits niet ophalen');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [navigate]);

  const monthLabel = useMemo(() => {
    if (!balance?.period_month) return null;
    const lang = ((i18n && i18n.language) || (typeof navigator !== 'undefined' && navigator.language) || 'nl-NL') as string;
    const d = new Date(`${balance.period_month}T00:00:00Z`);
    return d.toLocaleDateString(lang, { month: 'long', year: 'numeric' });
  }, [balance?.period_month, i18n]);

  const bundleInfo = useMemo(() => {
    // Mapping per plan (EUR)
    const map: Record<'BASIC' | 'PREMIUM' | 'ENTERPRISE', { fits: number; price: number }> = {
      BASIC: { fits: 100, price: 5 },
      PREMIUM: { fits: 500, price: 15 },
      ENTERPRISE: { fits: 1000, price: 27 }
    };
    if (plan === 'STARTER') return null;
    return map[plan as 'BASIC' | 'PREMIUM' | 'ENTERPRISE'];
  }, [plan]);

  const formatMoney = (amountEUR: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(amountEUR);

  const checkoutBundle = async () => {
    try {
      setCheckoutBusy(true);
      setError(null);
      const lang = ((i18n && i18n.language) || (typeof navigator !== 'undefined' && navigator.language) || 'auto').toString().substring(0, 2).toLowerCase();
      const { data } = await billingAPI.checkoutBundle({ lang });
      const url = (data?.url) || (data?.data?.url);
      if (typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url;
      } else {
        setError('Kon Stripe checkout URL voor bundel niet ophalen');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Bundle checkout mislukt');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const StatCard: React.FC<{ title: string; value: number; accent?: string }> = ({ title, value, accent }) => (
    <div className="bg-white rounded-lg shadow px-6 py-5">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`mt-1 text-3xl font-bold ${accent || 'text-gray-900'}`}>{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <RetailerNav title={t('retailer.subscription.title')} backTo="/retailer/settings" />
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-2">{t('retailer.subscription.credits.title')}</h1>
          <p className="text-gray-600">{t('retailer.subscription.credits.subtitle')}</p>
        </div>

        <SubscriptionTabs />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {monthLabel && (
              <div className="mb-6 rounded-md border border-blue-100 bg-blue-50 text-blue-900 p-3 text-sm">
                {t('retailer.subscription.credits.periodNoteMonth', {
                  month: monthLabel,
                  defaultValue: 'Het getoonde tegoed geldt voor de kalendermaand {{month}}.'
                })}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <StatCard title={t('retailer.subscription.credits.stats.available')} value={balance?.available ?? 0} accent="text-green-600" />
              <StatCard title={t('retailer.subscription.credits.stats.consumed')} value={balance?.consumed ?? 0} />
              <StatCard title={t('retailer.subscription.credits.stats.purchased')} value={balance?.purchased ?? 0} />
              <StatCard title={t('retailer.subscription.credits.stats.included')} value={balance?.included ?? 0} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">{t('retailer.subscription.credits.buy.title')}</h3>
              {plan === 'STARTER' ? (
                <p className="text-sm text-gray-600">
                  Wil je meer FiT credits? Upgrade dan naar een betaald abonnement.{' '}
                  <Link to="/retailer/abonnement" className="text-blue-600 hover:underline">Bekijk abonnementen</Link>.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">{t('retailer.subscription.credits.buy.description')}</p>
                  {bundleInfo ? (
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-700">
                      <span className="font-medium">{t('retailer.subscription.credits.buy.recommendedLabel')}:</span>
                      <span>{bundleInfo.fits} {t('retailer.subscription.credits.buy.fits')} — {t('retailer.subscription.credits.buy.price')}: {formatMoney(bundleInfo.price)}</span>
                    </div>
                  ) : (
                    <div className="mb-3 text-sm text-gray-500">n.v.t.</div>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={checkoutBundle}
                      disabled={checkoutBusy}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                    >
                      {checkoutBusy ? t('common.loading') : t('retailer.subscription.credits.buy.button')}
                    </button>
                    <span className="text-xs text-gray-500">{t('retailer.subscription.credits.buy.note')}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
