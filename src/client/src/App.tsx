import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Homepage from './pages/Homepage';
import Features from './pages/Features';
import LoginRetailer from './pages/LoginRetailer';
import LoginConsumer from './pages/LoginConsumer';
import RegisterRetailer from './pages/RegisterRetailer';
import RegisterConsumer from './pages/RegisterConsumer';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Unsubscribe from './pages/Unsubscribe';
import UnsubscribeConfirm from './pages/UnsubscribeConfirm';
import VerifyRetailer from './pages/VerifyRetailer';
import VerifyConsumer from './pages/VerifyConsumer';
import ConsumerProfile from './pages/ConsumerProfile';
import CustomerPartners from './pages/CustomerPartners';
import ConsumerPhotos from './pages/ConsumerPhotos';
import NewFitSession from './pages/NewFitSession';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerSessions from './pages/CustomerSessions';
import CustomerSessionDetail from './pages/CustomerSessionDetail';
import Dashboard from './pages/Dashboard';
import RetailerSessions from './pages/RetailerSessions';
import RetailerSettings from './pages/RetailerSettings';
import Webshops from './pages/Webshops';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CookieWall from './components/CookieWall';
import Subscription from './pages/Subscription';
import SubscriptionPayments from './pages/SubscriptionPayments';
import SubscriptionCredits from './pages/SubscriptionCredits';
import Contact from './pages/Contact';
import Help from './pages/Help';
import Api from './pages/Api';
import Demo from './pages/Demo';
import About from './pages/About';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerCategories from './pages/OwnerCategories';
import LoginOwners from './pages/LoginOwners';
import OwnerCategoryDetail from './pages/OwnerCategoryDetail';
import OwnerTools from './pages/OwnerTools';
import OwnerScrapeMonitor from './pages/OwnerScrapeMonitor';
import OwnerFitSettings from './pages/OwnerFitSettings';
import OwnerSubscriptionSettings from './pages/OwnerSubscriptionSettings';
import './App.css';
import AccountClosed from './pages/AccountClosed';
import AccountDeletion from './pages/AccountDeletion';
import { useAnalytics } from './hooks/useAnalytics';
import ContactButtons from './components/ContactButtons';

function App() {
  // Scroll to top on route changes (ignore hash-only changes)
  const ScrollToTop: React.FC = () => {
    const location = useLocation();
    React.useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, [location.pathname]);
    return null;
  };
  const GAListener: React.FC = () => {
    const location = useLocation();
    const { initGA, trackPageView } = useAnalytics();
    React.useEffect(() => {
      initGA();
      // Sanitize query params for analytics: never log email/token
      let sanitizedSearch = '';
      if (location.search) {
        try {
          const params = new URLSearchParams(location.search);
          params.delete('email');
          params.delete('token');
          const cleaned = params.toString();
          sanitizedSearch = cleaned ? `?${cleaned}` : '';
        } catch {
          sanitizedSearch = '';
        }
      }
      trackPageView(location.pathname + sanitizedSearch);
    }, [location.pathname, location.search]);
    return null;
  };
  return (
    <Router>
      <div className="App">
        {/* Bottom-left global actions container (for portals) */}
        <div id="fit-bottom-actions" className="fixed bottom-6 left-6 z-50 flex items-center gap-2 sm:gap-3"></div>
        <ScrollToTop />
        <GAListener />
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/features" element={<Features />} />
          <Route path="/login" element={<LoginRetailer />} />
          <Route path="/login/retailer" element={<LoginRetailer />} />
          <Route path="/login/consumer" element={<LoginConsumer />} />
          {/* Default /register goes to retailer registration */}
          <Route path="/register" element={<RegisterRetailer />} />
          <Route path="/register/retailer" element={<RegisterRetailer />} />
          <Route path="/register/consumer" element={<RegisterConsumer />} />
          {/* Hidden PAYED registration route (no nav link) */}
          <Route path="/register/consumer/payed" element={<RegisterConsumer />} />
          
          {/* Customer Portal Routes */}
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/sessions" element={<CustomerSessions />} />
          <Route path="/customer/sessions/:sessionId" element={<CustomerSessionDetail />} />
          <Route path="/customer/profile" element={<ConsumerProfile />} />
          <Route path="/customer/photos" element={<ConsumerPhotos />} />
          <Route path="/customer/partners" element={<CustomerPartners />} />
          {/* Public alias for partners page */}
          <Route path="/partners" element={<CustomerPartners />} />
          
          {/* Legacy routes for backward compatibility */}
          <Route path="/profile" element={<ConsumerProfile />} />
          <Route path="/fit-session/new" element={<NewFitSession />} />
          {/* Retailer routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/retailer/sessions" element={<RetailerSessions />} />
          <Route path="/retailer/settings" element={<RetailerSettings />} />
          <Route path="/retailer/settings/promo" element={<RetailerSettings />} />
          <Route path="/retailer/abonnement" element={<Subscription />} />
          <Route path="/retailer/abonnement/payments" element={<SubscriptionPayments />} />
          <Route path="/retailer/abonnement/credits" element={<SubscriptionCredits />} />
          <Route path="/retailer/webshops" element={<Webshops />} />
          
          {/* Owner routes (hidden from nav) */}
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/categories" element={<OwnerCategories />} />
          <Route path="/owner/categories/:key" element={<OwnerCategoryDetail />} />
          <Route path="/owner/tools" element={<OwnerTools />} />
          <Route path="/owner/tools/scraping" element={<OwnerScrapeMonitor />} />
          <Route path="/owner/tools/fit-settings" element={<OwnerFitSettings />} />
          <Route path="/owner/tools/subscription-settings" element={<OwnerSubscriptionSettings />} />
          <Route path="/login/owners" element={<LoginOwners />} />
          
          {/* Auth routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Legal */}
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/unsubscribe/confirm" element={<UnsubscribeConfirm />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route path="/api" element={<Api />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/account_closed" element={<AccountClosed />} />
          <Route path="/account_deletion" element={<AccountDeletion />} />

          {/* Email verification landing pages */}
          <Route path="/verify/retailer" element={<VerifyRetailer />} />
          <Route path="/verify/consumer" element={<VerifyConsumer />} />
        </Routes>
        {/* Cookie wall is global */}
        <CookieWall />
        <ContactButtons />
      </div>
    </Router>
  );
}

export default App;
