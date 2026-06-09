import type { ArgumentationResult } from '../models/types';

const EXAMPLE_PATTERNS = [
  'zum Beispiel', 'beispielsweise', 'so zum Beispiel', 'ein Beispiel',
  'beispielhaft', 'exemplarisch', 'wie zum Beispiel', 'etwa',
];

const JUSTIFICATION_PATTERNS = [
  'meiner Meinung nach', 'meiner Ansicht nach', 'ich finde', 'ich denke',
  'ich glaube', 'meines Erachtens', 'aus meiner Sicht', 'ich bin der Meinung',
  'ich bin überzeugt', 'meiner Überzeugung nach', 'es ist meiner Ansicht nach',
  'ich vertrete die Auffassung', 'ich gehe davon aus', 'ich bin der Ansicht',
  'ich halte es für', 'es scheint mir', 'ich würde sagen',
];

const COUNTERARGUMENT_PATTERNS = [
  'einerseits', 'andererseits', 'hingegen', 'demgegenüber',
  'im Gegensatz dazu', 'wohingegen', 'dagegen', 'allerdings',
  'jedoch', 'dennoch', 'trotzdem', 'obwohl', 'obgleich',
  'während', 'wobei', 'selbst wenn', 'auch wenn', 'andererseits kann man',
  'auf der anderen Seite', 'dem steht gegenüber',
];

const CONCLUSION_PATTERNS = [
  'abschließend', 'zusammenfassend', 'fazit', 'im Großen und Ganzen',
  'alles in allem', 'letztlich', 'schlussendlich', 'letztendlich',
  'resümierend', 'abschließend lässt sich sagen', 'zusammenfassend kann man sagen',
  'im Endeffekt', 'unterm Strich', 'zusammenfassend lässt sich feststellen',
];

function normalize(text: string): string {
  return ' ' + text.toLowerCase().replace(/[.,!?;:()"']/g, ' ') + ' ';
}

function countPatterns(normalized: string, patterns: string[]): number {
  let count = 0;
  for (const p of patterns) {
    const pn = ' ' + p.toLowerCase() + ' ';
    let idx = 0;
    while (idx < normalized.length) {
      const found = normalized.indexOf(pn, idx);
      if (found === -1) break;
      count++;
      idx = found + pn.length;
    }
  }
  return count;
}

function findMatchedPatterns(normalized: string, patterns: string[]): string[] {
  const found: string[] = [];
  for (const p of patterns) {
    const pn = ' ' + p.toLowerCase() + ' ';
    if (normalized.includes(pn)) {
      found.push(p);
    }
  }
  return found;
}

function scoreFromPatterns(
  hasExamples: boolean,
  hasJustification: boolean,
  hasCounterarguments: boolean,
  hasConclusion: boolean,
  totalPatterns: number
): ArgumentationResult['score'] {
  const count = [hasExamples, hasJustification, hasCounterarguments, hasConclusion].filter(Boolean).length;
  if (count >= 4 && totalPatterns >= 10) return 'A';
  if (count >= 3 && totalPatterns >= 6) return 'B';
  if (count >= 2 && totalPatterns >= 3) return 'C';
  return 'D';
}

export function analyzeArgumentation(transcript: string): ArgumentationResult {
  const normalized = normalize(transcript);

  const exampleCount = countPatterns(normalized, EXAMPLE_PATTERNS);
  const justificationCount = countPatterns(normalized, JUSTIFICATION_PATTERNS);
  const counterargumentCount = countPatterns(normalized, COUNTERARGUMENT_PATTERNS);
  const conclusionCount = countPatterns(normalized, CONCLUSION_PATTERNS);

  const hasExamples = exampleCount > 0;
  const hasJustification = justificationCount > 0;
  const hasCounterarguments = counterargumentCount > 0;
  const hasConclusion = conclusionCount > 0;

  const foundExamples = findMatchedPatterns(normalized, EXAMPLE_PATTERNS);
  const foundJustifications = findMatchedPatterns(normalized, JUSTIFICATION_PATTERNS);
  const foundCounterarguments = findMatchedPatterns(normalized, COUNTERARGUMENT_PATTERNS);
  const foundConclusions = findMatchedPatterns(normalized, CONCLUSION_PATTERNS);

  const patternsFound = [
    ...foundExamples,
    ...foundJustifications.slice(0, 2),
    ...foundCounterarguments.slice(0, 2),
    ...foundConclusions,
  ];

  const totalPatterns = exampleCount + justificationCount + counterargumentCount + conclusionCount;

  return {
    hasExamples,
    hasJustification,
    hasCounterarguments,
    hasConclusion,
    patternsFound,
    score: scoreFromPatterns(hasExamples, hasJustification, hasCounterarguments, hasConclusion, totalPatterns),
  };
}
