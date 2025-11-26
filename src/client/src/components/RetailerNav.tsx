import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, LogOut, LayoutDashboard, Settings as Cog, Crown, Star, Menu, X } from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import api, { authStorage } from '../services/api';
import { useTranslation } from 'react-i18next';

interface RetailerNavProps {
  title: string;
  backTo?: string;
  showWebshopsLink?: boolean; // kept for backward-compat, ignored
  showSettingsLink?: boolean; // kept for backward-compat, ignored
  right?: React.ReactNode;
  icon?: 'target' | 'building';
}

const RetailerNav: React.FC<RetailerNavProps> = ({
  title,
  backTo,
  showWebshopsLink,
  showSettingsLink,
  right,
  icon = 'target'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [plan, setPlan] = useState<'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('STARTER');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get('/auth-supabase/profile');
        const raw = (data?.data?.plan || data?.data?.planType || '').toString().toUpperCase();
        const normalized = raw === 'FREEMIUM' ? 'STARTER' : (['STARTER','BASIC','PREMIUM','ENTERPRISE'].includes(raw) ? raw : 'STARTER');
        if (mounted) setPlan(normalized as any);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const currentUserName = useMemo(() => {
    try {
      const u = authStorage.getUser();
      if (!u) return '';
      const fn = (u.firstName || (u as any).first_name || '').toString();
      const ln = (u.lastName || (u as any).last_name || '').toString();
      return [fn, ln].filter(Boolean).join(' ');
    } catch { return ''; }
  }, []);

  const PlanBadge: React.FC = () => {
    const common = 'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs';
    if (plan === 'BASIC') {
      return (
        <span className={`${common} bg-amber-100 text-amber-800 border-amber-200`} title={t('retailer.nav.basic')}>
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          {t('retailer.nav.basic')}
        </span>
      );
    }
    if (plan === 'PREMIUM') {
      return (
        <span className={`${common} bg-slate-100 text-slate-700 border-slate-200`} title={t('retailer.nav.premium')}>
          <Star className="h-3.5 w-3.5 fill-slate-400 text-slate-400" />
          <Star className="h-3.5 w-3.5 fill-slate-400 text-slate-400" />
          {t('retailer.nav.premium')}
        </span>
      );
    }
    if (plan === 'ENTERPRISE') {
      return (
        <span className={`${common} bg-yellow-100 text-yellow-800 border-yellow-200`} title={t('retailer.nav.enterprise')}>
          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
          {t('retailer.nav.enterprise')}
        </span>
      );
    }
    return (
      <span className={`${common} bg-gray-100 text-gray-700 border-gray-200`} title={t('retailer.nav.starter')}>
        {t('retailer.nav.starter')}
      </span>
    );
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const navBtn = (label: string, to: string, Icon: React.ElementType) => (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center px-3 py-2 rounded-md transition-colors ${isActive(to) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
    >
      <Icon className="h-4 w-4 mr-1" />
      {label}
    </button>
  );

  const handleLogout = () => {
    authStorage.clearAuth();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center shrink-0">
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                <span className="hidden xl:inline">{t('retailer.nav.back')}</span>
              </button>
            )}
            <Logo className="h-16 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {right ? right : (
              currentUserName ? (
                <span
                  className="hidden xl:block max-w-[280px] 2xl:max-w-[360px] truncate text-sm text-gray-700"
                  title={t('retailer.nav.welcome', { name: currentUserName })}
                >
                  {t('retailer.nav.welcome', { name: currentUserName })}
                </span>
              ) : null
            )}
            <PlanBadge />
            <LanguageSwitcher />
            {navBtn(t('retailer.nav.dashboard'), '/dashboard', LayoutDashboard)}
            {navBtn(t('retailer.nav.webshops'), '/retailer/webshops', Building)}
            {navBtn(t('retailer.nav.settings'), '/retailer/settings', Cog)}
            {navBtn(t('retailer.nav.subscription'), '/retailer/abonnement', Crown)}
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-700 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-1" />
              {t('retailer.nav.logout')}
            </button>
          </div>
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t">
            <div className="px-4 py-3 flex items-center justify-between">
              {right ? right : (
                currentUserName ? <span className="text-sm text-gray-700">{t('retailer.nav.welcome', { name: currentUserName })}</span> : <span />
              )}
              <PlanBadge />
            </div>
            <div className="px-4 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('common.language.label')}</span>
                <LanguageSwitcher />
              </div>
            </div>
            <div className="px-2 pb-3 space-y-1">
              <button
                onClick={() => { setMobileOpen(false); navigate('/dashboard'); }}
                className={`w-full flex items-center px-3 py-2 rounded-md ${isActive('/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                {t('retailer.nav.dashboard')}
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/retailer/webshops'); }}
                className={`w-full flex items-center px-3 py-2 rounded-md ${isActive('/retailer/webshops') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Building className="h-4 w-4 mr-2" />
                {t('retailer.nav.webshops')}
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/retailer/settings'); }}
                className={`w-full flex items-center px-3 py-2 rounded-md ${isActive('/retailer/settings') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Cog className="h-4 w-4 mr-2" />
                {t('retailer.nav.settings')}
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/retailer/abonnement'); }}
                className={`w-full flex items-center px-3 py-2 rounded-md ${isActive('/retailer/abonnement') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Crown className="h-4 w-4 mr-2" />
                {t('retailer.nav.subscription')}
              </button>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full flex items-center px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('retailer.nav.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default RetailerNav;
