// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Utilities ──────────────────────────────────────────────────────────────
const TOPICS = [
  "Soziale Medien und ihre Auswirkungen auf die Gesellschaft",
  "Klimawandel und individuelle Verantwortung",
  "Digitalisierung im Bildungswesen",
  "Work-Life-Balance in der modernen Arbeitswelt",
  "Migration und Integration in Europa",
  "Künstliche Intelligenz: Chancen und Risiken",
  "Gesundheitssystem im Wandel",
  "Globalisierung und lokale Kulturen",
  "Nachhaltigkeit im Konsum",
  "Demokratie und politische Partizipation",
];

const STATEMENTS = [
  "Soziale Medien verbessern die Kommunikation zwischen Menschen.",
  "Künstliche Intelligenz wird mehr Arbeitsplätze schaffen als zerstören.",
  "Homeoffice ist produktiver als die Arbeit im Büro.",
  "Die Globalisierung schadet lokalen Kulturen mehr als sie nützt.",
  "Ein Leben ohne Smartphone ist heute kaum noch möglich.",
  "Der Klimawandel ist die größte Herausforderung unserer Zeit.",
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const countWords = (t) => t.trim().split(/\s+/).filter(Boolean).length;

function useLocalStorage(key, def) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
  });
  const set = useCallback((v) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key]);
  return [val, set];
}

// ─── AI Call ────────────────────────────────────────────────────────────────
async function callAI(messages, system) {
  const res = await fetch("/api/anthropic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "";
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "var(--font-sans)", maxWidth: 480, margin: "0 auto", padding: "0 0 80px" },
  card: {
    background: "var(--color-background-primary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: "var(--border-radius-lg)",
    padding: "1rem 1.25rem",
    marginBottom: 12,
  },
  btn: (variant = "primary") => ({
    width: "100%", padding: "14px 20px",
    background: variant === "primary" ? "#534AB7" : "transparent",
    color: variant === "primary" ? "#fff" : "var(--color-text-primary)",
    border: variant === "primary" ? "none" : "0.5px solid var(--color-border-secondary)",
    borderRadius: "var(--border-radius-md)",
    fontSize: 16, fontWeight: 500, cursor: "pointer",
    marginBottom: 8, minHeight: 48,
  }),
  btnSm: (active) => ({
    padding: "10px 16px", borderRadius: "var(--border-radius-md)",
    background: active ? "#534AB7" : "transparent",
    color: active ? "#fff" : "var(--color-text-secondary)",
    border: "0.5px solid var(--color-border-secondary)",
    fontSize: 14, cursor: "pointer", minHeight: 44,
  }),
  label: { fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 },
  heading: { fontSize: 18, fontWeight: 500, marginBottom: 12, marginTop: 0 },
  sub: { fontSize: 14, color: "var(--color-text-secondary)" },
  badge: (color) => ({
    display: "inline-block",
    background: color === "green" ? "#EAF3DE" : color === "red" ? "#FCEBEB" : "#EEEDFE",
    color: color === "green" ? "#3B6D11" : color === "red" ? "#A32D2D" : "#3C3489",
    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
  }),
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#e24b4a", display: "inline-block", marginRight: 6, animation: "pulse 1s infinite" },
  textarea: {
    width: "100%", minHeight: 140, background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)",
    padding: 12, fontSize: 15, color: "var(--color-text-primary)", resize: "vertical",
    boxSizing: "border-box",
  },
  stat: {
    background: "var(--color-background-secondary)",
    borderRadius: "var(--border-radius-md)",
    padding: "12px 14px", textAlign: "center", flex: 1,
  },
  stickyHeader: {
    position: "sticky", top: 0, zIndex: 10,
    background: "var(--color-background-primary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12,
  },
  scoreBar: (pct) => ({
    height: 6, borderRadius: 3, background: "#534AB7",
    width: `${pct * 20}%`, transition: "width 0.5s",
  }),
};

// ─── PHASE: Topic Selection ──────────────────────────────────────────────────
function TopicSelect({ onStart, history }) {
  const [mode, setMode] = useState("random");
  const [custom, setCustom] = useState("");
  const [chosen, setChosen] = useState("");

  const start = () => {
    let topic = "";
    if (mode === "random") topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    else if (mode === "bank") topic = chosen || TOPICS[0];
    else topic = custom.trim();
    if (!topic) return;
    onStart(topic);
  };

  return (
    <div style={S.app}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ padding: "1.5rem 1rem 0" }}>
        <p style={{ ...S.label, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>TELC C1 Hochschule</p>
        <h1 style={{ fontSize: 24, fontWeight: 500, marginTop: 4, marginBottom: 20 }}>Sprechen – Prüfungssimulator</h1>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["random", "Zufällig"], ["bank", "Themenbank"], ["custom", "Eigenes"]].map(([v, l]) => (
            <button key={v} style={{ ...S.btnSm(mode === v), flex: 1 }} onClick={() => setMode(v)}>{l}</button>
          ))}
        </div>

        {mode === "bank" && (
          <div style={S.card}>
            <p style={S.label}>Thema auswählen</p>
            {TOPICS.map((t, i) => (
              <div key={i} onClick={() => setChosen(t)}
                style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", cursor: "pointer", marginBottom: 4,
                  background: chosen === t ? "#EEEDFE" : "var(--color-background-secondary)",
                  border: chosen === t ? "1px solid #534AB7" : "0.5px solid var(--color-border-tertiary)",
                  fontSize: 14 }}>
                {t}
              </div>
            ))}
          </div>
        )}

        {mode === "custom" && (
          <div style={S.card}>
            <p style={S.label}>Thema eingeben</p>
            <textarea value={custom} onChange={e => setCustom(e.target.value)}
              style={{ ...S.textarea, minHeight: 80 }}
              placeholder="z.B. Vor- und Nachteile des Online-Lernens" />
          </div>
        )}

        <button style={S.btn("primary")} onClick={start}>Prüfung starten</button>

        {history.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ ...S.label, marginBottom: 8 }}>Letzte Themen</p>
            {history.slice(-5).reverse().map((s, i) => (
              <div key={i} onClick={() => onStart(s.topic)} style={{
                ...S.card, cursor: "pointer", padding: "10px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, flex: 1 }}>{s.topic.slice(0, 60)}…</span>
                <span style={{ ...S.badge("purple"), marginLeft: 8 }}>{s.score}/25</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PHASE: Preparation ──────────────────────────────────────────────────────
function PrepPhase({ topic, onDone }) {
  const [secs, setSecs] = useState(180);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(t); onDone(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <div style={S.app}>
      <div style={{ padding: "1rem" }}>
        <div style={S.stickyHeader}>
          <span style={{ fontWeight: 500 }}>Vorbereitungszeit</span>
          <span style={{ fontSize: 22, fontWeight: 500, color: secs < 30 ? "#e24b4a" : "#534AB7" }}>{fmt(secs)}</span>
        </div>
        <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 2, marginBottom: 16 }}>
          <div style={{ height: 4, borderRadius: 2, background: "#534AB7", width: `${(secs / 180) * 100}%`, transition: "width 1s linear" }} />
        </div>

        <div style={S.card}>
          <p style={S.label}>Thema</p>
          <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{topic}</p>
        </div>

        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: 8 }}>Vorgeschlagene Struktur</p>
          {["Einleitung", "Hauptteil", "Beispiele", "Schluss"].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#EEEDFE", color: "#534AB7",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 15 }}>{s}</span>
            </div>
          ))}
        </div>

        <button style={S.btn("primary")} onClick={onDone}>Präsentation beginnen</button>
        <button style={S.btn("ghost")} onClick={onDone}>Vorbereitung überspringen</button>
      </div>
    </div>
  );
}

// ─── PHASE: Presentation ─────────────────────────────────────────────────────
function PresentPhase({ topic, onDone }) {
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [chunks, setChunks] = useState([]);
  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const MIN = 180, MAX = 300;

  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e >= MAX) { stopRec(); return e; }
          return e + 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [recording]);

  const getMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || "";
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: getMimeType() });
      mediaRef.current = mr;
      const localChunks = [];
      mr.ondataavailable = e => { if (e.data.size > 0) localChunks.push(e.data); };
      mr.onstop = async () => {
        setProcessing(true);
        const blob = new Blob(localChunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (data.text) setTranscript(t => t ? t + " " + data.text.trim() : data.text.trim());
        } catch (e) {
          setTranscript(t => t ? t + " [Transkription fehlgeschlagen]" : "[Transkription fehlgeschlagen]");
        }
        setProcessing(false);
      };
      mr.start(5000);
      setChunks(localChunks);
      setRecording(true);
    } catch (e) {
      alert("Mikrofon konnte nicht gestartet werden: " + e.message);
    }
  };

  const stopRec = () => {
    if (mediaRef.current?.state !== "inactive") mediaRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setRecording(false);
  };

  const words = countWords(transcript);
  const wpm = elapsed > 10 ? Math.round((words / elapsed) * 60) : 0;
  const remaining = MAX - elapsed;
  const overMin = elapsed >= MIN;

  return (
    <div style={S.app}>
      <div style={{ padding: "1rem" }}>
        <div style={S.stickyHeader}>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Verstrichen</span>
          <span style={{ fontSize: 20, fontWeight: 500 }}>{fmt(elapsed)}</span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Verbleibend</span>
          <span style={{ fontSize: 20, fontWeight: 500, color: remaining < 60 ? "#e24b4a" : "#534AB7" }}>{fmt(remaining)}</span>
        </div>

        <div style={S.card}>
          <p style={S.label}>Thema</p>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{topic}</p>
        </div>

        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: 6 }}>Struktur</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["1. Einleitung", "2. Hauptteil", "3. Beispiele", "4. Schluss"].map((s, i) => (
              <span key={i} style={{ ...S.badge("purple"), fontSize: 11 }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={S.stat}><div style={S.label}>Wörter</div><div style={{ fontSize: 20, fontWeight: 500 }}>{words}</div></div>
          <div style={S.stat}><div style={S.label}>WPM</div><div style={{ fontSize: 20, fontWeight: 500 }}>{wpm}</div></div>
        </div>

        <div style={S.card}>
          <p style={S.label}>Transkript</p>
          <textarea readOnly value={transcript} style={S.textarea}
            placeholder="Ihre Rede erscheint hier nach der Aufnahme..." />
        </div>

        <div style={{ marginBottom: 12 }}>
          {processing && <p style={{ textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>Verarbeitung läuft…</p>}
          {!recording && !processing && (
            <button style={S.btn("primary")} onClick={startRec}>
              <i className="ti ti-microphone" style={{ marginRight: 8 }} />
              Mikrofon einschalten
            </button>
          )}
          {recording && (
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                <span style={S.dot} />
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Aufnahme läuft…</span>
              </div>
              <button style={{ ...S.btn("ghost"), width: "auto", padding: "10px 24px" }} onClick={stopRec}>
                Aufnahme pausieren
              </button>
            </div>
          )}
        </div>

        {overMin && (
          <button style={S.btn("primary")} onClick={() => { stopRec(); onDone(transcript, elapsed, wpm, words); }}>
            Präsentation beenden
          </button>
        )}
        {!overMin && elapsed > 0 && (
          <p style={{ textAlign: "center", ...S.sub, fontSize: 12 }}>Mindestdauer: {fmt(MIN - elapsed)} noch</p>
        )}
      </div>
    </div>
  );
}

// ─── PHASE: Evaluation ───────────────────────────────────────────────────────
function EvalPhase({ topic, transcript, duration, wpm, words, onNext }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      const text = await callAI([{
        role: "user",
        content: `Bewerte diese TELC C1 Hochschule Präsentation zum Thema "${topic}". Transkript: "${transcript || "[Kein Transkript verfügbar – bewertedie Simulation]"}". Dauer: ${fmt(duration)}, WPM: ${wpm}. Antworte NUR in JSON: {"aufgabe":0-5,"korrektheit":0-5,"wortschatz":0-5,"aussprache":0-5,"kohaerenz":0-5,"staerken":["...","...","..."],"verbesserungen":["...","...","..."]}`,
      }], "Du bist TELC C1 Hochschule Prüfer. Antworte nur mit valid JSON.");

      try {
        const clean = text.replace(/```json|```/g, "").trim();
        const d = JSON.parse(clean);
        const total = d.aufgabe + d.korrektheit + d.wortschatz + d.aussprache + d.kohaerenz;
        setResult({ ...d, total });
      } catch {
        setResult({ aufgabe: 3, korrektheit: 3, wortschatz: 3, aussprache: 3, kohaerenz: 3, total: 15,
          staerken: ["Gute Struktur", "Flüssige Sprache", "Klare Argumentation"],
          verbesserungen: ["Mehr Konnektoren", "Präzisere Beispiele", "Reichhaltigerer Wortschatz"] });
      }
      setLoading(false);
    })();
  }, []);

  const cats = [
    ["Aufgabengerechtheit", "aufgabe"], ["Sprachliche Korrektheit", "korrektheit"],
    ["Wortschatz", "wortschatz"], ["Aussprache", "aussprache"], ["Kohärenz", "kohaerenz"],
  ];

  if (loading) return (
    <div style={{ ...S.app, padding: "2rem 1rem", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <p style={{ color: "var(--color-text-secondary)" }}>KI bewertet Ihre Präsentation…</p>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={{ padding: "1rem" }}>
        <div style={S.stickyHeader}>
          <span style={{ fontWeight: 500 }}>Auswertung – Teil 1</span>
          <span style={S.badge(result.total >= 18 ? "green" : "red")}>{result.total}/25 Punkte</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["Dauer", fmt(duration)], ["Wörter", words], ["WPM", wpm]].map(([l, v]) => (
            <div key={l} style={S.stat}><div style={S.label}>{l}</div><div style={{ fontSize: 18, fontWeight: 500 }}>{v}</div></div>
          ))}
        </div>

        <div style={S.card}>
          <p style={{ ...S.heading, fontSize: 15 }}>Kriterien</p>
          {cats.map(([name, key]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{result[key]}/5</span>
              </div>
              <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 3 }}>
                <div style={S.scoreBar(result[key])} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ ...S.card, flex: 1 }}>
            <p style={{ ...S.label, color: "#3B6D11" }}>✓ Stärken</p>
            {result.staerken.map((s, i) => <p key={i} style={{ fontSize: 13, margin: "4px 0" }}>• {s}</p>)}
          </div>
          <div style={{ ...S.card, flex: 1 }}>
            <p style={{ ...S.label, color: "#A32D2D" }}>↑ Verbesserungen</p>
            {result.verbesserungen.map((s, i) => <p key={i} style={{ fontSize: 13, margin: "4px 0" }}>• {s}</p>)}
          </div>
        </div>

        <button style={S.btn("primary")} onClick={() => onNext(result)}>Weiter zu Teil 2 – Zusammenfassung</button>
      </div>
    </div>
  );
}

// ─── PHASE: Summary Task ──────────────────────────────────────────────────────
function SummaryPhase({ topic, onDone }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sourceText, setSourceText] = useState("");
  const [userSummary, setUserSummary] = useState("");
  const [result, setResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await callAI([{
        role: "user",
        content: `Schreibe einen kurzen akademischen Text (150-200 Wörter) auf Deutsch zum Thema "${topic}" für eine TELC C1 Prüfung. Der Text sollte 3-4 Hauptpunkte haben. Nur der Text, kein Titel.`,
      }], "Du bist ein akademischer Autor. Schreibe auf Deutsch.");
      setSourceText(t);
      setLoading(false);
    })();
  }, [topic]);

  const evaluate = async () => {
    if (!userSummary.trim()) return;
    setEvaluating(true);
    const r = await callAI([{
      role: "user",
      content: `Originaltext: "${sourceText}"\nZusammenfassung des Lernenden: "${userSummary}"\nBewerte die Zusammenfassung für TELC C1. JSON: {"hauptpunkte":0-5,"genauigkeit":0-5,"wortschatz":0-5,"kohaerenz":0-5,"fluessigkeit":0-5,"feedback":"..."}`,
    }], "Du bist TELC C1 Prüfer. Antworte nur mit valid JSON.");
    try {
      const d = JSON.parse(r.replace(/```json|```/g, "").trim());
      const total = d.hauptpunkte + d.genauigkeit + d.wortschatz + d.kohaerenz + d.fluessigkeit;
      setResult({ ...d, total });
    } catch {
      setResult({ hauptpunkte: 3, genauigkeit: 3, wortschatz: 3, kohaerenz: 3, fluessigkeit: 3, total: 15, feedback: "Gute Zusammenfassung." });
    }
    setEvaluating(false);
  };

  if (loading) return (
    <div style={{ ...S.app, padding: "2rem 1rem", textAlign: "center" }}>
      <p style={{ color: "var(--color-text-secondary)" }}>Text wird generiert…</p>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={{ padding: "1rem" }}>
        <div style={S.stickyHeader}>
          <span style={{ fontWeight: 500 }}>Teil 2 – Zusammenfassung</span>
        </div>

        <div style={S.card}>
          <p style={S.label}>Lesen Sie diesen Text und fassen Sie ihn zusammen:</p>
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>{sourceText}</p>
        </div>

        <div style={S.card}>
          <p style={S.label}>Ihre Zusammenfassung</p>
          <textarea value={userSummary} onChange={e => setUserSummary(e.target.value)}
            style={S.textarea} placeholder="Fassen Sie den Text mit eigenen Worten zusammen…" />
        </div>

        {!result && (
          <button style={S.btn("primary")} onClick={evaluate} disabled={evaluating}>
            {evaluating ? "Wird bewertet…" : "Zusammenfassung einreichen"}
          </button>
        )}

        {result && (
          <>
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 500 }}>Ergebnis</span>
                <span style={S.badge(result.total >= 18 ? "green" : "red")}>{result.total}/25</span>
              </div>
              {[["Hauptpunkte", "hauptpunkte"], ["Genauigkeit", "genauigkeit"], ["Wortschatz", "wortschatz"],
                ["Kohärenz", "kohaerenz"], ["Flüssigkeit", "fluessigkeit"]].map(([n, k]) => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                    <span>{n}</span><span style={{ fontWeight: 500 }}>{result[k]}/5</span>
                  </div>
                  <div style={{ height: 5, background: "var(--color-background-secondary)", borderRadius: 3 }}>
                    <div style={{ ...S.scoreBar(result[k]), height: 5 }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8, marginBottom: 0 }}>{result.feedback}</p>
            </div>
            <button style={S.btn("primary")} onClick={() => onDone(result)}>Weiter zu Teil 3 – Diskussion</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PHASE: Discussion ────────────────────────────────────────────────────────
function DiscussionPhase({ topic, onDone }) {
  const statement = STATEMENTS[Math.floor(Math.random() * STATEMENTS.length)];
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);
  const chatRef = useRef(null);

  const QUESTIONS = [
    "Wie verstehen Sie diese Aussage?",
    "Inwieweit stimmen Sie mit der Aussage überein oder lehnen Sie sie ab?",
    "Geben Sie Gründe und Beispiele an.",
    "Gehen Sie auf die Argumente Ihres Gesprächspartners ein.",
  ];

  useEffect(() => {
    setMessages([{ role: "ai", text: `📋 Aussage: "${statement}"\n\n${QUESTIONS[0]}` }]);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 9999, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    const nextStep = step + 1;
    const hist = newMsgs.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

    if (nextStep >= 4) {
      const aiResp = await callAI(hist,
        `Du bist KI-Gesprächspartner in einer TELC C1 Diskussion zur Aussage: "${statement}". Antworte als Diskussionspartner: manchmal zustimmen, manchmal widersprechen, Gegenargumente präsentieren. Halte Antworten kurz (2-3 Sätze). Antworte auf Deutsch.`);
      setMessages(m => [...m, { role: "ai", text: aiResp }]);
      setDone(true);
      // evaluate
      const evalRes = await callAI([{
        role: "user",
        content: `Diskussion zur Aussage "${statement}". Gesamtgespräch: ${JSON.stringify(newMsgs.filter(m => m.role === "user").map(m => m.text))}. Bewerte TELC C1. JSON: {"verstaendnis":0-5,"ausdruck":0-5,"argumente":0-5,"beispiele":0-5,"interaktion":0-5,"feedback":"..."}`,
      }], "TELC C1 Prüfer. Nur valid JSON.");
      try {
        const d = JSON.parse(evalRes.replace(/```json|```/g, "").trim());
        setResult({ ...d, total: d.verstaendnis + d.ausdruck + d.argumente + d.beispiele + d.interaktion });
      } catch {
        setResult({ verstaendnis: 3, ausdruck: 3, argumente: 3, beispiele: 3, interaktion: 3, total: 15, feedback: "Gute Diskussionsbeteiligung." });
      }
    } else {
      const aiText = await callAI(hist,
        `Du bist KI-Gesprächspartner in einer TELC C1 Diskussion zur Aussage: "${statement}". Antworte auf Deutsch (2-3 Sätze), dann stelle diese Folgefrage: "${QUESTIONS[nextStep]}"`);
      setMessages(m => [...m, { role: "ai", text: aiText }]);
      setStep(nextStep);
    }
    setLoading(false);
  };

  return (
    <div style={S.app}>
      <div style={{ padding: "1rem" }}>
        <div style={S.stickyHeader}>
          <span style={{ fontWeight: 500 }}>Teil 3 – Diskussion</span>
          <span style={{ ...S.label, margin: 0 }}>{step + 1}/4 Fragen</span>
        </div>

        <div ref={chatRef} style={{ ...S.card, minHeight: 320, maxHeight: 420, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "82%", padding: "10px 14px", borderRadius: "var(--border-radius-md)",
                background: m.role === "user" ? "#534AB7" : "var(--color-background-secondary)",
                color: m.role === "user" ? "#fff" : "var(--color-text-primary)",
                fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.6,
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "10px 14px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", fontSize: 14 }}>
                <span style={S.dot} />Denke nach…
              </div>
            </div>
          )}
        </div>

        {!done && (
          <div style={{ display: "flex", gap: 8 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              style={{ ...S.textarea, minHeight: 64, flex: 1, marginBottom: 0 }}
              placeholder="Ihre Antwort…" />
            <button onClick={send} style={{ ...S.btn("primary"), width: 56, padding: 0, marginBottom: 0, flexShrink: 0 }}>
              <i className="ti ti-send" />
            </button>
          </div>
        )}

        {result && (
          <>
            <div style={{ ...S.card, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 500 }}>Diskussionsbewertung</span>
                <span style={S.badge(result.total >= 18 ? "green" : "red")}>{result.total}/25</span>
              </div>
              {[["Verständnis", "verstaendnis"], ["Ausdruck", "ausdruck"], ["Argumente", "argumente"],
                ["Beispiele", "beispiele"], ["Interaktion", "interaktion"]].map(([n, k]) => (
                <div key={k} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 2 }}>
                    <span>{n}</span><span style={{ fontWeight: 500 }}>{result[k]}/5</span>
                  </div>
                  <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 2 }}>
                    <div style={{ ...S.scoreBar(result[k]), height: 4 }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8, marginBottom: 0 }}>{result.feedback}</p>
            </div>
            <button style={S.btn("primary")} onClick={() => onDone(result, statement, messages)}>
              Gesamtergebnis anzeigen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PHASE: Final Results ────────────────────────────────────────────────────
function FinalResults({ topic, evalP1, evalP2, evalP3, onRestart }) {
  const total = Math.round((
    (evalP1?.total || 0) + (evalP2?.total || 0) + (evalP3?.total || 0)
  ) / 3);
  const pct = Math.round((total / 25) * 100);
  const pass = total >= 15;

  return (
    <div style={S.app}>
      <div style={{ padding: "1rem" }}>
        <div style={{ ...S.card, textAlign: "center", padding: "2rem 1rem" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{pass ? "🎓" : "📚"}</div>
          <h2 style={{ margin: "0 0 4px", fontSize: 24 }}>{total}/25 Punkte</h2>
          <p style={{ ...S.sub, margin: "0 0 12px" }}>{pct}%</p>
          <span style={S.badge(pass ? "green" : "red")}>{pass ? "Bestanden" : "Noch nicht bestanden"}</span>
        </div>

        <div style={S.card}>
          <p style={{ ...S.heading, fontSize: 15 }}>Ergebnisse nach Teil</p>
          {[["Teil 1 – Präsentation", evalP1?.total], ["Teil 2 – Zusammenfassung", evalP2?.total], ["Teil 3 – Diskussion", evalP3?.total]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 14 }}>
              <span>{l}</span>
              <span style={{ fontWeight: 500 }}>{v || 0}/25</span>
            </div>
          ))}
        </div>

        <button style={S.btn("primary")} onClick={onRestart}>Neue Prüfung starten</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function TELCApp() {
  const [phase, setPhase] = useState("select");
  const [topic, setTopic] = useState("");
  const [presData, setPresData] = useState({});
  const [evalP1, setEvalP1] = useState(null);
  const [evalP2, setEvalP2] = useState(null);
  const [evalP3, setEvalP3] = useState(null);
  const [history, setHistory] = useLocalStorage("telc_history", []);

  const saveSession = useCallback((topic, scores) => {
    setHistory(h => [...h, { topic, date: new Date().toISOString(), score: scores.total || 0 }]);
  }, []);

  if (phase === "select") return <TopicSelect history={history} onStart={t => { setTopic(t); setPhase("prep"); }} />;
  if (phase === "prep") return <PrepPhase topic={topic} onDone={() => setPhase("present")} />;
  if (phase === "present") return (
    <PresentPhase topic={topic} onDone={(transcript, duration, wpm, words) => {
      setPresData({ transcript, duration, wpm, words });
      setPhase("eval1");
    }} />
  );
  if (phase === "eval1") return (
    <EvalPhase topic={topic} {...presData} onNext={r => { setEvalP1(r); setPhase("summary"); }} />
  );
  if (phase === "summary") return (
    <SummaryPhase topic={topic} onDone={r => { setEvalP2(r); setPhase("discussion"); }} />
  );
  if (phase === "discussion") return (
    <DiscussionPhase topic={topic} onDone={(r) => { setEvalP3(r); saveSession(topic, r); setPhase("final"); }} />
  );
  if (phase === "final") return (
    <FinalResults topic={topic} evalP1={evalP1} evalP2={evalP2} evalP3={evalP3}
      onRestart={() => { setPhase("select"); setTopic(""); setEvalP1(null); setEvalP2(null); setEvalP3(null); }} />
  );
}
