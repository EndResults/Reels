import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Camera, Heart } from 'lucide-react';
import Logo from '../components/Logo';
import Navbar from '../components/Navbar';
import api, { authAPI, authStorage, LoginData } from '../services/api';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTranslation } from 'react-i18next';

const LoginConsumer = () => {
  const { trackEvent } = useAnalytics();
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

      const response = await authAPI.loginConsumer(loginData);
      
      if (response.data.success && response.data.data) {
        // Store auth data
        authStorage.setToken(response.data.data.token);
        if (response.data.data.user) {
          authStorage.setUser(response.data.data.user);
        }
        try {
          const u = response.data.data.user;
          trackEvent('consumer_login', {
            consumer_id: u?.id,
            login_method: 'email'
          });
        } catch {}
        
        // Fetch profile to decide redirect (ADMIN -> owner dashboard)
        try {
          const base = String(api.defaults.baseURL || '').replace(/\/+$/, '');
          const res = await fetch(base + '/consumer/profile', {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${response.data.data.token}` }
          });
          if (res.ok) {
            const json = await res.json();
            const userType = json?.profile?.user_type;
            if (userType === 'ADMIN') {
              navigate('/owner/dashboard');
              return;
            }
          }
        } catch {}
        // Default redirect
        navigate('/customer/dashboard');
      }
    } catch (err: any) {
      const code = String(err?.response?.data?.code || '').toLowerCase();
      if (code === 'email_not_confirmed') {
        const q = new URLSearchParams({ error: 'Email niet bevestigd', prefill: formData.email }).toString();
        navigate(`/verify/consumer?${q}`);
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

  const handleGoogleLogin = async () => {
    try {
      try { trackEvent('consumer_login_oauth_start', { login_method: 'google' }); } catch {}
      const apiBase = String(api.defaults.baseURL || '').replace(/\/+$/, '');
      const next = '/customer/dashboard';
      window.location.href = `${apiBase}/auth-supabase/oauth/google/start?type=consumer&next=${encodeURIComponent(next)}`;
    } catch (e) {
      console.error('Server-started OAuth (google) failed', e);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      try { trackEvent('consumer_login_oauth_start', { login_method: 'facebook' }); } catch {}
      const apiBase = String(api.defaults.baseURL || '').replace(/\/+$/, '');
      const next = '/customer/dashboard';
      window.location.href = `${apiBase}/auth-supabase/oauth/facebook/start?type=consumer&next=${encodeURIComponent(next)}`;
    } catch (e) {
      console.error('Supabase OAuth (facebook) start failed', e);
    }
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
          {t('consumerLogin.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('consumerLogin.subtitle')}
        </p>
        <p className="mt-1 text-center text-sm text-gray-500">
          {t('consumerLogin.areYouRetailer')} {' '}
          <Link to="/login/retailer" className="font-medium text-primary-600 hover:text-primary-500">
            {t('consumerLogin.clickHereRetailerLogin')}
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
          {/* Consumer Benefits Banner */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Camera className="h-6 w-6 text-primary-600 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-primary-800">{t('consumerLogin.profilePreviewTitle')}</h3>
                <p className="text-sm text-primary-600">{t('consumerLogin.profilePreviewText')}</p>
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
                  placeholder={t('auth.emailPlaceholder')}
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

            {/* Profile Features Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Heart className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">{t('consumerLogin.profileContentsTitle')}</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('consumerLogin.contents.savedMeasurements')}</li>
                <li>• {t('consumerLogin.contents.sessionsHistory')}</li>
                <li>• {t('consumerLogin.contents.favoriteItems')}</li>
                <li>• {t('consumerLogin.contents.personalSizeAdvice')}</li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('auth.loggingIn') : t('auth.login')}
              </button>
            </div>

            {/* Social SSO */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 px-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                aria-label="Google"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.2-6.2C34.9 3.1 29.7 1 24 1 14.6 1 6.7 6.6 3.1 14.3l7.7 6c1.8-5.5 7-10.8 13.2-10.8z"/>
                  <path fill="#34A853" d="M46.5 24.5c0-1.6-.1-2.7-.4-3.9H24v7.3h12.7c-.6 3.5-2.6 6.4-5.6 8.4l8.5 6.6c5-4.6 7.9-11.4 7.9-18.4z"/>
                  <path fill="#FBBC04" d="M10.8 28.3c-.4-1.2-.7-2.5-.7-3.8s.2-2.6.6-3.8l-7.7-6C1 17 1 20.5 1 24s0 7 2.1 9.7l7.7-5.4z"/>
                  <path fill="#4285F4" d="M24 47c6.5 0 12-2.1 16-5.7l-8.5-6.6c-2.3 1.6-5.3 2.6-7.5 2.6-5.8 0-11.4-3.9-13.2-9.5l-7.7 5.4C6.7 41.4 14.6 47 24 47z"/>
                </svg>
                <span>{t('auth.loginWithGoogle')}</span>
              </button>
              <button
                type="button"
                onClick={handleFacebookLogin}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium text-white hover:opacity-90"
                style={{ backgroundColor: '#1877F2' }}
                aria-label="Facebook"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.01 3.66 9.17 8.44 9.93v-7.02H7.9v-2.91h2.4V9.41c0-2.37 1.42-3.68 3.59-3.68 1.04 0 2.13.18 2.13.18v2.34h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.91h-2.22V22c4.78-.76 8.44-4.92 8.44-9.93z"/>
                </svg>
                <span>{t('auth.loginWithFacebook')}</span>
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t('consumerLogin.noAccount')} {' '}
                <Link to="/register/consumer" className="font-medium text-primary-600 hover:text-primary-500">
                  {t('consumerLogin.registerFreeAccount')}
                </Link>
              </p>
            </div>

            {/* Quick Access Info */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 text-center">
                {t('consumerLogin.tipNoAccountUse')}
              </p>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
};

export default LoginConsumer;
