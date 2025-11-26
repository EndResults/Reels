import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Scale, Shield, CreditCard, Users, AlertCircle, Mail } from 'lucide-react';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';

const Terms: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/20 mb-6">
              <Scale className="h-10 w-10 text-primary-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('terms.hero.title')}
            </h1>
            <p className="text-xl text-gray-300">
              {t('terms.hero.updated')}
            </p>
          </div>
        </div>
      </section>

      <main className="container-max section-padding py-16">
        <div className="max-w-4xl mx-auto">
          
          <section className="space-y-8">
            
            {/* Definities */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-7 w-7 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('terms.sections.definitions.title')}</h2>
              </div>
              
              <p className="text-gray-700 mb-6">{t('terms.sections.definitions.lead')}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.definitions.items.fit.title')}</h3>
                  <p className="text-sm text-gray-700">{t('terms.sections.definitions.items.fit.text')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.definitions.items.platform.title')}</h3>
                  <p className="text-sm text-gray-700">{t('terms.sections.definitions.items.platform.text')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.definitions.items.provider.title')}</h3>
                  <p className="text-sm text-gray-700">{t('terms.sections.definitions.items.provider.text')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.definitions.items.user.title')}</h3>
                  <p className="text-sm text-gray-700">{t('terms.sections.definitions.items.user.text')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.definitions.items.retailer.title')}</h3>
                  <p className="text-sm text-gray-700">{t('terms.sections.definitions.items.retailer.text')}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.definitions.items.session.title')}</h3>
                  <p className="text-sm text-gray-700">{t('terms.sections.definitions.items.session.text')}</p>
                </div>
              </div>
            </div>

            {/* Diensten */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-7 w-7 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('terms.sections.services.title')}</h2>
              </div>
              
              <div className="space-y-6">
                <div className="border-l-4 border-purple-500 pl-6">
                  <h3 className="font-bold text-dark-900 mb-3">{t('terms.sections.services.consumer.title')}</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('terms.sections.services.consumer.b1')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('terms.sections.services.consumer.b2')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('terms.sections.services.consumer.b3')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('terms.sections.services.consumer.b4')}</span>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="font-bold text-dark-900 mb-3">{t('terms.sections.services.retailer.title')}</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>{t('terms.sections.services.retailer.b1')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>{t('terms.sections.services.retailer.b2')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>{t('terms.sections.services.retailer.b3')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-gray-700">{t('terms.sections.services.availability')}</p>
                </div>
              </div>
            </div>

            {/* Abonnementen*/}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('terms.sections.subscriptions.title')}</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-dark-900 mb-4">{t('terms.sections.subscriptions.types.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-5 border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-dark-900">{t('terms.sections.subscriptions.types.starter.name')}</h4>
                        <span className="text-2xl font-bold text-green-600"></span>
                      </div>
                      <p className="text-sm text-gray-600">{t('terms.sections.subscriptions.types.starter.sessions')}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-5 border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-dark-900">{t('terms.sections.subscriptions.types.professional.name')}</h4>
                        <span className="text-2xl font-bold text-green-600"></span>
                      </div>
                      <p className="text-sm text-gray-600">{t('terms.sections.subscriptions.types.professional.sessions')}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-5 border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-dark-900">{t('terms.sections.subscriptions.types.business.name')}</h4>
                        <span className="text-2xl font-bold text-green-600"></span>
                      </div>
                      <p className="text-sm text-gray-600">{t('terms.sections.subscriptions.types.business.sessions')}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-5 border-2 border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-dark-900">{t('terms.sections.subscriptions.types.enterprise.name')}</h4>
                        <span className="text-lg font-bold text-green-600">{t('terms.sections.subscriptions.types.enterprise.custom')}</span>
                      </div>
                      <p className="text-sm text-gray-600">{t('terms.sections.subscriptions.types.enterprise.sessions')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-3">{t('terms.sections.subscriptions.payment.title')}</h3>
                  <div className="space-y-2 text-gray-700">
                    <p>{t('terms.sections.subscriptions.payment.b1')}</p>
                    <p>{t('terms.sections.subscriptions.payment.b2')}</p>
                    <p>{t('terms.sections.subscriptions.payment.b3')}</p>
                    <p>{t('terms.sections.subscriptions.payment.b4')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Aansprakelijkheid */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-7 w-7 text-red-600" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('terms.sections.liability.title')}</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-dark-900 mb-3">{t('terms.sections.liability.limit.title')}</h3>
                  <p className="text-gray-700 mb-3">{t('terms.sections.liability.limit.lead')}</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                      <span>{t('terms.sections.liability.limit.b1')}</span>
                    </div>
                    <div className="flex items-start gap-3 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                      <span>{t('terms.sections.liability.limit.b2')}</span>
                    </div>
                    <div className="flex items-start gap-3 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                      <span>{t('terms.sections.liability.limit.b3')}</span>
                    </div>
                    <div className="flex items-start gap-3 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                      <span>{t('terms.sections.liability.limit.b4')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.liability.max.title')}</h3>
                      <p className="text-sm text-gray-700">{t('terms.sections.liability.max.text')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Intellectueel Eigendom */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-7 w-7 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('terms.sections.ip.title')}</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-indigo-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.ip.ownership.title')}</h3>
                  <p className="text-gray-700 text-sm">{t('terms.sections.ip.ownership.text')}</p>
                </div>

                <div className="bg-indigo-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.ip.license.title')}</h3>
                  <p className="text-gray-700 text-sm">{t('terms.sections.ip.license.text')}</p>
                </div>

                <div className="bg-indigo-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-2">{t('terms.sections.ip.ugc.title')}</h3>
                  <p className="text-gray-700 text-sm">{t('terms.sections.ip.ugc.text')}</p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-gradient-to-br from-dark-900 to-dark-800 text-white rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-7 w-7 text-primary-400" />
                </div>
                <h2 className="text-3xl font-bold">{t('terms.sections.contact.title')}</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">{t('terms.sections.contact.company.title')}</h3>
                    <p className="text-gray-300 text-sm">
                      {t('terms.sections.contact.company.name')}<br/>
                      KVK: {t('terms.sections.contact.company.kvk')}<br/>
                      BTW: {t('terms.sections.contact.company.vat')}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">{t('terms.sections.contact.address.title')}</h3>
                    <p className="text-gray-300 text-sm">
                      {t('terms.sections.contact.address.line1')}<br/>
                      {t('terms.sections.contact.address.line2')}<br/>
                      {t('terms.sections.contact.address.country')}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="font-semibold mb-3">{t('terms.sections.contact.contact.title')}</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-gray-400">{t('terms.sections.contact.contact.emailLabel')}</span>{' '}
                      <a href="mailto:info@brendr.io" className="text-primary-400 hover:text-primary-300">
                        info@brendr.io
                      </a>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-400">{t('terms.sections.contact.contact.websiteLabel')}</span>{' '}
                      <a href="https://fit.brendr.io" target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300">
                        fit.brendr.io
                      </a>
                    </p>
                  </div>
                </div>

                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 mt-6">
                  <p className="text-sm text-primary-100">{t('terms.sections.contact.cta')}</p>
                </div>
              </div>
            </div>

          </section>
        </div>
      </main>

      {/* Footer */}
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

export default Terms;