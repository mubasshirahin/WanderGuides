import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, ShieldCheck, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch } from '../lib/demoAuth.js';

export default function GuideVerificationPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/guide-verifications?status=pending');
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Could not load verification requests');
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (request, status) => {
    const adminNote = String(notes[request.Id] || '').trim();
    if (status === 'rejected' && !adminNote) {
      setError('Add a short note before rejecting a request.');
      return;
    }
    setBusyId(request.Id); setError('');
    try {
      const res = await authFetch(`/api/guide-verifications/${request.Id}/review`, {
        method: 'PUT', body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || 'Could not update request');
      setRequests((current) => current.filter((item) => item.Id !== request.Id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Guide verification" title="Identity review requests" description="Review guide applications and publish verified status after a manual identity check." />
      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-brand-400" /></div> : requests.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center text-slate-400">There are no pending identity reviews.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">{requests.map((request) => (
          <article key={request.Id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><h2 className="font-bold text-white">{request.GuideName}</h2><p className="text-sm text-slate-400">{request.GuideEmail} · {request.City || 'City not set'}</p></div>
              <ShieldCheck className="h-5 w-5 shrink-0 text-amber-300" />
            </div>
            <p className="mb-2 text-xs text-slate-500">Requested {new Date(request.RequestedAt).toLocaleString()}</p>
            <p className="mb-4 whitespace-pre-wrap rounded-xl bg-white/[0.03] p-3 text-sm text-slate-300">{request.RequestNote}</p>
            <label className="mb-1 block text-xs text-slate-400">Review note {notes[request.Id] ? '(required when rejecting)' : ''}</label>
            <textarea value={notes[request.Id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [request.Id]: event.target.value }))} maxLength={1000} rows={2}
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-brand-400" />
            <div className="flex justify-end gap-2">
              <button onClick={() => review(request, 'rejected')} disabled={busyId === request.Id} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-sm text-rose-300 disabled:opacity-50"><X className="h-4 w-4" />Reject</button>
              <button onClick={() => review(request, 'approved')} disabled={busyId === request.Id} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />{busyId === request.Id ? 'Saving…' : 'Approve & verify'}</button>
            </div>
          </article>
        ))}</div>
      )}
    </div>
  );
}
