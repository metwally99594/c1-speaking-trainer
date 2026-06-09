import type { TelcGrade } from '../models/types';

export interface TelcBenchmark {
  id: string;
  name: string;
  description: string;
  level: 'Excellent' | 'Good' | 'Borderline' | 'Weak';
  topic: string;
  transcript: string;
  duration: number;
  wpm: number;
  expectedGrades: TelcGrade;
  expectedReadinessMin: number;
  expectedReadinessMax: number;
  expectedLevel: 'Strong Pass' | 'Pass' | 'Borderline';
}

export const telcBenchmarks: TelcBenchmark[] = [
  // ===== EXCELLENT =====
  {
    id: 'excellent-1',
    name: 'Hervorragende Präsentation',
    description: 'Fortgeschrittene C1-Präsentation mit breitem Wortschatz, komplexen Satzstrukturen und klarer Argumentation.',
    level: 'Excellent',
    topic: 'Welche Bedeutung hat Bildung in der heutigen Gesellschaft?',
    transcript: `Bildung hat in der heutigen Gesellschaft eine fundamentale Bedeutung, die weit über den reinen Wissenserwerb hinausgeht. Meiner Meinung nach ist Bildung der Schlüssel zur persönlichen und beruflichen Entwicklung eines jeden Menschen. Einerseits ermöglicht sie den Zugang zu besseren Berufschancen, andererseits fördert sie auch die kritische Denkfähigkeit und die gesellschaftliche Teilhabe.

Darüber hinaus spielt Bildung eine entscheidende Rolle bei der Integration von Migranten. Beispielsweise bieten Sprachkurse und berufliche Qualifikationsmaßnahmen eine hervorragende Möglichkeit, neu zugewanderte Menschen in den Arbeitsmarkt zu integrieren. Dies ist nicht nur für die Betroffenen selbst von Vorteil, sondern auch für die Gesellschaft als Ganzes.

Hingegen muss man kritisch anmerken, dass das deutsche Bildungssystem nach wie vor mit erheblichen Herausforderungen konfrontiert ist. Insbesondere die soziale Ungleichheit beim Bildungszugang ist ein folgenschweres Problem, das dringend angegangen werden muss. Kinder aus bildungsfernen Familien haben es ungleich schwerer, akademische Erfolge zu erzielen.

Dennoch gibt es durchaus positive Entwicklungen. Die Digitalisierung eröffnet völlig neue Lernmöglichkeiten, und viele Bildungseinrichtungen nutzen bereits innovative Lehrmethoden. Folglich können wir davon ausgehen, dass sich die Bildungslandschaft in den kommenden Jahren grundlegend verändern wird.

Abschließend lässt sich sagen, dass Investitionen in Bildung die nachhaltigste Strategie für die Zukunft unserer Gesellschaft darstellen. Eine umfassende Bildung befähigt Menschen nicht nur zu beruflichem Erfolg, sondern auch zu einem aktiven und verantwortungsvollen Bürgersinn.`,
    duration: 165,
    wpm: 125,
    expectedGrades: {
      aufgabengerechtheit: 'A',
      flüssigkeit: 'A',
      repertoire: 'A',
      grammatischeRichtigkeit: 'A',
      ausspracheUndIntonation: 'A',
    },
    expectedReadinessMin: 85,
    expectedReadinessMax: 100,
    expectedLevel: 'Strong Pass',
  },

  // ===== GOOD =====
  {
    id: 'good-1',
    name: 'Gute Präsentation',
    description: 'Solide B2/C1-Präsentation mit angemessenem Wortschatz und klarer Struktur, aber weniger Variation.',
    level: 'Good',
    topic: 'Wie wichtig ist Ihrer Meinung nach Umweltschutz?',
    transcript: `Umweltschutz ist meiner Meinung nach sehr wichtig für unsere Zukunft. Wir müssen mehr für die Umwelt tun, weil die Probleme wie Klimawandel und Umweltverschmutzung immer größer werden. Ich finde, dass jeder Einzelne einen Beitrag leisten kann.

Zum Beispiel kann man weniger Plastik verwenden und mehr recyceln. Auch der öffentliche Nahverkehr ist eine gute Alternative zum Auto. Viele Menschen denken aber, dass das zu teuer oder zu schwer ist. Das finde ich nicht richtig.

Einerseits ist es gut, dass die Politik jetzt mehr für den Umweltschutz tut. Andererseits dauert es oft zu lange, bis neue Gesetze kommen. Die junge Generation ist sehr engagiert, aber sie braucht mehr Unterstützung von der Regierung.

Ich glaube, dass wir in Zukunft noch mehr tun müssen. Es gibt viele Möglichkeiten, umweltfreundlicher zu leben. Jeder sollte sich überlegen, was er persönlich verbessern kann. Das ist wichtig für unsere Kinder und Enkelkinder.`,
    duration: 150,
    wpm: 110,
    expectedGrades: {
      aufgabengerechtheit: 'B',
      flüssigkeit: 'B',
      repertoire: 'B',
      grammatischeRichtigkeit: 'B',
      ausspracheUndIntonation: 'B',
    },
    expectedReadinessMin: 65,
    expectedReadinessMax: 84,
    expectedLevel: 'Pass',
  },

  // ===== BORDERLINE =====
  {
    id: 'borderline-1',
    name: 'Grenzwertige Präsentation',
    description: 'B1/B2-Präsentation mit einfachem Wortschatz, Wiederholungen und eingeschränkter Satzstruktur.',
    level: 'Borderline',
    topic: 'Sollte Plastik komplett verboten werden?',
    transcript: `Also, Plastik ist ein großes Problem für die Umwelt. Ich finde, man sollte weniger Plastik benutzen. Es gibt zu viel Plastik im Meer und das ist schlecht für die Tiere. In meiner Stadt gibt es schon viele Sachen ohne Plastik.

Aber ganz verboten? Das ist schwierig. Weil Plastik ist auch praktisch. Zum Beispiel im Krankenhaus oder für Lebensmittel. Man kann nicht alles verbieten. Ich denke, es kommt darauf an.

Wichtig ist, dass wir mehr recyceln. Und dass die Firmen weniger Plastik produzieren. Die Politik muss auch etwas machen. Aber es ist nicht einfach. Jeder muss seinen Teil dazu beitragen.

Ja, also, zusammenfassend finde ich, dass Plastik nicht komplett verboten werden sollte, aber wir müssen viel weniger davon benutzen. Das ist meine Meinung dazu.`,
    duration: 130,
    wpm: 95,
    expectedGrades: {
      aufgabengerechtheit: 'C',
      flüssigkeit: 'C',
      repertoire: 'C',
      grammatischeRichtigkeit: 'C',
      ausspracheUndIntonation: 'C',
    },
    expectedReadinessMin: 40,
    expectedReadinessMax: 64,
    expectedLevel: 'Borderline',
  },

  // ===== WEAK =====
  {
    id: 'weak-1',
    name: 'Schwache Präsentation',
    description: 'A2/B1-Präsentation mit sehr einfachem Wortschatz, kurzen Sätzen und wenig Struktur.',
    level: 'Weak',
    topic: 'Was sind die Vor- und Nachteile von Homeoffice?',
    transcript: `Homeoffice ist gut. Man kann zu Hause arbeiten. Das ist praktisch. Man spart Zeit für den Weg zur Arbeit. Das ist gut.

Aber es gibt auch Nachteile. Man ist allein. Man sieht die Kollegen nicht. Das ist nicht so gut. Ich arbeite lieber im Büro. Da sind mehr Leute.

Manchmal ist es schwer zu konzentrieren zu Hause. Kinder oder andere Sachen. Im Büro ist es besser. Aber für manche Leute ist Homeoffice gut.

Ich finde, man sollte beides machen. Ein bisschen zu Hause und ein bisschen im Büro. Das ist am besten.`,
    duration: 90,
    wpm: 85,
    expectedGrades: {
      aufgabengerechtheit: 'D',
      flüssigkeit: 'D',
      repertoire: 'D',
      grammatischeRichtigkeit: 'D',
      ausspracheUndIntonation: 'D',
    },
    expectedReadinessMin: 15,
    expectedReadinessMax: 39,
    expectedLevel: 'Borderline',
  },
];
