import type { RedemittelResult, ConnectorMatch } from '../models/types';

const REDEMITTEL_LIST: { connector: string; type: 'addition' | 'contrast' | 'consequence' | 'example' | 'concession' | 'structuring' }[] = [
  { connector: 'außerdem', type: 'addition' },
  { connector: 'darüber hinaus', type: 'addition' },
  { connector: 'des Weiteren', type: 'addition' },
  { connector: 'zudem', type: 'addition' },
  { connector: 'zusätzlich', type: 'addition' },
  { connector: 'nicht nur', type: 'addition' },
  { connector: 'sondern auch', type: 'addition' },
  { connector: 'einerseits', type: 'structuring' },
  { connector: 'andererseits', type: 'contrast' },
  { connector: 'hingegen', type: 'contrast' },
  { connector: 'demgegenüber', type: 'contrast' },
  { connector: 'im Gegensatz dazu', type: 'contrast' },
  { connector: 'wohingegen', type: 'contrast' },
  { connector: 'dagegen', type: 'contrast' },
  { connector: 'allerdings', type: 'concession' },
  { connector: 'jedoch', type: 'concession' },
  { connector: 'dennoch', type: 'concession' },
  { connector: 'trotzdem', type: 'concession' },
  { connector: 'obwohl', type: 'concession' },
  { connector: 'folglich', type: 'consequence' },
  { connector: 'daher', type: 'consequence' },
  { connector: 'deshalb', type: 'consequence' },
  { connector: 'deswegen', type: 'consequence' },
  { connector: 'aus diesem Grund', type: 'consequence' },
  { connector: 'infolgedessen', type: 'consequence' },
  { connector: 'zum Beispiel', type: 'example' },
  { connector: 'beispielsweise', type: 'example' },
  { connector: 'so zum Beispiel', type: 'example' },
  { connector: 'nämlich', type: 'example' },
  { connector: 'abschließend', type: 'structuring' },
  { connector: 'zusammenfassend', type: 'structuring' },
  { connector: 'im Hinblick auf', type: 'structuring' },
  { connector: 'was ... betrifft', type: 'structuring' },
  { connector: 'in Bezug auf', type: 'structuring' },
  { connector: 'hinsichtlich', type: 'structuring' },
  { connector: 'vor allem', type: 'addition' },
  { connector: 'insbesondere', type: 'addition' },
  { connector: 'besonders', type: 'addition' },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?;:()"']/g, ' ');
}

function scoreFromConnectorCount(total: number, totalWords: number): RedemittelResult['score'] {
  const ratio = total / Math.max(totalWords, 1) * 100;
  if (ratio >= 2.5 || total >= 12) return 'A';
  if (ratio >= 1.5 || total >= 7) return 'B';
  if (ratio >= 0.8 || total >= 3) return 'C';
  return 'D';
}

function levelEstimationFromScore(score: RedemittelResult['score']): string {
  switch (score) {
    case 'A': return 'Fortgeschritten (C1/C2) — breites Spektrum an komplexen Konnektoren';
    case 'B': return 'Gut entwickelt (B2/C1) — angemessene Nutzung von Konnektoren';
    case 'C': return 'Grundlegend (B1/B2) — einfache Konnektoren, wenig Variation';
    case 'D': return 'Eingeschränkt (A2/B1) — kaum Konnektoren, basale Satzverknüpfung';
  }
}

export function analyzeRedemittel(transcript: string): RedemittelResult {
  const normalized = normalize(transcript);
  const words = transcript.split(/\s+/).filter(Boolean);

  const matchCounts = new Map<string, number>();

  for (const entry of REDEMITTEL_LIST) {
    const pattern = entry.connector.toLowerCase();
    let count = 0;
    let idx = 0;
    while (idx < normalized.length) {
      const found = normalized.indexOf(' ' + pattern + ' ', idx);
      if (found === -1) break;
      count++;
      idx = found + pattern.length;
    }
    // Also check at start of string
    if (normalized.startsWith(pattern + ' ')) {
      count++;
    }
    if (count > 0) {
      matchCounts.set(entry.connector, count);
    }
  }

  const matches: ConnectorMatch[] = Array.from(matchCounts.entries())
    .map(([connector, count]) => ({ connector, count }))
    .sort((a, b) => b.count - a.count);

  const totalConnectors = matches.reduce((sum, m) => sum + m.count, 0);
  const uniqueConnectors = matches.length;
  const score = scoreFromConnectorCount(totalConnectors, words.length);

  return {
    totalConnectors,
    uniqueConnectors,
    matches,
    score,
    levelEstimation: levelEstimationFromScore(score),
  };
}
