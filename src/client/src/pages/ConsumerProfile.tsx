import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { CustomerLayout } from '../components/CustomerLayout';
import { ProfileCompleteness } from '../components/ProfileCompleteness';
import { Tooltip } from '../components/Tooltip';
import { api } from '../services/api';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';

interface ProfileData {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  language?: string;
  height_cm?: number;
  weight_kg?: number;
  profile_image_url?: string;
  pasPhoto_front?: string;
  pasphoto_front?: string;
}

const ConsumerProfile: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const [changeTick, setChangeTick] = useState(0);
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const markDirty = () => setChangeTick((t) => t + 1);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('nl');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/consumer/profile');
      
      if (response.data.success) {
        const profileData = response.data.profile;
        setProfile(profileData);
        
        // Populate form fields
        setFirstName(profileData.firstName || '');
        setLastName(profileData.lastName || '');
        setDateOfBirth(profileData.dateOfBirth || '');
        setGender(profileData.gender || '');
        setCountry(profileData.country || '');
        setLanguage(profileData.language || 'nl');
        setHeightCm(profileData.height_cm || '');
        setWeightKg(profileData.weight_kg || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast({ type: 'error', text: t('customer.profile.toast.loadError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await api.delete('/consumer/account');
      if ((response.data as any)?.success) {
        showToast({ type: 'success', text: t('customer.profile.toast.accountDeleted') });
        localStorage.removeItem('fit_token');
        localStorage.removeItem('fit_user');
        setTimeout(() => {
          navigate('/');
        }, 1200);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      showToast({ type: 'error', text: t('customer.sessions.toast.deleteFailed') });
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);

    try {
      const response = await api.put('/consumer/profile', {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        country: country || null,
        language: language || 'nl',
        height_cm: heightCm || null,
        weight_kg: weightKg || null
      });

      if (response.data.success) {
        showToast({ type: 'success', text: t('customer.profile.toast.saveSuccess') });
        await fetchProfile();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast({ type: 'error', text: t('customer.profile.toast.saveError') });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) {
      setPasswordError(t('customer.profile.toast.passwordMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t('customer.profile.toast.passwordTooShort'));
      return;
    }

    try {
      const response = await api.put('/user/password', {
        newPassword
      });

      if (response.data.success) {
        showToast({ type: 'success', text: t('customer.profile.toast.passwordChangeSuccess') });
        setShowPasswordForm(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordError('');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showToast({ type: 'error', text: t('customer.profile.toast.passwordChangeError') });
    }
  };

  const hasChanges = () => {
    return (
      firstName !== profile.firstName ||
      lastName !== profile.lastName ||
      dateOfBirth !== profile.dateOfBirth ||
      gender !== profile.gender ||
      country !== profile.country ||
      language !== profile.language ||
      heightCm !== profile.height_cm ||
      weightKg !== profile.weight_kg
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {profile.profile_image_url || profile.pasPhoto_front || profile.pasphoto_front ? (
                <img
                  src={(profile.profile_image_url || profile.pasPhoto_front || profile.pasphoto_front) as string}
                  alt={t('customer.common.profilePhotoAlt')}
                  className="h-16 w-16 rounded-full object-cover border-2 border-blue-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('customer.profile.header.title')}</h1>
              <p className="text-gray-600">{t('customer.profile.header.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Toasts are handled globally by ToastProvider */}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('customer.profile.personal.title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.personal.email')}
              </label>
              <input
                type="email"
                value={profile.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder={t('customer.profile.personal.emailPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.personal.firstName')}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('customer.profile.personal.firstNamePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.personal.lastName')}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('customer.profile.personal.lastNamePlaceholder')}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.personal.dateOfBirth')}
                <Tooltip content={t('customer.profile.personal.dateOfBirthTooltip')} className="ml-2" />
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => { setDateOfBirth(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.personal.gender')}
              </label>
              <select
                value={gender}
                onChange={(e) => { setGender(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('customer.profile.personal.genderSelect')}</option>
                <option value="MALE">{t('customer.profile.personal.genderMale')}</option>
                <option value="FEMALE">{t('customer.profile.personal.genderFemale')}</option>
                <option value="OTHER">{t('customer.profile.personal.genderOther')}</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.personal.country')}
                <Tooltip content={t('customer.profile.personal.countryTooltip')} className="ml-2" />
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => { setCountry(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('customer.profile.personal.countryPlaceholder')}
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.personal.language')}
                <Tooltip content={t('customer.profile.personal.languageTooltip')} className="ml-2" />
              </label>
              <select
                value={language}
                onChange={(e) => { setLanguage(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="nl">{t('customer.profile.personal.languageNl')}</option>
                <option value="en">{t('customer.profile.personal.languageEn')}</option>
                <option value="de">{t('customer.profile.personal.languageDe')}</option>
                <option value="fr">{t('customer.profile.personal.languageFr')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Physical Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('customer.profile.physical.title')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.physical.height')}
                <Tooltip content={t('customer.profile.physical.heightTooltip')} className="ml-2" />
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => { setHeightCm(e.target.value ? parseInt(e.target.value) : ''); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="175"
                min="50"
                max="300"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                {t('customer.profile.physical.weight')}
                <Tooltip content={t('customer.profile.physical.weightTooltip')} className="ml-2" />
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => { setWeightKg(e.target.value ? parseInt(e.target.value) : ''); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="70"
                min="20"
                max="500"
              />
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{t('customer.profile.password.title')}</h2>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {showPasswordForm ? t('customer.profile.password.cancel') : t('customer.profile.password.change')}
            </button>
          </div>
          
          {!showPasswordForm ? (
            <div className="text-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-lg tracking-wider">••••••••••••</span>
                <span className="text-sm text-gray-500">{t('customer.profile.password.hidden')}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('customer.profile.password.new')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('customer.profile.password.min8')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('customer.profile.password.confirm')}
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('customer.profile.password.confirm')}
                />
                {passwordError && (
                  <p className="text-red-600 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  onClick={handlePasswordChange}
                  disabled={!newPassword || !confirmNewPassword}
                >
                  {t('common.save')}
                </button>
                <button
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setPasswordError('');
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ProfileCompleteness - Sticky component with save button */}
        {/* Account deletion */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('customer.profile.delete.title')}</h2>
          <p className="text-gray-600 mb-4">{t('customer.profile.delete.desc')}</p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {t('customer.profile.delete.button')}
          </button>
        </div>

        <ProfileCompleteness 
          profile={profile} 
          onSave={handleSaveProfile}
          isSaving={isSaving}
          hasChanges={hasChanges()}
          // Auto-expand whenever a change occurs (even if previously minimized/hidden)
          expandSignal={changeTick}
        />

        <ConfirmModal
          open={showDeleteModal}
          title={t('customer.profile.delete.modalTitle')}
          description={t('customer.profile.delete.modalDesc')}
          cancelText={t('customer.profile.delete.cancel')}
          confirmText={t('customer.profile.delete.confirm')}
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
        />
      </div>
    </CustomerLayout>
  );
};

export default ConsumerProfile;
