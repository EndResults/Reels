import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Users, FileText, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import { useTranslation } from 'react-i18next';

const Privacy: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/20 mb-6">
              <Shield className="h-10 w-10 text-primary-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('privacy.hero.title')}
            </h1>
            <p className="text-xl text-gray-300">
              {t('privacy.hero.updated')}
            </p>
          </div>
        </div>
      </section>

      <main className="container-max section-padding py-16">
        <div className="max-w-4xl mx-auto">
          
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
            <p className="text-lg text-gray-700 leading-relaxed">{t('privacy.intro')}</p>
          </div>

          <section className="space-y-8">
            
            {/* Contactgegevens */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('privacy.sections.contact.title')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                <div className="flex gap-3">
                  <span className="font-semibold min-w-[140px]">{t('privacy.sections.contact.labels.businessName')}</span>
                  <span>{t('terms.sections.contact.company.name')}</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold min-w-[140px]">{t('privacy.sections.contact.labels.kvk')}</span>
                  <span>{t('terms.sections.contact.company.kvk')}</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold min-w-[140px]">{t('privacy.sections.contact.labels.vat')}</span>
                  <span>{t('terms.sections.contact.company.vat')}</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-semibold min-w-[140px]">{t('privacy.sections.contact.labels.country')}</span>
                  <span>{t('terms.sections.contact.address.country')}</span>
                </div>
                <div className="flex gap-3 md:col-span-2">
                  <span className="font-semibold min-w-[140px]">{t('privacy.sections.contact.labels.address')}</span>
                  <span>
                    {`${t('terms.sections.contact.address.line1')}, ${t('terms.sections.contact.address.line2')}, ${t('terms.sections.contact.address.country')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Gegevens die wij verzamelen */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Eye className="h-7 w-7 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('privacy.sections.collect.title')}</h2>
              </div>
              
              <div className="space-y-6">
                <div className="border-l-4 border-purple-500 pl-6">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.collect.personal.title')}</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('privacy.sections.collect.personal.items.name')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('privacy.sections.collect.personal.items.email')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('privacy.sections.collect.personal.items.birthdate')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>{t('privacy.sections.collect.personal.items.gender')}</span>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-6">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.collect.business.title')}</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>{t('privacy.sections.collect.business.items.company')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>{t('privacy.sections.collect.business.items.website')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>{t('privacy.sections.collect.business.items.type')}</span>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-6">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.collect.profile.title')}</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>{t('privacy.sections.collect.profile.items.photos')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>{t('privacy.sections.collect.profile.items.body')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>{t('privacy.sections.collect.profile.items.prefs')}</span>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-orange-500 pl-6">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.collect.technical.title')}</h3>
                  <div className="space-y-2 text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>{t('privacy.sections.collect.technical.items.ip')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>{t('privacy.sections.collect.technical.items.browser')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>{t('privacy.sections.collect.technical.items.device')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>{t('privacy.sections.collect.technical.items.cookies')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hoe we gegevens gebruiken */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-7 w-7 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('privacy.sections.use.title')}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.use.service.title')}</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>{t('privacy.sections.use.service.b1')}</p>
                    <p>{t('privacy.sections.use.service.b2')}</p>
                    <p>{t('privacy.sections.use.service.b3')}</p>
                    <p>{t('privacy.sections.use.service.b4')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.use.billing.title')}</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>{t('privacy.sections.use.billing.b1')}</p>
                    <p>{t('privacy.sections.use.billing.b2')}</p>
                    <p>{t('privacy.sections.use.billing.b3')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.use.communication.title')}</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>{t('privacy.sections.use.communication.b1')}</p>
                    <p>{t('privacy.sections.use.communication.b2')}</p>
                    <p>{t('privacy.sections.use.communication.b3')}</p>
                    <p>{t('privacy.sections.use.communication.b4')}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.use.improve.title')}</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>{t('privacy.sections.use.improve.b1')}</p>
                    <p>{t('privacy.sections.use.improve.b2')}</p>
                    <p>{t('privacy.sections.use.improve.b3')}</p>
                    <p>{t('privacy.sections.use.improve.b4')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Beveiliging */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-7 w-7 text-red-600" />
                </div>
                <h2 className="text-3xl font-bold text-dark-900">{t('privacy.sections.security.title')}</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.security.storage.title')}</h3>
                  <p className="text-gray-700">{t('privacy.sections.security.storage.text')}</p>
                </div>

                <div>
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.security.measures.title')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm">{t('privacy.sections.security.measures.b1')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm">{t('privacy.sections.security.measures.b2')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm">{t('privacy.sections.security.measures.b3')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm">{t('privacy.sections.security.measures.b4')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-dark-900 mb-3">{t('privacy.sections.security.retention.title')}</h3>
                  <div className="space-y-2">
                    <div className="flex gap-3 text-gray-700">
                      <span className="font-semibold min-w-[200px]">{t('privacy.sections.security.retention.account.label')}</span>
                      <span>{t('privacy.sections.security.retention.account.value')}</span>
                    </div>
                    <div className="flex gap-3 text-gray-700">
                      <span className="font-semibold min-w-[200px]">{t('privacy.sections.security.retention.sessions.label')}</span>
                      <span>{t('privacy.sections.security.retention.sessions.value')}</span>
                    </div>
                    <div className="flex gap-3 text-gray-700">
                      <span className="font-semibold min-w-[200px]">{t('privacy.sections.security.retention.transactions.label')}</span>
                      <span>{t('privacy.sections.security.retention.transactions.value')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Uw rechten */}
            <div id="data-deletion" className="bg-gradient-to-br from-primary-50 to-orange-50 border-2 border-primary-200 rounded-2xl p-8 scroll-mt-24">
              <h2 className="text-3xl font-bold text-dark-900 mb-6">{t('privacy.sections.rights.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('privacy.sections.rights.access.title')}</h3>
                  <p className="text-sm text-gray-700">{t('privacy.sections.rights.access.text')}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('privacy.sections.rights.rectification.title')}</h3>
                  <p className="text-sm text-gray-700">{t('privacy.sections.rights.rectification.text')}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('privacy.sections.rights.erasure.title')}</h3>
                  <p className="text-sm text-gray-700">{t('privacy.sections.rights.erasure.text')}</p>
                </div>
                <div className="bg-white rounded-xl p-4">
                  <h3 className="font-bold text-dark-900 mb-2">{t('privacy.sections.rights.portability.title')}</h3>
                  <p className="text-sm text-gray-700">{t('privacy.sections.rights.portability.text')}</p>
                </div>
              </div>

              {/* Data Deletion Policy */}
              <div className="bg-white rounded-2xl p-6 border-2 border-primary-300">
                <h3 className="text-2xl font-bold text-dark-900 mb-4">{t('privacy.sections.deletion.title')}</h3>
                <p className="text-gray-700 mb-6">{t('privacy.sections.deletion.intro')}</p>

                <div className="space-y-6">
                  {/* Hoe kun je je gegevens verwijderen */}
                  <div>
                    <h4 className="font-bold text-dark-900 mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold">1</span>
                      </div>
                      {t('privacy.sections.deletion.how.title')}
                    </h4>
                    <p className="text-gray-700 mb-3">{t('privacy.sections.deletion.how.lead')}</p>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex gap-3"><span className="text-gray-700">{t('privacy.sections.deletion.how.steps.s1')}</span></div>
                      <div className="flex gap-3"><span className="text-gray-700">{t('privacy.sections.deletion.how.steps.s2')}</span></div>
                      <div className="flex gap-3"><span className="text-gray-700">{t('privacy.sections.deletion.how.steps.s3')}</span></div>
                      <div className="flex gap-3"><span className="text-gray-700">{t('privacy.sections.deletion.how.steps.s4')}</span></div>
                      <div className="flex gap-3"><span className="text-gray-700">{t('privacy.sections.deletion.how.steps.s5')}</span></div>
                    </div>
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{t('privacy.sections.deletion.how.after')}</p>
                    </div>
                  </div>

                  {/* Wat er gebeurt bij verwijdering */}
                  <div>
                    <h4 className="font-bold text-dark-900 mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-bold">2</span>
                      </div>
                      {t('privacy.sections.deletion.what.title')}
                    </h4>
                    <p className="text-gray-700 mb-3">{t('privacy.sections.deletion.what.text')}</p>
                    <p className="font-semibold text-gray-900 mb-2">{t('privacy.sections.deletion.what.deletedTitle')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm">{t('privacy.sections.deletion.what.deleted.email')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm">{t('privacy.sections.deletion.what.deleted.password')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm">{t('privacy.sections.deletion.what.deleted.name')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm">{t('privacy.sections.deletion.what.deleted.photos')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm">{t('privacy.sections.deletion.what.deleted.device')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-sm">{t('privacy.sections.deletion.what.deleted.results')}</span>
                      </div>
                    </div>
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{t('privacy.sections.deletion.what.supabaseText')}</p>
                    </div>
                  </div>

                  {/* Onomkeerbaarheid */}
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      {t('privacy.sections.deletion.irreversible.title')}
                    </h4>
                    <p className="text-sm text-red-800">{t('privacy.sections.deletion.irreversible.text')}</p>
                  </div>

                  {/* Vragen of ondersteuning */}
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <h4 className="font-bold text-dark-900 mb-2">{t('privacy.sections.deletion.support.title')}</h4>
                    <p className="text-sm text-gray-700">
                      {t('privacy.sections.deletion.support.textPrefix')}{' '}
                      <a href="mailto:support@brendr.io" className="text-primary-600 hover:text-primary-700 font-semibold underline">
                        support@brendr.io
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact en klachten */}
            <div className="bg-gradient-to-br from-dark-900 to-dark-800 text-white rounded-2xl p-8">
              <h2 className="text-3xl font-bold mb-6">{t('privacy.sections.complaints.title')}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('privacy.sections.complaints.email.title')}</h3>
                    <a href="mailto:privacy@brendr.io" className="text-primary-400 hover:text-primary-300">
                      privacy@brendr.io
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('privacy.sections.complaints.phone.title')}</h3>
                    <a href="tel:+31852129806" className="text-primary-400 hover:text-primary-300">
                      +31 85 212 9806
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t('privacy.sections.complaints.address.title')}</h3>
                    <p className="text-gray-300 text-sm">
                      Jupiterlaan 33<br/>
                      3318JC Dordrecht
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h3 className="font-semibold mb-3">{t('privacy.sections.complaints.authorityTitle')}</h3>
                <p className="text-gray-300 mb-2">{t('privacy.sections.complaints.authorityLead')}</p>
                <p className="text-sm text-gray-400">
                  {t('privacy.sections.complaints.authority.website')} <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300">autoriteitpersoonsgegevens.nl</a><br/>
                  {t('privacy.sections.complaints.authority.phone')} (+31) - (0)70 - 888 85 00<br/>
                  {t('privacy.sections.complaints.authority.address')}
                </p>
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

export default Privacy;