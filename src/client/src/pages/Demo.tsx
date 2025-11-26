import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';

const Demo: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').toLowerCase();
  const current = lang.startsWith('nl') ? 'nl' : 'en';
  const videoId = current === 'nl' ? 'nWHG7ijs4EE' : 'BVeJcY988m8';
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="py-20 bg-dark-900 text-white">
        <div className="container-max section-padding text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">{t('demo.hero.title')}</h1>
          <p className="text-xl text-gray-300">{t('demo.hero.subtitle')}</p>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto">
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-black"
              style={{ paddingTop: '56.25%' }}
            >
              <iframe
                src={embedUrl}
                title={t('demo.hero.title')}
                className="absolute top-0 left-0 w-full h-full"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

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

export default Demo;
