import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Store, Globe, Tag, Building } from 'lucide-react';
import Logo from '../components/Logo';
import Navbar from '../components/Navbar';
import { authAPI, authStorage, RegisterRetailerData, categoriesAPI } from '../services/api';
import { getCategoryLabel } from '../constants/categories';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTranslation } from 'react-i18next';

const RegisterRetailer = () => {
  const { trackEvent } = useAnalytics();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language && i18n.language.toLowerCase().startsWith('en') ? 'en' : 'nl') as 'en' | 'nl';
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    shopName: '',
    shopUrl: '',
    shopType: ''
  });

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const DEFAULT_CATS = ['FASHION','BIKES','SHOES','MOTORS','GLASSES','JEWELRY','WATCHES','AUTOMOTIVE','FURNITURE','BAGS'];
  const [activeCategories, setActiveCategories] = useState<string[]>(DEFAULT_CATS);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ shopType?: string }>({});

  // Helpers to derive and validate domains
  const getEmailDomain = (email: string): string => {
    if (!email) return '';
    const at = email.indexOf('@');
    if (at === -1) return '';
    return email.substring(at + 1).trim().toLowerCase().replace(/^www\./, '');
  };

  const getHostFromInput = (input: string): string => {
    if (!input) return '';
    try {
      const url = new URL(`https://${input.trim()}`);
      return url.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const emailDomain = getEmailDomain(formData.email);
  const shopHost = getHostFromInput(formData.shopUrl);
  const hasBoth = !!emailDomain && !!shopHost;
  const domainMatches = hasBoth
    ? (
        emailDomain === shopHost ||
        emailDomain.endsWith('.' + shopHost) ||
        shopHost.endsWith('.' + emailDomain)
      )
    : true;
  const showDomainMismatch = hasBoth && !domainMatches;

  // Prefill from query params (e.g., after OAuth redirect) and surface error messages
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const nextState: any = {};
      const qEmail = params.get('email');
      const qFirst = params.get('firstName');
      const qLast = params.get('lastName');
      const qShopName = params.get('shopName');
      const qShopUrl = params.get('shopUrl');
      if (qEmail) nextState.email = qEmail;
      if (qFirst) nextState.firstName = qFirst;
      if (qLast) nextState.lastName = qLast;
      if (qShopName) nextState.shopName = qShopName;
      if (qShopUrl) {
        try {
          const u = new URL(qShopUrl);
          nextState.shopUrl = u.host.replace(/^www\./, '');
        } catch {
          nextState.shopUrl = qShopUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
        }
      }
      if (Object.keys(nextState).length > 0) {
        setFormData((prev) => ({ ...prev, ...nextState }));
      }
      if (params.get('error') === 'domain_mismatch') {
        const expected = params.get('expected');
        setError(`Gebruik een zakelijk e-mailadres dat hoort bij je domein${expected ? ` (${expected})` : ''}.`);
      }
    } catch {}
  }, []);

  // Load active categories
  useEffect(() => {
    (async () => {
      try {
        const res = await categoriesAPI.listActive();
        const list = Array.isArray(res.data?.categories) ? (res.data.categories as string[]) : DEFAULT_CATS;
        setActiveCategories(list);
        setFormData(prev => ({ ...prev, shopType: prev.shopType && list.includes(prev.shopType) ? prev.shopType : '' }));
      } catch {
        setActiveCategories(DEFAULT_CATS);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setFieldErrors({});

    console.log('🔵 RegisterRetailer: Form submission started');
    console.log('🔵 RegisterRetailer: Form data:', formData);

    if (formData.password !== formData.confirmPassword) {
      console.log('❌ RegisterRetailer: Password mismatch');
      setError(t('auth.passwordMismatch'));
      setIsLoading(false);
      return;
    }

    if (!formData.shopType) {
      setFieldErrors({ shopType: 'Categorie is verplicht' });
      setIsLoading(false);
      return;
    }

    // Extra domeinvalidatie vóór API-call
    const _emailDomain = getEmailDomain(formData.email);
    const _shopHost = getHostFromInput(formData.shopUrl);
    if (
      _emailDomain &&
      _shopHost &&
      !(
        _emailDomain === _shopHost ||
        _emailDomain.endsWith('.' + _shopHost) ||
        _shopHost.endsWith('.' + _emailDomain)
      )
    ) {
      setError(`Gebruik een zakelijk e-mailadres dat hoort bij je domein (${_shopHost}). Bijvoorbeeld jan@${_shopHost}.`);
      setIsLoading(false);
      return;
    }

    try {
      const registerData: RegisterRetailerData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        shopName: formData.shopName,
        shopUrl: `https://${formData.shopUrl}`,
        shopType: formData.shopType
      };

      console.log('🔵 RegisterRetailer: Sending API request with data:', registerData);
      console.log('🔵 RegisterRetailer: API endpoint will be called');

      const response = await authAPI.registerRetailer(registerData);
      
      console.log('✅ RegisterRetailer: API response received:', response);
      console.log('✅ RegisterRetailer: Response data:', response.data);
      
      if (response.data.success && response.data.data) {
        console.log('✅ RegisterRetailer: Registration successful, storing auth data');
        // Store auth data
        authStorage.setToken(response.data.data.token);
        if (response.data.data.retailer) {
          authStorage.setUser(response.data.data.retailer);
        }
        try {
          const r = response.data.data.retailer;
          const email = formData.email || '';
          const domain = email.includes('@') ? email.split('@')[1] : '';
          trackEvent('retailer_register', {
            retailer_id: r?.id,
            email_domain: domain,
            plan_type: 'starter'
          });
        } catch {}
        
        console.log('✅ RegisterRetailer: Redirecting to dashboard');
        // Redirect to dashboard or success page
        navigate('/dashboard');
      } else {
        console.log('❌ RegisterRetailer: Registration failed - success=false or no data');
        setError(response.data.message || t('auth.registerFailed'));
      }
    } catch (err: any) {
      console.error('❌ RegisterRetailer: API call failed:', err);
      console.error('❌ RegisterRetailer: Error response:', err.response);
      console.error('❌ RegisterRetailer: Error message:', err.message);
      
      setError(
        err.response?.data?.message || 
        t('auth.registerFailed')
      );
    } finally {
      setIsLoading(false);
      console.log('🔵 RegisterRetailer: Form submission completed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle URL field with https:// prefix
    if (name === 'shopUrl') {
      let processedValue = value;
      
      // Remove https:// if user typed it
      if (processedValue.startsWith('https://')) {
        processedValue = processedValue.substring(8);
      }
      // Remove http:// if user typed it
      if (processedValue.startsWith('http://')) {
        processedValue = processedValue.substring(7);
      }
      
      setFormData({
        ...formData,
        [name]: processedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
      if (name === 'shopType') {
        setFieldErrors(prev => ({ ...prev, shopType: undefined }));
      }
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
          {t('retailerRegister.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {t('retailerRegister.subtitle')}
        </p>
        <p className="mt-1 text-center text-sm text-gray-500">
          {t('retailerRegister.areYouConsumer')} {' '}
          <Link to="/register/consumer" className="font-medium text-primary-600 hover:text-primary-500">
            {t('retailerRegister.clickHereConsumerRegistration')}
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
                    placeholder="Jan"
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
                    placeholder="Jansen"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('retailerRegister.businessEmail')}
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
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border ${showDomainMismatch ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'} rounded-md placeholder-gray-400 focus:outline-none`}
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
              {showDomainMismatch && (
                <p className="mt-1 text-xs text-red-600">
                  Dit e-mailadres hoort niet bij je webshopdomein ({shopHost}). Gebruik een zakelijk adres, bijvoorbeeld jan@{shopHost}.
                </p>
              )}
            </div>

            {/* Shop Info */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('retailerRegister.shopInfoTitle')}</h3>
              
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                  {t('retailerRegister.shopName')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="shopName"
                    name="shopName"
                    type="text"
                    required
                    value={formData.shopName}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder={t('retailerRegister.shopNamePlaceholder')}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="shopUrl" className="block text-sm font-medium text-gray-700">
                  {t('retailerRegister.websiteUrl')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">https://</span>
                  </div>
                  <input
                    id="shopUrl"
                    name="shopUrl"
                    type="text"
                    required
                    value={formData.shopUrl}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full pl-20 pr-3 py-2 border ${showDomainMismatch ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'} rounded-md placeholder-gray-400 focus:outline-none`}
                    placeholder="mijnshop.nl"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{t('retailerRegister.domainHint')}</p>
                {shopHost && (
                  <p className={`mt-1 text-xs ${showDomainMismatch ? 'text-red-600' : 'text-gray-500'}`}>
                    Je zakelijk e-mailadres moet hetzelfde domein hebben. Verwacht: *@{shopHost}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label htmlFor="shopType" className="block text-sm font-medium text-gray-700">
                  {t('retailerRegister.shopCategory')}
                </label>
                <div className="mt-1">
                  <select
                    id="shopType"
                    name="shopType"
                    value={formData.shopType}
                    onChange={handleInputChange}
                    required
                    className={`appearance-none block w-full px-3 py-2 border ${fieldErrors.shopType ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'} rounded-md focus:outline-none`}
                  >
                    <option value="">{t('retailerRegister.selectCategory')}</option>
                    {activeCategories.map((c) => (
                      <option key={c} value={c}>{getCategoryLabel(c, lang)}</option>
                    ))}
                  </select>
                  {fieldErrors.shopType && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.shopType}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="border-t border-gray-200 pt-6">
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
                <p className="mt-1 text-sm text-gray-500">{t('auth.passwordHelpStrong')}</p>
              </div>

              <div className="mt-4">
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

            <div>
              <button
                type="submit"
                disabled={isLoading || showDomainMismatch}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('auth.creatingAccount') : t('retailerRegister.createRetailerAccount')}
              </button>
            </div>



            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t('auth.haveAccountQuestion')} {' '}
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
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

export default RegisterRetailer;
