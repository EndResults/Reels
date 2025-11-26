import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';

const AccountClosed: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const until = params.get('until');

  const lang = (i18n?.language || (typeof navigator !== 'undefined' ? navigator.language : 'nl')).slice(0,2).toLowerCase();
  const isNl = lang === 'nl';

  const title = isNl ? 'Account opgeheven' : 'Account closed';
  const subtitle = isNl
    ? 'Je account is succesvol opgeheven. Je webshops zijn gedeactiveerd.'
    : 'Your account has been successfully closed. Your shops have been deactivated.';
  const endNote = until
    ? (isNl
        ? `Je abonnement loopt door tot het einde van de huidige periode: ${new Date(until).toLocaleString('nl-NL')}.`
        : `Your subscription remains active until the end of the current billing period: ${new Date(until).toLocaleString('en-GB')}.`)
    : (isNl
        ? 'Eventuele resterende periode van je abonnement loopt af aan het einde van de huidige factureringsperiode.'
        : 'Any remaining subscription time will end at the end of the current billing period.');
  const extraUndo = until
    ? (isNl
        ? 'Je kan tot die tijd de opheffing ongedaan maken, daarna zal je account definitief verwijderd worden. Wil je de opheffing ongedaan maken, log dan opnieuw in.'
        : 'Until then you can undo the closure; after that your account will be permanently deleted. If you want to undo, please log in again.')
    : (isNl
        ? 'Wil je de opheffing ongedaan maken, log dan opnieuw in.'
        : 'If you want to undo the closure, please log in again.');
  const help = isNl
    ? 'Heb je vragen? Neem dan contact met ons op.'
    : 'Questions? Please contact us.';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="py-16 bg-gray-50">
          <div className="container-max section-padding max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-dark-900 mb-4">{title}</h1>
            <p className="text-gray-700 mb-3">{subtitle}</p>
            <p className="text-gray-700 mb-3">{endNote}</p>
            <p className="text-gray-700 mb-6">{extraUndo}</p>

            <div className="inline-flex gap-3">
              <Link to="/" className="btn-primary px-6 py-3">
                {isNl ? 'Terug naar home' : 'Back to home'}
              </Link>
              <Link to="/contact" className="btn-secondary px-6 py-3">
                {isNl ? 'Contact' : 'Contact'}
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-6">{help}</p>
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
              <p className="text-gray-400">{t('footer.tagline')}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2">
                <li><Link to="/features" className="hover:text-primary-500 transition-colors">{t('footer.features')}</Link></li>
                <li><Link to="/#pricing" className="hover:text-primary-500 transition-colors">{t('footer.pricing')}</Link></li>
                <li><Link to="/demo" className="hover:text-primary-500 transition-colors">{t('footer.demo')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.support')}</h4>
              <ul className="space-y-2">
                <li><Link to="/help" className="hover:text-primary-500 transition-colors">{t('footer.helpCenter')}</Link></li>
                <li><Link to="/contact" className="hover:text-primary-500 transition-colors">{t('footer.contact')}</Link></li>
                <li><Link to="/api" className="hover:text-primary-500 transition-colors">{t('footer.apiDocs')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="hover:text-primary-500 transition-colors">{t('footer.about')}</Link></li>
                <li><Link to="/privacy" className="hover:text-primary-500 transition-colors">{t('footer.privacy')}</Link></li>
                <li><Link to="/terms" className="hover:text-primary-500 transition-colors">{t('footer.terms')}</Link></li>
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

export default AccountClosed;
