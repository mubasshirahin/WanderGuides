import Reveal from './Reveal.jsx';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ eyebrow, title, description, backTo }) {
  return (
    <div className="mb-10 text-center">
      {backTo && (
        <div className="mb-6 text-left">
          <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-brand-400">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      )}
      <Reveal>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-400">{eyebrow}</span>
      </Reveal>
      <Reveal delay={80}>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
      </Reveal>
      <Reveal delay={160}>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">{description}</p>
      </Reveal>
    </div>
  );
}
