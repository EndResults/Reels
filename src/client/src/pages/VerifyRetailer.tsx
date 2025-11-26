import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { authAPI } from '../services/api';

const VerifyRetailer: React.FC = () => {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const hashParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams('');
    const h = window.location.hash?.replace(/^#/, '') || '';
    return new URLSearchParams(h);
  }, []);
  const error = params.get('error') || params.get('error_description') || hashParams.get('error') || hashParams.get('error_description');
  const type = params.get('type') || hashParams.get('type') || 'signup';

  const headline = error ? 'Verificatie mislukt' : 'E-mailadres bevestigd';
  const sub = error
    ? 'We konden je e-mailadres niet bevestigen. Probeer het opnieuw of vraag een nieuwe verificatie e-mail aan.'
    : type === 'recovery'
      ? 'Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen op je retailer dashboard.'
      : 'Bedankt! Je e-mailadres is bevestigd. Je kunt nu inloggen op je retailer dashboard.';

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
        setErrMsg('Vul een geldig e-mailadres in');
        return;
      }
      const res = await authAPI.resendVerification({ email, type: 'retailer' as any });
      if (res.data?.success) {
        setInfo('Verificatie e-mail is opnieuw verstuurd. Controleer je inbox.');
      } else {
        setErrMsg(res.data?.message || 'Versturen mislukt');
      }
    } catch (e: any) {
      setErrMsg(e?.response?.data?.message || 'Versturen mislukt');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-dark-900 text-white">
        <div className="container-max section-padding h-16 flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Logo className="h-16 w-auto" variant="dark" />
          </Link>
        </div>
      </header>

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
              <Link to="/login/retailer" className="btn-primary">Naar inloggen</Link>
              <Link to="/" className="btn-secondary">Terug naar home</Link>
            </div>

            <div className="mt-6 text-left">
              <p className="text-sm text-gray-600 mb-2">Geen mail ontvangen? Verstuur de verificatie opnieuw:</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="jij@winkel.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleResend}
                  disabled={sending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? 'Versturen…' : 'Verstuur opnieuw'}
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

export default VerifyRetailer;
