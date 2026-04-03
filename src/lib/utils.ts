import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CARTOON_NICKNAMES, VIBRANT_COLORS } from '../constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getWeeklyNickname(ownerName: string, allOwners: string[] = []) {
  const now = new Date();
  
  // Reference Monday at 7:00 AM (Jan 1, 2024)
  const reference = new Date('2024-01-01T07:00:00Z');
  const diff = now.getTime() - reference.getTime();
  const weekIndex = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
  
  // To ensure uniqueness, we sort all owners and assign based on their position
  // If allOwners is not provided, we fallback to the stable hash method
  if (allOwners.length > 0) {
    const sortedOwners = [...new Set(allOwners.map(o => o.toLowerCase()))].sort();
    const ownerIdx = sortedOwners.indexOf(ownerName.toLowerCase());
    
    // Seeded shuffle of nicknames for this week
    const shuffled = [...CARTOON_NICKNAMES];
    let seed = weekIndex;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled[ownerIdx % shuffled.length];
  }

  // Fallback stable hash
  let hash = 0;
  const seed = `${ownerName}-${weekIndex}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const index = Math.abs(hash) % CARTOON_NICKNAMES.length;
  return CARTOON_NICKNAMES[index];
}

export function isTournamentDay() {
  const day = new Date().getDay();
  // 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
  return [0, 4, 5, 6].includes(day);
}

export function getTeamColor(ownerName: string) {
  let hash = 0;
  for (let i = 0; i < ownerName.length; i++) {
    hash = (hash << 5) - hash + ownerName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VIBRANT_COLORS.length;
  return VIBRANT_COLORS[index];
}
