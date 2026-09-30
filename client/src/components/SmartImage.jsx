import { useEffect, useState } from 'react';
import { getAvatarFallbackUrl, getInitials } from '../lib/avatar.js';

/**
 * SmartImage — chobi load na hole auto dummy avatar.
 *
 * 1. src thakle seta load korar try kore
 * 2. fail korle dicebear initials avatar URL try kore
 * 3. setao fail korle gradient initials div dekhay
 *
 * Usage:
 *   <SmartImage src={guide.AvatarUrl} name={guide.FullName} className="h-14 w-14" rounded="rounded-2xl" />
 */
export default function SmartImage({
  src,
  name = 'G',
  className = 'h-12 w-12',
  rounded = 'rounded-2xl',
  imgClassName = '',
}) {
  const [stage, setStage] = useState(0); // 0 = src, 1 = fallback URL, 2 = initials only
  useEffect(() => { setStage(0); }, [src]);

  const initials = getInitials(name);

  if (!src || stage >= 2) {
    return (
      <div
        aria-label={name}
        className={`${className} ${rounded} flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-500 to-teal-600 font-display text-lg font-extrabold text-white shadow-lg shadow-brand-500/25`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={stage === 0 ? src : getAvatarFallbackUrl(name)}
      alt={name}
      loading="lazy"
      onError={() => setStage((s) => s + 1)}
      className={`${className} ${rounded} shrink-0 object-cover ${imgClassName}`}
    />
  );
}
