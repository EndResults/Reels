import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Camera } from 'lucide-react';
import Logo from '../components/Logo';
import Navbar from '../components/Navbar';
import api, { authAPI, authStorage, RegisterConsumerData } from '../services/api';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTranslation } from 'react-i18next';

const RegisterConsumer = () => {
  const { trackEvent } = useAnalytics();
  const { t } = useTranslation();
  const location = useLocation();
  const isPayed = /\/register\/consumer\/payed$/.test(location.pathname);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    registrationCode: ''
  });

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch'));
      setIsLoading(false);
      return;
    }

    try {
      const registerData: RegisterConsumerData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      };

      const response = isPayed
        ? await authAPI.registerConsumerPayed({ ...registerData, registrationCode: formData.registrationCode })
        : await authAPI.registerConsumer(registerData);
      
      if (response.data.success && response.data.data) {
        // Store auth data
        authStorage.setToken(response.data.data.token);
        if (response.data.data.user) {
          const u: any = response.data.data.user;
          if (isPayed) {
            u.user_type = u.user_type || 'PAYED';
            u.userType = u.userType || 'PAYED';
          }
          authStorage.setUser(u);
        }
        try {
          const u = response.data.data.user;
          trackEvent('consumer_login', {
            consumer_id: u?.id,
            login_method: 'email_register'
          });
        } catch {}
        
        // Redirect to customer dashboard
        navigate('/customer/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        t('auth.registerFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleRegister = async () => {
    try {
      try { trackEvent('consumer_register_oauth_start', { login_method: 'google' }); } catch {}
      const apiBase = String(api.defaults.baseURL || '').replace(/\/+$/, '');
      const next = '/customer/dashboard';
      window.location.href = `${apiBase}/auth-supabase/oauth/google/start?type=consumer&next=${encodeURIComponent(next)}`;
    } catch (e) {
      console.error('Supabase OAuth start failed', e);
    }
  };

  const handleFacebookRegister = async () => {
    try {
      try { trackEvent('consumer_register_oauth_start', { login_method: 'facebook' }); } catch {}
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
          {t('consumerRegister.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('consumerRegister.subtitle')}
        </p>
        <p className="mt-1 text-center text-sm text-gray-500">
          {t('consumerRegister.areYouRetailer')} {' '}
          <Link to="/register/retailer" className="font-medium text-primary-600 hover:text-primary-500">
            {t('consumerRegister.clickHereRetailerRegistration')}
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
          {/* Benefits Banner */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Camera className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-primary-800">{t('consumerRegister.benefitTitle')}</h3>
                <p className="text-sm text-primary-600">{t('consumerRegister.benefitText')}</p>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t('auth.firstName')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Sarah"
                  />
              </div>
            </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  {t('auth.lastName')}
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="de Vries"
                  />
              </div>
            </div>
          </div>

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
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('auth.passwordPlaceholder')}
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">{t('auth.passwordHelp')}</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.confirmPassword')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                />
              </div>
            </div>

            {isPayed && (
              <div>
                <label htmlFor="registrationCode" className="block text-sm font-medium text-gray-700">
                  Registratie code
                </label>
                <div className="mt-1">
                  <input
                    id="registrationCode"
                    name="registrationCode"
                    type="text"
                    required
                    value={formData.registrationCode}
                    onChange={handleInputChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Vul je code in"
                  />
                </div>
              </div>
            )}

            {/* Features Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">{t('consumerRegister.featuresTitle')}</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('consumerRegister.features.uploadPhoto')}</li>
                <li>• {t('consumerRegister.features.tryClothes')}</li>
                <li>• {t('consumerRegister.features.lessReturns')}</li>
                <li>• {t('consumerRegister.features.worksAllShops')}</li>
              </ul>
            </div>

            <div className="flex items-center">
              <input
                id="agree-terms"
                name="agree-terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
                {t('legal.agreePrefix')} {' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                  {t('legal.terms')}
                </Link>{' '}
                {t('legal.and')} {' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                  {t('legal.privacy')}
                </Link>
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="newsletter"
                name="newsletter"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="newsletter" className="ml-2 block text-sm text-gray-900">
                {t('consumerRegister.newsletterOptIn')}
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('auth.creatingAccount') : t('consumerRegister.createFreeAccount')}
              </button>
            </div>

            {/* Social SSO */}
            {!isPayed && (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleGoogleRegister}
                className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 rounded-md py-2 px-3 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                aria-label="Google"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.2-6.2C34.9 3.1 29.7 1 24 1 14.6 1 6.7 6.6 3.1 14.3l7.7 6c1.8-5.5 7-10.8 13.2-10.8z"/>
                  <path fill="#34A853" d="M46.5 24.5c0-1.6-.1-2.7-.4-3.9H24v7.3h12.7c-.6 3.5-2.6 6.4-5.6 8.4l8.5 6.6c5-4.6 7.9-11.4 7.9-18.4z"/>
                  <path fill="#FBBC04" d="M10.8 28.3c-.4-1.2-.7-2.5-.7-3.8s.2-2.6.6-3.8l-7.7-6C1 17 1 20.5 1 24s 0 7 2.1 9.7l7.7-5.4z"/>
                  <path fill="#4285F4" d="M24 47c6.5 0 12-2.1 16-5.7l-8.5-6.6c-2.3 1.6-5.3 2.6-7.5 2.6-5.8 0-11.4-3.9-13.2-9.5l-7.7 5.4C6.7 41.4 14.6 47 24 47z"/>
                </svg>
                <span>{t('consumerRegister.registerWithGoogle')}</span>
              </button>
              <button
                type="button"
                onClick={handleFacebookRegister}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md py-2 px-3 text-sm font-medium text-white hover:opacity-90"
                style={{ backgroundColor: '#1877F2' }}
                aria-label="Facebook"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.01 3.66 9.17 8.44 9.93v-7.02H7.9v-2.91h2.4V9.41c0-2.37 1.42-3.68 3.59-3.68 1.04 0 2.13.18 2.13.18v2.34h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.91h-2.22V22c4.78-.76 8.44-4.92 8.44-9.93z"/>
                </svg>
                <span>{t('consumerRegister.registerWithFacebook')}</span>
              </button>
            </div>
            )}

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t('auth.haveAccountQuestion')} {' '}
                <Link to="/login/consumer" className="font-medium text-primary-600 hover:text-primary-500">
                  {t('auth.loginHere')}
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

export default RegisterConsumer;
