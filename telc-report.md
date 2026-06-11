# TELC C1 Mündlicher Ausdruck — Vollständiger Implementierungsbericht

---

## 1. Projektübersicht

**Projekt:** `c1-speaking-trainer` (Vite + TypeScript, React)  
**URL (Vercel):** https://c1-speaking-trainer.vercel.app/telc  
**Route:** `/telc` → `TELCModule`  
**Build Status:** ✅ Clean (TypeScript + Vite Build)

---

## 2. Architektur

### 2.1 Dateistruktur

```
src/components/telc/
├── TELCModule.tsx              # Phasen-Router (Hauptkomponente)
├── types.ts                    # Alle Typen, Konstanten, Durationen
├── scoring.ts                  # Bewertungssystem (48 Punkte, 29 Bestehen)
│
├── data/
│   └── telcContent.json        # 3 Themen + 3 Zitate (Platzhalter)
│
├── hooks/
│   ├── useSTT.ts               # MediaRecorder → Groq Whisper
│   ├── useTTS.ts               # SpeechSynthesis, de-DE
│   ├── useAIPartner.ts         # OpenRouter/Claude API-Aufrufe
│   └── useTELCSession.ts       # localStorage-Persistenz
│
├── components/
│   ├── Timer.tsx               # Countdown-Timer
│   ├── RecordButton.tsx        # Aufnahme-Button (4 States)
│   ├── TTSSpeaker.tsx          # Vorlese-UI
│   ├── GradeCard.tsx           # Einzelkriterium (Note + Punkte)
│   ├── ScoreBar.tsx            # Gesamtpunktzahl-Balken
│   └── TranscriptViewer.tsx    # Einklappbarer Transkript-Anzeiger
│
└── phases/
    ├── IdlePhase.tsx           # Themen & Zitat auswählen
    ├── PrepPhase.tsx           # 20 Min Vorbereitung + Timer
    ├── Teil1APhase.tsx         # 3 Min Präsentation aufnehmen
    ├── Teil1BAIPhase.tsx       # AI-Zusammenfassung hören + antworten
    ├── Teil1AAIPhase.tsx       # AI-Präsentation hören + Fragen
    ├── Teil1BCandidateListensPhase.tsx  # AI-Antworten hören
    ├── Teil2Phase.tsx          # 6 Min Diskussion (multi-turn)
    ├── EvaluationPhase.tsx     # AI-Bewertung anzeigen
    ├── SelfAssessPhase.tsx     # Selbsteinschätzung
    └── ResultsPhase.tsx        # Vollständiges Ergebnis + Transkripte

api/
├── anthropic.mjs              # Vercel Edge → OpenRouter (Claude Sonnet 4)
└── transcribe.mjs             # Vercel Edge → Groq Whisper
```

### 2.2 Prüfungsablauf (10 Phasen)

```
IDLE → PREP (20 Min) → TEIL_1A_CANDIDATE (3 Min) 
  → TEIL_1B_AI_LISTENS → TEIL_1A_AI_PRESENTS 
  → TEIL_1B_CANDIDATE_LISTENS → TEIL_2_DISKUSSION (6 Min) 
  → EVALUATION → SELF_ASSESSMENT → RESULTS
```

- **Teil 1A:** Kandidat hält Präsentation (3 Min) → wird transkribiert
- **Teil 1B:** AI fasst zusammen + stellt Fragen → Kandidat antwortet (1 Min) → AI-Präsentation aus anderem Blickwinkel → Kandidat fasst zusammen + fragt (1:30 Min) → AI antwortet
- **Teil 2:** Diskussion über Zitat (6 Min, ~6-8 Turns), AI als Gesprächspartner
- **Bewertung:** Claude evaluiert alle 7 Kriterien (A/B/C/D) → Punktberechnung (48 max, 29 bestanden)
- **Selbsteinschätzung:** Kandidat bewertet sich selbst (optional)
- **Ergebnis:** Vollständige Ansicht mit Noten, Feedback, Transkripten, Verlauf

---

## 3. Technische Details

### 3.1 Spracherkennung (useSTT.ts)

- **Kein Web Speech API** — reiner MediaRecorder-Ansatz
- **MIME-Fallback für Samsung:** `audio/webm;codecs=opus` → `audio/ogg;codecs=opus` → `audio/mp4` → `audio/webm`
- **Bitrate:** 128 kbps
- **API:** POST `/api/transcribe` (FormData mit `file`-Feld) → Groq `whisper-large-v3`, Sprache `de`
- **Fehlerbehandlung:** Fallback-Textarea bei Transkriptionsfehler
- **Ladezustände:** `recording` / `processing` / `transcript` / `fallbackMode` / `mediaError`

### 3.2 Sprachausgabe (useTTS.ts)

- `window.speechSynthesis`, `lang: de-DE`, `rate: 0.9`
- Deutsche Stimme wird automatisch gesucht
- Stop-/Cancel-Funktion, `speaking`-State

### 3.3 AI-Integration (useAIPartner.ts → api/anthropic.mjs)

- **Provider:** OpenRouter (nicht direkt Anthropic)
- **Model:** `claude-sonnet-4-20250514`
- **Endpunkt:** `https://openrouter.ai/api/v1/chat/completions` (OpenAI-kompatibel)
- **Env Variable:** `OPENROUTER_API_KEY`
- **Max Tokens:** 4096
- **3 Partner-Rollen:**
  - `TEIL_1B`: Zusammenfassung + 1-2 Fragen zur Kandidaten-Präsentation
  - `TEIL_1A`: Eigene Präsentation aus anderem Blickwinkel
  - `TEIL_2`: Diskussionspartner mit Meinung, Nachfragen, Gegenargumenten
- **Evaluator:** Prompt fordert JSON mit 7 Kriterien (A-D) + Feedback + Notizen

### 3.4 Transkription (api/transcribe.mjs)

- Vercel Edge Function, POST nur
- FormData → Groq `whisper-large-v3`, `language: de`
- Health-Check via GET
- **Env Variable:** `GROQ_API_KEY`

### 3.5 Bewertungssystem (scoring.ts)

| Kriterium | Max | A | B | C | D |
|-----------|-----|---|---|---|---|
| Aufgabengerechtheit 1A | 6 | 6 | 4 | 2 | 0 |
| Aufgabengerechtheit 1B | 4 | 4 | 2 | 1 | 0 |
| Diskussionsführung | 6 | 6 | 4 | 2 | 0 |
| Flüssigkeit | 8 | 8 | 5 | 2 | 0 |
| Repertoire | 8 | 8 | 5 | 2 | 0 |
| Grammatik | 8 | 8 | 5 | 2 | 0 |
| Aussprache | 8 | 8 | 5 | 2 | 0 |
| **Gesamt** | **48** | | | | |

**Bestehen:** ≥ 29 Punkte (60,4%)

### 3.6 Session-Persistenz (useTELCSession.ts)

- **Aktuelle Session:** `localStorage` Key `telc_session_current`
- **Verlauf:** `localStorage` Key `telc_history` (max 50 Einträge)
- Speichert Transkripte nach jeder Phase, AI-Bewertung, Selbsteinschätzung
- Löschen einzelner Verlaufseinträge möglich

### 3.7 UI-Entscheidungen

- **Dark Theme** durchgängig, mobile-first (max-width: 480px)
- **Kein `position: fixed`** — keine modalen Overlays
- **Tap-Ziele ≥ 44px** für Mobile
- **Farbcodierung:** Blau (AI/Aktion), Grün (Kandidat/Bestanden), Gelb (Warnung), Rot (Fehler/Nicht bestanden)
- **Ladezustände** bei allen API-Aufrufen
- **Fehlerbehandlung:** Überspringen-Buttons bei AI-Fehlern, Textarea-Fallback bei Transkriptionsfehlern

---

## 4. Was wurde erreicht?

- ✅ Vollständige 10-Phasen-Prüfungssimulation
- ✅ Kein Web Speech API für STT (MediaRecorder + Groq Whisper)
- ✅ Samsung-MIME-Fallback (`webm` → `ogg` → `mp4` → `webm`)
- ✅ Textarea-Fallback bei Transkriptionsfehlern
- ✅ OpenRouter statt direktem Anthropic-Zugriff
- ✅ 48-Punkte-Bewertungssystem mit Bestehensgrenze 29
- ✅ 3 KI-Rollen (Partner Zusammenfassung, Partner Präsentation, Diskutant)
- ✅ JSON-basierte Evaluierung durch Claude
- ✅ localStorage-Persistenz (aktuelle Session + Verlauf)
- ✅ Mobile-first Dark Theme
- ✅ TypeScript `strict`/`verbatimModuleSyntax` — keine `@ts-nocheck`
- ✅ Vercel Edge Functions für API-Proxy
- ✅ Build ✅ Clean
- ✅ Veröffentlicht auf Vercel mit `OPENROUTER_API_KEY` und `GROQ_API_KEY`

---

## 5. Noch offen / Nächste Schritte

### ⚠️ Kritisch vor dem Testen

1. **telcContent.json** ersetzen: Die aktuellen 3 Themen + 3 Zitate sind Platzhalter. Mohamed muss echte C1-Prüfungsinhalte einfügen (ca. 10-15 Themen, 10-15 Zitate).

### 🧪 Testen (physisches Gerät erforderlich)

2. **End-to-End-Test auf Samsung Android Chrome:**
   - Mikrofonzugriff erlauben
   - 30s deutsche Sprache aufnehmen
   - Transkript prüfen
   - AI-Evaluierung prüfen
   - MIME-Fallback-Logs prüfen

3. **End-to-End-Test auf Desktop Chrome:**
   - Gleiche Schritte wie oben

4. **OpenRouter-Fehlerbehandlung:**
   - Falls `/api/anthropic` Fehler wirft: API-Key prüfen, Modellverfügbarkeit prüfen

5. **Groq-Fehlerbehandlung:**
   - Falls `/api/transcribe` Fehler wirft: API-Key prüfen

### 🔧 Optional

6. UI-Tests (cypress oder playwright) für die Phasenabfolge
7. Lade-Indikatoren beim Phasenwechsel zwischen TEIL_1B_AI_LISTENS und TEIL_1A_AI_PRESENTS optimieren
8. `useCallback`-Abhängigkeiten in `TELCModule.tsx` überprüfen (aktuell funktional, aber Abhängigkeiten wie `transcripts` in `handleTeil1ATranscript` könnten stale closures verursachen)

---

## 6. Env-Vars (müssen in Vercel gesetzt sein)

| Variable | Zweck |
|----------|-------|
| `OPENROUTER_API_KEY` | Claude Sonnet 4 über OpenRouter |
| `GROQ_API_KEY` | Whisper Large v3 über Groq |

---

## 7. Git-Historie (letzte 20 Commits)

```
e18bcc4 fix: replace simulated STT with Groq Whisper via /api/transcribe, add MIME fallback
85a3eb9 add: new TELC C1 Hochschule speaking module with AI evaluation, summary, discussion
204b0ef remove: strip all TELC-specific code, types, store, routes, nav, services, and utils
[+ 17 ältere Commits mit Groq-Integration, WebRTC-Experimenten, etc.]
```
