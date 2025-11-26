import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, Settings, Shield, TrendingUp, CreditCard, Headphones, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';

const Help: React.FC = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const toggleAccordion = (idx: number) => {
    setOpenIndex((current) => (current === idx ? null : idx));
  };

  const rawCats = t('help.faq.categories', { returnObjects: true }) as any[];
  const icons = [HelpCircle, Settings, Shield, TrendingUp, CreditCard, Headphones, Sparkles];
  const colors = ['blue','purple','green','orange','pink','indigo','teal'];
  const faqCategories = (Array.isArray(rawCats) ? rawCats : []).map((c, idx) => ({
    title: c.title,
    icon: icons[idx] || HelpCircle,
    color: colors[idx] || 'blue',
    questions: c.questions || []
  }));

  // Flatten all questions for JSON-LD schema
  const allQuestions = faqCategories.flatMap(cat => cat.questions);

  // Add SEO meta tags on component mount
  useEffect(() => {
    document.title = t('help.seo.title');
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t('help.seo.description'));
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = t('help.seo.description');
      document.head.appendChild(meta);
    }

    // Add JSON-LD structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": allQuestions.slice(0, 10).map(q => ({
        "@type": "Question",
        "name": q.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": typeof q.a === 'string' ? q.a : q.q
        }
      }))
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    teal: 'bg-teal-100 text-teal-600'
  };

  const renderAnswer = (text: string) => {
    if (typeof text !== 'string') return text as any;
    const href = 'https://fit.brendr.io/#pricing';
    if (text.includes('onze tarievenpagina')) {
      const parts = text.split('onze tarievenpagina');
      return (
        <>
          {parts[0]}
          <a href={href} className="text-primary-600 underline hover:text-primary-700">onze tarievenpagina</a>
          {parts.slice(1).join('onze tarievenpagina')}
        </>
      );
    }
    if (text.includes('our pricing page')) {
      const parts = text.split('our pricing page');
      return (
        <>
          {parts[0]}
          <a href={href} className="text-primary-600 underline hover:text-primary-700">our pricing page</a>
          {parts.slice(1).join('our pricing page')}
        </>
      );
    }
    return text;
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Navbar />

        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
          <div className="container-max section-padding">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/20 mb-6">
                <HelpCircle className="h-10 w-10 text-primary-400" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                {t('help.hero.title')}
              </h1>
              <p className="text-xl text-gray-300">
                {t('help.hero.subtitle')}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-20 -mt-10">
          <div className="container-max section-padding">
            <div className="max-w-4xl mx-auto">
              {faqCategories.map((category, catIdx) => {
                const CategoryIcon = category.icon;
                const colorClass = colorClasses[category.color] || 'bg-gray-100 text-gray-600';
                
                return (
                  <div key={catIdx} className="mb-12">
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-14 h-14 rounded-xl ${colorClass} flex items-center justify-center`}>
                        <CategoryIcon className="h-7 w-7" />
                      </div>
                      <h2 className="text-3xl font-bold text-dark-900">{category.title}</h2>
                    </div>

                    {/* Questions Accordion */}
                    <div className="space-y-3">
                      {category.questions.map((item, qIdx) => {
                        const globalIdx = faqCategories
                          .slice(0, catIdx)
                          .reduce((sum, cat) => sum + cat.questions.length, 0) + qIdx;
                        const open = openIndex === globalIdx;

                        return (
                          <div
                            key={qIdx}
                            className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-primary-300 transition-all hover:shadow-md"
                          >
                            <button
                              type="button"
                              onClick={() => toggleAccordion(globalIdx)}
                              className="w-full flex items-center justify-between px-6 py-5 bg-gradient-to-r from-white to-gray-50 hover:from-primary-50 hover:to-white transition-all text-left"
                              aria-expanded={open}
                              aria-controls={`faq-panel-${globalIdx}`}
                            >
                              <span className="font-semibold text-dark-900 text-lg pr-4">
                                {item.q}
                              </span>
                              <ChevronDown
                                className={`h-6 w-6 text-primary-500 transition-transform duration-300 flex-shrink-0 ${
                                  open ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {open && (
                              <div
                                id={`faq-panel-${globalIdx}`}
                                className="px-6 py-5 bg-gray-50 border-t-2 border-gray-100"
                              >
                                <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                                  {renderAnswer(item.a)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white">
          <div className="container-max section-padding">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">
                {t('help.cta.title')}
              </h2>
              <p className="text-xl text-primary-50 mb-8">
                {t('help.cta.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/contact"
                  className="bg-white text-primary-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-xl transition-all shadow-lg"
                >
                  {t('help.cta.primary')}
                </Link>
                <Link
                  to="/features"
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all backdrop-blur-sm border-2 border-white/30"
                >
                  {t('help.cta.secondary')}
                </Link>
              </div>
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
                <p className="text-gray-400">
                  {t('footer.tagline')}
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">
                  {t('footer.product')}
                </h4>
                <ul className="space-y-2">
                  <li><Link to="/features" className="hover:text-primary-500 transition-colors">{t('footer.features')}</Link></li>
                  <li><Link to="/#pricing" className="hover:text-primary-500 transition-colors">{t('footer.pricing')}</Link></li>
                  <li><Link to="/demo" className="hover:text-primary-500 transition-colors">{t('footer.demo')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">
                  {t('footer.support')}
                </h4>
                <ul className="space-y-2">
                  <li><Link to="/help" className="hover:text-primary-500 transition-colors">{t('footer.helpCenter')}</Link></li>
                  <li><Link to="/contact" className="hover:text-primary-500 transition-colors">{t('footer.contact')}</Link></li>
                  <li><Link to="/api" className="hover:text-primary-500 transition-colors">{t('footer.apiDocs')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">
                  {t('footer.company')}
                </h4>
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
    </>
  );
};

export default Help;