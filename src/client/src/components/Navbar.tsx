import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  variant?: 'dark' | 'light';
}

const Navbar: React.FC<NavbarProps> = ({ variant = 'dark' }) => {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const location = useLocation();
  const isCustomerSection = location.pathname.startsWith('/customer');

  const isDark = variant === 'dark';
  const navClass = isDark
    ? 'sticky top-0 z-50 bg-dark-900 text-white'
    : 'sticky top-0 z-50 bg-white text-dark-900 border-b border-gray-200';
  const authButtonColor = isDark ? 'text-white hover:text-primary-500' : 'text-gray-700 hover:text-primary-600';
  const mobileBtnColor = isDark
    ? 'md:hidden inline-flex items-center justify-center p-2 rounded-md text-white hover:text-primary-500 hover:bg-dark-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
    : 'md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500';
  const mobileMenuClass = isDark
    ? 'md:hidden bg-dark-900 text-white border-t border-white/10'
    : 'md:hidden bg-white text-dark-900 border-t border-gray-200';
  const mobileItemHover = isDark ? 'hover:bg-dark-800' : 'hover:bg-gray-100';

  return (
    <nav className={navClass}>
      <div className="container-max section-padding">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Logo className="h-16 w-auto" variant={isDark ? 'dark' : 'light'} />
            <span className="text-xl font-bold"></span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="hover:text-primary-500 transition-colors">
              {t('nav.home')}
            </Link>
            <Link to="/features" className="hover:text-primary-500 transition-colors">
              {t('nav.features')}
            </Link>
            <Link to="/#pricing" className="hover:text-primary-500 transition-colors">
              {t('nav.pricing')}
            </Link>
            {isCustomerSection && (
              <Link to="/customer/partners" className="hover:text-primary-500 transition-colors">
                {t('nav.webshops')}
              </Link>
            )}
            <Link to="/contact" className="hover:text-primary-500 transition-colors">
              {t('nav.contact')}
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className={`${authButtonColor} transition-colors`}
                  onClick={() => setOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5a8.25 8.25 0 1115 0A17.933 17.933 0 0012 21.75c-2.69 0-5.237-.588-7.5-2.25z"/>
                    </svg>
                    {t('nav.login')}
                  </span>
                </button>
                {open && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-lg bg-white text-dark-900 shadow-lg ring-1 ring-black/5 overflow-hidden z-20"
                  >
                    <Link
                      to="/login/consumer"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      {t('nav.loginConsumer')}
                    </Link>
                    <Link
                      to="/login/retailer"
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                    >
                      {t('nav.loginRetailer')}
                    </Link>
                  </div>
                )}
              </div>
              <Link 
                to="/register" 
                className="btn-primary"
              >
                {t('nav.startFree')}
              </Link>
            </div>
            <button
              type="button"
              className={mobileBtnColor}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className={mobileMenuClass}>
          <div className="px-4 pt-3 pb-4 space-y-2">
            <Link to="/" className={`block px-2 py-2 rounded ${mobileItemHover}`} onClick={() => setMobileOpen(false)}>
              {t('nav.home')}
            </Link>
            <Link to="/features" className={`block px-2 py-2 rounded ${mobileItemHover}`} onClick={() => setMobileOpen(false)}>
              {t('nav.features')}
            </Link>
            <Link to="/#pricing" className={`block px-2 py-2 rounded ${mobileItemHover}`} onClick={() => setMobileOpen(false)}>
              {t('nav.pricing')}
            </Link>
            {isCustomerSection && (
              <Link to="/customer/partners" className={`block px-2 py-2 rounded ${mobileItemHover}`} onClick={() => setMobileOpen(false)}>
                {t('nav.webshops')}
              </Link>
            )}
            <Link to="/contact" className={`block px-2 py-2 rounded ${mobileItemHover}`} onClick={() => setMobileOpen(false)}>
              {t('nav.contact')}
            </Link>
            <div className="pt-2 border-t border-white/10" />
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-80">{t('common.language.label')}</span>
              <LanguageSwitcher />
            </div>
            <div className="pt-2 border-t border-white/10" />
            <Link to="/login/consumer" className={`block px-2 py-2 rounded ${mobileItemHover}`} onClick={() => setMobileOpen(false)}>
              {t('nav.loginConsumer')}
            </Link>
            <Link to="/login/retailer" className={`block px-2 py-2 rounded ${mobileItemHover}`} onClick={() => setMobileOpen(false)}>
              {t('nav.loginRetailer')}
            </Link>
            <Link to="/register" className="btn-primary inline-block w-full text-center" onClick={() => setMobileOpen(false)}>
              {t('nav.startFree')}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
