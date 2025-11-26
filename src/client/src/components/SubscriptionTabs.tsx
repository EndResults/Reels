import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const tabBase = 'px-4 py-2 text-sm rounded-md border';
const activeClasses = 'bg-blue-600 text-white border-blue-600';
const inactiveClasses = 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100';

export default function SubscriptionTabs() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isBase = pathname === '/retailer/abonnement' || pathname === '/retailer/abonnement/';
  const isPayments = pathname.startsWith('/retailer/abonnement/payments');
  const isCredits = pathname.startsWith('/retailer/abonnement/credits');

  return (
    <div className="w-full flex items-center justify-center mb-8">
      <div className="flex items-center gap-2">
        <Link to="/retailer/abonnement" className={`${tabBase} ${isBase ? activeClasses : inactiveClasses}`}>{t('retailer.subscription.tabs.abonnement')}</Link>
        <Link to="/retailer/abonnement/payments" className={`${tabBase} ${isPayments ? activeClasses : inactiveClasses}`}>{t('retailer.subscription.tabs.payments')}</Link>
        <Link to="/retailer/abonnement/credits" className={`${tabBase} ${isCredits ? activeClasses : inactiveClasses}`}>{t('retailer.subscription.tabs.credits')}</Link>
      </div>
    </div>
  );
}
