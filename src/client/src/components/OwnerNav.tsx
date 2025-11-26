import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Folder, LogOut, Menu, X, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { authStorage } from '../services/api';

const OwnerNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const currentUserName = useMemo(() => {
    try {
      const u = authStorage.getUser();
      if (!u) return '';
      const fn = (u.firstName || (u as any).first_name || '').toString();
      const ln = (u.lastName || (u as any).last_name || '').toString();
      return [fn, ln].filter(Boolean).join(' ');
    } catch { return ''; }
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    authStorage.clearAuth();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div
              className="cursor-pointer"
              onClick={() => navigate('/owner/dashboard')}
              role="button"
              aria-label="Ga naar owner dashboard"
              onKeyDown={(e) => { if (e.key === 'Enter') navigate('/owner/dashboard'); }}
              tabIndex={0}
            >
              <Logo className="h-16 w-auto" variant="light" />
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            {currentUserName ? (
              <span className="hidden xl:block max-w-[280px] 2xl:max-w-[360px] truncate text-sm text-gray-700" title={`Welkom, ${currentUserName}`}>
                Welkom, {currentUserName}
              </span>
            ) : null}
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/owner/dashboard')}
              className={`flex items-center px-3 py-2 rounded-md transition-colors ${isActive('/owner/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <LayoutDashboard className="h-4 w-4 mr-1" />
              Dashboard
            </button>
            <button
              onClick={() => navigate('/owner/categories')}
              className={`flex items-center px-3 py-2 rounded-md transition-colors ${isActive('/owner/categories') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <Folder className="h-4 w-4 mr-1" />
              Categorieën
            </button>
            <div className="relative">
              <button
                onClick={() => setToolsOpen(v => !v)}
                className={`flex items-center px-3 py-2 rounded-md transition-colors ${ (isActive('/owner/tools/scraping') || (isActive('/owner/tools') && !isActive('/owner/categories'))) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Wrench className="h-4 w-4 mr-1" />
                Tools
                <ChevronDown className="h-3 w-3 ml-1" />
              </button>
              {toolsOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border rounded-md shadow-lg z-50">
                  <button
                    onClick={() => { setToolsOpen(false); navigate('/owner/tools'); }}
                    className={`w-full text-left flex items-center px-3 py-2 rounded-md transition-colors ${isActive('/owner/tools') && !isActive('/owner/tools/scraping') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Owner Tools
                  </button>
                  <button
                    onClick={() => { setToolsOpen(false); navigate('/owner/tools/fit-settings'); }}
                    className={`w-full text-left flex items-center px-3 py-2 rounded-md transition-colors ${isActive('/owner/tools/fit-settings') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    FiT settings
                  </button>
                  
                  <button
                    onClick={() => { setToolsOpen(false); navigate('/owner/tools/subscription-settings'); }}
                    className={`w-full text-left flex items-center px-3 py-2 rounded-md transition-colors ${isActive('/owner/tools/subscription-settings') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Subscription settings
                  </button>
                  <button
                    onClick={() => { setToolsOpen(false); navigate('/owner/tools/scraping'); }}
                    className={`w-full text-left flex items-center px-3 py-2 rounded-md transition-colors ${isActive('/owner/tools/scraping') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Scrape Monitor
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-700 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Uitloggen
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
              {currentUserName ? <span className="text-sm text-gray-700">Welkom, {currentUserName}</span> : <span />}
            </div>
            <div className="px-4 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Taal</span>
                <LanguageSwitcher />
              </div>
            </div>
            <div className="px-2 pb-3 space-y-1">
              <button
                onClick={() => { setMobileOpen(false); navigate('/owner/dashboard'); }}
                className={`w-full flex items-center px-3 py-2 rounded-md ${isActive('/owner/dashboard') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/owner/categories'); }}
                className={`w-full flex items-center px-3 py-2 rounded-md ${isActive('/owner/categories') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Folder className="h-4 w-4 mr-2" />
                Categorieën
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/owner/tools'); }}
                className={`w-full flex items-center px-3 py-2 rounded-md ${isActive('/owner/tools') && !isActive('/owner/tools/scraping') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Tools
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/owner/tools/fit-settings'); }}
                className={`w-full flex items-center pl-8 pr-3 py-2 rounded-md ${isActive('/owner/tools/fit-settings') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <ChevronRight className="h-4 w-4 mr-2" />
                FiT settings
              </button>
              
              <button
                onClick={() => { setMobileOpen(false); navigate('/owner/tools/subscription-settings'); }}
                className={`w-full flex items-center pl-8 pr-3 py-2 rounded-md ${isActive('/owner/tools/subscription-settings') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <ChevronRight className="h-4 w-4 mr-2" />
                Subscription settings
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate('/owner/tools/scraping'); }}
                className={`w-full flex items-center pl-8 pr-3 py-2 rounded-md ${isActive('/owner/tools/scraping') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <ChevronRight className="h-4 w-4 mr-2" />
                Scrape Monitor
              </button>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full flex items-center px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Uitloggen
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default OwnerNav;
