import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { CustomerLayout } from '../components/CustomerLayout';
import { PasPhotoUpload } from '../components/PasPhotoUpload';
import { consumerAPI } from '../services/api';
import { useToast } from '../components/ToastProvider';
import { useTranslation } from 'react-i18next';

interface ProfileData {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  profile_image_url?: string;
  pasPhoto_front?: string;
  pasPhoto_side?: string;
  pasPhoto_fullBody_front?: string;
  pasPhoto_fullBody_side?: string;
  pasPhoto_spouse?: string | null;
  pasPhoto_member1?: string | null;
  pasPhoto_member2?: string | null;
  pasPhoto_member3?: string | null;
  pasPhoto_member4?: string | null;
  pasPhoto_room_1?: string | null;
}

const ConsumerPhotos: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({});
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Helper function to get example image based on gender and type
const getExampleImage = (
  type: 'front' | 'side' | 'fullbody_front' | 'fullbody_side' | 'spouse' | 'member1' | 'member2' | 'member3' | 'member4' | 'room_1'
) => {
  // Base gender for user's own photos; default to male if unknown
  const genderSuffix = profile.gender === 'FEMALE' ? 'female' : 'male';

  // Spouse: opposite gender front example; if unknown, pick 'female' by default
  if (type === 'spouse') {
    const spouseGender =
      profile.gender === 'MALE' ? 'female' :
      profile.gender === 'FEMALE' ? 'male' : 'female';
    return `/images/examples/pasphoto_front_${spouseGender}.png`;
  }

  // Family members: fixed example images
  switch (type) {
    case 'member1': return '/images/examples/pasPhoto_gezinslid_1.png';
    case 'member2': return '/images/examples/pasPhoto_gezinslid_2.png';
    case 'member3': return '/images/examples/pasPhoto_gezinslid_3.png';
    case 'member4': return '/images/examples/pasPhoto_gezinslid_4.png';
    case 'room_1':  return '/images/examples/pasPhoto_ruimte_1.png';
  }

  // Default mapping for core types (front/side/fullbody)
  return `/images/examples/pasphoto_${type}_${genderSuffix}.png`;
};

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await consumerAPI.getProfile();
      
      if (response.data.success) {
        const profileData = response.data.profile;
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast({ type: 'error', text: t('customer.photos.toast.loadProfileError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUploaded = (photoType: string, photoUrl: string) => {
    setProfile(prev => ({
      ...prev,
      [`pasPhoto_${photoType}`]: photoUrl
    }));
    
    // If it's front photo, also update profile_image_url due to database trigger
    if (photoType === 'front') {
      setProfile(prev => ({
        ...prev,
        profile_image_url: photoUrl,
        pasPhoto_front: photoUrl,
      }));
    }

    showToast({ type: 'success', text: t('customer.photos.toast.photoUploaded') });
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
              {(profile.profile_image_url || profile.pasPhoto_front) ? (
                <img
                  src={(profile.profile_image_url || profile.pasPhoto_front) as string}
                  alt={t('customer.common.profilePhotoAlt')}
                  className="h-16 w-16 rounded-full object-cover border-2 border-blue-200"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                  <Camera className="h-8 w-8 text-blue-600" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('customer.photos.header.title')}</h1>
              <p className="text-gray-600">
                {t('customer.photos.header.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Toasts are shown globally via ToastProvider; no inline message banner here */}

        {/* PasPhoto Sections */}
        <div className="space-y-6 mb-6">
          <PasPhotoUpload
            type="front"
            currentPhoto={profile.pasPhoto_front}
            onPhotoUploaded={(url) => handlePhotoUploaded('front', url)}
            title={t('customer.photos.sections.front.title')}
            description={t('customer.photos.sections.front.desc')}
            exampleImage={getExampleImage('front')}
          />

          <PasPhotoUpload
            type="side"
            currentPhoto={profile.pasPhoto_side}
            onPhotoUploaded={(url) => handlePhotoUploaded('side', url)}
            title={t('customer.photos.sections.side.title')}
            description={t('customer.photos.sections.side.desc')}
            exampleImage={getExampleImage('side')}
          />

          <PasPhotoUpload
            type="fullbody_front"
            currentPhoto={profile.pasPhoto_fullBody_front}
            onPhotoUploaded={(url) => handlePhotoUploaded('fullbody_front', url)}
            title={t('customer.photos.sections.fullbody_front.title')}
            description={t('customer.photos.sections.fullbody_front.desc')}
            exampleImage={getExampleImage('fullbody_front')}
          />

          <PasPhotoUpload
            type="fullbody_side"
            currentPhoto={profile.pasPhoto_fullBody_side}
            onPhotoUploaded={(url) => handlePhotoUploaded('fullbody_side', url)}
            title={t('customer.photos.sections.fullbody_side.title')}
            description={t('customer.photos.sections.fullbody_side.desc')}
            exampleImage={getExampleImage('fullbody_side')}
          />
        </div>

        {/* Gezin Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('customer.photos.sections.family.title')}</h2>
          <p className="text-gray-600 mb-6">{t('customer.photos.sections.family.subtitle')}</p>
          <div className="space-y-6">
            <PasPhotoUpload
              type="spouse"
              currentPhoto={profile.pasPhoto_spouse || undefined}
              onPhotoUploaded={(url) => handlePhotoUploaded('spouse', url)}
              title={t('customer.photos.sections.spouse.title')}
              description={t('customer.photos.sections.spouse.desc')}
              exampleImage={getExampleImage('spouse')}
            />
            <PasPhotoUpload
              type="member1"
              currentPhoto={profile.pasPhoto_member1 || undefined}
              onPhotoUploaded={(url) => handlePhotoUploaded('member1', url)}
              title={t('customer.photos.sections.member1.title')}
              description={t('customer.photos.sections.member1.desc')}
              exampleImage={getExampleImage('member1')}
            />
            <PasPhotoUpload
              type="member2"
              currentPhoto={profile.pasPhoto_member2 || undefined}
              onPhotoUploaded={(url) => handlePhotoUploaded('member2', url)}
              title={t('customer.photos.sections.member2.title')}
              description={t('customer.photos.sections.member2.desc')}
              exampleImage={getExampleImage('member2')}
            />
            <PasPhotoUpload
              type="member3"
              currentPhoto={profile.pasPhoto_member3 || undefined}
              onPhotoUploaded={(url) => handlePhotoUploaded('member3', url)}
              title={t('customer.photos.sections.member3.title')}
              description={t('customer.photos.sections.member3.desc')}
              exampleImage={getExampleImage('member3')}
            />
            <PasPhotoUpload
              type="member4"
              currentPhoto={profile.pasPhoto_member4 || undefined}
              onPhotoUploaded={(url) => handlePhotoUploaded('member4', url)}
              title={t('customer.photos.sections.member4.title')}
              description={t('customer.photos.sections.member4.desc')}
              exampleImage={getExampleImage('member4')}
            />
          </div>
        </div>

        {/* Ruimtes Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('customer.photos.sections.rooms.title')}</h2>
          <p className="text-gray-600 mb-6">{t('customer.photos.sections.rooms.subtitle')}</p>
          <PasPhotoUpload
            type="room_1"
            currentPhoto={profile.pasPhoto_room_1 || undefined}
            onPhotoUploaded={(url) => handlePhotoUploaded('room_1', url)}
            title={t('customer.photos.sections.room_1.title')}
            description={t('customer.photos.sections.room_1.desc')}
            exampleImage={getExampleImage('room_1')}
          />
        </div>

        {/* Tips Section */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">{t('customer.photos.tips.title')}</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              {t('customer.photos.tips.t1')}
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              {t('customer.photos.tips.t2')}
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              {t('customer.photos.tips.t3')}
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              {t('customer.photos.tips.t4')}
            </li>
          </ul>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default ConsumerPhotos;
