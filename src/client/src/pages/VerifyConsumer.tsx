import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

const VerifyConsumer: React.FC = () => {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const hashParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams('');
    const h = window.location.hash?.replace(/^#/, '') || '';
    return new URLSearchParams(h);
  }, []);
  const error = params.get('error') || params.get('error_description') || hashParams.get('error') || hashParams.get('error_description');
  const type = params.get('type') || hashParams.get('type') || 'signup';
  const hasAccessToken = !!hashParams.get('access_token');

  const { t } = useTranslation();
  const headline = error ? t('verify.headlineFail') : t('verify.headlineSuccess');
  const sub = error
    ? t('verify.subFailGeneric')
    : type === 'recovery'
      ? t('verify.subRecoverySuccess')
      : t('verify.subSuccessDefault');

  const [email, setEmail] = useState(params.get('prefill') || '');
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleResend = async () => {
    setSending(true);
    setInfo(null);
    setErrMsg(null);
    try {
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        setErrMsg(t('verify.invalidEmail'));
        return;
      }
      const res = await authAPI.resendVerification({ email, type: 'user' as any });
      if (res.data?.success) {
        setInfo(t('verify.resendSuccess'));
      } else {
        setErrMsg(res.data?.message || t('verify.resendFail'));
      }
    } catch (e: any) {
      setErrMsg(e?.response?.data?.message || t('verify.resendFail'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar variant="light" />

      <main className="flex-1">
        <div className="container-max section-padding py-12">
          <div className="max-w-lg mx-auto bg-white shadow rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              {error ? (
                <AlertTriangle className="h-12 w-12 text-red-500" />
              ) : (
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-dark-900 mb-2">{headline}</h1>
            <p className="text-gray-600 mb-6">{sub}</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm mb-6 break-words">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/login/consumer" className="btn-primary">{t('verify.toLogin')}</Link>
              <Link to="/" className="btn-secondary">{t('verify.toHome')}</Link>
            </div>

            <div className="mt-6 text-left">
              <p className="text-sm text-gray-600 mb-2">{t('verify.noMailPrefix')}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder={t('verify.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleResend}
                  disabled={sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? t('verify.resending') : t('verify.resend')}
                </button>
              </div>
              {info && <p className="text-green-600 text-sm mt-2">{info}</p>}
              {errMsg && <p className="text-red-600 text-sm mt-2">{errMsg}</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyConsumer;
