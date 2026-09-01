import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, FileText, Tag, Globe, DollarSign, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import { authFetch } from '../lib/demoAuth.js';

const inputBase =
  'w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-brand-400 focus:bg-white/[0.1] focus:ring-4 focus:ring-brand-500/15';

function Field({ id, label, children, required }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function GuideFormPage() {
  const { id } = useParams();              // undefined = create, number = edit
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loadingGuide, setLoadingGuide] = useState(isEdit);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    bio: '',
    specialties: '',
    languages: '',
    ratePerDay: '',
  });

  // Fetch guide for edit mode
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await fetch(`/api/guides/${id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.message);
        const g = data.guide;
        setForm({
          fullName: g.FullName || '',
          email: g.Email || '',
          phone: g.Phone || '',
          city: g.City || '',
          bio: g.Bio || '',
          specialties: g.Specialties || '',
          languages: g.Languages || '',
          ratePerDay: g.RatePerDay ?? '',
        });
      } catch (e) {
        alert(e.message);
        navigate('/guides');
      } finally {
        setLoadingGuide(false);
      }
    })();
  }, [isEdit, id]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const err = {};
    if (!form.fullName.trim()) err.fullName = 'Name is required';
    if (!form.email.trim()) err.email = 'Email is required';
    if (!form.city.trim()) err.city = 'City is required';
    if (!form.ratePerDay || isNaN(Number(form.ratePerDay))) err.ratePerDay = 'Valid rate is required';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      const url = isEdit ? `/api/guides/${id}` : '/api/guides';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          ...form,
          ratePerDay: Number(form.ratePerDay),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      navigate('/guides');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingGuide) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        backTo="/guides"
        eyebrow="Guide Management"
        title={isEdit ? 'Edit Guide' : 'Add New Guide'}
        description={isEdit ? 'Update the guide profile details.' : 'Fill in the details to create a new guide profile.'}
      />

      <div className="mx-auto max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl space-y-5">
          <Field id="fullName" label="Full Name" required>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input id="fullName" type="text" value={form.fullName} onChange={set('fullName')} placeholder="John Doe" className={`${inputBase} ${errors.fullName ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`} />
            </div>
            {errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}
          </Field>

          <Field id="email" label="Email" required>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input id="email" type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" className={`${inputBase} ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`} />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="phone" label="Phone">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input id="phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="+880 1700-000000" className={inputBase} />
              </div>
            </Field>

            <Field id="city" label="City" required>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input id="city" type="text" value={form.city} onChange={set('city')} placeholder="Hoi An" className={`${inputBase} ${errors.city ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`} />
              </div>
              {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}
            </Field>
          </div>

          <Field id="bio" label="Bio">
            <div className="relative">
              <FileText className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={set('bio')}
                placeholder="A short bio about this guide..."
                className={`${inputBase} pl-11 resize-none`}
              />
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="specialties" label="Specialties (comma-separated)">
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input id="specialties" type="text" value={form.specialties} onChange={set('specialties')} placeholder="Heritage Walks, Food Tours" className={inputBase} />
              </div>
            </Field>

            <Field id="languages" label="Languages (comma-separated)">
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input id="languages" type="text" value={form.languages} onChange={set('languages')} placeholder="English, Vietnamese" className={inputBase} />
              </div>
            </Field>
          </div>

          <Field id="ratePerDay" label="Rate per day (USD)" required>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="ratePerDay"
                type="number"
                min="0"
                step="0.01"
                value={form.ratePerDay}
                onChange={set('ratePerDay')}
                placeholder="45.00"
                className={`${inputBase} ${errors.ratePerDay ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`}
              />
            </div>
            {errors.ratePerDay && <p className="mt-1 text-xs text-red-400">{errors.ratePerDay}</p>}
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/guides')}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/30 transition-all duration-300 hover:bg-brand-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Guide'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
