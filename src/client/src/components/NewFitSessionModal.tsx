import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, CheckCircle, AlertCircle, Sparkles, Plus, User, ShoppingBag, Star, Gift } from 'lucide-react';

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
  const [currentFlow, setCurrentFlow] = useState<'login' | 'fit' | 'processing' | 'result'>('login');
  const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);
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
    if (!user) return;
    
    try {
      const token = localStorage?.getItem('token');
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

  const handleProductRemove = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const handleLogin = () => {
    const loginUrl = `/login?redirect=${encodeURIComponent(location.href)}`;
    window.open(loginUrl, '_blank');
  };

  const handleRegister = () => {
    const registerUrl = `/register/consumer?redirect=${encodeURIComponent(location.href)}`;
    window.open(registerUrl, '_blank');
  };

  const handleContinueAsGuest = () => {
    setCurrentFlow('fit');
  };

  const handleStartFitSession = async () => {
    const photoToUse = selectedPhoto?.url || photoPreview;
    
    if (!photoToUse) {
      setError('Selecteer eerst een pasfoto');
      return;
    }

    if (selectedProducts.length === 0) {
      setError('Geen producten geselecteerd');
      return;
    }

    setIsSubmitting(true);
    setCurrentFlow('processing');
    setError(null);

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
        pollSessionStatus(result.data.sessionId);
      } else {
        throw new Error(result.message || 'Er is iets misgegaan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
      setCurrentFlow('fit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollSessionStatus = async (sessionId: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/status`);
        const result = await response.json() as { success: boolean; data: { status: string } };

        if (result.success) {
          if (result.data.status === 'COMPLETED') {
            setCurrentFlow('result');
            return;
          } else if (result.data.status === 'FAILED') {
            setError('AI processing is mislukt. Probeer het opnieuw.');
            setCurrentFlow('fit');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setError('Processing duurt langer dan verwacht. Controleer je account later.');
          setCurrentFlow('fit');
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
    setCurrentFlow('login');
    setSelectedProducts([]);
    setSelectedPhoto(null);
    setUserPhotos([]);
    setUploadedPhoto(null);
    setPhotoPreview(null);
    setSessionResult(null);
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  const primaryColor = retailerData.primaryColor || '#3B82F6';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            {retailerData.logoUrl && (
              <img 
                src={retailerData.logoUrl} 
                alt={retailerData.shopName}
                className="h-8 w-auto"
              />
            )}
            <h2 className="text-xl font-semibold">FiT your items</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Login Flow */}
          {currentFlow === 'login' && (
            <div className="text-center max-w-md mx-auto">
              <div className="mb-6">
                <Sparkles size={48} className="mx-auto mb-4 text-blue-600" />
                <h3 className="text-xl font-semibold mb-2">Probeer met FiT</h3>
                <p className="text-gray-600">
                  Zie hoe dit item bij jou staat voordat je het koopt
                </p>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <User size={20} />
                  Heb je al een FiT account? Log dan in.
                </h4>
                
                <div className="text-sm text-gray-700 space-y-2 mb-4">
                  <p className="flex items-center gap-2">
                    <ShoppingBag size={16} />
                    Kan je op alle webwinkels met een digitale paskamer terecht
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    Bewaren we al jouw FiT sessies netjes voor je
                  </p>
                  <p className="flex items-center gap-2">
                    <Plus size={16} />
                    Kan je verschillende items tegelijk passen
                  </p>
                  <p className="flex items-center gap-2">
                    <Gift size={16} />
                    Ontvang je verschillende kortingen
                  </p>
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 mb-3"
                >
                  Inloggen
                </button>

                <p className="text-sm text-gray-600 mb-3">
                  Nog geen account? Maak snel in twee stappen gratis een account aan.
                </p>

                <button
                  onClick={handleRegister}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
                >
                  Account aanmaken
                </button>
              </div>

              <button
                onClick={handleContinueAsGuest}
                className="text-gray-600 hover:text-gray-800 underline"
              >
                Doorgaan zonder FiT account
              </button>
            </div>
          )}

          {/* FiT Session Flow */}
          {currentFlow === 'fit' && (
            <div>
              {/* User Photo Section */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Jouw pasfoto</h3>
                
                {isAuthenticated && userPhotos.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={selectedPhoto?.url}
                        alt="Pasfoto"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium">Default pasfoto</p>
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        Andere foto kiezen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors mb-4"
                    >
                      {photoPreview ? (
                        <div className="space-y-3">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg mx-auto"
                          />
                          <p className="text-sm text-gray-600">Klik om een andere foto te selecteren</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Camera size={48} className="mx-auto text-gray-400" />
                          <div>
                            <p className="font-medium">Upload je pasfoto</p>
                            <p className="text-sm text-gray-600">JPG, PNG tot 10MB</p>
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

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Tips voor de beste resultaten:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Sta rechtop voor een neutrale achtergrond</li>
                        <li>• Zorg voor goede belichting</li>
                        <li>• Draag goed passende kleding</li>
                        <li>• Kijk recht in de camera</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Products Section */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Items om te passen</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="relative border rounded-lg p-3">
                      <button
                        onClick={() => handleProductRemove(product.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-24 object-cover rounded mb-2"
                      />
                      <p className="text-xs font-medium truncate">{product.title}</p>
                      <p className="text-xs text-gray-600">{product.price}</p>
                    </div>
                  ))}
                  
                  {selectedProducts.length < 4 && (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 flex flex-col items-center justify-center h-32 cursor-pointer hover:border-blue-400">
                      <Plus size={24} className="text-gray-400 mb-2" />
                      <p className="text-xs text-gray-600 text-center">Item toevoegen</p>
                    </div>
                  )}
                </div>

                {selectedProducts.length >= 4 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Je kan maximaal 4 items tegelijk passen.
                  </p>
                )}

                {isAuthenticated && (
                  <p className="text-sm text-blue-600 mt-2">
                    💡 Combineer items (alleen met account)
                  </p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartFitSession}
                  disabled={isSubmitting || (!selectedPhoto && !photoPreview) || selectedProducts.length === 0}
                  className="flex-1 text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Sparkles size={20} />
                  FiT Now!
                </button>
              </div>
            </div>
          )}

          {/* Processing Flow */}
          {currentFlow === 'processing' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
              <h3 className="font-medium mb-2">Even geduld, we maken jouw perfecte FiT...</h3>
              <p className="text-gray-600 text-sm mb-4">
                Dit duurt meestal minder dan 10 seconden.
              </p>
              <p className="text-xs text-gray-500">
                Laat dit venster openstaan...
              </p>
              {sessionResult && (
                <p className="text-xs text-gray-500 mt-4">
                  Sessie ID: {sessionResult.sessionId}
                </p>
              )}
            </div>
          )}

          {/* Result Flow */}
          {currentFlow === 'result' && (
            <div className="text-center py-8">
              <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
              <h3 className="font-medium mb-2">FiT Sessie Voltooid!</h3>
              <p className="text-gray-600 text-sm mb-6">
                {isAuthenticated 
                  ? 'Je virtuele pasfoto is klaar en opgeslagen in je account.'
                  : 'Je virtuele pasfoto is klaar. Registreer je om het resultaat te bekijken en op te slaan.'
                }
              </p>
              
              <div className="space-y-3">
                {sessionResult?.resultUrl ? (
                  <button
                    onClick={() => window.open(sessionResult.resultUrl, '_blank')}
                    className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Bekijk Resultaat
                  </button>
                ) : !isAuthenticated ? (
                  <button
                    onClick={handleRegister}
                    className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Registreer & Bekijk Resultaat
                  </button>
                ) : null}
                
                <button
                  onClick={handleClose}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200"
                >
                  Sluiten
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
