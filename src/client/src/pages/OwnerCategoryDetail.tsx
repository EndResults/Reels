import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { ownerAPI } from '../services/api';
import OwnerNav from '../components/OwnerNav';

const OwnerCategoryDetail: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<{ key: string; status: string; settings: any; shops: any[]; hero?: string | null; promo?: any } | null>(null);
  const [saving, setSaving] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoNl, setPromoNl] = useState<{ header: string; body: string; video_url: string }>({ header: '', body: '', video_url: '' });
  const [promoEn, setPromoEn] = useState<{ header: string; body: string; video_url: string }>({ header: '', body: '', video_url: '' });
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsText, setSettingsText] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [heroBust, setHeroBust] = useState<number>(0);
  const [form, setForm] = useState<any | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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
        const res = await ownerAPI.getCategory(key || '');
        setData({
          key: res.data?.key,
          status: res.data?.status,
          settings: res.data?.settings || {},
          shops: res.data?.shops || [],
          hero: res.data?.hero || null,
          promo: res.data?.promo || null
        });
        try {
          const p = res.data?.promo || {};
          const nl = p?.nl || {};
          const en = p?.en || {};
          setPromoNl({ header: nl.header || '', body: nl.body || '', video_url: nl.video_url || '' });
          setPromoEn({ header: en.header || '', body: en.body || '', video_url: en.video_url || '' });
        } catch {}
        try {
          const s = res.data?.settings || {};
          const norm = normalizeSettingsForForm(s);
          setForm(norm);
        } catch {}
      } catch (e: any) {
        setError('Kon categorie details niet laden');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [key]);

  const hasShops = useMemo(() => (data?.shops || []).length > 0, [data]);
  const heroSrc = useMemo(() => {
    const url = data?.hero || '';
    if (!url) return '';
    const sep = url.indexOf('?') >= 0 ? '&' : '?';
    return heroBust ? `${url}${sep}v=${heroBust}` : url;
  }, [data?.hero, heroBust]);

  function normalizeSettingsForForm(s: any): any {
    const out: any = { ...(s || {}) };
    out.n8n = out.n8n || {};
    out.n8n.defaultPhotoOrder = Array.isArray(out.n8n.defaultPhotoOrder) ? out.n8n.defaultPhotoOrder.slice() : [];
    out.n8n.perStylePhotoOrder = out.n8n.perStylePhotoOrder && typeof out.n8n.perStylePhotoOrder === 'object' ? out.n8n.perStylePhotoOrder : {};
    out.photoSlots = Array.isArray(out.photoSlots) ? out.photoSlots.map((sl: any) => ({ id: String(sl?.id || ''), label: sl?.label || { nl: '', en: '' }, required: !!sl?.required })) : [];
    out.limits = out.limits || {};
    out.limits.maxItemsGuest = Number.isFinite(Number(out.limits.maxItemsGuest)) ? Number(out.limits.maxItemsGuest) : 0;
    out.limits.maxItemsRegistered = Number.isFinite(Number(out.limits.maxItemsRegistered)) ? Number(out.limits.maxItemsRegistered) : 3;
    out.limits.guestCanChooseStyle = !!out.limits.guestCanChooseStyle;
    out.styles = Array.isArray(out.styles) ? out.styles.map((st: any) => ({ id: String(st?.id || ''), key: st?.key || `style${String(st?.id || '')}`, label: st?.label || { nl: '', en: '' }, icon: st?.icon || '', color: st?.color || '', info: st?.info || { nl: '', en: '' } })) : [];
    out.infoBoxHeader = out.infoBoxHeader || { nl: '', en: '' };
    out.infoBoxBody = out.infoBoxBody || (out.infoBox ? out.infoBox : { nl: '', en: '' });
    out.tipBoxHeader = out.tipBoxHeader || { nl: '', en: '' };
    out.tipBoxBody = out.tipBoxBody || { nl: '', en: '' };
    return out;
  }

  function updateForm(mutator: (draft: any) => void) {
    setForm((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      mutator(next);
      return next;
    });
  }

  function availableSlotIds(): string[] {
    const ids = (form?.photoSlots || []).map((s: any) => String(s.id || ''));
    return ids.filter(Boolean);
  }

  function knownSlotIds(): string[] {
    return [
      'pasphoto_front',
      'pasphoto_side',
      'pasphoto_fullbody_front',
      'pasphoto_fullbody_side',
      'pasphoto_spouse',
      'pasphoto_member1',
      'pasphoto_member2',
      'pasphoto_member3',
      'pasphoto_member4',
      'pasphoto_room_1'
    ];
  }

  const ICON_OPTIONS: string[] = [
    'sparkles',
    'building-office',
    'briefcase',
    'cake',
    'camera',
    'shopping-bag',
    'film',
    'globe-asia-australia',
    'home',
    'photo',
    'sun',
    'moon',
    'user',
    'user-group',
    'users',
    'video-camera'
  ];

  function onReorder(idxFrom: number, idxTo: number) {
    if (!form) return;
    const list = (form.n8n?.defaultPhotoOrder || []).slice();
    if (idxFrom < 0 || idxFrom >= list.length || idxTo < 0 || idxTo >= list.length) return;
    const [moved] = list.splice(idxFrom, 1);
    list.splice(idxTo, 0, moved);
    updateForm(d => { d.n8n.defaultPhotoOrder = list; });
  }

  function nextStyleId(): string {
    const ids = (form?.styles || []).map((s: any) => parseInt(String(s.id || '0'), 10)).filter((n: number) => Number.isFinite(n));
    const max = ids.length ? Math.max(...ids) : 0;
    return String(max + 1);
  }

  async function onSaveForm() {
    if (!data?.key || !form) return;
    try {
      setFormSaving(true);
      const payload = JSON.parse(JSON.stringify(form));
      payload.infoBox = undefined;
      await ownerAPI.setCategorySettings(data.key, payload);
      setData(prev => prev ? { ...prev, settings: payload } : prev);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Kon instellingen niet opslaan');
    } finally {
      setFormSaving(false);
    }
  }

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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categorie: {data?.key || key}</h1>
              <p className="text-gray-600">Status: <span className={`inline-block ml-1 px-2 py-0.5 rounded text-xs font-medium ${data?.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>{data?.status}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Actief</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (!data?.key) return;
                    try {
                      setSaving(true);
                      const next = data.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                      await ownerAPI.setCategoryStatus(data.key, next as 'ACTIVE' | 'INACTIVE');
                      setData(prev => prev ? { ...prev, status: next } : prev);
                    } catch (e) {
                      setError('Kon status niet bijwerken');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${data?.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300'} ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  aria-label="Schakel categorie actief/inactief"
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${data?.status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <Link to="/owner/categories" className="text-sm text-gray-600 hover:text-gray-800">← Terug naar overzicht</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <section className="border rounded-lg">
              <div className="border-b px-4 py-3 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-800">Instellingen bewerken</h2>
              </div>
              <div className="p-4">
                {!form ? (
                  <div className="text-gray-500 text-sm">Laden…</div>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Pasfoto’s</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-xs text-gray-600 mb-2">Volgorde in wizard</div>
                          <ul className="space-y-2">
                            {(form.n8n?.defaultPhotoOrder || []).map((id: string, idx: number) => (
                              <li
                                key={id+idx}
                                draggable
                                onDragStart={() => setDragIndex(idx)}
                                onDragOver={(e)=>{e.preventDefault();}}
                                onDrop={(e)=>{e.preventDefault(); if (dragIndex!=null && dragIndex!==idx) onReorder(dragIndex, idx); setDragIndex(null);}}
                                className="flex items-center justify-between border rounded px-2 py-1 bg-white cursor-move"
                                title="Sleep om te herschikken"
                              >
                                <span className="text-sm font-medium">{id}</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" className="btn-secondary btn-xs" onClick={()=>onReorder(idx, Math.max(0, idx-1))}>↑</button>
                                  <button type="button" className="btn-secondary btn-xs" onClick={()=>onReorder(idx, Math.min((form.n8n.defaultPhotoOrder||[]).length-1, idx+1))}>↓</button>
                                  <button type="button" className="btn-secondary btn-xs" onClick={()=>{
                                    updateForm(d=>{ d.n8n.defaultPhotoOrder = (d.n8n.defaultPhotoOrder||[]).filter((x:string,_i:number)=>_i!==idx); });
                                  }}>Verwijder</button>
                                </div>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 flex gap-2">
                            <select
                              className="input"
                              onChange={(e)=>{
                                const v = e.target.value; if (!v) return; if ((form.n8n.defaultPhotoOrder||[]).includes(v)) return; if (!availableSlotIds().includes(v)) return;
                                updateForm(d=>{ d.n8n.defaultPhotoOrder = [...(d.n8n.defaultPhotoOrder||[]), v]; });
                                e.currentTarget.selectedIndex = 0;
                              }}
                            >
                              <option value="">+ Voeg slot toe</option>
                              {availableSlotIds().filter(id=>!(form.n8n.defaultPhotoOrder||[]).includes(id)).map(id=> (
                                <option key={id} value={id}>{id}</option>
                              ))}
                            </select>
                          </div>
                          <div className="pt-3">
                            <div className="flex items-center gap-2">
                              <select className="input" onChange={(e)=>{
                                const v = e.target.value;
                                if (!v) return;
                                updateForm(d=>{
                                  const exists = (d.photoSlots||[]).some((s:any)=> String(s.id)===String(v));
                                  if (!exists) {
                                    d.photoSlots = [...(d.photoSlots||[]), { id: v, label: { nl: '', en: '' }, required: false }];
                                  }
                                  if (!Array.isArray(d.n8n?.defaultPhotoOrder)) d.n8n.defaultPhotoOrder = [];
                                  if (!d.n8n.defaultPhotoOrder.includes(v)) d.n8n.defaultPhotoOrder.push(v);
                                });
                                e.currentTarget.selectedIndex = 0;
                              }}>
                                <option value="">+ Voeg pasfoto slot toe</option>
                                {knownSlotIds().filter(id=>!(form.photoSlots||[]).some((s:any)=> String(s.id)===String(id))).map(id=> (
                                  <option key={id} value={id}>{id}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-2">Slot instellingen</div>
                          <div className="space-y-3">
                            {(form.photoSlots || []).map((sl: any, i: number) => (
                              <div key={sl.id || i} className="border rounded p-3">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-sm">{sl.id}</div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <label className="inline-flex items-center gap-2">
                                      <input type="checkbox" checked={(form.photoSlots||[]).some((s:any)=>String(s.id)===String(sl.id))} onChange={(e)=>{
                                        const checked = e.target.checked;
                                        updateForm(d=>{
                                          const exists = (d.photoSlots||[]).some((s:any)=>String(s.id)===String(sl.id));
                                          if (checked && !exists) {
                                            d.photoSlots = [...(d.photoSlots||[]), { id: sl.id, label: sl.label||{nl:'',en:''}, required: !!sl.required }];
                                            if (!Array.isArray(d.n8n?.defaultPhotoOrder)) d.n8n.defaultPhotoOrder = [];
                                            if (!d.n8n.defaultPhotoOrder.includes(sl.id)) d.n8n.defaultPhotoOrder.push(sl.id);
                                          }
                                          if (!checked) {
                                            d.photoSlots = (d.photoSlots||[]).filter((s:any)=>String(s.id)!==String(sl.id));
                                            d.n8n.defaultPhotoOrder = (d.n8n.defaultPhotoOrder||[]).filter((id:string)=>id!==sl.id);
                                          }
                                        });
                                      }} />
                                      <span>Vragen in wizard</span>
                                    </label>
                                    <label className="inline-flex items-center gap-2">
                                      <input type="checkbox" checked={!!sl.required} onChange={(e)=>{
                                        const checked = e.target.checked;
                                        updateForm(d=>{ d.photoSlots = (d.photoSlots||[]).map((s:any)=> String(s.id)===String(sl.id) ? { ...s, required: checked } : s ); });
                                      }} />
                                      <span>Verplicht</span>
                                    </label>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Label (NL)</label>
                                    <input className="input w-full" maxLength={25} value={typeof sl.label==='object' ? (sl.label.nl||'') : (i===-1?'':'')}
                                      onChange={(e)=>{ const v=e.target.value; updateForm(d=>{ d.photoSlots[i].label = { ...(d.photoSlots[i].label||{}), nl: v }; }); }} />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Label (EN)</label>
                                    <input className="input w-full" maxLength={25} value={typeof sl.label==='object' ? (sl.label.en||'') : (i===-1?'':'')}
                                      onChange={(e)=>{ const v=e.target.value; updateForm(d=>{ d.photoSlots[i].label = { ...(d.photoSlots[i].label||{}), en: v }; }); }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Limieten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Max items (gast)</label>
                          <select className="input w-full" value={form.limits?.maxItemsGuest ?? 0} onChange={(e)=>updateForm(d=>{ d.limits.maxItemsGuest = parseInt(e.target.value,10); })}>
                            {[0,1,2,3,4,5,6].map(n=> <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Max items (ingelogd)</label>
                          <select className="input w-full" value={form.limits?.maxItemsRegistered ?? 3} onChange={(e)=>updateForm(d=>{ d.limits.maxItemsRegistered = parseInt(e.target.value,10); })}>
                            {[0,1,2,3,4,5,6].map(n=> <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!form.limits?.guestCanChooseStyle} onChange={(e)=>updateForm(d=>{ d.limits.guestCanChooseStyle = !!e.target.checked; })} />
                            <span>Gast mag stijl kiezen</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Stijlen</h3>
                      <div className="space-y-3">
                        {(form.styles || []).map((st: any, i: number) => (
                          <div key={st.id || i} className="border rounded p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-medium">#{st.id} • {st.key}</div>
                              <button type="button" className="btn-secondary btn-sm" onClick={()=>{
                                const ok = window.confirm('Weet je zeker dat je deze stijl wilt verwijderen?');
                                if (!ok) return;
                                updateForm(d=>{ d.styles = (d.styles||[]).filter((_,idx:number)=>idx!==i); });
                              }}>Verwijderen</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Label (NL)</label>
                                <input className="input w-full" maxLength={25} value={typeof st.label==='object' ? (st.label.nl||'') : ''}
                                  onChange={(e)=>{ const v=e.target.value; updateForm(d=>{ d.styles[i].label = { ...(d.styles[i].label||{}), nl: v }; }); }} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Label (EN)</label>
                                <input className="input w-full" maxLength={25} value={typeof st.label==='object' ? (st.label.en||'') : ''}
                                  onChange={(e)=>{ const v=e.target.value; updateForm(d=>{ d.styles[i].label = { ...(d.styles[i].label||{}), en: v }; }); }} />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Icon (optioneel)</label>
                                <select className="input w-full" value={st.icon || ''} onChange={(e)=>updateForm(d=>{ d.styles[i].icon = e.target.value; })}>
                                  <option value="">Geen</option>
                                  {ICON_OPTIONS.map(ic => (
                                    <option key={ic} value={ic}>{ic}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Kleur (optioneel)</label>
                                <input type="color" className="input w-16 h-10 p-1" value={st.color || '#ffffff'} onChange={(e)=>updateForm(d=>{ d.styles[i].color = e.target.value; })} />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">Style info (NL)</label>
                                <textarea className="textarea w-full" maxLength={250} value={st.info?.nl || ''} onChange={(e)=>updateForm(d=>{ d.styles[i].info = { ...(d.styles[i].info||{}), nl: e.target.value }; })} />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs text-gray-600 mb-1">Style info (EN)</label>
                                <textarea className="textarea w-full" maxLength={250} value={st.info?.en || ''} onChange={(e)=>updateForm(d=>{ d.styles[i].info = { ...(d.styles[i].info||{}), en: e.target.value }; })} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <button type="button" className="btn-secondary" onClick={()=>{
                          const id = nextStyleId();
                          updateForm(d=>{ d.styles = [...(d.styles||[]), { id, key: `style${id}`, label: { nl: '', en: '' }, icon: '', color: '', info: { nl: '', en: '' } }]; });
                        }}>Voeg stijl toe</button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Categorie-informatie</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Header (NL)</label>
                          <input className="input w-full" maxLength={50} value={form.infoBoxHeader?.nl || ''} onChange={(e)=>updateForm(d=>{ d.infoBoxHeader = { ...(d.infoBoxHeader||{}), nl: e.target.value }; })} />
                          <label className="block text-xs text-gray-600 mt-2 mb-1">Body (NL)</label>
                          <textarea className="textarea w-full" maxLength={250} value={typeof form.infoBoxBody==='object' ? (form.infoBoxBody.nl||'') : (typeof form.infoBoxBody==='string'?form.infoBoxBody:'')} onChange={(e)=>updateForm(d=>{ d.infoBoxBody = { ...(d.infoBoxBody||{}), nl: e.target.value }; })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Header (EN)</label>
                          <input className="input w-full" maxLength={50} value={form.infoBoxHeader?.en || ''} onChange={(e)=>updateForm(d=>{ d.infoBoxHeader = { ...(d.infoBoxHeader||{}), en: e.target.value }; })} />
                          <label className="block text-xs text-gray-600 mt-2 mb-1">Body (EN)</label>
                          <textarea className="textarea w-full" maxLength={250} value={typeof form.infoBoxBody==='object' ? (form.infoBoxBody.en||'') : (typeof form.infoBoxBody==='string'?form.infoBoxBody:'')} onChange={(e)=>updateForm(d=>{ d.infoBoxBody = { ...(d.infoBoxBody||{}), en: e.target.value }; })} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Tip voor beste resultaat</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Header (NL)</label>
                          <input className="input w-full" maxLength={50} value={form.tipBoxHeader?.nl || ''} onChange={(e)=>updateForm(d=>{ d.tipBoxHeader = { ...(d.tipBoxHeader||{}), nl: e.target.value }; })} />
                          <label className="block text-xs text-gray-600 mt-2 mb-1">Body (NL)</label>
                          <textarea className="textarea w-full" maxLength={250} value={form.tipBoxBody?.nl || ''} onChange={(e)=>updateForm(d=>{ d.tipBoxBody = { ...(d.tipBoxBody||{}), nl: e.target.value }; })} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Header (EN)</label>
                          <input className="input w-full" maxLength={50} value={form.tipBoxHeader?.en || ''} onChange={(e)=>updateForm(d=>{ d.tipBoxHeader = { ...(d.tipBoxHeader||{}), en: e.target.value }; })} />
                          <label className="block text-xs text-gray-600 mt-2 mb-1">Body (EN)</label>
                          <textarea className="textarea w-full" maxLength={250} value={form.tipBoxBody?.en || ''} onChange={(e)=>updateForm(d=>{ d.tipBoxBody = { ...(d.tipBoxBody||{}), en: e.target.value }; })} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button type="button" disabled={formSaving || !data?.key} onClick={onSaveForm} className={`btn-primary ${formSaving ? 'opacity-60 cursor-not-allowed' : ''}`}>{formSaving ? 'Opslaan…' : 'Instellingen opslaan'}</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
            <section className="border rounded-lg">
              <div className="border-b px-4 py-3 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-800">Category settings</h2>
              </div>
              <div className="p-4">
                {!editingSettings && (
                  <div className="flex justify-end mb-3">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setSettingsText(JSON.stringify(data?.settings || {}, null, 2));
                        setEditingSettings(true);
                      }}
                    >
                      Bewerken
                    </button>
                  </div>
                )}
                {editingSettings ? (
                  <div>
                    <textarea
                      value={settingsText}
                      onChange={(e) => setSettingsText(e.target.value)}
                      className="w-full textarea min-h-[320px] font-mono text-xs"
                      spellCheck={false}
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={settingsSaving || !data?.key}
                        onClick={async () => {
                          if (!data?.key) return;
                          try {
                            setSettingsSaving(true);
                            let parsed: any;
                            try {
                              parsed = JSON.parse(settingsText || '{}');
                            } catch (err: any) {
                              setError('JSON is ongeldig');
                              setSettingsSaving(false);
                              return;
                            }
                            await ownerAPI.setCategorySettings(data.key, parsed);
                            setData(prev => prev ? { ...prev, settings: parsed } : prev);
                            setEditingSettings(false);
                            setError('');
                          } catch (e: any) {
                            setError('Kon settings niet opslaan');
                          } finally {
                            setSettingsSaving(false);
                          }
                        }}
                        className={`btn-primary ${settingsSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {settingsSaving ? 'Opslaan...' : 'Opslaan'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => { setEditingSettings(false); setSettingsText(''); setError(''); }}
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {data?.settings ? (
                      <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96 border border-gray-100">
                        {JSON.stringify(data.settings, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-gray-500 text-sm">Geen settings gevonden.</div>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="border rounded-lg">
              <div className="border-b px-4 py-3 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-800">Shops in deze categorie</h2>
              </div>
              <div className="p-4">
                {!hasShops ? (
                  <div className="text-gray-500 text-sm">Geen shops ingesteld op deze categorie.</div>
                ) : (
                  <div className="overflow-auto rounded border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Naam</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">URL</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Domein</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actief</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {data?.shops?.map((s: any) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{s.name}</td>
                            <td className="px-3 py-2 text-sm text-primary-700"><a href={s.url || '#'} target="_blank" rel="noreferrer" className="hover:underline">{s.url || '-'}</a></td>
                            <td className="px-3 py-2 text-sm text-gray-700">{s.domain || '-'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${s.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                {s.is_active ? 'Actief' : 'Inactief'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <section className="border rounded-lg">
              <div className="border-b px-4 py-3 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-800">Categorie hero</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Upload nieuwe hero (PNG/JPG/WEBP, max 5MB)</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={heroUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !data?.key) return;
                        setHeroUploading(true);
                        try {
                          const resp = await ownerAPI.uploadCategoryHero(data.key, file);
                          if (resp?.data?.success && resp.data.url) {
                            setData(prev => prev ? { ...prev, hero: resp.data.url } : prev);
                            setHeroBust(Date.now());
                          } else {
                            setError(resp?.data?.message || 'Upload mislukt');
                          }
                        } catch (err: any) {
                          setError(err?.response?.data?.message || err?.message || 'Upload mislukt');
                        } finally {
                          setHeroUploading(false);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="block w-full text-sm text-gray-700"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">Gebruik een breedte-beeld dat mooi schaalt in de wizard.</div>
                  </div>
                  {data?.hero && (
                    <div className="pt-2">
                      <img src={heroSrc} alt="Categorie hero" className="w-full max-h-80 object-contain border rounded" />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-8 mt-8">
            <section className="border rounded-lg">
              <div className="border-b px-4 py-3 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-800">Promo modal</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-lg border bg-white shadow-sm">
                    <div className="px-4 py-2 bg-gray-50 border-b rounded-t-lg">
                      <h3 className="text-sm font-semibold text-gray-800">Nederlands (NL)</h3>
                    </div>
                    <div className="p-4">
                      <label className="block text-xs text-gray-600 mb-1">Header</label>
                      <input type="text" value={promoNl.header} onChange={e=>setPromoNl(v=>({ ...v, header: e.target.value }))} className="w-full input" placeholder="Bijv. Bekijk hoe FiT werkt" />
                      <label className="block text-xs text-gray-600 mt-3 mb-1">Body</label>
                      <textarea value={promoNl.body} onChange={e=>setPromoNl(v=>({ ...v, body: e.target.value }))} className="w-full textarea min-h-[100px]" placeholder="Korte toelichting voor NL" />
                      <label className="block text-xs text-gray-600 mt-3 mb-1">YouTube URL</label>
                      <input type="url" value={promoNl.video_url} onChange={e=>setPromoNl(v=>({ ...v, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." className="w-full input" />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white shadow-sm">
                    <div className="px-4 py-2 bg-gray-50 border-b rounded-t-lg">
                      <h3 className="text-sm font-semibold text-gray-800">English (EN)</h3>
                    </div>
                    <div className="p-4">
                      <label className="block text-xs text-gray-600 mb-1">Header</label>
                      <input type="text" value={promoEn.header} onChange={e=>setPromoEn(v=>({ ...v, header: e.target.value }))} className="w-full input" placeholder="e.g. See how FiT works" />
                      <label className="block text-xs text-gray-600 mt-3 mb-1">Body</label>
                      <textarea value={promoEn.body} onChange={e=>setPromoEn(v=>({ ...v, body: e.target.value }))} className="w-full textarea min-h-[100px]" placeholder="Short explanation for EN" />
                      <label className="block text-xs text-gray-600 mt-3 mb-1">YouTube URL</label>
                      <input type="url" value={promoEn.video_url} onChange={e=>setPromoEn(v=>({ ...v, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." className="w-full input" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={promoSaving || !data?.key}
                    onClick={async ()=>{
                      if (!data?.key) return;
                      try {
                        setPromoSaving(true);
                        await ownerAPI.setCategoryPromo(data.key, { nl: promoNl, en: promoEn });
                        setError('');
                      } catch (e: any) {
                        setError(e?.response?.data?.message || 'Kon promo niet opslaan');
                      } finally {
                        setPromoSaving(false);
                      }
                    }}
                    className={`btn-primary ${promoSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {promoSaving ? 'Opslaan...' : 'Promo opslaan'}
                  </button>
                  <span className="text-xs text-gray-500">Laat de YouTube URL leeg om de demoknop te verbergen per taal.</span>
                </div>
              </div>
            </section>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">{error}</div>
          )}
        </div>
      </div>
    </div>
  </>
  );
};

export default OwnerCategoryDetail;
