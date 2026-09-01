import { useEffect, useState, useCallback } from 'react';
import {
  Star, Loader2, User, MapPin, CalendarDays, Send, CheckCircle,
  MessageSquare, BarChart3, Filter
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch, getStoredUser } from '../lib/demoAuth.js';

export default function ReviewsPage() {
  const currentUser = getStoredUser();
  const [activeTab, setActiveTab] = useState('received');
  const [reviewsReceived, setReviewsReceived] = useState([]);
  const [givenReviews, setGivenReviews] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [avgData, setAvgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review form state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [receivedRes, givenRes, pendingRes] = await Promise.all([
        authFetch(`/api/reviews/user/${currentUser?.Id}`),
        authFetch('/api/reviews/me'),
        authFetch('/api/reviews/pending-reviews'),
      ]);

      const receivedData = await receivedRes.json();
      const givenData = await givenRes.json();
      const pendingData = await pendingRes.json();

      if (receivedData.ok) {
        setReviewsReceived(receivedData.reviews);
        setAvgData(receivedData.avgRating);
      }
      if (givenData.ok) setGivenReviews(givenData.reviews);
      if (pendingData.ok) setPendingBookings(pendingData.bookings);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.Id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedBooking || rating === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess('');
    try {
      const res = await authFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedBooking.BookingId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Failed to submit review');

      setSuccess('Review submitted successfully!');
      setSelectedBooking(null);
      setRating(0);
      setComment('');
      await fetchAll();
      setActiveTab('received');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Feedback" title="Reviews" description="Rate and review after your tours." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Feedback"
        title="Reviews"
        description="Rate and review your travel partners."
      />

      {/* Success / Error */}
      {success && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-300">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
        <button
          onClick={() => { setActiveTab('received'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'received'
              ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Reviews Given to Me
          {reviewsReceived.length > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{reviewsReceived.length}</span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('write'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'write'
              ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send className="h-4 w-4" />
          Leave a Review
          {pendingBookings.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] text-amber-300">{pendingBookings.length}</span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('given'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'given'
              ? 'bg-gradient-to-r from-brand-600 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          Reviews I Gave
          {givenReviews.length > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{givenReviews.length}</span>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB: Reviews Given to Me                          */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'received' && (
        <div className="space-y-6">
          {/* Average Rating Card */}
          {avgData && avgData.total > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-center">
                  <p className="font-display text-5xl font-extrabold text-white">{avgData.average.toFixed(1)}</p>
                  <div className="mt-1 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(avgData.average) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{avgData.total} review{avgData.total !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 w-full space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = avgData.breakdown[star] || 0;
                    const pct = avgData.total > 0 ? (count / avgData.total) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="w-3 text-right text-xs text-slate-400">{star}</span>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-right text-[10px] text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Review List */}
          {reviewsReceived.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
              <Star className="mx-auto mb-3 h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">No reviews received yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewsReceived.map((r) => (
                <ReviewCard key={r.Id} review={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB: Leave a Review                                */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'write' && (
        <div className="space-y-6">
          {pendingBookings.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
              <CheckCircle className="mx-auto mb-3 h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">No pending reviews. All caught up!</p>
            </div>
          ) : (
            <>
              {/* Booking List */}
              {!selectedBooking && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Select a completed booking to review:</p>
                  {pendingBookings.map((b) => (
                    <button
                      key={b.BookingId}
                      onClick={() => setSelectedBooking(b)}
                      className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all hover:border-brand-500/30 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white/[0.06]">
                          {b.OtherAvatar ? (
                            <img src={b.OtherAvatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-5 w-5 text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate">{b.OtherName}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              b.OtherRole === 'guide' ? 'bg-teal-500/15 text-teal-400' : 'bg-brand-500/15 text-brand-400'
                            }`}>
                              {b.OtherRole === 'guide' ? 'Guide' : 'Tourist'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(b.StartDate).toLocaleDateString()} — {new Date(b.EndDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">৳{Number(b.TotalAmount).toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Review Form */}
              {selectedBooking && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-white">Write a Review</h3>
                    <button onClick={() => { setSelectedBooking(null); setRating(0); setComment(''); }}
                      className="text-xs text-slate-400 hover:text-white">
                      ← Back to list
                    </button>
                  </div>

                  {/* Selected booking info */}
                  <div className="mb-6 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-white/[0.06]">
                      {selectedBooking.OtherAvatar ? (
                        <img src={selectedBooking.OtherAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{selectedBooking.OtherName}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(selectedBooking.StartDate).toLocaleDateString()} — {new Date(selectedBooking.EndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitReview} className="space-y-5">
                    {/* Star Rating */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseEnter={() => setHoverRating(s)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(s)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star className={`h-8 w-8 transition-colors ${
                              s <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`} />
                          </button>
                        ))}
                      </div>
                      {rating > 0 && (
                        <p className="mt-1 text-xs text-slate-400">
                          {rating === 1 && 'Poor'}
                          {rating === 2 && 'Fair'}
                          {rating === 3 && 'Good'}
                          {rating === 4 && 'Very Good'}
                          {rating === 5 && 'Excellent'}
                        </p>
                      )}
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">Comment (optional)</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        placeholder="Share your experience..."
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting || rating === 0}
                      className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all duration-300 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB: Reviews I Gave                               */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'given' && (
        <div>
          {givenReviews.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
              <Send className="mx-auto mb-3 h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">You haven&apos;t written any reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {givenReviews.map((r) => (
                <ReviewCard key={r.Id} review={r} showRole />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review: r, showRole }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
          {r.ReviewerAvatar ? (
            <img src={r.ReviewerAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5 text-slate-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{r.ReviewerName}</p>
            {showRole && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                r.ReviewerRole === 'guide' ? 'bg-teal-500/15 text-teal-400' : 'bg-brand-500/15 text-brand-400'
              }`}>
                {r.ReviewerRole === 'guide' ? 'Guide' : 'Tourist'}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= r.Rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
              ))}
            </div>
            <span className="text-[10px] text-slate-500">
              {new Date(r.CreatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      {r.Comment && (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{r.Comment}</p>
      )}
    </div>
  );
}
