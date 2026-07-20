// Age calculation per spec: weeks (<3mo), months (<24mo), years (>=24mo)
export function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getBabyAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const diffMs = now.getTime() - dob.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const years = Math.floor(days / 365.25);

  if (months < 3) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} old`;
  } else if (months < 24) {
    return `${months} ${months === 1 ? 'month' : 'months'} old`;
  } else {
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m > 0 ? `${y}y ${m}m old` : `${y} ${y === 1 ? 'year' : 'years'} old`;
  }
}

export function getAgeInMonths(dateOfBirth: string, atDate?: string): number {
  const dob = new Date(dateOfBirth);
  const ref = atDate ? new Date(atDate) : new Date();
  const days = Math.floor((ref.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(days / 30.44));
}

// Time formatting
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Locale-aware date formatting
export function formatDate(iso: string, locale?: string): string {
  const date = new Date(iso);
  const userLocale = locale || navigator.language || 'en-US';
  return date.toLocaleDateString(userLocale, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  const userLocale = locale || navigator.language || 'en-US';
  return date.toLocaleTimeString(userLocale, { hour: '2-digit', minute: '2-digit' });
}

// Grouping utility for logs
export function groupByDate<T>(items: T[], dateKey: string): Record<string, T[]> {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  return items.reduce((acc, item) => {
    const d = new Date((item as any)[dateKey]);
    const dateStr = d.toDateString();
    let label: string;
    if (dateStr === today) {
      label = 'Today';
    } else if (dateStr === yesterday) {
      label = 'Yesterday';
    } else {
      label = d.toLocaleDateString(navigator.language || 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// Duration formatting
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTimerSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Unit conversion
export function convertWeight(value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number {
  if (from === to) return value;
  return from === 'metric' ? Math.round(value * 2.20462 * 10) / 10 : Math.round(value / 2.20462 * 10) / 10;
}

export function convertLength(value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number {
  if (from === to) return value;
  return from === 'metric' ? Math.round(value / 2.54 * 10) / 10 : Math.round(value * 2.54 * 10) / 10;
}

export function convertVolume(value: number, from: 'metric' | 'imperial', to: 'metric' | 'imperial'): number {
  if (from === to) return value;
  return from === 'metric' ? Math.round(value / 29.5735 * 10) / 10 : Math.round(value * 29.5735 * 10) / 10;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(seed: string): string {
  const cleaned = seed.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'B';
  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function generateAvatarSvg(seed: string, foreground: string, palette: [string, string]): string {
  const initials = getInitials(seed);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="100%" stop-color="${palette[1]}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#bg)"/>
  <circle cx="128" cy="128" r="90" fill="rgba(255,255,255,0.18)"/>
  <circle cx="420" cy="420" r="110" fill="rgba(255,255,255,0.12)"/>
  <text
    x="50%"
    y="54%"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Poppins, system-ui, -apple-system, Segoe UI, sans-serif"
    font-size="180"
    font-weight="800"
    fill="${foreground}"
  >${initials}</text>
</svg>`.trim();
}

function paletteForSeed(seed: string, kind: 'baby' | 'user', gender?: string): [string, string] {
  if (kind === 'baby' && gender === 'boy') {
    return ['#7AC6FF', '#3D7FE8'];
  }
  if (kind === 'baby' && gender === 'girl') {
    return ['#FFB7D7', '#FF6FA5'];
  }
  const palettes: Array<[string, string]> = [
    ['#8ED9C8', '#2BAF8E'],
    ['#F5C387', '#E68A3B'],
    ['#B6B5FF', '#6B6AF7'],
    ['#A8D8FF', '#4C90F0'],
    ['#FFBCB3', '#F06A5B'],
  ];
  const hash = hashSeed(seed);
  return palettes[hash % palettes.length];
}

// Reliable generated avatars that do not depend on third-party image hosts
export function getDefaultAvatar(gender?: string, seed?: string): string {
  const normalizedSeed = (seed || 'baby').trim() || 'baby';
  const palette = paletteForSeed(normalizedSeed, 'baby', gender);
  const svg = generateAvatarSvg(normalizedSeed, '#FFFFFF', palette);
  return toDataUri(svg);
}

export function getUserAvatar(seed?: string): string {
  const normalizedSeed = (seed || 'parent').trim() || 'parent';
  const palette = paletteForSeed(normalizedSeed, 'user');
  const svg = generateAvatarSvg(normalizedSeed, '#FFFFFF', palette);
  return toDataUri(svg);
}

// WHO Growth Standards (simplified percentile data for boys and girls 0-24 months)
// Weight in kg, Length in cm, Head circumference in cm
// Percentiles: 3rd, 15th, 50th, 85th, 97th
export interface WHODataPoint {
  ageMonths: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export type GrowthStandard = 'WHO' | 'CDC';

export const WHO_WEIGHT_BOYS: WHODataPoint[] = [
  { ageMonths: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.3 },
  { ageMonths: 1, p3: 3.2, p15: 3.8, p50: 4.5, p85: 5.1, p97: 5.7 },
  { ageMonths: 2, p3: 4.1, p15: 4.7, p50: 5.6, p85: 6.3, p97: 7.0 },
  { ageMonths: 3, p3: 4.8, p15: 5.5, p50: 6.4, p85: 7.2, p97: 7.9 },
  { ageMonths: 4, p3: 5.4, p15: 6.1, p50: 7.0, p85: 7.8, p97: 8.6 },
  { ageMonths: 5, p3: 5.8, p15: 6.6, p50: 7.5, p85: 8.4, p97: 9.2 },
  { ageMonths: 6, p3: 6.2, p15: 7.0, p50: 7.9, p85: 8.8, p97: 9.7 },
  { ageMonths: 7, p3: 6.5, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.1 },
  { ageMonths: 8, p3: 6.8, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.5 },
  { ageMonths: 9, p3: 7.1, p15: 7.9, p50: 8.9, p85: 9.9, p97: 10.9 },
  { ageMonths: 10, p3: 7.3, p15: 8.2, p50: 9.2, p85: 10.2, p97: 11.2 },
  { ageMonths: 11, p3: 7.5, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.5 },
  { ageMonths: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 11.8 },
  { ageMonths: 15, p3: 8.2, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.6 },
  { ageMonths: 18, p3: 8.7, p15: 9.7, p50: 10.9, p85: 12.2, p97: 13.4 },
  { ageMonths: 21, p3: 9.2, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.1 },
  { ageMonths: 24, p3: 9.6, p15: 10.8, p50: 12.2, p85: 13.6, p97: 14.8 },
];

export const WHO_WEIGHT_GIRLS: WHODataPoint[] = [
  { ageMonths: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { ageMonths: 1, p3: 3.0, p15: 3.4, p50: 4.2, p85: 4.8, p97: 5.4 },
  { ageMonths: 2, p3: 3.7, p15: 4.4, p50: 5.1, p85: 5.9, p97: 6.5 },
  { ageMonths: 3, p3: 4.4, p15: 5.0, p50: 5.8, p85: 6.6, p97: 7.4 },
  { ageMonths: 4, p3: 4.8, p15: 5.6, p50: 6.4, p85: 7.3, p97: 8.1 },
  { ageMonths: 5, p3: 5.2, p15: 6.0, p50: 6.9, p85: 7.8, p97: 8.7 },
  { ageMonths: 6, p3: 5.5, p15: 6.3, p50: 7.3, p85: 8.3, p97: 9.2 },
  { ageMonths: 7, p3: 5.8, p15: 6.6, p50: 7.6, p85: 8.7, p97: 9.6 },
  { ageMonths: 8, p3: 6.0, p15: 6.9, p50: 7.9, p85: 9.0, p97: 10.0 },
  { ageMonths: 9, p3: 6.2, p15: 7.1, p50: 8.2, p85: 9.3, p97: 10.4 },
  { ageMonths: 10, p3: 6.4, p15: 7.4, p50: 8.5, p85: 9.6, p97: 10.7 },
  { ageMonths: 11, p3: 6.6, p15: 7.6, p50: 8.7, p85: 9.9, p97: 11.0 },
  { ageMonths: 12, p3: 6.8, p15: 7.8, p50: 8.9, p85: 10.1, p97: 11.3 },
  { ageMonths: 15, p3: 7.2, p15: 8.4, p50: 9.6, p85: 10.9, p97: 12.2 },
  { ageMonths: 18, p3: 7.8, p15: 9.0, p50: 10.2, p85: 11.6, p97: 13.0 },
  { ageMonths: 21, p3: 8.2, p15: 9.5, p50: 10.9, p85: 12.4, p97: 13.8 },
  { ageMonths: 24, p3: 8.7, p15: 10.0, p50: 11.5, p85: 13.0, p97: 14.5 },
];

export const WHO_LENGTH_BOYS: WHODataPoint[] = [
  { ageMonths: 0, p3: 46.3, p15: 48.0, p50: 49.9, p85: 51.8, p97: 53.4 },
  { ageMonths: 1, p3: 50.5, p15: 52.3, p50: 54.7, p85: 56.7, p97: 58.4 },
  { ageMonths: 2, p3: 53.4, p15: 55.4, p50: 58.4, p85: 60.6, p97: 62.2 },
  { ageMonths: 3, p3: 56.0, p15: 58.0, p50: 61.4, p85: 63.5, p97: 65.2 },
  { ageMonths: 4, p3: 58.0, p15: 60.0, p50: 63.9, p85: 66.0, p97: 67.8 },
  { ageMonths: 5, p3: 59.7, p15: 61.7, p50: 65.9, p85: 68.0, p97: 69.9 },
  { ageMonths: 6, p3: 61.0, p15: 63.2, p50: 67.6, p85: 69.8, p97: 71.6 },
  { ageMonths: 9, p3: 64.5, p15: 67.0, p50: 72.0, p85: 74.2, p97: 76.2 },
  { ageMonths: 12, p3: 68.0, p15: 70.5, p50: 75.7, p85: 78.0, p97: 80.2 },
  { ageMonths: 18, p3: 74.0, p15: 77.0, p50: 82.3, p85: 85.0, p97: 87.5 },
  { ageMonths: 24, p3: 79.5, p15: 82.5, p50: 87.8, p85: 90.5, p97: 93.0 },
];

export const WHO_LENGTH_GIRLS: WHODataPoint[] = [
  { ageMonths: 0, p3: 45.6, p15: 47.2, p50: 49.1, p85: 51.0, p97: 52.7 },
  { ageMonths: 1, p3: 49.5, p15: 51.2, p50: 53.7, p85: 55.6, p97: 57.4 },
  { ageMonths: 2, p3: 52.2, p15: 54.0, p50: 57.1, p85: 59.2, p97: 61.0 },
  { ageMonths: 3, p3: 54.6, p15: 56.5, p50: 59.8, p85: 62.0, p97: 63.8 },
  { ageMonths: 4, p3: 56.6, p15: 58.5, p50: 62.1, p85: 64.3, p97: 66.2 },
  { ageMonths: 5, p3: 58.1, p15: 60.2, p50: 64.0, p85: 66.2, p97: 68.2 },
  { ageMonths: 6, p3: 59.5, p15: 61.5, p50: 65.7, p85: 68.0, p97: 70.0 },
  { ageMonths: 9, p3: 63.0, p15: 65.5, p50: 70.1, p85: 72.5, p97: 74.8 },
  { ageMonths: 12, p3: 66.5, p15: 69.2, p50: 74.0, p85: 76.5, p97: 79.0 },
  { ageMonths: 18, p3: 72.5, p15: 75.5, p50: 80.7, p85: 83.5, p97: 86.0 },
  { ageMonths: 24, p3: 78.0, p15: 81.0, p50: 86.4, p85: 89.2, p97: 92.0 },
];

export const WHO_HEAD_BOYS: WHODataPoint[] = [
  { ageMonths: 0, p3: 32.1, p15: 33.1, p50: 34.5, p85: 35.8, p97: 36.9 },
  { ageMonths: 3, p3: 38.0, p15: 39.0, p50: 40.5, p85: 42.0, p97: 43.0 },
  { ageMonths: 6, p3: 41.0, p15: 42.0, p50: 43.3, p85: 44.6, p97: 45.6 },
  { ageMonths: 9, p3: 43.0, p15: 44.0, p50: 45.3, p85: 46.5, p97: 47.5 },
  { ageMonths: 12, p3: 44.2, p15: 45.2, p50: 46.5, p85: 47.7, p97: 48.7 },
  { ageMonths: 18, p3: 45.5, p15: 46.6, p50: 48.0, p85: 49.2, p97: 50.2 },
  { ageMonths: 24, p3: 46.3, p15: 47.3, p50: 48.7, p85: 49.9, p97: 50.8 },
];

export const WHO_HEAD_GIRLS: WHODataPoint[] = [
  { ageMonths: 0, p3: 31.5, p15: 32.4, p50: 33.9, p85: 35.1, p97: 36.1 },
  { ageMonths: 3, p3: 37.0, p15: 38.0, p50: 39.5, p85: 41.0, p97: 42.0 },
  { ageMonths: 6, p3: 40.0, p15: 41.0, p50: 42.2, p85: 43.4, p97: 44.5 },
  { ageMonths: 9, p3: 41.8, p15: 42.8, p50: 44.0, p85: 45.3, p97: 46.3 },
  { ageMonths: 12, p3: 43.0, p15: 44.0, p50: 45.2, p85: 46.5, p97: 47.5 },
  { ageMonths: 18, p3: 44.4, p15: 45.4, p50: 46.7, p85: 48.0, p97: 49.0 },
  { ageMonths: 24, p3: 45.2, p15: 46.2, p50: 47.6, p85: 48.8, p97: 49.8 },
];

function getWhoGrowthData(
  metric: 'weight' | 'height' | 'head',
  gender?: string,
): WHODataPoint[] {
  if (metric === 'weight') return gender === 'girl' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
  if (metric === 'height') return gender === 'girl' ? WHO_LENGTH_GIRLS : WHO_LENGTH_BOYS;
  return gender === 'girl' ? WHO_HEAD_GIRLS : WHO_HEAD_BOYS;
}

export function getGrowthStandardData(
  metric: 'weight' | 'height' | 'head',
  gender?: string,
  standard: GrowthStandard = 'WHO',
): WHODataPoint[] {
  if (standard === 'CDC') {
    // Cradlyn charts currently cover birth to 24 months. CDC guidance uses the
    // WHO growth standard for this age range, so CDC requests intentionally
    // resolve to WHO reference data instead of fabricated parallel curves.
    return getWhoGrowthData(metric, gender);
  }

  return getWhoGrowthData(metric, gender);
}

export function getWHOData(metric: 'weight' | 'height' | 'head', gender?: string): WHODataPoint[] {
  return getGrowthStandardData(metric, gender, 'WHO');
}

export function getPercentile(
  value: number,
  ageMonths: number,
  metric: 'weight' | 'height' | 'head',
  gender?: string,
  standard: GrowthStandard = 'WHO',
): string {
  const data = getGrowthStandardData(metric, gender, standard);
  // Find closest age bracket
  let closest = data[0];
  for (const dp of data) {
    if (Math.abs(dp.ageMonths - ageMonths) < Math.abs(closest.ageMonths - ageMonths)) {
      closest = dp;
    }
  }
  if (value <= closest.p3) return '<3rd';
  if (value <= closest.p15) return '3rd-15th';
  if (value <= closest.p50) return '15th-50th';
  if (value <= closest.p85) return '50th-85th';
  if (value <= closest.p97) return '85th-97th';
  return '>97th';
}

export function vibrate(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
