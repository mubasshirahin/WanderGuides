export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'G';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getAvatarFallbackUrl(name) {
  const seed = encodeURIComponent((name || 'Guide').trim() || 'Guide');
  // DiceBear initials SVG — always returns a valid image, no API key needed.
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=059669,0d9488,10b981&fontWeight=700`;
}

/**
 * Swap a broken <img> to a dummy avatar automatically.
 * Usage: <img src={...} onError={(e) => handleImgError(e, name)} />
 * First failure -> dicebear fallback URL, second failure -> hide img
 * (parent should render initials behind it).
 */
export function handleImgError(event, name) {
  const img = event?.currentTarget;
  if (!img) return;
  if (!img.dataset.fallbackStage) {
    img.dataset.fallbackStage = '1';
    img.src = getAvatarFallbackUrl(name);
  } else {
    // Fallback o load hoy nai — img hide kore initials div dekhano hobe
    img.style.display = 'none';
  }
}
