export type WordStatus = 'correct' | 'near-match' | 'incorrect' | 'missing' | 'extra';

export interface ComparedWord {
  text: string;
  status: WordStatus;
  similarity: number; // 0 to 1
  isImportant: boolean;
}

export interface DetailedAnalysis {
  accuracyScore: number;
  vocabularyScore: number;
  sentenceSimilarity: number;
  missingImportantWords: string[];
  extraWordsCount: number;
}

export interface ComparisonResultV2 {
  words: ComparedWord[];
  score: number;
  feedback: string;
  analysis: DetailedAnalysis;
}

const STOP_WORDS = new Set([
  'der', 'die', 'das', 'ein', 'eine', 'einer', 'eines', 'dem', 'den', 'des', 
  'am', 'im', 'in', 'an', 'auf', 'aus', 'bei', 'mit', 'nach', 'von', 'vor', 
  'zu', 'und', 'oder', 'aber', 'denn', 'doch', 'sondern', 'es', 'gibt', 
  'ist', 'sind', 'war', 'als', 'wie', 'so', 'dass', 'da', 'weil', 'wenn', 'um'
]);

const normalize = (text: string) => 
  text.toLowerCase().replace(/[.,!?;:]/g, '').trim();

const levenshtein = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

const getSimilarity = (a: string, b: string): number => {
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
};

export const compareSentencesV2 = (original: string, transcript: string): ComparisonResultV2 => {
  const originalWords = original.split(/\s+/).filter(Boolean);
  const transcriptWords = transcript.split(/\s+/).filter(Boolean);
  
  const normOriginal = originalWords.map(normalize);
  const normTranscript = transcriptWords.map(normalize);

  const result: ComparedWord[] = [];
  const matchedTranscriptIndices = new Set<number>();
  
  let vocabScoreTotal = 0;
  let vocabScorePossible = 0;
  const missingImportantWords: string[] = [];
  let extraWordsCount = 0;

  let transIdx = 0;

  for (let i = 0; i < normOriginal.length; i++) {
    const origNorm = normOriginal[i];
    const isImportant = !STOP_WORDS.has(origNorm) && origNorm.length > 3;
    const weight = isImportant ? 3 : 1;
    vocabScorePossible += weight;

    let bestMatchIdx = -1;
    let bestSim = 0;

    // Look ahead in transcript for a match
    for (let j = transIdx; j < Math.min(transIdx + 3, normTranscript.length); j++) {
      const sim = getSimilarity(origNorm, normTranscript[j]);
      if (sim > 0.7 && sim > bestSim) {
        bestSim = sim;
        bestMatchIdx = j;
      }
    }

    // Special check for German compounds split into two words in transcript
    if (bestMatchIdx === -1 && transIdx < normTranscript.length - 1) {
      const combined = normTranscript[transIdx] + normTranscript[transIdx + 1];
      const combinedSim = getSimilarity(origNorm, combined);
      if (combinedSim > 0.85) {
        result.push({ 
          text: originalWords[i], 
          status: 'near-match', 
          similarity: combinedSim, 
          isImportant 
        });
        vocabScoreTotal += combinedSim * weight;
        matchedTranscriptIndices.add(transIdx);
        matchedTranscriptIndices.add(transIdx + 1);
        transIdx += 2;
        continue;
      }
    }

    if (bestMatchIdx !== -1) {
      const status: WordStatus = bestSim === 1 ? 'correct' : 'near-match';
      result.push({ 
        text: originalWords[i], 
        status, 
        similarity: bestSim, 
        isImportant 
      });
      vocabScoreTotal += bestSim * weight;
      
      // Mark words in between as extra
      for (let k = transIdx; k < bestMatchIdx; k++) {
        matchedTranscriptIndices.add(k);
        result.push({ text: transcriptWords[k], status: 'extra', similarity: 0, isImportant: false });
        extraWordsCount++;
      }
      matchedTranscriptIndices.add(bestMatchIdx);
      transIdx = bestMatchIdx + 1;
    } else {
      result.push({ 
        text: originalWords[i], 
        status: 'missing', 
        similarity: 0, 
        isImportant 
      });
      if (isImportant) missingImportantWords.push(originalWords[i]);
    }
  }

  // Add remaining unmatched transcript words as extra
  for (let j = 0; j < normTranscript.length; j++) {
    if (!matchedTranscriptIndices.has(j)) {
      result.push({ text: transcriptWords[j], status: 'extra', similarity: 0, isImportant: false });
    }
  }
  extraWordsCount = transcriptWords.length - matchedTranscriptIndices.size;

  // Global Sentence Similarity
  const fullOrigNorm = normalize(original);
  const fullTransNorm = normalize(transcript);
  const sentenceSimilarity = getSimilarity(fullOrigNorm, fullTransNorm) * 100;

  const vocabularyScore = vocabScorePossible > 0 ? (vocabScoreTotal / vocabScorePossible) * 100 : 100;
  
  // Accuracy Score calculation
  // Base accuracy is the vocabulary score penalized by extra words
  const penalty = (extraWordsCount * 2);
  const accuracyScore = Math.max(0, Math.round(vocabularyScore - penalty));

  const feedback =
    accuracyScore >= 95 ? 'Sehr gut!' :
    accuracyScore >= 90 ? 'Gut gemacht!' :
    accuracyScore >= 80 ? 'Fast richtig. Bitte erneut versuchen.' :
    'Bitte wiederholen Sie den Satz.';

  return {
    words: result,
    score: accuracyScore,
    feedback,
    analysis: {
      accuracyScore,
      vocabularyScore: Math.round(vocabularyScore),
      sentenceSimilarity: Math.round(sentenceSimilarity),
      missingImportantWords,
      extraWordsCount,
    }
  };
};
