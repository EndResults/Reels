import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Mail } from 'lucide-react';

const N8N_UNSUBSCRIBE_URL = 'https://clintonend.app.n8n.cloud/webhook/unsubscribe';

const UnsubscribeConfirm: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const hasRequiredParams = Boolean(email && token);

  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    if (submitting) return;
    setSubmitting(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
        <div className="container-max section-padding">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/20 mb-6">
              <Mail className="h-10 w-10 text-primary-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t('unsubscribeConfirm.hero.title')}
            </h1>
            <p className="text-lg text-gray-300">
              {t('unsubscribeConfirm.hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <main className="container-max section-padding py-16">
        <div className="max-w-2xl mx-auto">
          {!hasRequiredParams && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex gap-4 items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-900 mb-1">
                  {t('unsubscribeConfirm.error.title')}
                </h2>
                <p className="text-sm text-red-800">
                  {t('unsubscribeConfirm.error.missingParams')}
                </p>
              </div>
            </div>
          )}

          {hasRequiredParams && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-dark-900 mb-4">
                {t('unsubscribeConfirm.body.heading')}
              </h2>
              <p className="text-gray-700 mb-4">
                {t('unsubscribeConfirm.body.intro')}
              </p>
              <p className="text-gray-700 mb-4">
                {t('unsubscribeConfirm.body.description')}
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t('unsubscribeConfirm.body.emailLabel')}</p>
                  <p className="font-mono text-sm text-dark-900 break-all">{email}</p>
                </div>
              </div>

              <form method="POST" action={N8N_UNSUBSCRIBE_URL} onSubmit={handleSubmit}>
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="token" value={token} />

                <button
                  type="submit"
                  className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting
                    ? t('unsubscribeConfirm.actions.submitting')
                    : t('unsubscribeConfirm.actions.confirm')}
                </button>

                {submitting && (
                  <p className="mt-3 text-sm text-gray-500 text-center">
                    {t('unsubscribeConfirm.actions.pleaseWait')}
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-dark-800 text-gray-300 py-12">
        <div className="container-max section-padding">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Logo className="h-8 w-auto" variant="dark" />
              </div>
              <p className="text-gray-400">{t('footer.tagline')}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2">
                <li><a href="/features" className="hover:text-primary-500 transition-colors">{t('footer.features')}</a></li>
                <li><a href="/#pricing" className="hover:text-primary-500 transition-colors">{t('footer.pricing')}</a></li>
                <li><a href="/demo" className="hover:text-primary-500 transition-colors">{t('footer.demo')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.support')}</h4>
              <ul className="space-y-2">
                <li><a href="/help" className="hover:text-primary-500 transition-colors">{t('footer.helpCenter')}</a></li>
                <li><a href="/contact" className="hover:text-primary-500 transition-colors">{t('footer.contact')}</a></li>
                <li><a href="/api" className="hover:text-primary-500 transition-colors">{t('footer.apiDocs')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2">
                <li><a href="/about" className="hover:text-primary-500 transition-colors">{t('footer.about')}</a></li>
                <li><a href="/privacy" className="hover:text-primary-500 transition-colors">{t('footer.privacy')}</a></li>
                <li><a href="/terms" className="hover:text-primary-500 transition-colors">{t('footer.terms')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UnsubscribeConfirm;
