import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// allow lottie-player web component in TSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': any;
    }
  }
}

const About: React.FC = () => {
  const { t } = useTranslation();

  // Ensure lottie web component is available (only once)
  useEffect(() => {
    const existing = document.querySelector('script[data-lottie-player]');
    if (!existing) {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
      s.async = true;
      s.setAttribute('data-lottie-player', '');
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <lottie-player
                src="https://hruleghaabwolyrkzzoc.supabase.co/storage/v1/object/public/logos/Loading%20Bubbles.json"
                background="transparent"
                speed="1"
                style={{ width: '100%', maxWidth: '240px', height: '240px' }}
                loop
                autoplay
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">{t('about.hero.title')}</h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 -mt-10">
        <div className="container-max section-padding">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-100 p-8 md:p-12">
              <div className="prose prose-lg max-w-none text-gray-800">
                <p className="mb-5">{t('about.content.p1')}</p>
                <p className="mb-5">{t('about.content.p2')}</p>
                <p className="mb-8">{t('about.content.p3')}</p>

                <div className="flex items-center gap-3">
                  <span className="font-semibold text-dark-900">{t('about.content.learnMore')}</span>
                  <a
                    href="https://endresults.nl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('about.content.learnMoreLinkLabel')}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white">
        <div className="container-max section-padding">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">{t('about.cta.title')}</h2>
            <p className="text-xl text-primary-50 mb-8">{t('about.cta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-white text-primary-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-xl transition-all shadow-lg"
              >
                {t('about.cta.primary')}
              </Link>
              <Link
                to="/features"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all backdrop-blur-sm border-2 border-white/30"
              >
                {t('about.cta.secondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (same pattern) */}
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
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
