import { LOCAL_STORAGE_KEYS } from '../types';
import { SEED_TOPIC_PAIRS, SEED_ZITATE } from './seedData';

export function seedIfEmpty(): void {
  try {
    const existingPairs = localStorage.getItem(LOCAL_STORAGE_KEYS.TOPIC_PAIRS);
    const existingZitate = localStorage.getItem(LOCAL_STORAGE_KEYS.ZITATE);

    if (!existingPairs || JSON.parse(existingPairs).length === 0) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOPIC_PAIRS, JSON.stringify(SEED_TOPIC_PAIRS));
      console.log('[TELC] Seeded', SEED_TOPIC_PAIRS.length, 'topic pairs');
    }

    if (!existingZitate || JSON.parse(existingZitate).length === 0) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ZITATE, JSON.stringify(SEED_ZITATE));
      console.log('[TELC] Seeded', SEED_ZITATE.length, 'Zitate');
    }
  } catch (e) {
    console.error('[TELC] Seed failed:', e);
  }
}
