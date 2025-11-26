import React, { useEffect, useState } from 'react';
import RetailerNav from '../components/RetailerNav';
import SubscriptionTabs from '../components/SubscriptionTabs';
import { billingAPI, authStorage } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Invoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created: number; // unix ts
}

export default function SubscriptionPayments() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [portalBusy, setPortalBusy] = useState(false);

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
        const { data } = await billingAPI.invoices(12);
        if (data?.success && Array.isArray(data.data)) {
          setInvoices(data.data as Invoice[]);
        } else {
          setInvoices([]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Kon facturen niet ophalen');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [navigate]);

  const openPortal = async () => {
    try {
      setPortalBusy(true);
      const { data } = await billingAPI.portal();
      const url = (data?.url) || (data?.data?.url);
      if (typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url;
      } else {
        setError('Kon Stripe portal URL niet ophalen');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Kon Stripe portal niet openen');
    } finally {
      setPortalBusy(false);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency?.toUpperCase?.() || 'EUR' }).format((cents || 0) / 100);
  };

  const formatDate = (unix: number) => {
    try { return new Date(unix * 1000).toLocaleString('nl-NL'); } catch { return '' }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RetailerNav title={t('retailer.subscription.title')} backTo="/retailer/settings" />
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-2">{t('retailer.subscription.payments.title')}</h1>
          <p className="text-gray-600">{t('retailer.subscription.payments.subtitle')}</p>
        </div>

        <SubscriptionTabs />

        <div className="flex justify-end mb-4">
          <button onClick={openPortal} disabled={portalBusy} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60">
            {portalBusy ? t('common.loading') : t('retailer.subscription.payments.portal')}
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-600">
                <div className="col-span-3">{t('retailer.subscription.payments.table.date')}</div>
                <div className="col-span-3">{t('retailer.subscription.payments.table.amount')}</div>
                <div className="col-span-2">{t('retailer.subscription.payments.table.status')}</div>
                <div className="col-span-4">{t('retailer.subscription.payments.table.actions')}</div>
              </div>
              {invoices.length === 0 && (
                <div className="px-6 py-6 text-sm text-gray-600">{t('retailer.subscription.payments.table.empty')}</div>
              )}
              {invoices.map((inv) => (
                <div key={inv.id} className="grid grid-cols-12 gap-3 px-6 py-4 items-center text-sm">
                  <div className="col-span-3">{formatDate(inv.created)}</div>
                  <div className="col-span-3">{formatAmount(inv.amount_due || inv.amount_paid, inv.currency)}</div>
                  <div className="col-span-2">{inv.status || '-'}</div>
                  <div className="col-span-4 flex items-center gap-3">
                    {inv.invoice_pdf && (
                      <a href={inv.invoice_pdf} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{t('retailer.subscription.payments.table.downloadPdf')}</a>
                    )}
                    {inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{t('retailer.subscription.payments.table.viewOnline')}</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
