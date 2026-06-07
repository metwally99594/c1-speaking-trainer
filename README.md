# C1 Speaking Trainer

Ein professioneller Trainer zur Vorbereitung auf die deutsche C1-Prüfung (Goethe, Telc, ÖSD).

## Funktionen

- **Themen-Management:** Erstellen und organisieren Sie Ihre eigenen Präsentationsthemen.
- **Intelligentes Splitting:** Automatische Aufteilung von Texten in übbare Sätze (Auto, Satzzeichen, Zeilenumbruch, Manuell).
- **Word Focus Mode:** Klicken Sie auf einzelne Wörter im Feedback, um deren Aussprache gezielt zu üben.
- **Weak Words Dashboard:** Automatische Erkennung von Problemwörtern mit Statistik, Suche und Sortierung.
- **Tägliche Wiederholung:** Priorisierte Wiederholung der schwächsten Wörter.
- **Text-to-Speech:** Hören Sie die korrekte deutsche Aussprache mit einstellbarer Geschwindigkeit und Stimme.
- **Spracherkennung:** Üben Sie das Sprechen und erhalten Sie sofortiges Feedback auf Wortebene.
- **Vergleichs-Engine:** Levenshtein-basierte Fuzzy-Erkennung für fehlende, falsche oder zusätzliche Wörter.
- **Sprechgeschwindigkeit:** Analyse der Wörter pro Minute mit Zielbereich 100–140 WPM für C1-Niveau.
- **Spaced Repetition:** Intelligente Wiederholungszyklen basierend auf Ihrer Leistung.
- **Prüfungsmodus:** Simulieren Sie eine echte C1-Prüfung mit Zeitmessung, Sprechgeschwindigkeit und Anschlussfragen.
- **Backup & Datenschutz:** Alle Daten werden lokal im Browser gespeichert. Exportieren und importieren Sie Ihre Backups jederzeit.

## Installation

1. Projekt klonen oder herunterladen.
2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
3. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```
4. Produktions-Build erstellen:
   ```bash
   npm run build
   ```

## Browser-Anforderungen

Für die volle Funktionalität (Spracherkennung & Sprachausgabe) wird die Verwendung von **Google Chrome** oder **Microsoft Edge** empfohlen. Firefox und Safari unterstützen die Web Speech API derzeit nur eingeschränkt oder gar nicht für die deutsche Sprache.

## Technologie-Stack

- React 19 (TypeScript)
- Vite 8
- TailwindCSS 4
- Zustand (mit Persist-Middleware)
- Lucide React (Icons)
- Web Speech API (Lokal im Browser)

## Datenschutz

Diese Anwendung ist **Privacy-First**. Es werden keine Daten an einen Server gesendet. Die Spracherkennung und Sprachausgabe erfolgen lokal in Ihrem Browser. Ihre Lernfortschritte und Themen verlassen nie Ihr Gerät.

---
Viel Erfolg bei Ihrer C1-Prüfung!
