import type { VocabularyResult } from '../models/types';

const ADVANCED_VOCABULARY = new Set([
  'unerlässlich', 'vielschichtig', 'folgenschwer', 'nachhaltig', 'differenziert',
  'signifikant', 'kontrovers', 'ambitioniert', 'konsequent', 'substantiell',
  'paradox', 'redundant', 'implizieren', 'konstatieren', 'konsolidieren',
  'manifestieren', 'spezifizieren', 'legitimieren', 'quantifizieren', 'qualifizieren',
  'exponiert', 'reziprok', 'kongruent', 'heterogen', 'homogen',
  'omnipräsent', 'perpetuieren', 'proliferieren', 'sukzessive', 'extensiv',
  'obsessiv', 'peripher', 'akzentuiert', 'ambivalent', 'arbiträr',
  'dediziert', 'defizitär', 'dissonant', 'elaborieren', 'emsig',
  'essentiell', 'evident', 'fragil', 'fruchtbar', 'fundiert',
  'generieren', 'genuin', 'gravieren', 'immanent', 'indifferent',
  'inherent', 'innovativ', 'instrumentell', 'integral', 'intrinsisch',
  'kohärent', 'komparabel', 'kompatibel', 'komplex', 'komprimieren',
  'konziliant', 'korrelieren', 'kritisch', 'kurzfristig', 'langfristig',
  'marginal', 'multilateral', 'obrigkeitlich', 'operationalisieren', 'oppositionell',
  'originell', 'partizipieren', 'phänomenal', 'prädestiniert', 'prägnant',
  'prävalent', 'priorisieren', 'produktiv', 'progressiv', 'proportional',
  'rational', 'realistisch', 'reflektieren', 'relevant', 'resistent',
  'rigoros', 'simultan', 'solide', 'souverän', 'spekulativ',
  'stabil', 'strategisch', 'strukturell', 'suboptimal', 'symptomatisch',
  'tangieren', 'tendenziell', 'theoretisch', 'tragfähig', 'transparent',
  'umfassend', 'umstritten', 'unabhängig', 'unbestritten', 'unverhältnismäßig',
  'vehement', 'verifizieren', 'vertikal', 'visionär', 'vital',
]);

const BASIC_VOCABULARY_MAP: Record<string, string> = {
  gut: 'gut',
  schlecht: 'schlecht',
  wichtig: 'wichtig',
  groß: 'groß',
  klein: 'klein',
  viel: 'viel',
  wenig: 'wenig',
  neu: 'neu',
  alt: 'alt',
  schön: 'schön',
  hässlich: 'hässlich',
  einfach: 'einfach',
  schwer: 'schwer',
  leicht: 'leicht',
  schnell: 'schnell',
  langsam: 'langsam',
  teuer: 'teuer',
  billig: 'billig',
  interessant: 'interessant',
  langweilig: 'langweilig',
  richtig: 'richtig',
  falsch: 'falsch',
  toll: 'toll',
  super: 'super',
  nett: 'nett',
  böse: 'böse',
  glücklich: 'glücklich',
  traurig: 'traurig',
};

function getWords(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[.,!?;:()"']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

function scoreFromDiversityAndAdvanced(
  diversity: number,
  advancedRatio: number,
  totalWords: number
): VocabularyResult['level'] {
  if (totalWords < 20) return 'D';
  if (diversity >= 0.65 && advancedRatio >= 0.08) return 'A';
  if (diversity >= 0.5 && advancedRatio >= 0.04) return 'B';
  if (diversity >= 0.35 || advancedRatio >= 0.02) return 'C';
  return 'D';
}

const OVERUSED_THRESHOLD_BASE = 3;

export function analyzeVocabulary(transcript: string): VocabularyResult {
  const words = getWords(transcript);
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      uniqueWords: 0, totalWords: 0, diversity: 0,
      advancedCount: 0, overusedWords: [], basicWords: [],
      level: 'D',
    };
  }

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const uniqueWords = freq.size;
  const diversity = uniqueWords / totalWords;

  let advancedCount = 0;
  for (const w of freq.keys()) {
    if (ADVANCED_VOCABULARY.has(w)) {
      advancedCount += freq.get(w)!;
    }
  }
  const advancedRatio = advancedCount / totalWords;

  const overusedThreshold = Math.max(OVERUSED_THRESHOLD_BASE, Math.round(totalWords * 0.05));
  const overusedWords: { word: string; count: number }[] = [];
  const basicWords: { word: string; count: number }[] = [];

  for (const [word, count] of freq.entries()) {
    if (BASIC_VOCABULARY_MAP[word] && count >= 2) {
      basicWords.push({ word, count });
    }
    if (count >= overusedThreshold) {
      overusedWords.push({ word, count });
    }
  }

  overusedWords.sort((a, b) => b.count - a.count);
  basicWords.sort((a, b) => b.count - a.count);

  const level = scoreFromDiversityAndAdvanced(diversity, advancedRatio, totalWords);

  return {
    uniqueWords,
    totalWords,
    diversity,
    advancedCount,
    overusedWords,
    basicWords,
    level,
  };
}
