import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { ownerAPI } from '../services/api';
import OwnerNav from '../components/OwnerNav';
import { ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';

type PlanType = 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

const tabBtnBase = 'px-4 py-2 text-sm rounded-md border';
const tabActive = 'bg-blue-600 text-white border-blue-600';
const tabInactive = 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100';

const PAGE_LIMIT = 20;

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Tabs
  const [tab, setTab] = useState<'retailers' | 'consumers' | 'shops' | 'sessions'>('retailers');

  // Retailers state
  const [retailers, setRetailers] = useState<any[]>([]);
  const [retailersLoading, setRetailersLoading] = useState(false);
  const [retailersErr, setRetailersErr] = useState<string | null>(null);
  const [rPage, setRPage] = useState(1);
  const [rTotal, setRTotal] = useState(0);
  const [rSearch, setRSearch] = useState('');
  const [rEmail, setREmail] = useState('');
  const [rPlan, setRPlan] = useState<PlanType | ''>('');
  const [rRegFrom, setRRegFrom] = useState('');
  const [rRegTo, setRRegTo] = useState('');
  const [rLastFrom, setRLastFrom] = useState('');
  const [rLastTo, setRLastTo] = useState('');
  const [rSortBy, setRSortBy] = useState<'first_name'|'last_name'|'email'|'plan_type'|'created_at'|'last_login'|'sessions_total'|'shops_count'>('created_at');
  const [rSortDir, setRSortDir] = useState<'asc'|'desc'>('desc');

  // Retailer row actions state
  const [menuRetailerId, setMenuRetailerId] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planModalRetailer, setPlanModalRetailer] = useState<any | null>(null);
  const [planModalPlan, setPlanModalPlan] = useState<PlanType>('STARTER');
  const [planSaving, setPlanSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRetailer, setDeleteRetailer] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Consumers state
  const [consumers, setConsumers] = useState<any[]>([]);
  const [consumersLoading, setConsumersLoading] = useState(false);
  const [consumersErr, setConsumersErr] = useState<string | null>(null);
  const [cPage, setCPage] = useState(1);
  const [cTotal, setCTotal] = useState(0);
  const [cSearch, setCSearch] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cUserType, setCUserType] = useState<'USER' | 'ADMIN' | ''>('');
  const [cRegFrom, setCRegFrom] = useState('');
  const [cRegTo, setCRegTo] = useState('');
  const [cSortBy, setCSortBy] = useState<'first_name'|'last_name'|'email'|'user_type'|'created_at'|'total_sessions'|'completed_sessions'|'processing_sessions'|'satisfied_true_sessions'|'satisfied_false_sessions'>('created_at');
  const [cSortDir, setCSortDir] = useState<'asc'|'desc'>('desc');
  const [cHideGuests, setCHideGuests] = useState(false);

  // Shops state
  const [shops, setShops] = useState<any[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsErr, setShopsErr] = useState<string | null>(null);
  const [sPage, setSPage] = useState(1);
  const [sTotal, setSTotal] = useState(0);
  const [sSearch, setSSearch] = useState('');
  const [sCategory, setSCategory] = useState('');
  const [sRetailerEmail, setSRetailerEmail] = useState('');
  const [sSessionsMin, setSSessionsMin] = useState<string>('');
  const [sSessionsMax, setSSessionsMax] = useState<string>('');
  const [sRegFrom, setSRegFrom] = useState('');
  const [sRegTo, setSRegTo] = useState('');
  const [sSortBy, setSSortBy] = useState<'name'|'category'|'created_at'|'sessions_total'|'retailer_email'>('name');
  const [sSortDir, setSSortDir] = useState<'asc'|'desc'>('asc');

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsErr, setSessionsErr] = useState<string | null>(null);
  const [xPage, setXPage] = useState(1);
  const [xTotal, setXTotal] = useState(0);
  const [xSearch, setXSearch] = useState('');
  const [xGender, setXGender] = useState('');
  const [xUserType, setXUserType] = useState<'guest'|'logged'|''>('');
  const [xShopId, setXShopId] = useState('');
  const [xStatus, setXStatus] = useState('');
  const [xFrom, setXFrom] = useState('');
  const [xTo, setXTo] = useState('');
  const [xSatisfied, setXSatisfied] = useState<''|'true'|'false'>('');
  const [xSortBy, setXSortBy] = useState<'product_title'|'gender'|'user_type'|'shop_name'|'status'|'created_at'|'satisfied'>('created_at');
  const [xSortDir, setXSortDir] = useState<'asc'|'desc'>('desc');
  const [shopOptions, setShopOptions] = useState<{id: string; name: string}[]>([]);

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
        if (!res.ok) { setIsAdmin(false); setLoading(false); return; }
        const json = await res.json();
        const userType = json?.profile?.user_type || null;
        setIsAdmin(userType === 'ADMIN');
      } catch (e) {
        if (mounted) setIsAdmin(false);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // Loaders
  const loadRetailers = async (page = 1) => {
    try {
      setRetailersLoading(true); setRetailersErr(null);
      const resp = await ownerAPI.listRetailers({
        page, limit: PAGE_LIMIT, q: rSearch || undefined, email: rEmail || undefined, planType: (rPlan || undefined) as any,
        regFrom: rRegFrom || undefined, regTo: rRegTo || undefined, lastLoginFrom: rLastFrom || undefined, lastLoginTo: rLastTo || undefined,
        sortBy: rSortBy, sortDir: rSortDir
      });
      const data = resp.data?.data;
      setRetailers(Array.isArray(data?.items) ? data.items : []);
      setRPage(data?.pagination?.page || page);
      setRTotal(data?.pagination?.totalCount || 0);
    } catch (e: any) { setRetailersErr(e?.response?.data?.message || e?.message || 'Fout bij laden retailers'); }
    finally { setRetailersLoading(false); }
  };

  const loadShops = async (page = 1) => {
    try {
      setShopsLoading(true); setShopsErr(null);
      const resp = await ownerAPI.listShops({
        page, limit: PAGE_LIMIT, q: sSearch || undefined, category: sCategory || undefined, retailerEmail: sRetailerEmail || undefined,
        sessionsMin: sSessionsMin ? parseInt(sSessionsMin, 10) : undefined,
        sessionsMax: sSessionsMax ? parseInt(sSessionsMax, 10) : undefined,
        regFrom: sRegFrom || undefined, regTo: sRegTo || undefined,
        sortBy: sSortBy, sortDir: sSortDir
      });
      const data = resp.data?.data;
      setShops(Array.isArray(data?.items) ? data.items : []);
      setSPage(data?.pagination?.page || page);
      setSTotal(data?.pagination?.totalCount || 0);
    } catch (e: any) { setShopsErr(e?.response?.data?.message || e?.message || 'Fout bij laden webshops'); }
    finally { setShopsLoading(false); }
  };

  const loadSessions = async (page = 1) => {
    try {
      setSessionsLoading(true); setSessionsErr(null);
      const resp = await ownerAPI.listSessions({
        page, limit: PAGE_LIMIT, q: xSearch || undefined, gender: xGender || undefined, userType: xUserType || undefined,
        shopId: xShopId || undefined, status: (xStatus || undefined) as any, dateFrom: xFrom || undefined, dateTo: xTo || undefined,
        satisfied: xSatisfied || undefined, sortBy: xSortBy, sortDir: xSortDir
      });
      const data = resp.data?.data;
      setSessions(Array.isArray(data?.items) ? data.items : []);
      setXPage(data?.pagination?.page || page);
      setXTotal(data?.pagination?.totalCount || 0);
    } catch (e: any) { setSessionsErr(e?.response?.data?.message || e?.message || 'Fout bij laden sessies'); }
    finally { setSessionsLoading(false); }
  };

  const loadConsumers = async (page = 1) => {
    try {
      setConsumersLoading(true); setConsumersErr(null);
      const resp = await ownerAPI.listConsumers({
        page,
        limit: PAGE_LIMIT,
        q: cSearch || undefined,
        email: cEmail || undefined,
        userType: (cUserType || undefined) as any,
        regFrom: cRegFrom || undefined,
        regTo: cRegTo || undefined,
        sortBy: cSortBy,
        sortDir: cSortDir,
        hideGuests: cHideGuests
      });
      const data = resp.data?.data;
      setConsumers(Array.isArray(data?.items) ? data.items : []);
      setCPage(data?.pagination?.page || page);
      setCTotal(data?.pagination?.totalCount || 0);
    } catch (e: any) {
      setConsumersErr(e?.response?.data?.message || e?.message || 'Fout bij laden consumers');
    } finally {
      setConsumersLoading(false);
    }
  };

  // Load shops list for filter in Sessions tab
  useEffect(() => {
    const initShops = async () => {
      try {
        const resp = await ownerAPI.listShops({ page: 1, limit: 500, sortBy: 'name', sortDir: 'asc' });
        const items = resp.data?.data?.items || [];
        setShopOptions(items.map((i: any) => ({ id: i.id, name: i.name })));
      } catch {}
    };
    if (isAdmin) initShops();
  }, [isAdmin]);

  // Auto-load current tab
  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'retailers') loadRetailers(1);
    if (tab === 'consumers') loadConsumers(1);
    if (tab === 'shops') loadShops(1);
    if (tab === 'sessions') loadSessions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  const rCanPrev = useMemo(() => rPage > 1, [rPage]);
  const rTotalPages = useMemo(() => Math.max(1, Math.ceil(rTotal / PAGE_LIMIT)), [rTotal]);
  const rCanNext = useMemo(() => rPage < rTotalPages, [rPage, rTotalPages]);

  const cCanPrev = useMemo(() => cPage > 1, [cPage]);
  const cTotalPages = useMemo(() => Math.max(1, Math.ceil(cTotal / PAGE_LIMIT)), [cTotal]);
  const cCanNext = useMemo(() => cPage < cTotalPages, [cPage, cTotalPages]);

  const sCanPrev = useMemo(() => sPage > 1, [sPage]);
  const sTotalPages = useMemo(() => Math.max(1, Math.ceil(sTotal / PAGE_LIMIT)), [sTotal]);
  const sCanNext = useMemo(() => sPage < sTotalPages, [sPage, sTotalPages]);

  const xCanPrev = useMemo(() => xPage > 1, [xPage]);
  const xTotalPages = useMemo(() => Math.max(1, Math.ceil(xTotal / PAGE_LIMIT)), [xTotal]);
  const xCanNext = useMemo(() => xPage < xTotalPages, [xPage, xTotalPages]);

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
            <p className="text-gray-600 mb-6">Je hebt geen toegang tot het owner dashboard.</p>
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
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow p-6 sm:p-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
              <p className="text-gray-600">Beheer retailers, webshops en FiT sessies.</p>
            </div>

            {/* Tabs */}
            <div className="w-full flex items-center justify-center mb-6">
              <div className="flex items-center gap-2">
                <button className={`${tabBtnBase} ${tab === 'retailers' ? tabActive : tabInactive}`} onClick={() => setTab('retailers')}>Retailers</button>
                <button className={`${tabBtnBase} ${tab === 'consumers' ? tabActive : tabInactive}`} onClick={() => setTab('consumers')}>Consumers</button>
                <button className={`${tabBtnBase} ${tab === 'shops' ? tabActive : tabInactive}`} onClick={() => setTab('shops')}>Webshops</button>
                <button className={`${tabBtnBase} ${tab === 'sessions' ? tabActive : tabInactive}`} onClick={() => setTab('sessions')}>FiT sessies</button>
              </div>
            </div>

            {/* Retailers Tab */}
            {tab === 'retailers' && (
              <div>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <input value={rSearch} onChange={e => setRSearch(e.target.value)} type="text" placeholder="Zoeken (voornaam, achternaam, email)" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  <input value={rEmail} onChange={e => setREmail(e.target.value)} type="text" placeholder="Filter: email" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  <select value={rPlan} onChange={e => setRPlan(e.target.value as PlanType | '')} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Alle plannen</option>
                    <option value="STARTER">Starter</option>
                    <option value="BASIC">Basic</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Registratie:</label>
                    <input type="date" value={rRegFrom} onChange={e => setRRegFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <span className="text-gray-400">—</span>
                    <input type="date" value={rRegTo} onChange={e => setRRegTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Laatste login:</label>
                    <input type="date" value={rLastFrom} onChange={e => setRLastFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <span className="text-gray-400">—</span>
                    <input type="date" value={rLastTo} onChange={e => setRLastTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sorteer:</label>
                    <select value={rSortBy} onChange={e => setRSortBy(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="first_name">Voornaam</option>
                      <option value="last_name">Achternaam</option>
                      <option value="email">Email</option>
                      <option value="plan_type">Abonnement</option>
                      <option value="created_at">Registratie datum</option>
                      <option value="last_login">Laatste login</option>
                      <option value="sessions_total">Totaal sessies</option>
                      <option value="shops_count">Aantal webshops</option>
                    </select>
                    <select value={rSortDir} onChange={e => setRSortDir(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="asc">Oplopend</option>
                      <option value="desc">Aflopend</option>
                    </select>
                  </div>
                  <button onClick={() => loadRetailers(1)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Toepassen</button>
                  <button onClick={() => { setRSearch(''); setREmail(''); setRPlan(''); setRRegFrom(''); setRRegTo(''); setRLastFrom(''); setRLastTo(''); setRSortBy('created_at'); setRSortDir('desc'); loadRetailers(1); }} className="px-3 py-1.5 rounded border text-sm text-gray-700 bg-white hover:bg-gray-50">Reset</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Voornaam</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Achternaam</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Abonnement</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registratie</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Laatste login</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Totaal sessies</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Webshops</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acties</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {retailersLoading && (
                        <tr><td colSpan={9} className="px-4 py-4 text-sm text-gray-500">Laden...</td></tr>
                      )}
                      {retailersErr && (
                        <tr><td colSpan={9} className="px-4 py-4 text-sm text-red-600">{retailersErr}</td></tr>
                      )}
                      {!retailersLoading && !retailersErr && retailers.length === 0 && (
                        <tr><td colSpan={9} className="px-4 py-4 text-sm text-gray-500">Geen resultaten</td></tr>
                      )}
                      {!retailersLoading && !retailersErr && retailers.map((r) => (
                        <tr key={r.id} className="relative">
                          <td className="px-4 py-2 text-sm text-gray-900">{r.firstName || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{r.lastName || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{r.email}</td>
                          <td className="px-4 py-2 text-sm">{r.planType || 'STARTER'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{r.registeredAt ? new Date(r.registeredAt).toLocaleDateString('nl-NL') : '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString('nl-NL') : '-'}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{r.totalSessions ?? 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{r.shopsCount ?? 0}</td>
                          <td className="px-2 py-2 text-sm text-right">
                            <button
                              className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-50"
                              onClick={() => setMenuRetailerId(menuRetailerId === r.id ? null : r.id)}
                              aria-haspopup="menu"
                              aria-expanded={menuRetailerId === r.id}
                            >
                              ⋯
                            </button>
                            {menuRetailerId === r.id && (
                              <div className="absolute right-2 mt-2 z-10 w-44 bg-white border border-gray-200 rounded shadow">
                                <button
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                  onClick={() => {
                                    setMenuRetailerId(null);
                                    setPlanModalRetailer(r);
                                    setPlanModalPlan((r.planType || 'STARTER') as PlanType);
                                    setPlanModalOpen(true);
                                  }}
                                >
                                  Abonnement aanpassen
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  onClick={() => {
                                    setMenuRetailerId(null);
                                    setDeleteRetailer(r);
                                    setDeleteReason('');
                                    setDeleteModalOpen(true);
                                  }}
                                >
                                  Account opheffen
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-2 py-3 bg-gray-50 flex items-center justify-between mt-3 rounded">
                  <div className="text-xs text-gray-500">Pagina {rPage} van {rTotalPages} · {rTotal} resultaten</div>
                  <div className="space-x-2">
                    <button onClick={() => rCanPrev && loadRetailers(rPage - 1)} disabled={!rCanPrev} className={`px-3 py-1.5 rounded border text-sm ${rCanPrev ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Vorige</button>
                    <button onClick={() => rCanNext && loadRetailers(rPage + 1)} disabled={!rCanNext} className={`px-3 py-1.5 rounded border text-sm ${rCanNext ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Volgende</button>
                  </div>
                </div>
              </div>
            )}

            {/* Consumers Tab */}
            {tab === 'consumers' && (
              <div>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <input
                    value={cSearch}
                    onChange={e => setCSearch(e.target.value)}
                    type="text"
                    placeholder="Zoeken (voornaam, achternaam, email)"
                    className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                  <input
                    value={cEmail}
                    onChange={e => setCEmail(e.target.value)}
                    type="text"
                    placeholder="Filter: email"
                    className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                  <select
                    value={cUserType}
                    onChange={e => setCUserType(e.target.value as any)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="">Alle types</option>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Registratie:</label>
                    <input
                      type="date"
                      value={cRegFrom}
                      onChange={e => setCRegFrom(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <span className="text-gray-400">—</span>
                    <input
                      type="date"
                      value={cRegTo}
                      onChange={e => setCRegTo(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sorteer:</label>
                    <select
                      value={cSortBy}
                      onChange={e => setCSortBy(e.target.value as any)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="first_name">Voornaam</option>
                      <option value="last_name">Achternaam</option>
                      <option value="email">Email</option>
                      <option value="user_type">Gebruikerstype</option>
                      <option value="created_at">Registratie datum</option>
                      <option value="total_sessions">Totaal sessies</option>
                      <option value="completed_sessions">Voltooide sessies</option>
                      <option value="processing_sessions">Lopende sessies</option>
                      <option value="satisfied_true_sessions">Duimpje omhoog</option>
                      <option value="satisfied_false_sessions">Duimpje omlaag</option>
                    </select>
                    <select
                      value={cSortDir}
                      onChange={e => setCSortDir(e.target.value as any)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value="asc">Oplopend</option>
                      <option value="desc">Aflopend</option>
                    </select>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={cHideGuests}
                      onChange={e => setCHideGuests(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Gast sessies verbergen
                  </label>
                  <button
                    onClick={() => loadConsumers(1)}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                  >
                    Toepassen
                  </button>
                  <button
                    onClick={() => {
                      setCSearch('');
                      setCEmail('');
                      setCUserType('');
                      setCRegFrom('');
                      setCRegTo('');
                      setCHideGuests(false);
                      setCSortBy('created_at');
                      setCSortDir('desc');
                      loadConsumers(1);
                    }}
                    className="px-3 py-1.5 rounded border text-sm text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Voornaam</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Achternaam</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gebruikerstype</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registratie</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Totaal sessies</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Voltooid</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lopend</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Duimpje omhoog</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Duimpje omlaag</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {consumersLoading && (
                        <tr><td colSpan={10} className="px-4 py-4 text-sm text-gray-500">Laden...</td></tr>
                      )}
                      {consumersErr && (
                        <tr><td colSpan={10} className="px-4 py-4 text-sm text-red-600">{consumersErr}</td></tr>
                      )}
                      {!consumersLoading && !consumersErr && consumers.length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-4 text-sm text-gray-500">Geen resultaten</td></tr>
                      )}
                      {!consumersLoading && !consumersErr && consumers.map((u) => (
                        <tr key={u.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{u.firstName || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{u.lastName || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{u.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{u.userType || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('nl-NL') : '-'}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{u.totalSessions ?? 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{u.completedSessions ?? 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{u.processingSessions ?? 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{u.satisfiedTrueSessions ?? 0}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{u.satisfiedFalseSessions ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-2 py-3 bg-gray-50 flex items-center justify-between mt-3 rounded">
                  <div className="text-xs text-gray-500">Pagina {cPage} van {cTotalPages} · {cTotal} resultaten</div>
                  <div className="space-x-2">
                    <button
                      onClick={() => cCanPrev && loadConsumers(cPage - 1)}
                      disabled={!cCanPrev}
                      className={`px-3 py-1.5 rounded border text-sm ${cCanPrev ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      Vorige
                    </button>
                    <button
                      onClick={() => cCanNext && loadConsumers(cPage + 1)}
                      disabled={!cCanNext}
                      className={`px-3 py-1.5 rounded border text-sm ${cCanNext ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      Volgende
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Shops Tab */}
            {tab === 'shops' && (
              <div>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <input value={sSearch} onChange={e => setSSearch(e.target.value)} type="text" placeholder="Zoeken (winkelnaam)" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  <input value={sRetailerEmail} onChange={e => setSRetailerEmail(e.target.value)} type="text" placeholder="Filter: email retailer" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  <select value={sCategory} onChange={e => setSCategory(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Alle categorieën</option>
                    {['FASHION','BIKES','SHOES','MOTORS','GLASSES','JEWELRY','WATCHES','AUTOMOTIVE','FURNITURE','BAGS'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sessies:</label>
                    <input type="number" min={0} value={sSessionsMin} onChange={e => setSSessionsMin(e.target.value)} placeholder="min" className="w-24 border border-gray-300 rounded px-2 py-1 text-sm" />
                    <span className="text-gray-400">—</span>
                    <input type="number" min={0} value={sSessionsMax} onChange={e => setSSessionsMax(e.target.value)} placeholder="max" className="w-24 border border-gray-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Registratie:</label>
                    <input type="date" value={sRegFrom} onChange={e => setSRegFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <span className="text-gray-400">—</span>
                    <input type="date" value={sRegTo} onChange={e => setSRegTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sorteer:</label>
                    <select value={sSortBy} onChange={e => setSSortBy(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="name">Winkelnaam</option>
                      <option value="category">Categorie</option>
                      <option value="sessions_total">Totaal sessies</option>
                      <option value="created_at">Registratie datum</option>
                      <option value="retailer_email">Email retailer</option>
                    </select>
                    <select value={sSortDir} onChange={e => setSSortDir(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="asc">Oplopend</option>
                      <option value="desc">Aflopend</option>
                    </select>
                  </div>
                  <button onClick={() => loadShops(1)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Toepassen</button>
                  <button onClick={() => { setSSearch(''); setSRetailerEmail(''); setSCategory(''); setSSessionsMin(''); setSSessionsMax(''); setSRegFrom(''); setSRegTo(''); setSSortBy('name'); setSSortDir('asc'); loadShops(1); }} className="px-3 py-1.5 rounded border text-sm text-gray-700 bg-white hover:bg-gray-50">Reset</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Winkelnaam</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Totaal sessies</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Registratie</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email retailer</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shopsLoading && (
                        <tr><td colSpan={5} className="px-4 py-4 text-sm text-gray-500">Laden...</td></tr>
                      )}
                      {shopsErr && (
                        <tr><td colSpan={5} className="px-4 py-4 text-sm text-red-600">{shopsErr}</td></tr>
                      )}
                      {!shopsLoading && !shopsErr && shops.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-4 text-sm text-gray-500">Geen resultaten</td></tr>
                      )}
                      {!shopsLoading && !shopsErr && shops.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{s.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.category}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900">{s.totalSessions ?? 0}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('nl-NL') : '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.retailerEmail || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-2 py-3 bg-gray-50 flex items-center justify-between mt-3 rounded">
                  <div className="text-xs text-gray-500">Pagina {sPage} van {sTotalPages} · {sTotal} resultaten</div>
                  <div className="space-x-2">
                    <button onClick={() => sCanPrev && loadShops(sPage - 1)} disabled={!sCanPrev} className={`px-3 py-1.5 rounded border text-sm ${sCanPrev ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Vorige</button>
                    <button onClick={() => sCanNext && loadShops(sPage + 1)} disabled={!sCanNext} className={`px-3 py-1.5 rounded border text-sm ${sCanNext ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Volgende</button>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {tab === 'sessions' && (
              <div>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <input value={xSearch} onChange={e => setXSearch(e.target.value)} type="text" placeholder="Zoeken (product titel, webshop)" className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  <select value={xGender} onChange={e => setXGender(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Geslacht: alle</option>
                    <option value="MALE">Man</option>
                    <option value="FEMALE">Vrouw</option>
                    <option value="OTHER">Anders</option>
                  </select>
                  <select value={xUserType} onChange={e => setXUserType(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Gebruiker: alle</option>
                    <option value="guest">Gast</option>
                    <option value="logged">Ingelogd</option>
                  </select>
                  <select value={xShopId} onChange={e => setXShopId(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Alle webshops</option>
                    {shopOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <select value={xStatus} onChange={e => setXStatus(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Status: alle</option>
                    {['PENDING','PROCESSING','COMPLETED','FAILED'].map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Datum:</label>
                    <input type="date" value={xFrom} onChange={e => setXFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <span className="text-gray-400">—</span>
                    <input type="date" value={xTo} onChange={e => setXTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  </div>
                  <select value={xSatisfied} onChange={e => setXSatisfied(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">Feedback: alle</option>
                    <option value="true">Duimpje omhoog</option>
                    <option value="false">Duimpje omlaag</option>
                  </select>
                  <div className="inline-flex items-center gap-2">
                    <label className="text-sm text-gray-600">Sorteer:</label>
                    <select value={xSortBy} onChange={e => setXSortBy(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="product_title">Product titel</option>
                      <option value="gender">Geslacht</option>
                      <option value="user_type">Gebruikerstype</option>
                      <option value="shop_name">Webshopnaam</option>
                      <option value="status">Status</option>
                      <option value="created_at">Datum</option>
                      <option value="satisfied">Duimpje</option>
                    </select>
                    <select value={xSortDir} onChange={e => setXSortDir(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                      <option value="asc">Oplopend</option>
                      <option value="desc">Aflopend</option>
                    </select>
                  </div>
                  <button onClick={() => loadSessions(1)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Toepassen</button>
                  <button onClick={() => { setXSearch(''); setXGender(''); setXUserType(''); setXShopId(''); setXStatus(''); setXFrom(''); setXTo(''); setXSatisfied(''); setXSortBy('created_at'); setXSortDir('desc'); loadSessions(1); }} className="px-3 py-1.5 rounded border text-sm text-gray-700 bg-white hover:bg-gray-50">Reset</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Geslacht</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gebruiker</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Webshop</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Feedback</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opmerking</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessionsLoading && (
                        <tr><td colSpan={8} className="px-4 py-4 text-sm text-gray-500">Laden...</td></tr>
                      )}
                      {sessionsErr && (
                        <tr><td colSpan={8} className="px-4 py-4 text-sm text-red-600">{sessionsErr}</td></tr>
                      )}
                      {!sessionsLoading && !sessionsErr && sessions.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-4 text-sm text-gray-500">Geen resultaten</td></tr>
                      )}
                      {!sessionsLoading && !sessionsErr && sessions.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{s.productTitle || 'n/b'}</span>
                              {s.productUrl && (
                                <a href={s.productUrl} target="_blank" rel="noreferrer" title="bekijk artikel" className="text-blue-600 hover:text-blue-800"><ExternalLink className="h-4 w-4" /></a>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.gender || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.userType === 'GUEST' ? 'Gast' : 'Ingelogd'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.shop?.name || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.status}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{s.createdAt ? new Date(s.createdAt).toLocaleString('nl-NL') : '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 text-center">
                            {s.satisfied === true ? <ThumbsUp className="h-4 w-4 text-green-600 inline" /> : s.satisfied === false ? <ThumbsDown className="h-4 w-4 text-red-600 inline" /> : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 max-w-xs truncate" title={s.feedback || ''}>{s.feedback || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-2 py-3 bg-gray-50 flex items-center justify-between mt-3 rounded">
                  <div className="text-xs text-gray-500">Pagina {xPage} van {xTotalPages} · {xTotal} resultaten</div>
                  <div className="space-x-2">
                    <button onClick={() => xCanPrev && loadSessions(xPage - 1)} disabled={!xCanPrev} className={`px-3 py-1.5 rounded border text-sm ${xCanPrev ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Vorige</button>
                    <button onClick={() => xCanNext && loadSessions(xPage + 1)} disabled={!xCanNext} className={`px-3 py-1.5 rounded border text-sm ${xCanNext ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Volgende</button>
                  </div>
                </div>
              </div>
            )}

            {/* Plan edit modal */}
            {planModalOpen && planModalRetailer && (
              <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
                  <h3 className="text-lg font-semibold mb-3">Abonnement aanpassen</h3>
                  <div className="text-sm text-gray-700 mb-3">{planModalRetailer.email}</div>
                  <label className="block text-sm text-gray-600 mb-1">Plan</label>
                  <select
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={planModalPlan}
                    onChange={e => setPlanModalPlan(e.target.value as PlanType)}
                  >
                    <option value="STARTER">Starter</option>
                    <option value="BASIC">Basic</option>
                    <option value="PREMIUM">Premium</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">Wijzigt het actieve abonnement, synchroniseert profiel en credits.</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button className="px-3 py-1.5 rounded border text-sm" onClick={() => { if (!planSaving) { setPlanModalOpen(false); setPlanModalRetailer(null); } }}>Annuleren</button>
                    <button
                      className={`px-3 py-1.5 rounded text-sm ${planSaving ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                      disabled={planSaving}
                      onClick={async () => {
                        try {
                          setPlanSaving(true);
                          await ownerAPI.setRetailerPlan(planModalRetailer.id, planModalPlan);
                          setPlanModalOpen(false);
                          setPlanModalRetailer(null);
                          await loadRetailers(rPage);
                        } catch (e: any) {
                          alert(e?.response?.data?.message || e?.message || 'Kon plan niet opslaan');
                        } finally { setPlanSaving(false); }
                      }}
                    >
                      Opslaan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirm modal */}
            {deleteModalOpen && deleteRetailer && (
              <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-5">
                  <h3 className="text-lg font-semibold mb-3 text-red-700">Account opheffen</h3>
                  <div className="text-sm text-gray-700 mb-3">{deleteRetailer.email}</div>
                  <label className="block text-sm text-gray-600 mb-1">Reden (optioneel)</label>
                  <textarea className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={3} value={deleteReason} onChange={e => setDeleteReason(e.target.value)} />
                  <p className="text-xs text-gray-500 mt-2">Deze actie deactiveert retailer en webshops (soft delete) en zet eventuele lopende abonnementen op einde-periode annuleren.</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button className="px-3 py-1.5 rounded border text-sm" onClick={() => { if (!deleteSaving) { setDeleteModalOpen(false); setDeleteRetailer(null); } }}>Annuleren</button>
                    <button
                      className={`px-3 py-1.5 rounded text-sm ${deleteSaving ? 'bg-gray-300 text-gray-600' : 'bg-red-600 text-white hover:bg-red-700'}`}
                      disabled={deleteSaving}
                      onClick={async () => {
                        if (!window.confirm('Weet je zeker dat je dit account wilt opheffen?')) return;
                        try {
                          setDeleteSaving(true);
                          await ownerAPI.closeRetailer(deleteRetailer.id, deleteReason || undefined);
                          setDeleteModalOpen(false);
                          setDeleteRetailer(null);
                          await loadRetailers(rPage);
                        } catch (e: any) {
                          alert(e?.response?.data?.message || e?.message || 'Kon account niet opheffen');
                        } finally { setDeleteSaving(false); }
                      }}
                    >
                      Opheffen
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerDashboard;
