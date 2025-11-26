import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import OwnerNav from '../components/OwnerNav';
import api, { ownerAPI } from '../services/api';
import { Wrench } from 'lucide-react';

const OwnerTools: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [fitLoading, setFitLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('fit_token');
        const base = String(api.defaults.baseURL || '').replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(base + '/consumer/profile', {
          credentials: 'include',
          headers
        });
        if (!mounted) return;
        if (!res.ok) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        const json = await res.json();
        const userType = json?.profile?.user_type || null;
        setIsAdmin(userType === 'ADMIN');
      } catch (e) {
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isAdmin) return;
      setFitLoading(true);
      try {
        // noop: page now only shows tiles
      } finally {
        if (mounted) setFitLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  if (loading) {
    return (
      <>
        <OwnerNav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Laden...</div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <OwnerNav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">403 - Geen toegang</h1>
            <p className="text-gray-600 mb-6">Je hebt geen toegang tot de owner tools.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/" className="btn-secondary">Naar home</Link>
              <Link to="/login/owners" className="btn-primary">Owner login</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <OwnerNav />
      <div className="min-h-screen bg-gray-50 py-12 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Owner Tools</h1>
            <p className="text-gray-600">Beheertools en diagnostiek voor FiT.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-xl p-6 flex items-start gap-4">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Wrench className="h-6 w-6" /></div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Adaptive Scraper Monitor</h2>
                <p className="text-gray-600 text-sm">Test de scraper, bekijk recente resultaten, en analyseer bronnen & confidence.
                </p>
                <div className="mt-4">
                  <Link to="/owner/tools/scraping" className="btn-primary">Open Scrape Monitor</Link>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-xl p-6 flex items-start gap-4">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Wrench className="h-6 w-6" /></div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">FiT settings</h2>
                <p className="text-gray-600 text-sm">Maximale dagelijkse sessies per gebruiker.</p>
                <div className="mt-4">
                  <Link to="/owner/tools/fit-settings" className="btn-primary">Open FiT settings</Link>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-xl p-6 flex items-start gap-4">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Wrench className="h-6 w-6" /></div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Subscription settings</h2>
                <p className="text-gray-600 text-sm">Abonnement prijzen en FiTs per maand.</p>
                <div className="mt-4">
                  <Link to="/owner/tools/subscription-settings" className="btn-primary">Open subscription settings</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerTools;
