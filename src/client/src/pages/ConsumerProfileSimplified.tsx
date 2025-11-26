import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { CustomerLayout } from '../components/CustomerLayout';
import { ProfileCompleteness } from '../components/ProfileCompleteness';
import { Tooltip } from '../components/Tooltip';
import { api } from '../services/api';
import { useToast } from '../components/ToastProvider';

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
}

const ConsumerProfile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const [changeTick, setChangeTick] = useState(0);
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
      showToast({ type: 'error', text: 'Fout bij het laden van het profiel' });
    } finally {
      setIsLoading(false);
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
        showToast({ type: 'success', text: 'Profiel succesvol opgeslagen!' });
        await fetchProfile();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast({ type: 'error', text: 'Fout bij het opslaan van het profiel' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Nieuw wachtwoord en bevestiging komen niet overeen');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Wachtwoord moet minimaal 8 karakters lang zijn');
      return;
    }

    try {
      const response = await api.put('/user/password', {
        newPassword
      });

      if (response.data.success) {
        showToast({ type: 'success', text: 'Wachtwoord succesvol gewijzigd!' });
        setShowPasswordForm(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordError('');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showToast({ type: 'error', text: 'Fout bij het wijzigen van het wachtwoord' });
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
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mijn Profiel</h1>
              <p className="text-gray-600">
                Beheer je persoonlijke gegevens en instellingen.
              </p>
            </div>
          </div>
        </div>

        {/* Toasts are handled globally by ToastProvider */}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Persoonlijke Gegevens</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (Gebruikersnaam)
              </label>
              <input
                type="email"
                value={profile.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                placeholder="Geen email beschikbaar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voornaam
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jouw voornaam"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Achternaam
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jouw achternaam"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Geboortedatum
                <Tooltip content="Altijd handig voor felicitaties" className="ml-2" />
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
                Geslacht
              </label>
              <select
                value={gender}
                onChange={(e) => { setGender(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecteer geslacht</option>
                <option value="MALE">Man</option>
                <option value="FEMALE">Vrouw</option>
                <option value="OTHER">Geheim</option>
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Land
                <Tooltip content="Voor lokale voorkeuren en verzending" className="ml-2" />
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => { setCountry(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nederland"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Taal
                <Tooltip content="Tonen we je alles in jouw voorkeurstaal" className="ml-2" />
              </label>
              <select
                value={language}
                onChange={(e) => { setLanguage(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="nl">Nederlands</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>

        {/* Physical Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Fysieke Gegevens</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                Lengte (cm)
                <Tooltip content="Voor accurate pasvorm berekeningen" className="ml-2" />
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
                Gewicht (kg)
                <Tooltip content="Voor accurate pasvorm berekeningen" className="ml-2" />
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
            <h2 className="text-xl font-semibold text-gray-900">Wachtwoord</h2>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {showPasswordForm ? 'Annuleren' : 'Wachtwoord Aanpassen'}
            </button>
          </div>
          
          {!showPasswordForm ? (
            <div className="text-gray-600">
              <div className="flex items-center space-x-3">
                <span className="text-lg tracking-wider">••••••••••••</span>
                <span className="text-sm text-gray-500">Wachtwoord verborgen voor beveiliging</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nieuw Wachtwoord
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Minimaal 8 karakters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bevestig Nieuw Wachtwoord
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Herhaal je nieuwe wachtwoord"
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
                  Opslaan
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
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ProfileCompleteness - Sticky component with save button */}
        <ProfileCompleteness 
          profile={profile} 
          onSave={handleSaveProfile}
          isSaving={isSaving}
          hasChanges={hasChanges()}
          expandSignal={changeTick}
        />
      </div>
    </CustomerLayout>
  );
};

export default ConsumerProfile;
