import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerNav from '../components/OwnerNav';
import api, { ownerAPI } from '../services/api';

const OwnerFitSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [fitLoading, setFitLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [userDaily, setUserDaily] = useState('');
  const [guestDaily, setGuestDaily] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('fit_token');
        const base = String(api.defaults.baseURL || '').replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(base + '/consumer/profile', { credentials: 'include', headers });
        if (!mounted) return;
        if (!res.ok) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        const json = await res.json();
        const userType = json?.profile?.user_type || null;
        setIsAdmin(userType === 'ADMIN');
      } catch {
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
      setMsg(null); setErr(null);
      try {
        const resp = await ownerAPI.getFitSettings();
        const d = resp?.data?.data || {};
        const u = Number(d.userDailyMax ?? 50);
        const g = Number(d.guestDailyMax ?? 3);
        if (!mounted) return;
        setUserDaily(String(Math.max(0, Math.min(999, isFinite(u) ? u : 50))));
        setGuestDaily(String(Math.max(0, Math.min(999, isFinite(g) ? g : 3))));
      } catch (e: any) {
        if (mounted) setErr('Kon FiT instellingen niet laden');
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
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">FiT settings</h1>
            <p className="text-gray-600">Maximale dagelijkse sessies per gebruiker.</p>
          </div>

          <div className="bg-white shadow rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Ingelogde gebruikers</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  className="w-full border rounded-lg px-3 py-2"
                  value={userDaily}
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\D/g, '').slice(0,3);
                    setUserDaily(v);
                  }}
                  disabled={fitLoading || saving || applying}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Gasten</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  className="w-full border rounded-lg px-3 py-2"
                  value={guestDaily}
                  onChange={(e) => {
                    const v = (e.target.value || '').replace(/\D/g, '').slice(0,3);
                    setGuestDaily(v);
                  }}
                  disabled={fitLoading || saving || applying}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="btn-primary"
                disabled={fitLoading || saving || applying || !userDaily || !guestDaily}
                onClick={async () => {
                  setSaving(true); setMsg(null); setErr(null);
                  try {
                    const u = Math.max(0, Math.min(999, parseInt(userDaily || '0', 10) || 0));
                    const g = Math.max(0, Math.min(999, parseInt(guestDaily || '0', 10) || 0));
                    await ownerAPI.updateFitSettings({ userDailyMax: u, guestDailyMax: g });
                    setMsg('Instellingen opgeslagen');
                  } catch (e: any) {
                    setErr('Opslaan mislukt');
                  } finally {
                    setSaving(false);
                  }
                }}
              >Opslaan</button>
              <button
                className="btn-secondary"
                disabled={fitLoading || applying || saving}
                onClick={async () => {
                  setApplying(true); setMsg(null); setErr(null);
                  try {
                    const u = Math.max(0, Math.min(999, parseInt(userDaily || '0', 10) || 0));
                    const r = await ownerAPI.applyFitSettingsAllUsers(u);
                    const cnt = r?.data?.updated ?? 0;
                    const max = r?.data?.userDailyMax ?? u;
                    setMsg(`Toegepast op ${cnt} gebruikers (max ${max})`);
                  } catch (e: any) {
                    setErr('Toepassen mislukt');
                  } finally {
                    setApplying(false);
                  }
                }}
              >Toepassen op alle gebruikers</button>
            </div>

            <div className="mt-3 min-h-[1.25rem]">
              {fitLoading && <div className="text-gray-500 text-sm">Laden…</div>}
              {!fitLoading && msg && <div className="text-green-600 text-sm">{msg}</div>}
              {!fitLoading && err && <div className="text-red-600 text-sm">{err}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerFitSettings;
