import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, CheckCircle, AlertCircle, Sparkles, Plus, User, ShoppingBag, Star, Gift } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTranslation } from 'react-i18next';

declare global {
  interface Window {
    localStorage: Storage;
    location: Location;
  }
}

interface ProductItem {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
  url: string;
}

interface UserPhoto {
  id: string;
  url: string;
  isDefault: boolean;
}

interface FitSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: ProductItem;
  retailerData: {
    id: string;
    shopName: string;
    logoUrl?: string;
    primaryColor?: string;
    apiKey: string;
  };
  isAuthenticated?: boolean;
  user?: any;
}

interface SessionResult {
  sessionId: string;
  status: string;
  resultUrl?: string;
}

export const FitSessionModal: React.FC<FitSessionModalProps> = ({
  isOpen,
  onClose,
  initialProduct,
  retailerData,
  isAuthenticated = false,
  user = null
}) => {
  const { trackEvent } = useAnalytics();
  const { t } = useTranslation();
  const [currentFlow, setCurrentFlow] = useState<'login' | 'fit' | 'processing' | 'result'>('login');
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);
  const [userPhoto, setUserPhoto] = useState<File | null>(null);
  const [userPhotos, setUserPhotos] = useState<UserPhoto[]>([]);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize flow based on auth status
  useEffect(() => {
    if (isOpen) {
      if (isAuthenticated) {
        setCurrentFlow('fit');
        loadUserPhotos();
      } else {
        setCurrentFlow('login');
      }
      
      // Add initial product if provided
      if (initialProduct) {
        setSelectedProducts([initialProduct]);
      }
    }
  }, [isOpen, isAuthenticated, initialProduct]);

  const loadUserPhotos = async () => {
    if (!user || typeof window === 'undefined') return;
    
    try {
      const token = window.localStorage?.getItem('token');
      const response = await fetch('/api/consumer/photos', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json() as { photos: UserPhoto[] };
        setUserPhotos(data.photos || []);
        const defaultPhoto = data.photos?.find(p => p.isDefault) || data.photos?.[0];
        if (defaultPhoto) {
          setSelectedPhoto(defaultPhoto);
        }
      }
    } catch (error) {
      console.error('Failed to load user photos:', error);
    }
  };

  // Get product data from initialProduct or selectedProducts.
  const productData = initialProduct || selectedProducts[0];

  // Handle photo selection
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUserPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!userPhoto) return;
    
    setIsSubmitting(true);
    setStep('processing');
    
    try {
      // Submit logic here
      console.log('Submitting FiT session...');
      // Simulate processing
      setTimeout(() => {
        setStep('result');
        setIsSubmitting(false);
      }, 3000);
    } catch (error) {
      console.error('Submission error:', error);
      setError(t('errors.generic'));
      setStep('upload');
      setIsSubmitting(false);
    }
  };

  const handleProductRemove = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleProductAdd = () => {
    // This would open a product selector - for now just placeholder
    console.log('Add product functionality');
  };

  const handleLogin = () => {
    // Redirect to login while staying on retailer site
    const loginUrl = `/login?redirect=${encodeURIComponent(window.location.href)}`;
    window.open(loginUrl, '_blank');
  };

  const handleRegister = () => {
    // Redirect to register while staying on retailer site  
    const registerUrl = `/register/consumer?redirect=${encodeURIComponent(window.location.href)}`;
    window.open(registerUrl, '_blank');
  };

  const handleContinueAsGuest = () => {
    setCurrentFlow('fit');
  };

  const handleStartFitSession = async () => {
    const photoToUse = selectedPhoto?.url || photoPreview;
    
    if (!photoToUse) {
      setError(t('fit.selectPhotoFirst'));
      return;
    }

    if (selectedProducts.length === 0) {
      setError(t('fit.noProductsSelected'));
      return;
    }

    setIsSubmitting(true);
    setCurrentFlow('processing');
    setError(null);
    try {
      trackEvent('fit_session_start', {
        consumer_id: user?.id,
        shop_domain: (typeof window !== 'undefined' ? window.location.hostname : undefined),
        product_url: productData?.url
      });
    } catch {}

    try {
      const formData = new FormData();
      
      if (uploadedPhoto) {
        formData.append('userPhoto', uploadedPhoto);
      } else if (selectedPhoto) {
        formData.append('userPhotoUrl', selectedPhoto.url);
      }

      formData.append('products', JSON.stringify(selectedProducts));
      formData.append('retailerId', retailerData.id);
      formData.append('isGuest', (!isAuthenticated).toString());

      const response = await fetch('/api/sessions/create-widget', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${retailerData.apiKey}`
        },
        body: formData
      });

      const result = await response.json() as { success: boolean; data: SessionResult; message?: string };

      if (result.success) {
        setSessionResult(result.data);
        // Poll for session completion
        pollSessionStatus(result.data.sessionId);
      } else {
        throw new Error(result.message || t('errors.generic'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
      setCurrentFlow('fit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollSessionStatus = async (sessionId: string) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/status`);
        const result = await response.json();

        if (result.success) {
          if (result.data.status === 'COMPLETED') {
            setStep('result');
            try {
              trackEvent('fit_session_complete', {
                consumer_id: user?.id,
                fit_session_id: sessionId,
                result_count: (Array.isArray((result as any)?.data?.images) ? (result as any).data.images.length : undefined)
              });
            } catch {}
            return;
          } else if (result.data.status === 'FAILED') {
            setError(t('fit.aiFailed'));
            setStep('upload');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError(t('fit.processingSlow'));
          setStep('upload');
        }
      } catch (err) {
        console.error('Polling error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        }
      }
    };

    poll();
  };

  const resetModal = () => {
    setStep('upload');
    setUserPhoto(null);
    setPhotoPreview(null);
    setSessionResult(null);
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    try {
      if (step !== 'result') {
        trackEvent('fit_session_abandoned', {
          consumer_id: user?.id,
          shop_domain: (typeof window !== 'undefined' ? window.location.hostname : undefined),
          product_url: productData?.url
        });
      }
    } catch {}
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{t('modal.ctaTry')}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Product Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              {productData.imageUrl && (
                <img
                  src={productData.imageUrl}
                  alt={productData.title}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-medium text-sm">{productData.title}</h3>
                {productData.price && (
                  <p className="text-gray-600 text-sm mt-1">{productData.price}</p>
                )}
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 'upload' && (
            <div>
              <h3 className="font-medium mb-4">{t('fit.uploadYourPhoto')}</h3>
              
              <div className="mb-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {photoPreview ? (
                    <div className="space-y-3">
                      <img
                        src={photoPreview}
                        alt={t('fit.previewAlt')}
                        className="w-32 h-32 object-cover rounded-lg mx-auto"
                      />
                      <p className="text-sm text-gray-600">{t('fit.clickToSelectAnother')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Camera size={48} className="mx-auto text-gray-400" />
                      <div>
                        <p className="font-medium">{t('fit.selectPhoto')}</p>
                        <p className="text-sm text-gray-600">{t('fit.fileTypesLimit')}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-sm mb-2">{t('fit.tipsTitle')}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t('fit.tips.uprightBackground')}</li>
                  <li>• {t('fit.tips.goodLighting')}</li>
                  <li>• {t('fit.tips.wellFittingClothes')}</li>
                  <li>• {t('fit.tips.lookAtCamera')}</li>
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <button
                onClick={handleStartFitSession}
                disabled={!userPhoto || isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('fit.uploading') : t('fit.startSession')}
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="font-medium mb-2">{t('fit.aiWorking')}</h3>
              <p className="text-gray-600 text-sm">{t('fit.generatingPhoto')}</p>
              {sessionResult && (
                <p className="text-xs text-gray-500 mt-4">
                  {t('fit.sessionIdLabel')} {sessionResult.sessionId}
                </p>
              )}
            </div>
          )}

          {step === 'result' && (
            <div className="text-center py-8">
              <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
              <h3 className="font-medium mb-2">{t('fit.sessionComplete')}</h3>
              <p className="text-gray-600 text-sm mb-6">{t('fit.resultMessage')}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.open('/register/consumer', '_blank')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
                >
                  {t('fit.registerToView')}
                </button>
                
                <button
                  onClick={handleClose}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
