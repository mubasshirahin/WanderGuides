import { Link } from 'react-router-dom';
import {
  MapPin,
  Star,
  Languages,
  ArrowRight,
  Search,
  UserRound,
  CalendarCheck2,
  Globe,
  ShieldCheck,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';
import { mockGuides } from '../data/mockGuides.js';
import Reveal from '../components/Reveal.jsx';
import useCountUp from '../hooks/useCountUp.js';

const steps = [
  { icon: Search, title: 'Search', desc: 'Browse vetted tourist guides by city, specialty and language.' },
  { icon: UserRound, title: 'Choose', desc: 'Compare profiles, ratings, and rates to find your perfect match.' },
  { icon: CalendarCheck2, title: 'Book', desc: 'Schedule your tour and pay securely in a few clicks.' },
  { icon: ShieldCheck, title: 'Explore', desc: 'Travel with confidence backed by verified local experts.' },
];

const stats = [
  { label: 'Active Guides', prefix: '', value: 1200, suffix: '+' },
  { label: 'Destinations', prefix: '', value: 85, suffix: '' },
  { label: 'Happy Travelers', prefix: '', value: 50, suffix: 'k+' },
  { label: 'Avg. Rating', prefix: '', value: 4.9, suffix: '★' },
];

const destinations = [
  'Hoi An',
  'Florence',
  'Kyoto',
  'Cape Town',
  'Barcelona',
  'Marrakech',
  'Bali',
  'Santorini',
  'Lisbon',
  'Havana',
  'Prague',
  'Istanbul',
];

function Stat({ stat, start }) {
  const count = useCountUp(stat.value, { start });
  const display =
    stat.value % 1 !== 0 ? count.toFixed(1) : Math.round(count).toLocaleString('en-US');

  return (
    <div className="group relative text-center">
      <span className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px w-10 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <p className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {stat.prefix}
        {display}
        <span className="text-accent-300">{stat.suffix}</span>
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
        {stat.label}
      </p>
    </div>
  );
}

export default function Landing({ isAuthenticated }) {
  const ctaTarget = isAuthenticated ? '/guides' : '/auth';

  return (
    <div className="overflow-x-clip">
      {/* ================= HERO ================= */}
      <section className="noise relative overflow-hidden bg-ink-950">
        {/* Aurora blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-48 h-[36rem] w-[36rem] animate-float-slow rounded-full bg-brand-500/25 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-10 h-[30rem] w-[30rem] animate-aurora rounded-full bg-teal-500/25 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-accent-500/15 blur-[120px] [animation-delay:4s]"
        />

        {/* Grid + vignette */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(6,10,20,0.85)_100%)]"
        />

        {/* Twinkling particles */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {[
            ['10%', '22%', '0s'],
            ['78%', '30%', '1.2s'],
            ['20%', '70%', '0.6s'],
            ['88%', '68%', '1.8s'],
            ['55%', '18%', '2.4s'],
            ['42%', '78%', '3s'],
          ].map(([left, top, delay], i) => (
            <span
              key={i}
              className="absolute h-1 w-1 animate-twinkle rounded-full bg-emerald-200/80"
              style={{ left, top, animationDelay: delay }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            {/* ---------- Copy ---------- */}
            <div>
              <Reveal>
                <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-50">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <Globe className="h-4 w-4 text-emerald-300" />
                  1,200+ certified guides across 85 destinations
                </span>
              </Reveal>

              <Reveal delay={120}>
                <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-[4.2rem]">
                  Explore the World with a{' '}
                  <span className="text-gradient">Local Expert</span>
                </h1>
              </Reveal>

              <Reveal delay={240}>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
                  Skip the guidebook. Hire a vetted local tourist guide who knows the hidden gems,
                  the best food, and the stories behind every street.
                </p>
              </Reveal>

              <Reveal delay={360}>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link
                    to={ctaTarget}
                    className="btn-sheen group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 via-teal-500 to-emerald-500 px-8 py-4 font-display text-base font-bold text-white shadow-glow-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Search className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                    Find a Guide
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="glass inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <Sparkles className="h-4 w-4 text-accent-300" />
                    How it Works
                  </a>
                </div>
              </Reveal>
            </div>

            {/* ---------- Floating showcase ---------- */}
            <Reveal delay={300} className="relative hidden h-full min-h-[420px] lg:block">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative h-72 w-72 animate-float">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-500/30 via-teal-500/20 to-accent-500/30 blur-2xl" />
                  <div className="relative flex h-full w-full items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] backdrop-blur-xl">
                    <span className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-white/20 via-transparent to-white/10" />
                    <div className="relative text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-glow">
                        <Globe className="h-10 w-10" />
                      </div>
                      <p className="mt-5 font-display text-lg font-bold text-white">WanderGuides</p>
                      <p className="text-sm text-slate-400">Your city, your story.</p>
                      <div className="mt-4 flex justify-center gap-1.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-accent-400 text-accent-400" />
                        ))}
                      </div>
                      <p className="mt-2 font-mono text-xs text-emerald-300">4.9 · 50k travelers</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating mini card: booking */}
              <div className="glass absolute left-0 top-10 flex animate-float items-center gap-3 rounded-2xl px-4 py-3 [animation-delay:1.2s]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/25 text-brand-300">
                  <CalendarCheck2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Tour confirmed</p>
                  <p className="text-xs text-slate-400">Kyoto · Temple Walk</p>
                </div>
              </div>

              {/* Floating mini card: rating */}
              <div className="glass absolute bottom-6 right-0 flex animate-float items-center gap-3 rounded-2xl px-4 py-3 [animation-delay:2s]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/25 text-accent-300">
                  <Star className="h-4 w-4 fill-accent-300" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">Verified guide</p>
                  <p className="text-xs text-slate-400">Mai Nguyen · Hoi An</p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ---------- Stats bar ---------- */}
          <Reveal delay={150}>
            <div className="relative mt-16 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-8 backdrop-blur-xl sm:px-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent"
              />
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                {stats.map((s) => (
                  <Stat key={s.label} stat={s} start />
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Bottom fade into light section */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
      </section>

      {/* ================= DESTINATION MARQUEE ================= */}
      <section className="group relative border-y border-slate-200/70 bg-white py-5">
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          Featured destinations
        </p>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
          <div className="marquee-track flex w-max items-center gap-10 pr-10">
            {[...destinations, ...destinations].map((d, i) => (
              <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                <span className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:text-brand-600">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  {d}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="bg-grid-light relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">How it Works</span>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Discover the perfect guide in{' '}
              <span className="text-gradient-dark">four steps</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-4 max-w-xl text-slate-500">
              From search to sightseeing — a simple, secure journey from booking to hello.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 120}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-7 shadow-card backdrop-blur transition-all duration-500 hover:-translate-y-2 hover:border-brand-200 hover:shadow-card-hover">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-100/60 blur-2xl transition-all duration-500 group-hover:bg-brand-200/70"
                />
                <span className="absolute right-6 top-6 font-mono text-4xl font-bold text-slate-100 transition-colors duration-500 group-hover:text-brand-100">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/30 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </span>

                <h3 className="relative mt-5 font-display text-lg font-bold text-slate-900">{title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>

                <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-gradient-to-r from-brand-500 to-teal-500 transition-transform duration-500 group-hover:scale-x-100" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= FEATURED GUIDES ================= */}
      <section className="relative overflow-hidden bg-white py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Reveal>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">
                  Featured Guides
                </span>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                  Handpicked <span className="text-gradient-dark">local experts</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={150}>
              <Link
                to={ctaTarget}
                className="group inline-flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50/60 px-5 py-2.5 text-sm font-semibold text-brand-700 transition-all duration-300 hover:border-brand-400 hover:bg-brand-50"
              >
                View all guides
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {mockGuides.map((guide, i) => (
              <Reveal key={guide.id} delay={i * 100}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-card transition-all duration-500 hover:-translate-y-2 hover:border-brand-200 hover:shadow-card-hover">
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={guide.avatar}
                      alt={guide.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />

                    <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                      <Sparkles className="h-3 w-3 text-accent-300" />
                      $ {guide.rate} / day
                    </span>

                    <span className="glass absolute bottom-3 left-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />
                      Verified
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-slate-900">{guide.name}</h3>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {guide.rating}
                        <span className="text-slate-400">({guide.reviews})</span>
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-brand-500" />
                      {guide.city}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {guide.specialties.map((s) => (
                        <span
                          key={s}
                          className="rounded-lg border border-brand-100 bg-brand-50/60 px-2 py-0.5 text-xs font-medium text-brand-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                      <Languages className="h-3.5 w-3.5" />
                      {guide.languages.join(', ')}
                    </p>

                    <button className="btn-sheen mt-4 w-full rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition-all duration-300 hover:shadow-glow">
                      View Profile
                    </button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA BANNER ================= */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal>
          <div className="noise relative overflow-hidden rounded-[2.5rem] bg-ink-950 px-8 py-16 text-center shadow-2xl shadow-ink-950/40 sm:px-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 animate-float-slow rounded-full bg-brand-500/30 blur-[100px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 animate-aurora rounded-full bg-teal-500/30 blur-[100px]"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark" />

            <div className="relative">
              <span className="glass mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-brand-300">
                <ShieldCheck className="h-7 w-7" />
              </span>
              <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Ready to meet your <span className="text-gradient">local expert?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-300">
                Start your journey — it takes less than a minute to find and hire your guide.
              </p>
              <Link
                to={ctaTarget}
                className="btn-sheen group mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 via-teal-500 to-emerald-500 px-9 py-4 font-display text-base font-bold text-white shadow-glow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                {isAuthenticated ? 'Start Searching' : 'Get Started Free'}
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}