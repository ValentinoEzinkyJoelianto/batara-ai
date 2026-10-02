const THUMB_PALETTES = [
  ['#93C5FD', '#2563EB'],
  ['#FDE68A', '#F59E0B'],
  ['#A7F3D0', '#059669'],
  ['#FBCFE8', '#DB2777'],
  ['#DDD6FE', '#7C3AED'],
  ['#FECACA', '#DC2626'],
];

export function thumbColors(seed) {
  const str = String(seed || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return THUMB_PALETTES[hash % THUMB_PALETTES.length];
}