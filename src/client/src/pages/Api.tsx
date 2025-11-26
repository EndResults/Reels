import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Code, Copy, Check, Zap, Settings, Sparkles, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';

const Api: React.FC = () => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const exampleCode = t('api.steps.s1.codeExample');

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/20 mb-6">
              <Code className="h-10 w-10 text-primary-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('api.hero.title')}
            </h1>
            <p className="text-xl text-gray-300">
              {t('api.hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-20">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto">
            
            {/* Step 1 */}
            <div className="mb-16">
              <div className="flex items-start gap-6 mb-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary-500/30">
                  1
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-dark-900 mb-3">{t('api.steps.s1.title')}</h2>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {t('api.steps.s1.desc')}
                  </p>
                </div>
              </div>

              {/* Code Block */}
              <div className="bg-dark-900 rounded-2xl overflow-hidden shadow-xl border-2 border-gray-800">
                <div className="flex items-center justify-between px-6 py-4 bg-dark-800 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-primary-400" />
                    <span className="text-gray-300 font-semibold">{t('api.steps.s1.widgetCode')}</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-all text-sm font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{t('api.steps.s1.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>{t('api.steps.s1.copy')}</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-6">
                  <pre className="text-green-400 font-mono text-sm overflow-x-auto">
                    <code>{exampleCode}</code>
                  </pre>
                </div>
              </div>

              <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-blue-700">{t('api.steps.s1.tipLabel')}</span> {t('api.steps.s1.tipText')}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="mb-16">
              <div className="flex items-start gap-6 mb-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/30">
                  2
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-dark-900 mb-3">{t('api.steps.s2.title')}</h2>
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    {t('api.steps.s2.p1.before')} <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-primary-600">&lt;/body&gt;</code> {t('api.steps.s2.p1.after')}
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    {t('api.steps.s2.p2')}
                  </p>
                </div>
              </div>

              {/* Platform Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-dark-900 mb-2">{t('api.steps.s2.cards.shopify.title')}</h3>
                  <p className="text-sm text-gray-600">{t('api.steps.s2.cards.shopify.hint')}</p>
                </div>
                
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-dark-900 mb-2">{t('api.steps.s2.cards.woocommerce.title')}</h3>
                  <p className="text-sm text-gray-600">{t('api.steps.s2.cards.woocommerce.hint')}</p>
                </div>
                
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-3">
                    <Settings className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-dark-900 mb-2">{t('api.steps.s2.cards.magento.title')}</h3>
                  <p className="text-sm text-gray-600">{t('api.steps.s2.cards.magento.hint')}</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="mb-16">
              <div className="flex items-start gap-6 mb-6">
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-green-500/30">
                  3
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-dark-900 mb-3">{t('api.steps.s3.title')}</h2>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {t('api.steps.s3.desc')}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-900 mb-2">{t('api.steps.s3.cardTitle')}</h3>
                    <p className="text-green-800">{t('api.steps.s3.cardText')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Section */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 mb-16">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-7 w-7 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-dark-900 mb-3">{t('api.steps.optional.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {t('api.steps.optional.p1')}
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-700">{t('api.steps.optional.noteLabel')}</span> {t('api.steps.optional.noteText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Start CTA */}
            <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-10 text-white text-center shadow-2xl">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-6">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">{t('api.quickStart.title')}</h2>
              <p className="text-primary-50 text-lg mb-8 max-w-2xl mx-auto">
                {t('api.quickStart.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/features"
                  className="inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-xl transition-all shadow-lg"
                >
                  <span>{t('api.quickStart.primary')}</span>
                  <ExternalLink className="h-5 w-5" />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all backdrop-blur-sm border-2 border-white/30"
                >
                  <span>{t('api.quickStart.secondary')}</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">{t('api.support.title')}</h2>
            <p className="text-lg text-gray-600 mb-8">
              {t('api.support.subtitle')}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-primary-500/30"
            >
              <span>{t('api.support.contact')}</span>
              <ExternalLink className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
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

export default Api;