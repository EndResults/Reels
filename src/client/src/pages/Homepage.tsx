import React, { useEffect } from 'react';

const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const VITE_SUPABASE_ASSETS_BASE = import.meta.env.VITE_SUPABASE_ASSETS_BASE as string | undefined;
const ASSETS_BASE = (VITE_SUPABASE_ASSETS_BASE || (VITE_SUPABASE_URL ? `${VITE_SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public` : '')).replace(/\/+$/,'');
import { Link, useLocation } from 'react-router-dom';
import { Users, Zap, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { Tooltip } from '../components/Tooltip';
import Pricing from '../components/Pricing';
import { useTranslation } from 'react-i18next';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': any;
    }
  }
}

const Homepage = () => {
  const { t } = useTranslation();
  // Scroll naar prijzen-sectie wanneer hash #pricing is
  const location = useLocation();
  useEffect(() => {
    if (location.hash === '#pricing') {
      const el = document.getElementById('pricing');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  // (Slideshow verwijderd in voordeel van statische afbeeldingen per sectie)

  // Ensure lottie web component is available
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
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-dark-900 text-white py-20">
        <div className="container-max section-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: content */}
            <div className="max-w-2xl mx-auto lg:mx-0">
              {/* Lottie boven de titel */}
              <div className="mb-6 flex justify-center lg:justify-start">
                <lottie-player
                  src={`${ASSETS_BASE}/logos/Loading%20Bubbles.json`}
                  background="transparent"
                  speed="1"
                  style={{ width: '130px', height: '130px' }}
                  loop
                  autoplay
                />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center lg:text-left">
                {t('homepage.hero.titleStart')} {' '}
                <span className="text-primary-500">{t('homepage.hero.titleEm')}</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto lg:mx-0 lg:text-left">
                {t('homepage.hero.subtitle')}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 text-left">
                <div>
                  <div className="text-4xl font-bold text-primary-500 mb-2">30%</div>
                  <div className="text-gray-300 flex items-center justify-start gap-2">
                    {t('homepage.stats.conversion')}
                    <Tooltip content={t('homepage.stats.conversionTooltip')} />
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary-500 mb-2">45%</div>
                  <div className="text-gray-300 flex items-center justify-start gap-2">
                    {t('homepage.stats.returns')}
                    <Tooltip content={t('homepage.stats.returnsTooltip')} />
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary-500 mb-2">100%</div>
                  <div className="text-gray-300 flex items-center justify-start gap-2">
                    {t('homepage.stats.fit')}
                    <Tooltip content={t('homepage.stats.fitTooltip')} />
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register" className="btn-primary text-lg px-8 py-4">
                  {t('homepage.hero.ctaPrimary')}
                </Link>
                <Link to="/features" className="btn-secondary text-lg px-8 py-4">
                  {t('homepage.hero.ctaSecondary')}
                </Link>
              </div>
            </div>

            {/* Right: beeld */}
            <div className="flex justify-center lg:justify-end">
              <img
                src={`${ASSETS_BASE}/Website_content/Ontwerp%20zonder%20titel.png`}
                alt={t('homepage.alt.hero')}
                className="w-full max-w-[520px] rounded-2xl shadow-2xl object-contain"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-max section-padding">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark-900 mb-4">
              {t('homepage.featuresSection.title')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('homepage.featuresSection.subtitle')}
            </p>
          </div>

          {/* Row 1: Makkelijk te integreren */}
          <div className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              {/* Beeld links */}
              <div>
                <img
                  src={`${ASSETS_BASE}/Website_content/Category_image_BIKES.png`}
                  alt={t('homepage.alt.integrationBike')}
                  className="w-full rounded-2xl shadow-xl object-cover"
                  loading="lazy"
                />
              </div>
              {/* Tekst rechts */}
              <div>
                <div className="flex items-start">
                  <div className="bg-primary-100 p-3 rounded-lg mr-4">
                    <Users className="h-8 w-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-dark-900">{t('homepage.integrate.title')}</h3>
                    <p className="text-gray-600">
                      {t('homepage.integrate.desc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: AI-powered (afbeelding rechts i.p.v. slideshow) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-start">
                <div className="bg-primary-100 p-3 rounded-lg mr-4">
                  <Zap className="h-8 w-8 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-dark-900">{t('homepage.ai.title')}</h3>
                  <p className="text-gray-600">
                    {t('homepage.ai.desc')}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <img
                src={`${ASSETS_BASE}/Website_content/Category_image_FURNITURE.png`}
                alt={t('homepage.alt.aiAdvice')}
                className="w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (shared component) */}
      <Pricing id="pricing" mode="auto" withHeader />

      {/* CTA Section */}
      <section className="bg-dark-900 text-white py-20">
        <div className="container-max section-padding text-center">
          <h2 className="text-4xl font-bold mb-4">
            {t('homepage.cta.title')}
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {t('homepage.cta.subtitle')}
          </p>
          <Link to="/register" className="btn-primary text-lg px-8 py-4">
            {t('homepage.cta.cta')}
          </Link>
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

export default Homepage;
