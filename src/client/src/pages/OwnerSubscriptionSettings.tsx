import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerNav from '../components/OwnerNav';
import api, { ownerSubscriptionAPI } from '../services/api';

type PlanKey = 'STARTER' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

interface PlanForm {
  included: string; // integer as string
  priceMonthlyEUR: string; // allow empty -> GRATIS
  priceYearlyEUR: string; // allow empty -> GRATIS
  shopsLimit: string; // integer as string, empty => ∞
  allowSubdomains: boolean;
}

const defaultForm = (included: number, m?: number | null, y?: number | null, shops?: number | null, allowSubs?: boolean): PlanForm => ({
  included: String(included),
  priceMonthlyEUR: m == null ? '' : String(m),
  priceYearlyEUR: y == null ? '' : String(y),
  shopsLimit: shops == null ? '' : String(shops),
  allowSubdomains: !!allowSubs
});

const OwnerSubscriptionSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [forms, setForms] = useState<Record<PlanKey, PlanForm>>({
    STARTER: defaultForm(50, 0, 0, 1, false),
    BASIC: defaultForm(500, 29.95, 25.0, 3, false),
    PREMIUM: defaultForm(2500, 99.0, 89.0, 12, false),
    ENTERPRISE: defaultForm(2500, null, null, null, false)
  });

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
      setBusy(true);
      setMsg(null); setErr(null);
      try {
        const r = await ownerSubscriptionAPI.getSubscriptionSettings();
        const d = r?.data?.data || {};
        if (!mounted) return;
        setForms({
          STARTER: defaultForm(
            Number(d.STARTER?.included ?? 50),
            d.STARTER?.priceMonthlyEUR ?? 0,
            d.STARTER?.priceYearlyEUR ?? 0,
            (d.STARTER?.shopsLimit == null ? null : Number(d.STARTER?.shopsLimit)),
            !!d.STARTER?.allowSubdomains
          ),
          BASIC: defaultForm(
            Number(d.BASIC?.included ?? 500),
            d.BASIC?.priceMonthlyEUR ?? 29.95,
            d.BASIC?.priceYearlyEUR ?? 25.0,
            (d.BASIC?.shopsLimit == null ? null : Number(d.BASIC?.shopsLimit)),
            !!d.BASIC?.allowSubdomains
          ),
          PREMIUM: defaultForm(
            Number(d.PREMIUM?.included ?? 2500),
            d.PREMIUM?.priceMonthlyEUR ?? 99.0,
            d.PREMIUM?.priceYearlyEUR ?? 89.0,
            (d.PREMIUM?.shopsLimit == null ? null : Number(d.PREMIUM?.shopsLimit)),
            !!d.PREMIUM?.allowSubdomains
          ),
          ENTERPRISE: defaultForm(
            Number(d.ENTERPRISE?.included ?? 2500),
            null,
            null,
            (d.ENTERPRISE?.shopsLimit == null ? null : Number(d.ENTERPRISE?.shopsLimit)),
            !!d.ENTERPRISE?.allowSubdomains
          )
        });
      } catch {
        setErr('Kon instellingen niet laden');
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  if (loading) {
    return (
      <>
        <OwnerNav />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Laden...</div></div>
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

  const onChange = (key: PlanKey, field: keyof PlanForm, raw: string | boolean) => {
    setForms(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: ((): any => {
          if (field === 'included' || field === 'shopsLimit') {
            const s = String(raw);
            return s.replace(/\D/g, '').slice(0, 6);
          }
          if (field === 'allowSubdomains') {
            return !!raw;
          }
          const s = String(raw);
          return s.replace(/,/g, '.').slice(0, 12);
        })()
      }
    }));
  };

  const save = async () => {
    setBusy(true); setMsg(null); setErr(null);
    try {
      const toNum = (v: string) => v.trim() === '' ? null : Number(v);
      await ownerSubscriptionAPI.updateSubscriptionSettings({
        STARTER: { included: Number(forms.STARTER.included || '0'), priceMonthlyEUR: toNum(forms.STARTER.priceMonthlyEUR), priceYearlyEUR: toNum(forms.STARTER.priceYearlyEUR), shopsLimit: toNum(forms.STARTER.shopsLimit), allowSubdomains: forms.STARTER.allowSubdomains },
        BASIC: { included: Number(forms.BASIC.included || '0'), priceMonthlyEUR: toNum(forms.BASIC.priceMonthlyEUR), priceYearlyEUR: toNum(forms.BASIC.priceYearlyEUR), shopsLimit: toNum(forms.BASIC.shopsLimit), allowSubdomains: forms.BASIC.allowSubdomains },
        PREMIUM: { included: Number(forms.PREMIUM.included || '0'), priceMonthlyEUR: toNum(forms.PREMIUM.priceMonthlyEUR), priceYearlyEUR: toNum(forms.PREMIUM.priceYearlyEUR), shopsLimit: toNum(forms.PREMIUM.shopsLimit), allowSubdomains: forms.PREMIUM.allowSubdomains },
        ENTERPRISE: { included: Number(forms.ENTERPRISE.included || '0'), priceMonthlyEUR: null, priceYearlyEUR: null, shopsLimit: toNum(forms.ENTERPRISE.shopsLimit), allowSubdomains: forms.ENTERPRISE.allowSubdomains }
      });
      setMsg('Instellingen opgeslagen');
    } catch {
      setErr('Opslaan mislukt');
    } finally {
      setBusy(false);
    }
  };

  const applyIncluded = async () => {
    setApplyBusy(true); setMsg(null); setErr(null);
    try {
      await ownerSubscriptionAPI.applyIncludedToActive();
      setMsg('Included sessies toegepast op actieve abonnementen');
    } catch {
      setErr('Toepassen mislukt');
    } finally {
      setApplyBusy(false);
    }
  };

  const Card: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
    <div className="bg-white shadow rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{desc}</p>
      {children}
    </div>
  );

  const priceField = (key: PlanKey, field: 'priceMonthlyEUR'|'priceYearlyEUR', placeholder: string, disabled?: boolean) => (
    <input
      type="text"
      inputMode="decimal"
      className="w-full border rounded-lg px-3 py-2"
      placeholder={placeholder}
      value={forms[key][field]}
      onChange={(e) => onChange(key, field, e.target.value)}
      disabled={busy || disabled}
    />
  );

  const intField = (key: PlanKey) => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className="w-full border rounded-lg px-3 py-2"
      value={forms[key].included}
      onChange={(e) => onChange(key, 'included', e.target.value)}
      disabled={busy}
    />
  );

  const shopsField = (key: PlanKey) => (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className="w-full border rounded-lg px-3 py-2"
      placeholder={key === 'ENTERPRISE' ? 'leeg = ∞' : ''}
      value={forms[key].shopsLimit}
      onChange={(e) => onChange(key, 'shopsLimit', e.target.value)}
      disabled={busy}
    />
  );

  const allowSubdomainsToggle = (key: PlanKey) => (
    <label className="flex items-center gap-2 select-none">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={!!forms[key].allowSubdomains}
        onChange={(e) => onChange(key, 'allowSubdomains', e.target.checked)}
        disabled={busy}
      />
      <span className="text-sm text-gray-700">Subdomeinen toestaan die overeenkomen met het toplevel domein</span>
    </label>
  );

  return (
    <>
      <OwnerNav />
      <div className="min-h-screen bg-gray-50 py-12 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Subscription settings</h1>
            <p className="text-gray-600">Beheer FiT sessies per maand en prijsweergave (alleen UI). Stripe blijft leidend voor betalingen.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Starter" desc="Aantal FiTs p/m, prijzen (leeg = GRATIS) en webshops/subdomeinen">
              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm text-gray-700">FiTs per maand</label>
                {intField('STARTER')}
                <label className="text-sm text-gray-700">Prijs per maand (EUR)</label>
                {priceField('STARTER','priceMonthlyEUR','0 of leeg = GRATIS')}
                <label className="text-sm text-gray-700">Prijs per maand bij jaarbetaling (EUR)</label>
                {priceField('STARTER','priceYearlyEUR','0 of leeg = GRATIS')}
                <label className="text-sm text-gray-700">Aantal webshops (leeg = ∞)</label>
                {shopsField('STARTER')}
                {allowSubdomainsToggle('STARTER')}
              </div>
            </Card>

            <Card title="Basic" desc="Aantal FiTs p/m, prijzen (EUR) en webshops/subdomeinen">
              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm text-gray-700">FiTs per maand</label>
                {intField('BASIC')}
                <label className="text-sm text-gray-700">Prijs per maand (EUR)</label>
                {priceField('BASIC','priceMonthlyEUR','bijv. 29.95')}
                <label className="text-sm text-gray-700">Prijs per maand bij jaarbetaling (EUR)</label>
                {priceField('BASIC','priceYearlyEUR','bijv. 25.00')}
                <label className="text-sm text-gray-700">Aantal webshops (leeg = ∞)</label>
                {shopsField('BASIC')}
                {allowSubdomainsToggle('BASIC')}
              </div>
            </Card>

            <Card title="Premium" desc="Aantal FiTs p/m, prijzen (EUR) en webshops/subdomeinen">
              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm text-gray-700">FiTs p/m</label>
                {intField('PREMIUM')}
                <label className="text-sm text-gray-700">Prijs per maand (EUR)</label>
                {priceField('PREMIUM','priceMonthlyEUR','bijv. 99.00')}
                <label className="text-sm text-gray-700">Prijs per maand bij jaarbetaling (EUR)</label>
                {priceField('PREMIUM','priceYearlyEUR','bijv. 89.00')}
                <label className="text-sm text-gray-700">Aantal webshops (leeg = ∞)</label>
                {shopsField('PREMIUM')}
                {allowSubdomainsToggle('PREMIUM')}
              </div>
            </Card>

            <Card title="Enterprise" desc="Prijs wordt niet getoond (contact CTA). FiTs p/m en webshops/subdomeinen.">
              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm text-gray-700">FiTs per maand</label>
                {intField('ENTERPRISE')}
                <label className="text-sm text-gray-700">Prijs per maand (EUR)</label>
                {priceField('ENTERPRISE','priceMonthlyEUR','n.v.t. (leeg)', true)}
                <label className="text-sm text-gray-700">Prijs p/m bij jaarbetaling (EUR)</label>
                {priceField('ENTERPRISE','priceYearlyEUR','n.v.t. (leeg)', true)}
                <label className="text-sm text-gray-700">Aantal webshops (leeg = ∞)</label>
                {shopsField('ENTERPRISE')}
                {allowSubdomainsToggle('ENTERPRISE')}
              </div>
            </Card>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={busy || applyBusy} onClick={save}>Opslaan</button>
            <button className="btn-secondary" disabled={busy || applyBusy} onClick={applyIncluded}>Toepassen op actieve abonnementen</button>
          </div>

          <div className="mt-3 min-h-[1.25rem]">
            {busy && <div className="text-gray-500 text-sm">Bezig…</div>}
            {!busy && msg && <div className="text-green-600 text-sm">{msg}</div>}
            {!busy && err && <div className="text-red-600 text-sm">{err}</div>}
          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerSubscriptionSettings;
