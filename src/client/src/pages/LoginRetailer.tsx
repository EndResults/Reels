import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Store, BarChart3 } from 'lucide-react';
import Logo from '../components/Logo';
import Navbar from '../components/Navbar';
import { authAPI, authStorage, LoginData } from '../services/api';
import { useTranslation } from 'react-i18next';

const LoginRetailer = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const loginData: LoginData = {
        email: formData.email,
        password: formData.password
      };

      const response = await authAPI.loginRetailer(loginData);
      
      if (response.data.success && response.data.data) {
        // Store auth data
        authStorage.setToken(response.data.data.token);
        if (response.data.data.retailer) {
          authStorage.setUser(response.data.data.retailer);
        }
        
        // If account is in closing state but subscription still active (non-STARTER), land on account_deletion
        if ((response.data.data as any).closing) {
          const until = (response.data.data as any).effectiveEnd;
          const q = until ? `?until=${encodeURIComponent(until)}` : '';
          navigate(`/account_deletion${q}`);
        } else {
          // Redirect: first login -> webshops with first expanded, else dashboard
          const firstLogin = Boolean((response.data.data as any).firstLogin);
          if (firstLogin) {
            navigate('/retailer/webshops?expand=first');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (err: any) {
      const code = String(err?.response?.data?.code || '').toLowerCase();
      if (code === 'email_not_confirmed') {
        const q = new URLSearchParams({ error: 'Email niet bevestigd', prefill: formData.email }).toString();
        navigate(`/verify/retailer?${q}`);
        return;
      }
      setError(
        err.response?.data?.message || 
        t('auth.loginErrorGeneric')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <>
      <Navbar variant="light" />
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo className="h-12 w-auto" variant="light" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-dark-900">
          {t('retailerLogin.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('retailerLogin.subtitle')}
        </p>
        <p className="mt-1 text-center text-sm text-gray-500">
          {t('retailerLogin.areYouConsumer')} {' '}
          <Link to="/login/consumer" className="font-medium text-primary-600 hover:text-primary-500">
            {t('retailerLogin.clickHereConsumerLogin')}
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {/* Retailer Benefits Banner */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Store className="h-6 w-6 text-primary-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-primary-800">{t('retailerLogin.bannerTitle')}</h3>
                <p className="text-sm text-primary-600">{t('retailerLogin.bannerText')}</p>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('auth.emailPlaceholderShop')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Je wachtwoord"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                  {t('auth.rememberMe')}
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            </div>

            {/* Dashboard Features Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <BarChart3 className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">{t('retailerLogin.dashboardPreviewTitle')}</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('retailerLogin.features.analytics')}</li>
                <li>• {t('retailerLogin.features.returns')}</li>
                <li>• {t('retailerLogin.features.widgetTools')}</li>
                <li>• {t('retailerLogin.features.planBilling')}</li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('auth.loggingIn') : t('auth.loginOnDashboard')}
              </button>
            </div>

            {/* Google SSO */}

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t('retailerLogin.noRetailerAccount')} {' '}
                <Link to="/register/retailer" className="font-medium text-primary-600 hover:text-primary-500">
                  {t('retailerLogin.registerYourShop')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
};

export default LoginRetailer;
