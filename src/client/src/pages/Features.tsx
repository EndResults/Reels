import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Check, Zap, TrendingUp, Shield, Users, BarChart3, Info, Shirt, Bike, Car, Gem, Footprints, Bike as Motorcycle, Glasses, Watch, Briefcase, Sofa } from 'lucide-react';
import Pricing from '../components/Pricing';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';
import { billingAPI } from '../services/api';

const Features: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useTranslation();
  const [plans, setPlans] = useState<{
    STARTER: { included: number };
    BASIC: { included: number };
    PREMIUM: { included: number };
    ENTERPRISE: { included: number };
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await billingAPI.publicPlansConfig();
        if (!mounted) return;
        const d = r?.data?.data;
        if (d) setPlans(d);
      } catch {
        if (mounted) setPlans(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fmt = (n: number) => (typeof n === 'number' ? n.toLocaleString('nl-NL') : '');
  const toggleAccordion = (idx: number) => {
    setOpenIndex((current) => (current === idx ? null : idx));
  };

  const getSpec = (cat: string, spec: string) => ({
    label: t(`features.categoriesAccordion.${cat}.specs.${spec}.label`),
    value: t(`features.categoriesAccordion.${cat}.specs.${spec}.value`),
  });

  const categories = [
    { key: 'FASHION', icon: Shirt, specs: ['itemsPerOutfit', 'studioStyle', 'realWorldStyle'] },
    { key: 'BIKES', icon: Bike, specs: ['itemsPerUse', 'studioStyle', 'realWorldStyle'] },
    { key: 'AUTOMOTIVE', icon: Car, specs: ['itemsPerUse', 'inCarStyle'] },
    { key: 'JEWELRY', icon: Gem, specs: ['itemsPerLook', 'studioStyle', 'lifestyleStyle'] },
    { key: 'SHOES', icon: Footprints, specs: ['itemsPerSession', 'studioStyle', 'realWorldStyle'] },
    { key: 'MOTORS', icon: Motorcycle, specs: ['itemsPerUse', 'studioStyle', 'outdoorRideStyle'] },
    { key: 'GLASSES', icon: Glasses, specs: ['itemsPerSession', 'studioStyle', 'lifestyleStyle'] },
    { key: 'WATCHES', icon: Watch, specs: ['itemsPerSession', 'studioStyle', 'lifestyleStyle'] },
    { key: 'BAGS', icon: Briefcase, specs: ['itemsPerUse', 'studioStyle', 'realWorldStyle'] },
    { key: 'FURNITURE', icon: Sofa, specs: ['itemsPerScene', 'studioStyle', 'inHomeStyle'] }
  ].map((c) => ({
    title: t(`features.categoriesAccordion.${c.key}.title`),
    icon: c.icon,
    description: t(`features.categoriesAccordion.${c.key}.description`),
    specs: c.specs.map((s) => getSpec(c.key, s))
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('features.hero.title')}
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              {t('features.hero.subtitle')}
            </p>
          </div>
        </div>
      </section>


      {/* Comparison Table */}
      <section className="py-20 bg-white">
        <div className="container-max section-padding">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <BarChart3 className="h-10 w-10 text-primary-500" />
                <h2 className="text-4xl font-bold text-dark-900">{t('features.compare.title')}</h2>
              </div>
              <p className="text-lg text-gray-600">{t('features.compare.subtitle')}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-dark-900 to-dark-800 text-white">
                      <th className="px-6 py-5 text-left font-semibold text-lg">{t('features.compare.table.feature')}</th>
                      <th className="px-6 py-5 text-center font-semibold">{t('features.compare.table.starter')}</th>
                      <th className="px-6 py-5 text-center font-semibold">{t('features.compare.table.basic')}</th>
                      <th className="px-6 py-5 text-center font-semibold bg-primary-500/20">{t('features.compare.table.premium')}</th>
                      <th className="px-6 py-5 text-center font-semibold">{t('features.compare.table.enterprise')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-dark-900">{t('features.compare.table.rows.fittingRoom')}</td>
                      <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                      <td className="px-6 py-4 text-center bg-primary-50"><Check className="h-5 w-5 text-primary-500 mx-auto" /></td>
                      <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-dark-900">{t('features.compare.table.rows.insights')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.sessionsCount')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.visitorInsights')}</td>
                      <td className="px-6 py-4 text-center bg-primary-50 text-sm text-gray-600">{t('features.compare.table.rows.detailed')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.customAnalytics')}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-dark-900">{t('features.compare.table.rows.shops')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">1</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">3</td>
                      <td className="px-6 py-4 text-center bg-primary-50 text-sm text-gray-600">12</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">∞</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-dark-900">{t('features.compare.table.rows.fitsPerMonth')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{fmt(plans?.STARTER?.included ?? 50)}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{fmt(plans?.BASIC?.included ?? 500)}</td>
                      <td className="px-6 py-4 text-center bg-primary-50 text-sm text-gray-600">{fmt(plans?.PREMIUM?.included ?? 2500)}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{fmt(plans?.ENTERPRISE?.included ?? 2500)}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-dark-900">{t('features.compare.table.rows.branding')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.brendr')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.brendr')}</td>
                      <td className="px-6 py-4 text-center bg-primary-50 text-sm text-gray-600">{t('features.compare.table.rows.toggleable')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.custom')}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-dark-900">{t('features.compare.table.rows.support')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.standard')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.basic')}</td>
                      <td className="px-6 py-4 text-center bg-primary-50 text-sm text-gray-600">{t('features.compare.table.rows.twentyfourSeven')}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600">{t('features.compare.table.rows.sla')}</td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-dark-900">{t('features.compare.table.rows.customIntegration')}</td>
                      <td className="px-6 py-4 text-center text-gray-400">{t('features.compare.table.rows.dash')}</td>
                      <td className="px-6 py-4 text-center text-gray-400">{t('features.compare.table.rows.dash')}</td>
                      <td className="px-6 py-4 text-center bg-primary-50 text-gray-400">{t('features.compare.table.rows.dash')}</td>
                      <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info Section - Nu met tabel voor Inzichten per pakket */}
      <section className="py-20 bg-gray-50">
        <div className="container-max section-padding">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Info className="h-10 w-10 text-primary-500" />
                <h2 className="text-4xl font-bold text-dark-900">{t('features.info.title')}</h2>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-10 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                <div>
                  <h3 className="font-semibold text-dark-900 mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary-500" />
                    {t('features.info.billing.title')}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {t('features.info.billing.text')}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-dark-900 mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary-500" />
                    {t('features.info.fitting.title')}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {t('features.info.fitting.text')}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-dark-900 mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary-500" />
                    {t('features.info.branding.title')}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {t('features.info.branding.text')}
                  </p>
                </div>
              </div>

              {/* Inzichten per pakket - nu in tabel met iconen */}
              <div>
                <h3 className="font-semibold text-dark-900 mb-4 flex items-center gap-2 text-xl">
                  <TrendingUp className="h-6 w-6 text-primary-500" />
                  {t('features.info.insightsPerPlan')}
                </h3>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-dark-900 to-dark-800 text-white">
                        <th className="px-6 py-4 text-left font-semibold">{t('features.info.table.headers.plan')}</th>
                        <th className="px-6 py-4 text-left font-semibold">{t('features.info.table.headers.available')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                              <BarChart3 className="h-5 w-5 text-green-600" />
                            </div>
                            <span className="font-semibold text-dark-900">{t('features.compare.table.starter')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{t('features.info.table.rows.starter')}</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-semibold text-dark-900">{t('features.compare.table.basic')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{t('features.info.table.rows.basic')}</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Zap className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="font-semibold text-dark-900">{t('features.compare.table.premium')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{t('features.info.table.rows.premium')}</td>
                      </tr>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                              <Shield className="h-5 w-5 text-orange-600" />
                            </div>
                            <span className="font-semibold text-dark-900">{t('features.compare.table.enterprise')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{t('features.info.table.rows.enterprise')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
	  
      {/* Pricing Component (shared) - dit blijft zoals het is */}
      <section className="-mt-20">
        <Pricing mode="auto" withHeader={false} />
      </section>	  

      {/* Categories Hero */}
      <section className="py-20 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {t('features.categoriesHero.title')}
            </h2>
            <p className="text-xl text-primary-50 mb-4">
              {t('features.categoriesHero.subtitle1')}
            </p>
            <p className="text-lg text-primary-100">
              {t('features.categoriesHero.subtitle2')}
            </p>
          </div>
        </div>
      </section>

      {/* Categories Accordion */}
      <section className="py-20 bg-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto space-y-4">
            {categories.map((item, idx) => {
              const open = openIndex === idx;
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-primary-300 transition-all hover:shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(idx)}
                    className="w-full flex items-center justify-between px-8 py-6 bg-gradient-to-r from-gray-50 to-white hover:from-primary-50 hover:to-white transition-all"
                    aria-expanded={open}
                    aria-controls={`acc-panel-${idx}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-primary-600" />
                      </div>
                      <span className="text-left font-bold text-dark-900 text-xl">{item.title}</span>
                    </div>
                    <ChevronDown
                      className={`h-6 w-6 text-primary-500 transition-transform duration-300 flex-shrink-0 ${
                        open ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {open && (
                    <div id={`acc-panel-${idx}`} className="px-8 py-6 bg-gray-50 border-t-2 border-gray-100">
                      <p className="text-gray-700 mb-6 text-lg text-left">{item.description}</p>
                      <div className="grid gap-4">
                        {item.specs.map((spec, i) => (
                          <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-left">
                              <span className="font-semibold text-primary-600 sm:min-w-[160px]">{spec.label}</span>
                              <span className="text-gray-700">{spec.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-dark-900 to-dark-800 text-white">
        <div className="container-max section-padding">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">{t('features.cta.title')}</h2>
            <p className="text-xl text-gray-300 mb-8">
              {t('features.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-primary-500/30">
                {t('features.cta.primary')}
              </Link>
              <Link to="/contact" className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all backdrop-blur-sm">
                {t('features.cta.secondary')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - exact zoals homepage */}
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

export default Features;