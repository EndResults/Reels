import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Save, Minimize2, Maximize2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProfileData {
  id?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  country?: string;
  language?: string;
  height_cm?: number;
  weight_kg?: number;
  pasPhoto_front?: string;
  pasPhoto_side?: string;
  pasPhoto_fullBody_front?: string;
  pasPhoto_fullBody_side?: string;
}

interface ProfileCompletenessProps {
  profile: ProfileData;
  onSave?: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
  showSaveButton?: boolean;
  // When this value becomes truthy/changes, the widget will auto-expand and show again
  expandSignal?: any;
}

export const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({ 
  profile, 
  onSave,
  isSaving = false,
  hasChanges = false,
  showSaveButton = true,
  expandSignal
}) => {
  const { t } = useTranslation();
  const minimizedKey = (pid?: string) => `fit_profile_widget_minimized_${pid || 'anon'}`;
  const visibleKey = (pid?: string) => `fit_profile_widget_visible_${pid || 'anon'}`;

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(minimizedKey(profile?.id));
      return stored === '1' || stored === 'true';
    }
    return false;
  });
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(visibleKey(profile?.id));
      return stored === null ? true : (stored === '1' || stored === 'true');
    }
    return true;
  });

  // Persist minimized/visible state across page navigations
  useEffect(() => {
    try { window.localStorage.setItem(minimizedKey(profile?.id), isMinimized ? '1' : '0'); } catch {}
  }, [isMinimized, profile?.id]);
  useEffect(() => {
    try { window.localStorage.setItem(visibleKey(profile?.id), isVisible ? '1' : '0'); } catch {}
  }, [isVisible, profile?.id]);

  // Auto-expand/restore visibility when something changes on profile page
  useEffect(() => {
    if (expandSignal) {
      setIsMinimized(false);
      setIsVisible(true);
    }
  }, [expandSignal]);

  // When profile changes (e.g., user switch), reload persisted state for that user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const m = window.localStorage.getItem(minimizedKey(profile?.id));
      const v = window.localStorage.getItem(visibleKey(profile?.id));
      if (m !== null) setIsMinimized(m === '1' || m === 'true');
      if (v !== null) setIsVisible(v === '1' || v === 'true');
    }
  }, [profile?.id]);

  if (!isVisible) return null;
  const calculateCompleteness = () => {
    const requiredFields = [
      profile.firstName,
      profile.lastName,
      profile.dateOfBirth,
      profile.gender,
      profile.country,
      profile.height_cm,
      profile.weight_kg,
      profile.pasPhoto_front,
      profile.pasPhoto_side,
      profile.pasPhoto_fullBody_front,
      profile.pasPhoto_fullBody_side
    ];

    const completedFields = requiredFields.filter(field => field !== null && field !== undefined && field !== '').length;
    const totalFields = requiredFields.length;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    return { completionPercentage, missingCount: Math.max(0, totalFields - completedFields) };
  };

  const { completionPercentage: completeness, missingCount } = calculateCompleteness();
  
  const getCompletenessColor = () => {
    if (completeness >= 80) return 'bg-green-500';
    if (completeness >= 60) return 'bg-yellow-500';
    if (completeness >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCompletenessText = () => {
    if (completeness >= 80) return t('profileWidget.excellent');
    if (completeness >= 60) return t('profileWidget.good');
    if (completeness >= 40) return t('profileWidget.ok');
    return t('profileWidget.poor');
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 md:bottom-28 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white shadow-lg rounded-lg p-3 border border-gray-200 hover:shadow-xl transition-shadow duration-200 flex items-center space-x-2"
        >
          <div className="flex items-center space-x-2">
            {completeness === 100 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            <span className={`text-sm font-medium ${
              completeness >= 80 ? 'text-green-600' : 
              completeness >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {completeness}%
            </span>
          </div>
          <Maximize2 className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-28 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{t('profileWidget.title')}</h3>
        <div className="flex items-center space-x-1">
          {completeness === 100 ? (
            <CheckCircle className="text-green-500" size={20} />
          ) : (
            <AlertCircle className="text-orange-500" size={20} />
          )}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-100 rounded ml-2"
          >
            <Minimize2 className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{t('profileWidget.progress')}</span>
          <span>{completeness}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              completeness === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {completeness === 100 
          ? t('profileWidget.complete') 
          : t('profileWidget.fillMore', { count: missingCount })
        }
      </p>

      {/* Show CTA link to profile page when used buiten de profielpagina (no save button) */}
      {!showSaveButton && completeness < 100 && (
        <a
          href="/customer/profile"
          className="block w-full mb-3 text-center py-2 px-4 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
        >
          {t('profileWidget.fillMore', { count: missingCount })}
        </a>
      )}

      {showSaveButton && (
        <button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
            hasChanges && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save size={16} className="mr-2" />
          )}
          {isSaving ? t('profileWidget.saving') : hasChanges ? t('profileWidget.save') : t('profileWidget.noChanges')}
        </button>
      )}
    </div>
  );
};
