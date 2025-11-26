import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { ownerAPI } from '../services/api';
import OwnerNav from '../components/OwnerNav';

type CategoryRow = { key: string; shopsCount: number; status: string };

const OwnerCategories: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('fit_token');
        const base = String(api.defaults.baseURL || '').replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const prof = await fetch(base + '/consumer/profile', { credentials: 'include', headers });
        if (!mounted) return;
        if (!prof.ok) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        const j = await prof.json();
        const userType = j?.profile?.user_type;
        const isAdm = userType === 'ADMIN';
        setIsAdmin(isAdm);
        if (!isAdm) { setLoading(false); return; }
        const res = await ownerAPI.listCategories();
        const list: CategoryRow[] = (res.data?.categories || []).map((c: any) => ({ key: c.key, shopsCount: c.shopsCount, status: c.status }));
        setRows(list);
      } catch (e: any) {
        setError('Kon categorieën niet laden');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const hasData = useMemo(() => rows && rows.length > 0, [rows]);

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
            <p className="text-gray-600 mb-6">Je hebt geen toegang tot owner categorie-instellingen.</p>
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
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Categorieën</h1>
              <p className="text-gray-600">Overzicht met aantal shops, status en link naar details.</p>
            </div>

          {!hasData ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 text-center text-gray-500">
              <p>Geen categorieën gevonden.</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shops</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-900">{row.key}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.shopsCount}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${row.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/owner/categories/${encodeURIComponent(row.key)}`} className="text-primary-600 hover:text-primary-700 font-medium text-sm">Bekijk details →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

            {error && (
              <div className="mt-4 text-sm text-red-600">{error}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerCategories;
