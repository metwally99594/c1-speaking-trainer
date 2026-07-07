import type { WordStat } from '../models/types';

export const isWeakWord = (w: WordStat) =>
  (w.lastScore || 0) < 90 || (w.averageScore || 0) < 90;
