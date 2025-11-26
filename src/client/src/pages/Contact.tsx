import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, MessageSquare, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';
import api from '../services/api';
import { useTranslation } from 'react-i18next';

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await api.post('/contact', { name, email, message });
      if (res.status < 200 || res.status >= 300 || res?.data?.success === false) {
        throw new Error(res?.data?.message || t('contact.form.fail'));
      }

      setSuccess(t('contact.form.success'));
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || t('contact.form.failGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-500/20 mb-6">
              <MessageSquare className="h-10 w-10 text-primary-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('contact.hero.title')}
            </h1>
            <p className="text-xl text-gray-300">
              {t('contact.hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 -mt-20">
        <div className="container-max section-padding">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                
                {/* Left Sidebar - Contact Info */}
                <div className="lg:col-span-2 bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white p-10 lg:p-12">
                  <h2 className="text-3xl font-bold mb-6 text-left">{t('contact.sidebar.title')}</h2>
                  <p className="text-primary-50 mb-12 leading-relaxed text-left">
                    {t('contact.sidebar.subtitle')}
                  </p>

                  <div className="space-y-10">
                    {/* Email */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold mb-2 text-left">{t('contact.sidebar.emailUs')}</h3>
                        <a 
                          href="mailto:fit@brendr.io" 
                          className="text-primary-50 hover:text-white transition-colors block text-left"
                        >
                          fit@brendr.io
                        </a>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold mb-2 text-left">{t('contact.sidebar.callUs')}</h3>
                        <a 
                          href="tel:+31852129806" 
                          className="text-primary-50 hover:text-white transition-colors block text-left"
                        >
                          +31 85 212 9806
                        </a>
                        <p className="text-sm text-primary-100 mt-2 text-left">{t('contact.sidebar.officeHours')}</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold mb-2 text-left">{t('contact.sidebar.visitUs')}</h3>
                        <p className="text-primary-50 text-left">
                          BrendR / EndResults<br />
                          Jupiterlaan 33<br />
                          3318 JC Dordrecht
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Decorative circles */}
                  <div className="mt-16 relative">
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-10 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                  </div>
                </div>

                {/* Right Side - Form */}
                <div className="lg:col-span-3 p-10 lg:p-12">
                  <h2 className="text-3xl font-bold text-dark-900 mb-2">{t('contact.form.title')}</h2>
                  <p className="text-gray-600 mb-8">
                    {t('contact.form.subtitle')}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Input */}
                    <div>
                      <label className="block text-sm font-semibold text-dark-900 mb-2">
                        {t('contact.form.nameLabel')}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder={t('contact.form.namePlaceholder')}
                      />
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="block text-sm font-semibold text-dark-900 mb-2">
                        {t('contact.form.emailLabel')}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder={t('contact.form.emailPlaceholder')}
                      />
                    </div>

                    {/* Message Input */}
                    <div>
                      <label className="block text-sm font-semibold text-dark-900 mb-2">
                        {t('contact.form.messageLabel')}
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={6}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                        placeholder={t('contact.form.messagePlaceholder')}
                      />
                    </div>

                    {/* Success Message */}
                    {success && (
                      <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-700 flex items-start gap-3">
                        <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{success}</span>
                      </div>
                    )}

                    {/* Error Message */}
                    {error && (
                      <div className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 flex items-start gap-3">
                        <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>{t('contact.form.sending')}</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          <span>{t('contact.form.send')}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ or Additional Info Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-dark-900 mb-4">{t('contact.faq.title')}</h2>
            <p className="text-lg text-gray-600 mb-12">
              {t('contact.faq.subtitle')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-dark-900 mb-2">{t('contact.faq.cards.quick.title')}</h3>
                <p className="text-sm text-gray-600">{t('contact.faq.cards.quick.text')}</p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-dark-900 mb-2">{t('contact.faq.cards.phone.title')}</h3>
                <p className="text-sm text-gray-600">{t('contact.faq.cards.phone.text')}</p>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="font-semibold text-dark-900 mb-2">{t('contact.faq.cards.email.title')}</h3>
                <p className="text-sm text-gray-600">{t('contact.faq.cards.email.text')}</p>
              </div>
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
            <p>&copy; {new Date().getFullYear()} FiT by Brendr.io. Alle rechten voorbehouden.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;