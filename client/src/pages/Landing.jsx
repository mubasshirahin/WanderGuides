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
  Zap,
  Heart,
  Clock,
  CreditCard,
  Users,
  CheckCircle2,
  ChevronRight,
  Play,
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

const features = [
  {
    icon: ShieldCheck,
    title: 'Verified & Trusted',
    desc: 'Every guide undergoes rigorous background checks and identity verification before being listed.',
    gradient: 'from-brand-500 to-emerald-600',
  },
  {
    icon: Globe,
    title: '85+ Destinations',
    desc: 'Access local experts in over 85 cities across 6 continents, from hidden gems to iconic landmarks.',
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    desc: 'Pay with confidence using our encrypted payment system. Funds held in escrow until your tour is complete.',
    gradient: 'from-brand-500 to-teal-600',
  },
  {
    icon: Clock,
    title: 'Instant Booking',
    desc: 'Book a guide in under 60 seconds. Real-time availability and instant confirmation.',
    gradient: 'from-accent-500 to-orange-600',
  },
  {
    icon: Heart,
    title: 'Curated Experiences',
    desc: 'From food tours to heritage walks — discover handpicked experiences tailored to your interests.',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    icon: Users,
    title: 'Group & Solo',
    desc: 'Whether you are traveling solo or with a group, find the perfect guide for any party size.',
    gradient: 'from-violet-500 to-purple-600',
  },
];

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Travel Blogger',
    avatar: 'https://i.pravatar.cc/120?img=47',
    text: 'WanderGuides completely changed how I travel. The local guide in Kyoto showed us temples and tea houses that no guidebook mentions.',
    rating: 5,
  },
  {
    name: 'James Chen',
    role: 'Software Engineer',
    avatar: 'https://i.pravatar.cc/120?img=68',
    text: 'Booked a food tour in Barcelona in minutes. Our guide was incredible — we tasted dishes we never would have found on our own.',
    rating: 5,
  },
  {
    name: 'Amara Okafor',
    role: 'Photographer',
    avatar: 'https://i.pravatar.cc/120?img=45',
    text: 'As a photographer, I need guides who know the best spots. WanderGuides connected me with a local who knew every golden-hour location.',
    rating: 5,
  },
];

const destinations = [
  { name: 'Cox\'s Bazar', tag: 'Sea Beach' },
  { name: 'Sundarbans', tag: 'Mangrove Forest' },
  { name: 'Sylhet', tag: 'Tea Capital' },
  { name: 'Srimangal', tag: 'Tea Gardens' },
  { name: 'Rangamati', tag: 'Hill District' },
  { name: 'Bandarban', tag: 'Hill Tracts' },
  { name: 'Saint Martin', tag: 'Coral Island' },
  { name: 'Dhaka', tag: 'Capital City' },
  { name: 'Chittagong', tag: 'Port City' },
  { name: 'Kuakata', tag: 'Sea Beach' },
  { name: 'Rajshahi', tag: 'Silk City' },
  { name: 'Bagerhat', tag: 'Heritage Site' },
  { name: 'Paharpur', tag: 'Buddhist Monastery' },
  { name: 'Comilla', tag: 'Archaeology' },
  { name: 'Dinajpur', tag: 'Historic Mosque' },
  { name: 'Tangail', tag: 'Sari Weaving' },
];

const stats = [
  { label: 'Active Guides', prefix: '', value: 1200, suffix: '+' },
  { label: 'Destinations', prefix: '', value: 85, suffix: '' },
  { label: 'Happy Travelers', prefix: '', value: 50, suffix: 'k+' },
  { label: 'Avg. Rating', prefix: '', value: 4.9, suffix: '★' },
];

function Stat({ stat, start }) {
  const count = useCountUp(stat.value, { start });
  const display =
    stat.value % 1 !== 0 ? count.toFixed(1) : Math.round(count).toLocaleString('en-US');

  return (
    <div className="group relative text-center">
      <p className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {stat.prefix}
        {display}
        <span className="text-accent-300">{stat.suffix}</span>
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
      <section className="noise relative overflow-hidden bg-ink-950 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:pt-40 lg:pb-36">
        {/* Aurora blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-48 h-[36rem] w-[36rem] animate-float-slow rounded-full bg-brand-500/20 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-10 h-[30rem] w-[30rem] animate-aurora rounded-full bg-teal-500/20 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] animate-float-slow rounded-full bg-accent-500/10 blur-[120px] [animation-delay:4s]" />

        {/* Grid + vignette */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(6,10,20,0.85)_100%)]" />

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

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <Reveal>
            <div className="mx-auto mb-8 flex w-fit justify-center">
              <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-emerald-50 sm:text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <Globe className="h-3.5 w-3.5 text-emerald-300 sm:h-4 sm:w-4" />
                1,200+ certified guides across 85 destinations
              </span>
            </div>
          </Reveal>

          {/* Heading */}
          <Reveal delay={80}>
            <h1 className="mx-auto max-w-4xl text-center font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-7xl">
              Explore the World with a{' '}
              <span className="text-gradient">Local Expert</span>
            </h1>
          </Reveal>

          {/* Subheading */}
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-slate-400 sm:text-lg lg:text-xl">
              Skip the guidebook. Hire a vetted local tourist guide who knows the hidden gems,
              the best food, and the stories behind every street.
            </p>
          </Reveal>

          {/* CTA buttons */}
          <Reveal delay={240}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to={ctaTarget}
                className="btn-sheen group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 via-teal-500 to-emerald-500 px-8 py-4 font-display text-base font-bold text-white shadow-glow-lg transition-all duration-300 hover:-translate-y-0.5 sm:w-auto"
              >
                <Search className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
                Find a Guide
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="#how-it-works"
                className="glass inline-flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
              >
                <Play className="h-4 w-4 text-accent-300" />
                See How it Works
              </a>
            </div>
          </Reveal>

          {/* Floating showcase - desktop only */}
          <Reveal delay={300}>
            <div className="relative mx-auto mt-16 hidden max-w-3xl lg:block">
              <div className="relative mx-auto flex items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 backdrop-blur-xl">
                <span className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-white/10 via-transparent to-white/5" />

                {/* Decorative grid inside showcase */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[2rem] bg-grid-dark opacity-50" />

                <div className="relative grid w-full grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="glass flex flex-col items-center rounded-2xl p-5 text-center transition-all duration-500 hover:-translate-y-1 hover:border-brand-500/30">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/20">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <p className="mt-3 font-display text-sm font-bold text-white">Kyoto, Japan</p>
                    <p className="text-xs text-slate-400">Temple Walk</p>
                    <div className="mt-2 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent-400 text-accent-400" />
                      <span className="text-xs font-semibold text-white">4.9</span>
                      <span className="text-xs text-slate-500">(2.1k)</span>
                    </div>
                  </div>

                  {/* Card 2 - Center (featured) */}
                  <div className="glass relative flex flex-col items-center rounded-2xl border-brand-500/30 p-5 text-center transition-all duration-500 hover:-translate-y-1">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-teal-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                      Most Popular
                    </span>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white shadow-glow">
                      <Globe className="h-7 w-7" />
                    </span>
                    <p className="mt-4 font-display text-base font-bold text-white">WanderGuides</p>
                    <p className="text-sm text-slate-400">Your city, your story.</p>
                    <div className="mt-3 flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent-400 text-accent-400" />
                      ))}
                    </div>
                    <p className="mt-1 font-mono text-xs text-emerald-300">4.9 · 50k travelers</p>
                  </div>

                  {/* Card 3 */}
                  <div className="glass flex flex-col items-center rounded-2xl p-5 text-center transition-all duration-500 hover:-translate-y-1 hover:border-brand-500/30">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-orange-600 text-white shadow-lg shadow-accent-500/20">
                      <Star className="h-5 w-5" />
                    </span>
                    <p className="mt-3 font-display text-sm font-bold text-white">Barcelona, Spain</p>
                    <p className="text-xs text-slate-400">Food Tour</p>
                    <div className="mt-2 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent-400 text-accent-400" />
                      <span className="text-xs font-semibold text-white">4.8</span>
                      <span className="text-xs text-slate-500">(1.8k)</span>
                    </div>
                  </div>
                </div>

                {/* Floating mini cards */}
                <div className="glass absolute -left-8 top-8 flex animate-float items-center gap-3 rounded-2xl px-4 py-3 [animation-delay:1.2s]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/25 text-brand-300">
                    <CalendarCheck2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Tour confirmed</p>
                    <p className="text-xs text-slate-400">Kyoto · Temple Walk</p>
                  </div>
                </div>

                <div className="glass absolute -right-8 bottom-8 flex animate-float items-center gap-3 rounded-2xl px-4 py-3 [animation-delay:2s]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/25 text-accent-300">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Verified guide</p>
                    <p className="text-xs text-slate-400">Mai Nguyen · Hoi An</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Social proof */}
          <Reveal delay={400}>
            <div className="mt-12 flex flex-col items-center gap-6 sm:mt-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Trusted by travelers worldwide
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
                {['50,000+', '4.9/5', '85+', '24/7'].map((val, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i === 0 && <Users className="h-4 w-4 text-brand-400" />}
                    {i === 1 && <Star className="h-4 w-4 fill-accent-400 text-accent-400" />}
                    {i === 2 && <Globe className="h-4 w-4 text-teal-400" />}
                    {i === 3 && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                    <span className="text-sm font-semibold text-slate-300">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Stats bar */}
          <Reveal delay={200}>
            <div className="relative mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] px-6 py-8 backdrop-blur-xl sm:mt-16 sm:px-10">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
                {stats.map((s) => (
                  <Stat key={s.label} stat={s} start />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= DESTINATION MARQUEE ================= */}
      <section className="group relative border-y border-white/10 bg-white/[0.03] py-5">
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Explore Bangladesh
        </p>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-950 to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-950 to-transparent sm:w-24" />
          <div className="marquee-track flex w-max items-center gap-8 pr-8 sm:gap-10 sm:pr-10">
            {[...destinations, ...destinations].map((d, i) => (
              <span key={i} className="flex items-center gap-8 whitespace-nowrap sm:gap-10">
                <span className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-slate-400 transition-colors hover:text-brand-400 sm:text-sm">
                  <MapPin className="h-3 w-3 text-brand-400 sm:h-3.5 sm:w-3.5" />
                  {d.name}
                  <span className="ml-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[9px] font-medium normal-case tracking-normal text-brand-300">
                    {d.tag}
                  </span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURES GRID ================= */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-400">Why WanderGuides</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Everything you need for the{' '}
                <span className="text-gradient">perfect trip</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-4 max-w-xl text-slate-400">
                We handle the details so you can focus on making memories.
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {features.map(({ icon: Icon, title, desc, gradient }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08] sm:p-8">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                  <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-gradient-to-r from-brand-500 to-teal-500 transition-transform duration-500 group-hover:scale-x-100" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="relative overflow-hidden py-20 sm:py-28">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-400">How it Works</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Four steps to your next{' '}
                <span className="text-gradient">adventure</span>
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mx-auto mt-4 max-w-xl text-slate-400">
                From search to sightseeing — a simple, secure journey from booking to hello.
              </p>
            </Reveal>
          </div>

          <div className="relative mt-14">
            {/* Connecting line - desktop only */}
            <div aria-hidden="true" className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-white/10 to-transparent lg:block" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
              {steps.map(({ icon: Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 120}>
                  <div className="group relative h-full">
                    {/* Step number badge */}
                    <div className="absolute -top-3 left-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-ink-950 font-mono text-xs font-bold text-brand-400 shadow-lg sm:left-8">
                      {i + 1}
                    </div>

                    <div className="h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-brand-500/30 hover:bg-white/[0.08] sm:p-8">
                      <div className="flex flex-col items-start text-left">
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-600 text-white shadow-lg shadow-brand-500/20 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                          <Icon className="h-6 w-6" />
                        </span>
                        <h3 className="mt-5 font-display text-xl font-bold text-white">{title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                      </div>

                      {/* Arrow connector - desktop */}
                      {i < steps.length - 1 && (
                        <div className="absolute -right-3 top-10 hidden text-white/20 lg:block">
                          <ChevronRight className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-400">Testimonials</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Loved by travelers{' '}
                <span className="text-gradient">everywhere</span>
              </h2>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map(({ name, role, avatar, text, rating }, i) => (
              <Reveal key={name} delay={i * 100}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08] sm:p-8">
                  <div className="flex items-center gap-3">
                    <img src={avatar} alt={name} className="h-12 w-12 rounded-full border-2 border-white/10 object-cover" />
                    <div>
                      <p className="font-display text-sm font-bold text-white">{name}</p>
                      <p className="text-xs text-slate-500">{role}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-0.5">
                    {[...Array(rating)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent-400 text-accent-400" />
                    ))}
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-300">"{text}"</p>

                  <span className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-gradient-to-r from-brand-500 to-teal-500 transition-transform duration-500 group-hover:scale-x-100" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURED GUIDES ================= */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Reveal>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-400">Featured Guides</span>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Handpicked <span className="text-gradient">local experts</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={120}>
              <Link
                to={ctaTarget}
                className="group inline-flex items-center gap-2 self-start rounded-2xl border border-brand-500/30 bg-brand-500/10 px-5 py-2.5 text-sm font-semibold text-brand-300 transition-all duration-300 hover:border-brand-400/50 hover:bg-brand-500/20 sm:self-auto"
              >
                View all guides
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {mockGuides.map((guide, i) => (
              <Reveal key={guide.id} delay={i * 100}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-brand-500/30 hover:bg-white/[0.1]">
                  <div className="relative h-44 overflow-hidden sm:h-52">
                    <img
                      src={guide.avatar}
                      alt={guide.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />

                    <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur sm:left-4 sm:text-xs">
                      <Sparkles className="h-3 w-3 text-accent-300" />
                      $ {guide.rate} / day
                    </span>

                    <span className="glass absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-emerald-100 sm:left-4 sm:text-[11px]">
                      <BadgeCheck className="h-3 w-3 text-emerald-300 sm:h-3.5 sm:w-3.5" />
                      Verified
                    </span>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-white sm:text-lg">{guide.name}</h3>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent-300 sm:text-xs">
                        <Star className="h-3 w-3 fill-accent-400 text-accent-400 sm:h-3.5 sm:w-3.5" />
                        {guide.rating}
                        <span className="text-slate-500">({guide.reviews})</span>
                      </span>
                    </div>

                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400 sm:text-sm">
                      <MapPin className="h-3 w-3 text-brand-400 sm:h-3.5 sm:w-3.5" />
                      {guide.city}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3">
                      {guide.specialties.map((s) => (
                        <span
                          key={s}
                          className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[11px] font-medium text-brand-300 sm:text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <p className="mt-2.5 flex items-center gap-1 text-[11px] text-slate-500 sm:mt-3 sm:text-xs">
                      <Languages className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {guide.languages.join(', ')}
                    </p>

                    <button className="btn-sheen mt-3.5 w-full rounded-xl bg-gradient-to-r from-brand-600 to-teal-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-brand-600/25 transition-all duration-300 hover:shadow-glow sm:mt-4 sm:text-sm">
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
      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <Reveal>
          <div className="noise relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-ink-950 px-6 py-14 text-center shadow-2xl shadow-ink-950/40 sm:rounded-[2.5rem] sm:px-8 sm:py-20 lg:px-16">
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 animate-float-slow rounded-full bg-brand-500/30 blur-[100px]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 animate-aurora rounded-full bg-teal-500/30 blur-[100px]" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid-dark" />

            <div className="relative">
              <span className="glass mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-brand-300">
                <ShieldCheck className="h-7 w-7" />
              </span>
              <h2 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-5xl">
                Ready to meet your <span className="text-gradient">local expert?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
                Start your journey — it takes less than a minute to find and hire your guide.
              </p>
              <Link
                to={ctaTarget}
                className="btn-sheen group mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 via-teal-500 to-emerald-500 px-7 py-3.5 font-display text-sm font-bold text-white shadow-glow-lg transition-all duration-300 hover:-translate-y-0.5 sm:mt-9 sm:px-9 sm:py-4 sm:text-base"
              >
                {isAuthenticated ? 'Start Searching' : 'Get Started Free'}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 sm:h-5 sm:w-5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
