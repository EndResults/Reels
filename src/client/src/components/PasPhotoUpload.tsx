import React, { useState } from 'react';
import { Camera, Info, Upload, X, Maximize2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './ToastProvider';
import { useTranslation } from 'react-i18next';

interface PasPhotoUploadProps {
  type: 'front' | 'side' | 'fullbody_front' | 'fullbody_side' | 'spouse' | 'member1' | 'member2' | 'member3' | 'member4' | 'room_1';
  currentPhoto?: string;
  onPhotoUploaded: (photoUrl: string) => void;
  title: string;
  description: string;
  exampleImage: string;
}

export const PasPhotoUpload: React.FC<PasPhotoUploadProps> = ({
  type,
  currentPhoto,
  onPhotoUploaded,
  title,
  description,
  exampleImage
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleFileUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      showToast({ type: 'error', text: t('customer.photos.toast.fileTooLarge') });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('pasPhoto', file);
      
      // Use axios API client so requests always go to the correct backend URL
      const response = await api.post(`/consumer/profile/pasphoto/${type}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const result = response.data;
      
      if (result.success) {
        onPhotoUploaded(result.photoUrl);
        showToast({ type: 'success', text: t('customer.photos.toast.photoUploaded') });
      } else {
        showToast({ type: 'error', text: result.message || t('customer.photos.toast.uploadError') });
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast({ type: 'error', text: t('customer.photos.toast.uploadGeneric') });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="bg-white rounded-lg border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
        >
          <Info size={20} />
        </button>
      </div>

      {showInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-4">
            <img
              src={exampleImage}
              alt={`${t('customer.photos.ui.exampleLabel')} ${title}`}
              className="w-24 h-32 object-cover rounded-lg border"
            />
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium mb-2">{t('customer.photos.ui.exampleLabel')}:</p>
              <p className="text-sm text-blue-700">{description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area (zonder extra voorbeeldkolom) */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{t('customer.photos.ui.yourPhoto')}</p>
        {currentPhoto ? (
          <div className="relative">
            <img
              src={currentPhoto}
              alt={`${t('customer.photos.ui.yourPhoto')} ${title}`}
              className={`w-full rounded-lg border ${
                type.includes('fullbody') 
                  ? 'h-64 object-contain bg-gray-50' 
                  : 'h-48 object-contain bg-gray-50'
              }`}
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
              <label className="cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                <Upload size={16} className="inline mr-2" />
                {t('customer.photos.ui.replace')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center"
              >
                <Maximize2 size={16} className="mr-2" />
                {t('customer.photos.ui.seeFull')}
              </button>
            </div>
            {/* Zichtbare knop onder de foto (ook handig voor mobile zonder hover) */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
              >
                <Maximize2 size={16} className="mr-1" />
                {t('customer.photos.ui.seeFull')}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
              type.includes('fullbody') ? 'h-64' : 'h-48'
            } ${
              dragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isUploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">{t('customer.photos.ui.uploading')}</p>
              </div>
            ) : (
              <div className="text-center">
                <Camera size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">{t('customer.photos.ui.dragHereOr')}</p>
                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  <Upload size={16} className="inline mr-2" />
                  {t('customer.photos.ui.selectFile')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">{t('customer.photos.ui.maxSize')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && currentPhoto && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <button
            aria-label={t('common.close')}
            onClick={() => setIsPreviewOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-200"
          >
            <X size={28} />
          </button>
          <img
            src={currentPhoto}
            alt={`${t('customer.photos.ui.seeFull')} ${title}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
