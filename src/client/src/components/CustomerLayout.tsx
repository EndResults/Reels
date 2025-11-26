import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  User, 
  Camera, 
  LogOut,
  Target,
  Menu,
  X,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { authStorage, api } from '../services/api';
import { ProfileCompleteness } from './ProfileCompleteness';
import { useTranslation } from 'react-i18next';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userType = (user?.user_type || user?.userType || '').toString().toUpperCase();
  const canStartFit = userType === 'PAYED' || userType === 'ADMIN';

  useEffect(() => {
    // Get user data for profile completeness
    const userData = authStorage.getUser();
    setUser(userData);
  }, []);

  useEffect(() => {
    // Fetch live profile to power completeness widget on non-profile pages
    const fetchProfile = async () => {
      try {
        const response = await api.get('/consumer/profile');
        if (response.data?.success) {
          setProfile(response.data.profile);
        }
      } catch (e) {
        // Ignore fetch errors here; widget will just not render
        console.debug('CustomerLayout: could not load profile for completeness widget');
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const ensureToken = async () => {
      try {
        const existing = authStorage.getToken();
        if (!existing) {
          const resp = await api.post('/auth-supabase/mint-widget-token');
          if ((resp.data as any)?.success && (resp.data as any).token) {
            authStorage.setToken((resp.data as any).token);
            const u = (resp.data as any).user;
            if (u && !authStorage.getUser()) {
              authStorage.setUser({ ...(u || {}), role: 'user' } as any);
            }
          }
        }
      } catch (_e) {}
    };
    ensureToken();
  }, []);

  const handleLogout = () => {
    authStorage.clearAuth();
    navigate('/');
  };

  const navItems = [
    { key: 'dashboard', href: '/customer/dashboard', icon: Home },
    { key: 'profile', href: '/customer/profile', icon: User },
    { key: 'photos', href: '/customer/photos', icon: Camera },
    { key: 'sessions', href: '/customer/sessions', icon: Target },
    { key: 'partners', href: '/customer/partners', icon: ShoppingBag }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div
                className="cursor-pointer"
                onClick={() => navigate('/customer/dashboard')}
                role="button"
                aria-label={t('customer.layout.goToDashboardAria')}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate('/customer/dashboard'); }}
                tabIndex={0}
              >
                <Logo 
                  className="h-16 w-auto"
                  variant="light"
                />
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.key}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {t(`customer.nav.${item.key}`)}
                  </NavLink>
                );
              })}
            </div>

            <div className="flex items-center">
              {/* Mobile menu toggle */}
              <button
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={t('customer.layout.openNavigationAria')}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="hidden md:block mr-3">
                <LanguageSwitcher />
              </div>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-4 w-4 mr-1" />
                {t('customer.nav.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.key}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {t(`customer.nav.${item.key}`)}
                </NavLink>
              );
            })}
            {canStartFit && (
              <button
                type="button"
                onClick={() => { setMobileOpen(false); navigate('/customer/fit-widget'); }}
                className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              >
                <Sparkles className="h-5 w-5 mr-3" />
                {location.pathname.startsWith('/en') ? 'Start a FiT' : 'Start een FiT'}
              </button>
            )}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('common.language.label')}</span>
                <LanguageSwitcher />
              </div>
            </div>
            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
            >
              <LogOut className="h-5 w-5 mr-3" />
              {t('customer.nav.logout')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Profile Completeness Widget - hide on /customer/profile to avoid duplicate */}
      {location.pathname !== '/customer/profile' && profile && (
        <ProfileCompleteness 
          profile={profile} 
          showSaveButton={false}
        />
      )}
    </div>
  );
};
