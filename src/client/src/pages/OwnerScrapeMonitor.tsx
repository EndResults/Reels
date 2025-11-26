import React, { useEffect, useMemo, useState } from 'react';
import OwnerNav from '../components/OwnerNav';
import api from '../services/api';
import { Search, Globe, Timer, Image, Brain, AlertCircle, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ExtractResult {
  title?: string;
  priceRaw?: string;
  price?: number;
  currency?: string;
  images: string[];
  source: 'jsonld' | 'meta' | 'dom' | 'ai';
  confidence: number;
  url: string;
  notes?: string[];
}

interface ScrapeLog {
  id: string;
  url: string;
  domain: string;
  source: string;
  confidence: number;
  load_time_ms: number;
  success: boolean;
  images_count: number;
  ai_used: boolean;
  status_code?: number | null;
  title?: string | null;
  price_found?: boolean | null;
  notes?: string[] | null;
  error_msg?: string | null;
  created_at: string;
}

const OwnerScrapeMonitor: React.FC = () => {
  const [testUrl, setTestUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<ExtractResult | null>(null);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [domainFilter, setDomainFilter] = useState('');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/owner/scrape-results', { params: { limit: 150, domain: domainFilter || undefined } });
      setLogs(res.data?.results || []);
    } catch (e) {
      console.error('Failed to load scrape results', e);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const onScrape = async () => {
    if (!/^https?:\/\//i.test(testUrl)) {
      alert('Voer een geldige product-URL in (http/https)');
      return;
    }
    setTesting(true);
    setLastResult(null);
    try {
      const res = await api.get('/scrape', { params: { url: testUrl }, timeout: 30000 });
      setLastResult(res.data as ExtractResult);
      // refresh logs
      fetchLogs();
    } catch (e) {
      console.error('Scrape failed', e);
      alert('Scrape mislukt');
    } finally {
      setTesting(false);
    }
  };

  // Aggregates for charts
  const sourceCounts = useMemo(() => {
    const m: Record<string, number> = { jsonld: 0, meta: 0, dom: 0, ai: 0 };
    for (const r of logs) {
      const key = (r.source || 'dom').toLowerCase();
      m[key] = (m[key] || 0) + 1;
    }
    return m;
  }, [logs]);

  const exportCsv = () => {
    const esc = (v: any) => {
      const s = (v == null ? '' : String(v));
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const header = ['Datum','Domein','Bron','Conf.','Imgs','AI?','Tijd (ms)','Notities'];
    const rows = logs.map(r => [
      new Date(r.created_at).toLocaleString(),
      r.domain,
      (r.source || '').toUpperCase(),
      `${Math.round((r.confidence || 0) * 100)}%`,
      r.images_count ?? 0,
      r.ai_used ? 'Ja' : 'Nee',
      r.load_time_ms ?? '',
      (r.notes || []).join(' | ')
    ]);
    const csv = [header, ...rows].map(row => row.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrape-results-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const domainStats = useMemo(() => {
    const agg: Record<string, { sum: number; n: number }> = {};
    for (const r of logs) {
      const d = r.domain || 'unknown';
      if (!agg[d]) agg[d] = { sum: 0, n: 0 };
      agg[d].sum += Number(r.confidence || 0);
      agg[d].n += 1;
    }
    const arr = Object.entries(agg).map(([domain, v]) => ({ domain, avg: v.n ? v.sum / v.n : 0, n: v.n }));
    arr.sort((a, b) => b.avg - a.avg);
    return arr.slice(0, 10);
  }, [logs]);

  return (
    <>
      <OwnerNav />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Adaptive Scraper Monitor</h1>
              <p className="text-gray-600">Test de scraper, bekijk recente resultaten en analyseer performance.</p>
            </div>
            <Link to="/owner/tools" className="text-blue-600 hover:underline">← Terug naar Tools</Link>
          </div>

          {/* Testbalk */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="testUrl" className="block text-sm font-medium text-gray-700">Product URL</label>
                <input id="testUrl" className="mt-1 w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500" placeholder="https://shop.nl/product/..." value={testUrl} onChange={e => setTestUrl(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button onClick={onScrape} disabled={testing} className="btn-primary inline-flex items-center">
                  <Search className="h-4 w-4 mr-1" /> {testing ? 'Bezig...' : 'Scrape nu'}
                </button>
              </div>
            </div>
          </div>

          {/* Laatste resultaat */}
          {lastResult && (
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Laatste resultaat</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500 mb-1">URL</div>
                  <div className="truncate text-blue-600"><a href={lastResult.url} target="_blank" rel="noreferrer">{lastResult.url}</a></div>
                  <div className="mt-3">
                    <div className="text-sm text-gray-500">Titel</div>
                    <div className="text-gray-900 font-medium">{lastResult.title || '—'}</div>
                  </div>
                  <div className="mt-3 flex gap-6 text-sm">
                    <div className="flex items-center text-gray-700"><Globe className="h-4 w-4 mr-1" /> Bron: <span className="ml-1 font-medium uppercase">{lastResult.source}</span></div>
                    <div className="flex items-center text-gray-700"><Timer className="h-4 w-4 mr-1" /> Confidence: <span className="ml-1 font-medium">{(lastResult.confidence * 100).toFixed(0)}%</span></div>
                    <div className="flex items-center text-gray-700"><Image className="h-4 w-4 mr-1" /> Afbeeldingen: <span className="ml-1 font-medium">{lastResult.images?.length || 0}</span></div>
                    {lastResult.source === 'ai' && <div className="flex items-center text-purple-700"><Brain className="h-4 w-4 mr-1" /> AI gebruikt</div>}
                  </div>
                  {(lastResult.notes && lastResult.notes.length) ? (
                    <div className="mt-3 text-sm text-gray-600">Notities: {lastResult.notes.join(', ')}</div>
                  ) : null}
                </div>
                <div>
                  <div className="grid grid-cols-3 gap-2">
                    {(lastResult.images || []).slice(0, 6).map((img, i) => (
                      <div key={i} className="aspect-square bg-gray-100 rounded overflow-hidden">
                        <img src={img} alt="thumb" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">Filter op domein</label>
                <input className="mt-1 w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500" placeholder="bijv. zalando.nl" value={domainFilter} onChange={e => setDomainFilter(e.target.value)} />
              </div>
              <button onClick={fetchLogs} className="btn-secondary">Toepassen</button>
            </div>
          </div>

          {/* Grafieken (CSS-based lightweight) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Verdeling per bron</h3>
              <div className="space-y-3">
                {['jsonld','meta','dom','ai'].map((k) => (
                  <div key={k} className="flex items-center gap-3">
                    <div className="w-20 text-sm uppercase text-gray-600">{k}</div>
                    <div className="flex-1 h-3 bg-gray-100 rounded">
                      <div className={`h-3 rounded ${k==='ai' ? 'bg-purple-500' : k==='dom' ? 'bg-blue-500' : k==='meta' ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (sourceCounts[k] || 0) / Math.max(1, logs.length) * 100)}%` }} />
                    </div>
                    <div className="w-10 text-right text-sm text-gray-700">{sourceCounts[k] || 0}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Gem. confidence per domein (top 10)</h3>
              <div className="space-y-2">
                {domainStats.map((d) => (
                  <div key={d.domain} className="flex items-center gap-3">
                    <div className="flex-1 truncate">
                      <div className="text-sm text-gray-700 truncate" title={d.domain}>{d.domain}</div>
                      <div className="h-2 bg-gray-100 rounded mt-1">
                        <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.min(100, d.avg * 100)}%` }} />
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm text-gray-700">{(d.avg * 100).toFixed(0)}%</div>
                  </div>
                ))}
                {!domainStats.length && <div className="text-sm text-gray-500 flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>Geen data</div>}
              </div>
            </div>
          </div>

          {/* Tabel */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Recente scrapes</h3>
              <div className="flex items-center gap-3">
                <button onClick={exportCsv} className="btn-secondary inline-flex items-center"><Download className="h-4 w-4 mr-1"/>Export CSV</button>
                <div className="text-sm text-gray-500">{loadingLogs ? 'Laden...' : `${logs.length} resultaten`}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-600">
                    <th className="px-3 py-2">Datum</th>
                    <th className="px-3 py-2">Domein</th>
                    <th className="px-3 py-2">Bron</th>
                    <th className="px-3 py-2">Conf.</th>
                    <th className="px-3 py-2">Imgs</th>
                    <th className="px-3 py-2">AI?</th>
                    <th className="px-3 py-2">Tijd (ms)</th>
                    <th className="px-3 py-2">Notities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {logs.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.domain}</td>
                      <td className="px-3 py-2 whitespace-nowrap uppercase">{r.source}</td>
                      <td className="px-3 py-2">{Math.round((r.confidence || 0) * 100)}%</td>
                      <td className="px-3 py-2">{r.images_count}</td>
                      <td className="px-3 py-2">{r.ai_used ? 'Ja' : 'Nee'}</td>
                      <td className="px-3 py-2">{r.load_time_ms}</td>
                      <td className="px-3 py-2 max-w-[320px] truncate">{(r.notes || []).join(', ')}</td>
                    </tr>
                  ))}
                  {!logs.length && !loadingLogs && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-gray-500">Geen resultaten</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OwnerScrapeMonitor;
