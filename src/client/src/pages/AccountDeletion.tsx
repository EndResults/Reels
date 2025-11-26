import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';
import { retailerAPI } from '../services/api';

const AccountDeletion: React.FC = () => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const until = params.get('until');

  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lang = (i18n?.language || (typeof navigator !== 'undefined' ? navigator.language : 'nl')).slice(0,2).toLowerCase();
  const isNl = lang === 'nl';

  const title = isNl ? 'Account opheffing in wachttijd' : 'Account deletion scheduled';
  const line1 = isNl
    ? `Je account is succesvol opgeheven maar je abonnement loopt nog door tot het einde van de huidige periode: ${until ? new Date(until).toLocaleString('nl-NL') : ''}.`
    : `Your account has been closed but your subscription remains active until: ${until ? new Date(until).toLocaleString('en-GB') : ''}.`;
  const line2 = isNl
    ? 'Je kan tot die tijd de opheffing ongedaan maken, daarna zal je account definitief verwijderd worden en kan je niet meer inloggen.'
    : 'Until then you can undo the closure; after that your account will be permanently deleted and you will no longer be able to log in.';
  const actionText = isNl ? 'Opheffen ongedaan maken' : 'Undo closure';

  const modalTitle = isNl ? 'Opheffing ongedaan maken' : 'Undo account closure';
  const modalBody = isNl
    ? `Je staat op het punt je account opheffing ongedaan te maken. Het bestaande abonnement zal zoals aangegeven alsnog beëindigd worden op ${until ? new Date(until).toLocaleString('nl-NL') : '[datum]'}.`
    : `You are about to undo the account closure. The existing subscription will still end on ${until ? new Date(until).toLocaleString('en-GB') : '[date]'}.`;
  const cancelText = isNl ? 'Annuleren' : 'Cancel';
  const confirmText = isNl ? 'Ja, opheffing ongedaan maken' : 'Yes, undo closure';

  const onConfirmUndo = async () => {
    try {
      setBusy(true);
      setError(null);
      await retailerAPI.undoClose();
      // Back to dashboard after successful undo
      navigate('/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || (isNl ? 'Er ging iets mis' : 'Something went wrong'));
    } finally {
      setBusy(false);
      setModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="py-16 bg-gray-50">
          <div className="container-max section-padding max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-4">{title}</h1>
            <p className="text-gray-700 mb-2">{line1}</p>
            <p className="text-gray-700 mb-6">{line2}</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-sm text-red-700">{error}</div>
            )}

            <button
              className="btn-primary px-6 py-3"
              onClick={() => setModalOpen(true)}
            >
              {actionText}
            </button>

            {/* Modal */}
            {modalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => !busy && setModalOpen(false)} />
                <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900">{modalTitle}</h4>
                  </div>
                  <div className="p-6 text-sm text-gray-700">
                    {modalBody}
                  </div>
                  <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                      onClick={() => setModalOpen(false)}
                      disabled={busy}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                      {cancelText}
                    </button>
                    <button
                      onClick={onConfirmUndo}
                      disabled={busy}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy ? (isNl ? 'Bezig…' : 'Working…') : confirmText}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="bg-dark-800 text-gray-300 py-12">
        <div className="container-max section-padding">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Logo className="h-8 w-auto" variant="dark" />
                <span className="text-xl font-bold text-white"></span>
              </div>
              <p className="text-gray-400">{/** i18n key from homepage footer */}Powered by FiT</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/features" className="hover:text-primary-500 transition-colors">Features</Link></li>
                <li><Link to="/#pricing" className="hover:text-primary-500 transition-colors">Pricing</Link></li>
                <li><Link to="/demo" className="hover:text-primary-500 transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link to="/help" className="hover:text-primary-500 transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-primary-500 transition-colors">Contact</Link></li>
                <li><Link to="/api" className="hover:text-primary-500 transition-colors">API Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="hover:text-primary-500 transition-colors">About</Link></li>
                <li><Link to="/privacy" className="hover:text-primary-500 transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-primary-500 transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p>&copy; {new Date().getFullYear()} FiT by Brendr.io. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AccountDeletion;
