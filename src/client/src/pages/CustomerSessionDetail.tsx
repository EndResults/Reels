import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar, 
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  Download,
  Share2,
  Heart,
  Maximize2,
  X,
  ThumbsUp,
  ThumbsDown,
  Info
} from 'lucide-react';
import { CustomerLayout } from '../components/CustomerLayout';
import { authStorage } from '../services/api';
import { fitSessionsAPI, FitSessionWithProducts } from '../services/fitSessionsAPI';
import { buildFitResultCloudinaryUrl, buildFitResultCloudinaryDownloadUrl } from '../utils/image';
import { useToast } from '../components/ToastProvider';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTranslation } from 'react-i18next';

const CustomerSessionDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<FitSessionWithProducts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [showFeedbackInfo, setShowFeedbackInfo] = useState(false);
  const { showToast } = useToast();
  const { trackEvent } = useAnalytics();
  const { t, i18n } = useTranslation();
  const locale = i18n.language && i18n.language.toLowerCase().startsWith('en') ? 'en-US' : 'nl-NL';

  // Always land at the top when opening detail page
  useEffect(() => {
    // Defer to next frame to ensure layout exists
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [sessionId]);

  useEffect(() => {
    const loadSessionDetail = async () => {
      if (!sessionId) {
        setError(t('errors.generic'));
        setLoading(false);
        return;
      }

      // Check if user is authenticated
      const token = authStorage.getToken();
      const userData = authStorage.getUser();
      
      if (!token || !userData) {
        navigate('/login/consumer');
        return;
      }

      try {
        const sessionData = await fitSessionsAPI.getSessionById(sessionId);
        if (sessionData) {
          setSession(sessionData);
        } else {
          setError(t('errors.generic'));
        }
      } catch (error) {
        console.error('Error loading session detail:', error);
        setError(t('errors.generic'));
      } finally {
        setLoading(false);
      }
    };
    loadSessionDetail();
  }, [sessionId, navigate]);

  const toggleFavorite = async () => {
    try {
      if (!session) return;
      const nextFav = !Boolean(session.favorite);
      // Optimistic update
      setSession(prev => prev ? { ...prev, favorite: nextFav } : prev);
      await fitSessionsAPI.toggleFavorite(session.id, nextFav);
      showToast({ type: 'success', text: nextFav ? 'Toegevoegd aan favorieten' : 'Verwijderd uit favorieten' });
    } catch (e) {
      // Revert
      setSession(prev => prev ? { ...prev, favorite: !Boolean(prev.favorite) } : prev);
      showToast({ type: 'error', text: 'Favoriet bijwerken mislukt' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'PROCESSING': return 'text-yellow-600 bg-yellow-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return t('customer.status.completed');
      case 'PROCESSING': return t('customer.status.processing');
      case 'FAILED': return t('customer.status.failed');
      default: return t('customer.status.unknown');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-5 w-5" />;
      case 'PROCESSING': return <Clock className="h-5 w-5" />;
      case 'FAILED': return <AlertCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'WS';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || '';
    const b = parts[1]?.[0] || parts[0]?.[1] || '';
    return (a + b).toUpperCase();
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </CustomerLayout>
    );
  }

  if (error || !session) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Fout</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/customer/sessions', { state: { fromSessionId: sessionId } })}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar sessies
              </button>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const firstProduct = session.products?.[0];
  const productName = firstProduct?.product_name || t('customer.common.unknownProduct');
  const retailerName = session.shop?.name || session.retailer?.shop_name || t('customer.common.unknownStore');
  const resultUrl = session.status === 'COMPLETED' && session.generated_image_url
    ? buildFitResultCloudinaryUrl(session.generated_image_url)
    : null;

  const ensureAbsoluteUrl = (url?: string | null): string | null => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  };

  const handleDownload = () => {
    if (!session?.generated_image_url) return;
    const downloadUrl = buildFitResultCloudinaryDownloadUrl(session.generated_image_url);
    try {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'fit_result.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleDownloadProductImage = async (url?: string | null) => {
    if (!url) return;
    try {
      const resp = await fetch(url, { mode: 'cors' });
      if (!resp.ok) throw new Error('download failed');
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = (url.split('.').pop() || 'jpg').split('?')[0];
      a.href = href;
      a.download = `product_image.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (e) {
      try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
    }
  };

  const handleShare = async () => {
    // Prefer sharing the image itself with a friendly message
    const text = t('customer.sessionDetail.shareText');
    const imgUrl = resultUrl;
    if (!imgUrl) {
      showToast({ type: 'error', text: t('customer.sessionDetail.toast.noResult') });
      return;
    }

    try {
      // Try Web Share API with file (best experience on mobile + desktop supporting Level 2)
      if ((navigator as any).share) {
        try {
          const resp = await fetch(imgUrl);
          const blob = await resp.blob();
          const file = typeof File !== 'undefined' ? new File([blob], 'fit_result.jpg', { type: blob.type || 'image/jpeg' }) : null;
          if (file && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
            await (navigator as any).share({ files: [file], title: t('customer.sessionDetail.shareTitle'), text });
            try { trackEvent('fit_share', { consumer_id: authStorage.getUser()?.id, share_method: 'web_share_file' }); } catch {}
            return;
          }
          // Fallback to sharing URL + text via Web Share
          await (navigator as any).share({ title: t('customer.sessionDetail.shareTitle'), text, url: imgUrl });
          try { trackEvent('fit_share', { consumer_id: authStorage.getUser()?.id, share_method: 'web_share_url' }); } catch {}
          return;
        } catch (_e) {
          // Continue to clipboard fallback
        }
      }

      // Fallback: copy image URL to clipboard
      try {
        await navigator.clipboard.writeText(imgUrl);
        showToast({ type: 'success', text: t('customer.sessionDetail.toast.copied') });
        try { trackEvent('fit_share', { consumer_id: authStorage.getUser()?.id, share_method: 'clipboard' }); } catch {}
      } catch (_e2) {
        // Last resort: open image in a new tab
        window.open(imgUrl, '_blank');
        try { trackEvent('fit_share', { consumer_id: authStorage.getUser()?.id, share_method: 'open_tab' }); } catch {}
      }
    } catch (_err) {
      showToast({ type: 'error', text: t('customer.sessionDetail.toast.shareFailed') });
    }
  };

  const handleFeedback = (type: 'positive' | 'negative' | 'report') => {
    if (!session) return;
    if (type === 'positive') {
      fitSessionsAPI.updateFeedback(session.id, { satisfied: true })
        .then((updated) => {
          if (updated) {
            setSession(prev => prev ? { ...prev, satisfied: true } : prev);
            setShowFeedbackInfo(false);
            showToast({ type: 'success', text: t('customer.sessionDetail.toast.positiveSaved') });
          }
        })
        .catch(() => {
          showToast({ type: 'error', text: t('customer.sessionDetail.toast.saveFailed') });
        });
    } else if (type === 'negative') {
      setFeedbackInput(session.feedback || '');
      setShowFeedbackModal(true);
    }
  };

  const submitNegativeFeedback = async () => {
    if (!session) return;
    const text = (feedbackInput || '').trim();
    if (!text) {
      showToast({ type: 'error', text: t('customer.sessionDetail.toast.explainMin') });
      return;
    }
    try {
      const updated = await fitSessionsAPI.updateFeedback(session.id, { satisfied: false, feedback: text });
      if (updated) {
        setSession(prev => prev ? { ...prev, satisfied: false, feedback: text } : prev);
        setShowFeedbackModal(false);
        setShowFeedbackInfo(false);
        showToast({ type: 'success', text: t('customer.sessionDetail.toast.negativeSaved') });
      }
    } catch (e) {
      showToast({ type: 'error', text: t('customer.sessionDetail.toast.saveFailed') });
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/customer/sessions', { state: { fromSessionId: session?.id || sessionId } })}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('customer.sessionDetail.back')}
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{productName}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {retailerName} • {new Date(session.created_at).toLocaleDateString(locale)}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                {getStatusIcon(session.status)}
                <span className="ml-2">{getStatusText(session.status)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generated Image - Prominent Display */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">{t('customer.sessionDetail.resultTitle')}</h2>
                {session.status === 'COMPLETED' && session.generated_image_url ? (
                  <div className="relative">
                    <img 
                      src={resultUrl!} 
                      alt="FiT resultaat"
                      className="w-full h-96 object-cover rounded-lg"
                      style={{ objectPosition: '50% 15%' }}
                    />
                    {/* Action buttons - desktop: horizontal top-right */}
                    <div className="absolute top-4 right-4 hidden sm:flex space-x-2">
                      <button
                        onClick={toggleFavorite}
                        aria-pressed={!!session.favorite}
                        className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
                        title={session.favorite ? t('customer.common.favoriteRemove') : t('customer.common.favoriteAdd')}
                      >
                        <Heart
                          className={`h-5 w-5 ${session.favorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                          fill={session.favorite ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button onClick={handleShare} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" title={t('customer.sessionDetail.actions.share')}>
                        <Share2 className="h-5 w-5 text-gray-400" />
                      </button>
                      <button onClick={handleDownload} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" title={t('customer.sessionDetail.actions.download')}>
                        <Download className="h-5 w-5 text-gray-400" />
                      </button>
                      <button onClick={() => setIsFullscreen(true)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" title={t('customer.sessionDetail.actions.fullscreen')}>
                        <Maximize2 className="h-5 w-5 text-gray-400" />
                      </button>
                    </div>
                    {/* Action buttons - mobile: vertical right middle */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex sm:hidden flex-col space-y-2">
                      <button
                        onClick={toggleFavorite}
                        aria-pressed={!!session.favorite}
                        className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
                        title={session.favorite ? t('customer.common.favoriteRemove') : t('customer.common.favoriteAdd')}
                      >
                        <Heart
                          className={`h-5 w-5 ${session.favorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
                          fill={session.favorite ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button onClick={handleShare} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" title={t('customer.sessionDetail.actions.share')}>
                        <Share2 className="h-5 w-5 text-gray-400" />
                      </button>
                      <button onClick={handleDownload} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" title={t('customer.sessionDetail.actions.download')}>
                        <Download className="h-5 w-5 text-gray-400" />
                      </button>
                      <button onClick={() => setIsFullscreen(true)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50" title={t('customer.sessionDetail.actions.fullscreen')}>
                        <Maximize2 className="h-5 w-5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ) : session.status === 'PROCESSING' ? (
                  <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Clock className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                      <p className="mt-2 text-sm text-gray-500">{t('customer.sessionDetail.processing')}</p>
                    </div>
                  </div>
                ) : session.status === 'FAILED' ? (
                  <div className="w-full h-96 bg-red-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                      <p className="mt-2 text-sm text-red-600">{t('customer.sessionDetail.failed')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">{t('customer.sessionDetail.noResult')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="space-y-6">
            {/* Session Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{t('customer.sessionDetail.details.title')}</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('customer.sessionDetail.details.status')}</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {getStatusIcon(session.status)}
                      <span className="ml-1">{getStatusText(session.status)}</span>
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('customer.sessionDetail.details.category')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">{session.category || t('categories.GENERAL')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('customer.sessionDetail.details.created')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(session.created_at).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </dd>
                </div>
                {session.processed_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{t('customer.sessionDetail.details.completed')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(session.processed_at).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {t('customer.sessionDetail.products.title', { count: session.products?.length || 0 })}
              </h2>
              
              {session.products && session.products.length > 0 ? (
                <div className="space-y-4">
                  {session.products.map((product) => {
                    const isUploaded = (product.product_name || '').toLowerCase() === 'not available' || (product.product_image_url || '').includes('/storage/v1/object/public/product-images/');
                    const nameDisplay = isUploaded ? (locale === 'nl-NL' ? 'niet beschikbaar' : 'not available') : (product.product_name || t('customer.common.unknownProduct'));
                    const priceDisplay = isUploaded ? (locale === 'nl-NL' ? 'niet beschikbaar' : 'not available') : (product.product_price || '');
                    return (
                      <div key={product.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        {product.product_image_url ? (
                          <img 
                            src={product.product_image_url} 
                            alt={nameDisplay}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{nameDisplay}</h3>
                          {priceDisplay ? (
                            <p className={`text-sm font-medium ${isUploaded ? 'text-gray-500' : 'text-green-600'}`}>{priceDisplay}</p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            {t('customer.sessionDetail.products.addedAt', { date: new Date(product.created_at).toLocaleDateString(locale) })}
                          </p>
                        </div>
                        {isUploaded ? (
                          <button 
                            onClick={() => handleDownloadProductImage(product.product_image_url)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            {locale === 'nl-NL' ? 'Download' : 'Download'}
                          </button>
                        ) : (product.product_url ? (
                          <button 
                            onClick={() => window.open(product.product_url, '_blank')}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {t('customer.sessionDetail.products.view')}
                          </button>
                        ) : null)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t('customer.sessionDetail.noResult')}</p>
              )}
              </div>
            

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{t('customer.sessionDetail.retailer.title')}</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {session.shop?.logo_url ? (
                    <img src={session.shop.logo_url} alt={`${session.shop?.name || retailerName} logo`} className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-[3.75rem] h-[3.75rem] rounded-full bg-gray-200 text-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold">{getInitials(session.shop?.name || session.retailer?.shop_name || '')}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{session.shop?.name || session.retailer?.shop_name}</h3>
                    <p className="text-sm text-gray-500">{t('customer.sessionDetail.retailer.partner')}</p>
                  </div>
                </div>
                {ensureAbsoluteUrl(session.shop?.url || session.retailer?.shop_url) && (
                  <button 
                    onClick={() => window.open(ensureAbsoluteUrl(session.shop?.url || session.retailer?.shop_url)!, '_blank')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t('customer.sessionDetail.retailer.visit')}
                  </button>
                )}
              </div>
            </div>
            {/* Feedback actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleFeedback('positive')}
                  className={`p-2 rounded-full shadow-sm border ${session.satisfied === true ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  title={t('customer.sessionDetail.actions.thumbUp')}
                >
                  <ThumbsUp className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleFeedback('negative')}
                  className={`p-2 rounded-full shadow-sm border ${session.satisfied === false ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  title={t('customer.sessionDetail.actions.thumbDown')}
                >
                  <ThumbsDown className="h-5 w-5" />
                </button>
                {session.feedback ? (
                  <button
                    onClick={() => setShowFeedbackInfo(v => !v)}
                    className="p-2 rounded-full shadow-sm border bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    title={t('customer.sessionDetail.actions.feedbackInfo')}
                  >
                    <Info className="h-5 w-5" />
                  </button>
                ) : null}
              </div>
              {showFeedbackInfo && session.feedback && (
                <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-700">
                  {session.feedback}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      {/* Fullscreen Modal */}
      {isFullscreen && resultUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setIsFullscreen(false)}>
          <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsFullscreen(false)} className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow">
              <X className="h-5 w-5 text-gray-700" />
            </button>
            <img src={resultUrl} alt="FiT resultaat groot" className="w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* Negative feedback modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowFeedbackModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{t('customer.sessionDetail.negative.title')}</h3>
              <button onClick={() => setShowFeedbackModal(false)} className="p-2 rounded hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">{t('customer.sessionDetail.negative.question')}</p>
            <textarea
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={t('customer.sessionDetail.negative.placeholder')}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowFeedbackModal(false)} className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50">{t('customer.sessionDetail.negative.cancel')}</button>
              <button onClick={submitNegativeFeedback} className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">{t('customer.sessionDetail.negative.send')}</button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default CustomerSessionDetail;
