import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface PromoSettingsData {
  promoEnabled: boolean;
  promoStartDate?: string;
  promoEndDate?: string;
}

const PromoSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [hasDateRange, setHasDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/retailer/promo-settings');
      
      if (response.data && (response.data as any).success) {
        const data = (response.data as any).data as PromoSettingsData;
        setEnabled(data.promoEnabled);
        
        if (data.promoStartDate || data.promoEndDate) {
          setHasDateRange(true);
          setStartDate(data.promoStartDate?.split('T')[0] || '');
          setEndDate(data.promoEndDate?.split('T')[0] || '');
        }
      }
    } catch (error: any) {
      console.error('Error loading promo settings:', error);
      setError('Fout bij laden van promo instellingen');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Validatie
      if (hasDateRange && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end <= start) {
          setError('Einddatum moet na startdatum liggen');
          return;
        }
      }

      const response = await api.put('/retailer/promo-settings', {
        promoEnabled: enabled,
        promoStartDate: hasDateRange && startDate ? startDate : null,
        promoEndDate: hasDateRange && endDate ? endDate : null
      });
      
      if (response.data && (response.data as any).success) {
        setSuccess('Promo instellingen succesvol opgeslagen!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(((response.data as any)?.message) || 'Fout bij opslaan');
      }
    } catch (error: any) {
      console.error('Error saving promo settings:', error);
      setError('Fout bij opslaan van promo instellingen');
    } finally {
      setLoading(false);
    }
  };

  const PreviewModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Preview Promo Banner</h3>
        <div className="border-2 border-dashed border-gray-300 p-4 mb-4">
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '14px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '28px' }}>🎉</span>
            <span style={{ flex: 1, fontSize: '15px' }}>
              <strong>NIEUW!</strong> Probeer producten virtueel - zie hoe het bij jou past!
            </span>
            <button style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '25px',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              Probeer FiT
            </button>
            <button style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '24px'
            }}>
              ×
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowPreview(false)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
        >
          Sluiten
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <span className="mr-2">🎉</span>
        Promo Aankondiging
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="mb-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-14 h-8 rounded-full transition ${
              enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${
                enabled ? 'translate-x-6' : ''
              }`} />
            </div>
          </div>
          <span className="font-medium text-lg">
            FiT Promo Banner {enabled ? 'Aan' : 'Uit'}
          </span>
        </label>
      </div>

      {/* Date Range Section */}
      {enabled && (
        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <h3 className="font-semibold mb-4">Looptijd (optioneel)</h3>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="dateRange"
                checked={!hasDateRange}
                onChange={() => setHasDateRange(false)}
                className="w-4 h-4"
              />
              <span>Altijd zichtbaar</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="dateRange"
                checked={hasDateRange}
                onChange={() => setHasDateRange(true)}
                className="w-4 h-4"
              />
              <span>Periode instellen</span>
            </label>
          </div>
          
          {hasDateRange && (
            <div className="ml-6 mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Van:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tot:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <p className="text-sm text-gray-600">
                Banner verdwijnt automatisch na einddatum
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowPreview(true)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
          disabled={loading}
        >
          Preview
        </button>
        <button
          onClick={saveSettings}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && <PreviewModal />}
    </div>
  );
};

export default PromoSettings;
