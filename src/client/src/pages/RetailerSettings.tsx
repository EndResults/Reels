import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Save, 
  Eye, 
  EyeOff, 
  User, 
  Building, 
  Globe, 
  Lock,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Megaphone,
  Crown
} from 'lucide-react';
import api, { authStorage, domainAPI, billingAPI, retailerAPI } from '../services/api';
import RetailerNav from '../components/RetailerNav';
import { useTranslation } from 'react-i18next';

interface DomainData {
  id: string;
  domain: string;
  category: string;
  name?: string;
  isActive: boolean;
}

type PlanTypeUI = 'FREEMIUM' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

interface RetailerData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  shopName: string;
  shopUrl: string;
  shopType: string;
  apiKey: string;
  domains?: DomainData[];
  plan?: PlanTypeUI; // optional; defaults to FREEMIUM if absent
}

const RetailerSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  const [retailer, setRetailer] = useState<RetailerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    shopName: '',
    shopUrl: '',
    shopType: 'FASHION'
  });
  
  // Domain management state
  const [domains, setDomains] = useState<DomainData[]>([]);
  const [newDomain, setNewDomain] = useState({ domain: '', category: 'FASHION', name: '' });
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; category: string }>({ name: '', category: 'FASHION' });
  // Password management state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const shopTypes = [
    { value: 'FASHION', label: '👕 Kleding & Mode' },
    { value: 'BIKES', label: '🚴‍♀️ Fietsen & E-bikes' },
    { value: 'SHOES', label: '👟 Schoenen & Footwear' },
    { value: 'MOTORS', label: '🏍️ Motoren & Scooters' },
    { value: 'GLASSES', label: '🕶️ Brillen & Zonnebrillen' },
    { value: 'JEWELRY', label: '💍 Sieraden & Accessoires' },
    { value: 'WATCHES', label: '⌚ Horloges' },
    { value: 'AUTOMOTIVE', label: '🚗 Automotive' },
    { value: 'FURNITURE', label: '🏠 Meubels & Interieur' },
    { value: 'BAGS', label: '🎒 Tassen & Bagage' }
  ];

  // Helpers for plan & limits
  const getPlan = (): PlanTypeUI => (retailer?.plan || 'FREEMIUM');
  const getPlanLimit = (plan: PlanTypeUI): number => {
    switch (plan) {
      case 'FREEMIUM': return 1;
      case 'BASIC': return 2;
      case 'PREMIUM': return 10;
      case 'ENTERPRISE': return Number.POSITIVE_INFINITY;
      default: return 1;
    }
  };

  const plan = getPlan();
  const domainLimit = getPlanLimit(plan);
  const domainCount = domains.length;
  const limitReached = domainCount >= domainLimit;

  const planLabel = (() => {
    switch (plan) {
      case 'FREEMIUM':
        return t('retailer.nav.starter');
      case 'BASIC':
        return t('retailer.nav.basic');
      case 'PREMIUM':
        return t('retailer.nav.premium');
      case 'ENTERPRISE':
        return t('retailer.nav.enterprise');
      default:
        return t('retailer.nav.starter');
    }
  })();

  const startCheckout = async (targetPlan: 'BASIC' | 'PREMIUM', interval: 'month' | 'year' = 'month') => {
    try {
      setCheckoutBusy(true);
      setBillingError(null);
      const lang = ((i18n && i18n.language) || (typeof navigator !== 'undefined' && navigator.language) || 'auto').toString().substring(0, 2).toLowerCase();
      const resp = await billingAPI.checkout({ planType: targetPlan, interval, lang });
      const url = (resp?.data?.url) || (resp?.data?.data?.url);
      if (typeof url === 'string' && url.startsWith('http')) {
        window.location.href = url;
      } else {
        setBillingError('Kon Stripe checkout URL niet ophalen');
      }
    } catch (e) {
      const anyE: any = e as any;
      // @ts-ignore
      setBillingError(anyE?.response?.data?.message || anyE?.message || 'Checkout mislukt');
    } finally {
      setCheckoutBusy(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = authStorage.getToken();
        if (!token) {
          navigate('/login/retailer');
          return;
        }
        const { data: result } = await api.get('/auth-supabase/profile');
        if (result.success && result.data) {
          const data = result.data;
          setRetailer({
            id: data.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            shopName: data.shopName,
            shopUrl: data.shopUrl,
            shopType: data.shopType,
            apiKey: data.apiKey,
            plan: data.plan || 'FREEMIUM'
          });
          setFormData({
            firstName: data.firstName,
            lastName: data.lastName,
            shopName: data.shopName,
            shopUrl: data.shopUrl,
            shopType: data.shopType
          });
          if (data.domains) {
            const normalized: DomainData[] = Array.isArray(data.domains)
              ? data.domains
              : Object.entries(data.domains).map(([domainUrl, meta]: any) => {
                  const category = typeof meta === 'string' ? meta : meta?.category;
                  const name = typeof meta === 'object' ? meta?.name : undefined;
                  return { id: String(domainUrl), domain: String(domainUrl), category: String(category || 'FASHION'), name, isActive: true };
                });
            setDomains(normalized);
          }
        } else {
          navigate('/login/retailer');
        }
      } catch (e) {
        navigate('/login/retailer');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Scroll to promo section when visiting /retailer/settings/promo or #promo
  useEffect(() => {
    if (location.pathname.endsWith('/promo') || location.hash === '#promo') {
      const el = document.getElementById('promo-settings');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'shopUrl') {
      let processedValue = value;
      if (processedValue.startsWith('https://')) processedValue = processedValue.substring(8);
      if (processedValue.startsWith('http://')) processedValue = processedValue.substring(7);
      setFormData(prev => ({ ...prev, [name]: processedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'domain') {
      let processedValue = value;
      
      // Remove https:// if user typed it
      if (processedValue.startsWith('https://')) {
        processedValue = processedValue.substring(8);
      }
      // Remove http:// if user typed it
      if (processedValue.startsWith('http://')) {
        processedValue = processedValue.substring(7);
      }
      
      setNewDomain(prev => ({
        ...prev,
        [name]: processedValue
      }));
    } else {
      setNewDomain(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('retailer.settings.personal.firstNameError');
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('retailer.settings.personal.lastNameError');
    }
    if (!formData.shopName.trim()) {
      newErrors.shopName = t('retailer.settings.personal.shopNameError');
    }
    if (!formData.shopUrl.trim()) {
      newErrors.shopUrl = t('retailer.settings.personal.shopUrlError');
    } else {
      try {
        new URL(`https://${formData.shopUrl}`);
      } catch {
        newErrors.shopUrl = t('retailer.settings.personal.shopUrlInvalid');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDomain = () => {
    const newErrors: Record<string, string> = {};

    if (!newDomain.domain.trim()) {
      newErrors.domain = t('retailer.settings.domain.domainError');
    } else {
      try {
        new URL(`https://${newDomain.domain}`);
      } catch {
        newErrors.domain = t('retailer.settings.domain.domainInvalid');
      }
    }

    if (!newDomain.name.trim()) {
      newErrors.domainName = t('retailer.settings.domain.domainNameError');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = t('retailer.settings.password.currentPasswordError');
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = t('retailer.settings.password.newPasswordError');
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = t('retailer.settings.password.newPasswordLengthError');
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = t('retailer.settings.password.confirmPasswordError');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const { data: result } = await api.put('/auth-supabase/update-profile', {
        ...formData,
        shopUrl: `https://${formData.shopUrl}` // Add https:// prefix when sending to API
      });

      if (result.success) {
        setSuccessMessage(t('retailer.settings.successMessage'));
        // Update local retailer data
        if (retailer) {
          setRetailer({
            ...retailer,
            ...formData
          });
        }
      } else {
        setErrors({ general: result.message || t('retailer.settings.generalError') });
      }
    } catch (error) {
      setErrors({ general: t('retailer.settings.generalError') });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!validateDomain()) return;

    setSaving(true);
    setSuccessMessage('');
    setErrors({});

    try {
      const { data: result } = await domainAPI.addDomain(`https://${newDomain.domain}`, newDomain.category, newDomain.name);

      if (result.success) {
        setSuccessMessage(t('retailer.settings.domain.successMessage'));
        // Server returns { data: { id, domains: DomainData[] } }
        if (Array.isArray(result.data?.domains)) {
          setDomains(result.data.domains as DomainData[]);
        }
        setNewDomain({ domain: '', category: 'FASHION', name: '' });
      } else {
        setErrors({ general: result.message || t('retailer.settings.generalError') });
      }
    } catch (error) {
      setErrors({ general: t('retailer.settings.generalError') });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    setSaving(true);
    setSuccessMessage('');
    setErrors({});

    try {
      const { data: result } = await domainAPI.removeDomain(domainId);

      if (result.success) {
        setSuccessMessage(t('retailer.settings.domain.successMessage'));
        if (Array.isArray(result.data?.domains)) {
          setDomains(result.data.domains as DomainData[]);
        }
      } else {
        setErrors({ general: result.message || t('retailer.settings.generalError') });
      }
    } catch (error) {
      setErrors({ general: t('retailer.settings.generalError') });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    setSaving(true);
    setSuccessMessage('');

    try {
      const { data: result } = await api.put('/auth-supabase/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (result.success) {
        setSuccessMessage(t('retailer.settings.password.successMessage'));
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      } else {
        setErrors({ password: result.message || t('retailer.settings.password.error') });
      }
    } catch (error) {
      setErrors({ password: t('retailer.settings.password.error') });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!retailer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <RetailerNav
        title={t('retailer.settings.title')}
        backTo="/dashboard"
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-sm text-green-700">{successMessage}</div>
          </div>
        )}

        {/* Abonnement */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              {t('retailer.settings.subscription.title')}
            </h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 mb-4">{t('retailer.settings.subscription.youHave')} <strong>{planLabel}</strong> account.</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/retailer/abonnement')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('retailer.settings.subscription.adjust')}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm text-red-600 hover:text-red-700 underline"
                type="button"
              >
                {t('retailer.settings.subscription.closeAccount')}
              </button>
            </div>
          </div>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">{errors.general}</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Information */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('retailer.settings.personal.title')}
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('retailer.settings.personal.firstName')}
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('retailer.settings.personal.lastName')}
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('retailer.settings.personal.email')}
                  </label>
                  <input
                    type="email"
                    value={retailer.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">{t('retailer.settings.personal.emailNote')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Information - verplaatst naar Webshops (UI verwijderd) */}

          {/* Domain Management - verplaatst naar Webshops (UI verwijderd) */}

          {/* Promo Settings (moved to Webshops page) */}
        <div className="bg-white shadow rounded-lg" id="promo-settings">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Megaphone className="h-5 w-5 mr-2" />
                {t('retailer.settings.promo.title')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{t('retailer.settings.promo.desc')}</p>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">{t('retailer.settings.promo.goToWebshops')}</p>
              </div>
            </div>
          </div>

          {/* Password Change */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              {t('retailer.settings.password.title')}
            </h3>
          </div>
          <div className="p-6">
            {!showPasswordForm ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">{t('retailer.settings.password.desc')}</p>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  {t('retailer.settings.password.change')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.password && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-sm text-red-700">{errors.password}</div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('retailer.settings.password.current')}
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('retailer.settings.password.new')}
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('retailer.settings.password.confirm')}
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleChangePassword}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? t('retailer.settings.password.changing') : t('retailer.settings.password.changeBtn')}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                      setErrors({});
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    {t('retailer.settings.password.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Close space-y-6 container */}
        </div>

        {/* Confirm delete account modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => !deleteBusy && setShowDeleteModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">{t('retailer.settings.deleteModal.title')}</h4>
              </div>
              <div className="p-6 text-sm text-gray-700">{t('retailer.settings.deleteModal.text')}</div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteBusy}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {t('retailer.settings.deleteModal.cancel')}
                </button>
                <button
                  onClick={async () => {
                    setDeleteBusy(true);
                    try {
                      const { data: resp } = await retailerAPI.closeAccount();
                      authStorage.clearAuth();
                      const until = resp?.data?.effectiveEnd ? `?until=${encodeURIComponent(resp.data.effectiveEnd)}` : '';
                      window.location.href = `/account_closed${until}`;
                    } catch (e) {
                      setErrors({ general: t('retailer.settings.generalError') });
                    } finally {
                      setDeleteBusy(false);
                      setShowDeleteModal(false);
                    }
                  }}
                  disabled={deleteBusy}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {t('retailer.settings.deleteModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetailerSettings;
