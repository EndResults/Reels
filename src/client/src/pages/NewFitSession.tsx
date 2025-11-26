import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Upload, Image, Globe, Type, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { authStorage } from '../services/api';

interface FitSessionData {
  productTitle: string;
  productUrl: string;
  productImage: File | null;
  userPhoto: File | null;
}

const NewFitSession = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [sessionData, setSessionData] = useState<FitSessionData>({
    productTitle: '',
    productUrl: '',
    productImage: null,
    userPhoto: null
  });

  const [previews, setPreviews] = useState({
    productImage: '',
    userPhoto: ''
  });

  // Check authentication
  React.useEffect(() => {
    if (!authStorage.isAuthenticated()) {
      navigate('/login/consumer');
    }
  }, [navigate]);

  const handleProductImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSessionData({ ...sessionData, productImage: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews({ ...previews, productImage: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUserPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSessionData({ ...sessionData, userPhoto: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews({ ...previews, userPhoto: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNextStep = () => {
    setError('');
    
    if (currentStep === 1) {
      // Validate product info
      if (!sessionData.productTitle.trim()) {
        setError('Product titel is verplicht');
        return;
      }
      if (!sessionData.productUrl.trim()) {
        setError('Product URL is verplicht');
        return;
      }
      // Basic URL validation (domain format)
      const urlPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(\/.*)?$/;
      if (!urlPattern.test(sessionData.productUrl.trim())) {
        setError('Voer een geldige URL in (bijv. example.com/product)');
        return;
      }
      if (!sessionData.productImage) {
        setError('Product afbeelding is verplicht');
        return;
      }
    }
    
    if (currentStep === 2) {
      // Validate user photo
      if (!sessionData.userPhoto) {
        setError('Je foto is verplicht voor FiT processing');
        return;
      }
    }
    
    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Construct full URL with https:// prefix for backend
      const fullProductUrl = `https://${sessionData.productUrl}`;
      
      // TODO: Implement API call to create FiT session
      console.log('Creating FiT session:', {
        ...sessionData,
        productUrl: fullProductUrl
      });
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to profile with success message
      navigate('/profile?fitSessionCreated=true');
      
    } catch (err: any) {
      setError('Er is een fout opgetreden bij het starten van de FiT sessie');
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep >= step 
                ? 'bg-primary-500 border-primary-500 text-white' 
                : 'border-gray-300 text-gray-400'
            }`}>
              {currentStep > step ? (
                <Check className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{step}</span>
              )}
            </div>
            {step < 3 && (
              <div className={`w-12 h-0.5 ${
                currentStep > step ? 'bg-primary-500' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Informatie</h2>
        <p className="text-gray-600">Voer de gegevens in van het product dat je wilt passen</p>
      </div>

      <div className="space-y-6">
        {/* Product Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Type className="inline h-4 w-4 mr-2" />
            Product Titel
          </label>
          <input
            type="text"
            value={sessionData.productTitle}
            onChange={(e) => setSessionData({ ...sessionData, productTitle: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Bijv. Nike Air Max 90 Wit/Zwart"
          />
        </div>

        {/* Product URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="inline h-4 w-4 mr-2" />
            Product URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">https://</span>
            </div>
            <input
              type="text"
              value={sessionData.productUrl}
              onChange={(e) => {
                let value = e.target.value;
                // Remove https:// if user types it
                if (value.startsWith('https://')) {
                  value = value.substring(8);
                }
                if (value.startsWith('http://')) {
                  value = value.substring(7);
                }
                setSessionData({ ...sessionData, productUrl: value });
              }}
              className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="example.com/product/nike-air-max-90"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Voer alleen het domein en pad in, https:// wordt automatisch toegevoegd
          </p>
        </div>

        {/* Product Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Image className="inline h-4 w-4 mr-2" />
            Product Afbeelding
          </label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
            {previews.productImage ? (
              <div className="space-y-4">
                <img
                  src={previews.productImage}
                  alt="Product preview"
                  className="mx-auto h-48 w-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setSessionData({ ...sessionData, productImage: null });
                    setPreviews({ ...previews, productImage: '' });
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Andere afbeelding kiezen
                </button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Klik om product afbeelding te uploaden
                </p>
                <p className="text-sm text-gray-500">
                  PNG, JPG tot 5MB
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Jouw Foto</h2>
        <p className="text-gray-600">Upload een foto van jezelf voor de virtuele paskamer</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Tips voor de beste resultaten:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Sta rechtop met je armen langs je lichaam</li>
          <li>• Draag goed passende kleding</li>
          <li>• Zorg voor goede verlichting</li>
          <li>• Kijk recht in de camera</li>
          <li>• Zorg dat je volledig in beeld bent</li>
        </ul>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
        {previews.userPhoto ? (
          <div className="space-y-4">
            <img
              src={previews.userPhoto}
              alt="User photo preview"
              className="mx-auto h-64 w-48 object-cover rounded-lg"
            />
            <button
              onClick={() => {
                setSessionData({ ...sessionData, userPhoto: null });
                setPreviews({ ...previews, userPhoto: '' });
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Andere foto kiezen
            </button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl font-medium text-gray-900 mb-2">
              Upload je foto
            </p>
            <p className="text-sm text-gray-500 mb-4">
              PNG, JPG tot 5MB
            </p>
            <div className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
              <Camera className="h-5 w-5 mr-2" />
              Foto Kiezen
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleUserPhotoUpload}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bevestiging</h2>
        <p className="text-gray-600">Controleer je gegevens voordat je de FiT sessie start</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Product Summary */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Product</h3>
          <div className="flex items-start space-x-4">
            {previews.productImage && (
              <img
                src={previews.productImage}
                alt="Product"
                className="h-20 w-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900">{sessionData.productTitle}</p>
              <p className="text-sm text-gray-500 break-all">{sessionData.productUrl}</p>
            </div>
          </div>
        </div>

        {/* User Photo Summary */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Jouw Foto</h3>
          {previews.userPhoto && (
            <img
              src={previews.userPhoto}
              alt="User"
              className="h-32 w-24 object-cover rounded-lg"
            />
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Let op</h3>
            <p className="text-sm text-yellow-800 mt-1">
              De AI processing kan 2-5 minuten duren. Je ontvangt een notificatie wanneer je FiT resultaat klaar is.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                to="/profile"
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Terug
              </Link>
              <Logo className="h-8 w-auto mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Nieuwe FiT Sessie</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStepIndicator()}

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePreviousStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Vorige
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Volgende
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-8 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <Upload className="animate-spin h-4 w-4 mr-2" />
                    FiT Sessie Starten...
                  </>
                ) : (
                  'FiT Sessie Starten'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewFitSession;
