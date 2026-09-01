import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, DollarSign, Loader2, User } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch } from '../lib/demoAuth.js';

const statusStyles = {
  pending: 'bg-amber-500/15 text-amber-400',
  confirmed: 'bg-sky-500/15 text-sky-400',
  completed: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-rose-500/15 text-rose-400',
};

export default function BookingsPage({ role }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch('/api/bookings');
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || 'Failed to load');
        setBookings(data.bookings);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const otherParty = (b) =>
    role === 'guide' ? b.TouristName : b.GuideName;

  return (
    <div>
      <PageHeader
        eyebrow="Your adventures"
        title="My Bookings"
        description="Keep track of your upcoming tours and past adventures."
      />

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

      {!loading && !error && bookings.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-slate-500" />
          <p className="text-slate-400">No bookings found.</p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/10">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Tour</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">{role === 'admin' ? 'Tourist → Guide' : role === 'guide' ? 'Tourist' : 'Guide'}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.map((b) => (
                  <tr key={b.Id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4 text-brand-400" />
                          Booking #{b.Id}
                        </span>
                      </div>
                      {b.Notes && <div className="text-xs text-slate-400 mt-0.5">{b.Notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(b.StartDate).toLocaleDateString()} — {new Date(b.EndDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {role === 'admin' ? (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-brand-400" />
                          {b.TouristName} → {b.GuideName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-brand-400" />
                          {otherParty(b)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[b.Status] || 'bg-white/10 text-slate-400'}`}>
                        {b.Status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      <span className="inline-flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                        {Number(b.TotalAmount).toFixed(2)}
                      </span>
                    </td>
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
