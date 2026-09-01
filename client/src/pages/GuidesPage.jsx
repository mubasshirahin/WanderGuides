import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, Star, Languages, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch } from '../lib/demoAuth.js';

const API = '/api/guides';

export function ComingSoon({ icon: Icon, title, message }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
      {Icon && <Icon className="mx-auto h-10 w-10 text-slate-500 mb-4" />}
      <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

export default function GuidesPage({ role }) {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [cities, setCities] = useState([]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cityFilter) params.set('city', cityFilter);
      const res = await fetch(`${API}?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to load');
      setGuides(data.guides);
      // collect unique cities
      const unique = [...new Set(data.guides.map(g => g.City).filter(Boolean))].sort();
      setCities(unique);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGuides(); }, [cityFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this guide?')) return;
    try {
      const res = await authFetch(`${API}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Delete failed');
      setGuides(g => g.filter(g => g.Id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = guides.filter(g =>
    (g.FullName + ' ' + g.City + ' ' + (g.Specialties || '')).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <PageHeader
          eyebrow={role === 'admin' ? 'Manage Guides' : 'Explore Guides'}
          title="Guide Directory"
          description={role === 'admin' ? 'Create, view, edit, and delete guide profiles.' : 'Browse available tourist guides and their details.'}
        />
        {role === 'admin' && (
          <Link to="/guides/new" className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow">
            <Plus className="h-4 w-4" />
            Add Guide
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, city, specialties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15"
          />
        </div>
        <select
          value={cityFilter}
          onChange={e => setCityFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none transition-all duration-300 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15 min-w-[180px]"
        >
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Loading / Error / Empty */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-center">
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <p className="text-slate-400">No guides found.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Guide</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Rate/Day</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Status</th>
                  {role === 'admin' && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(g => (
                  <tr key={g.Id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{g.FullName}</div>
                      <div className="text-xs text-slate-400">{g.Email}</div>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1.5 text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-brand-400" />
                      {g.City}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">$ {Number(g.RatePerDay).toFixed(2)}</td>
                    <td className="px-4 py-3 flex items-center gap-1 text-slate-300">
                      <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" />
                      {Number(g.Rating || 0).toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        g.IsActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-slate-400'
                      }`}>
                        {g.IsActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {role === 'admin' && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/guides/${g.Id}/edit`} className="p-2 rounded-lg text-slate-400 hover:bg-brand-500/15 hover:text-brand-400 transition-colors" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button onClick={() => handleDelete(g.Id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-500/15 hover:text-red-400 transition-colors" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
