import React, { useRef, useState, useEffect } from 'react';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { Download, Upload, Trash2, ShieldAlert, CheckCircle2, Volume2, Play } from 'lucide-react';

function getVoiceProvider(voice: SpeechSynthesisVoice): string {
  if (voice.name.includes('Microsoft')) return 'Microsoft';
  if (voice.name.includes('Google')) return 'Google';
  if (voice.name.includes('Apple')) return 'Apple';
  if (voice.name.includes('Amazon')) return 'Amazon';
  return voice.localService ? 'Local' : 'Network';
}

export default function Settings() {
  const exportData = useTopicStore(state => state.exportData);
  const importData = useTopicStore(state => state.importData);
  const resetAll = useTopicStore(state => state.resetAll);
  const voiceSettings = useTopicStore(state => state.voiceSettings);
  const updateVoiceSettings = useTopicStore(state => state.updateVoiceSettings);
  
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const germanVoices = voices.filter(v => v.lang.startsWith('de'));

  const handlePreview = () => {
    const utterance = new SpeechSynthesisUtterance(
      'Guten Tag! Ich freue mich, Ihnen meine Präsentation zu zeigen.'
    );
    const savedVoice = voiceSettings.voiceURI
      ? voices.find(v => v.voiceURI === voiceSettings.voiceURI)
      : null;
    const germanVoice = savedVoice || voices.find(v => v.lang.startsWith('de')) || voices[0];
    if (germanVoice) utterance.voice = germanVoice;
    utterance.lang = 'de-DE';
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `c1-trainer-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const success = importData(json);
      if (success) {
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    if (confirm('ACHTUNG: Dies wird alle Ihre Themen, Fortschritte und Prüfungsergebnisse unwiderruflich löschen. Fortfahren?')) {
      resetAll();
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <PageHeader title="Einstellungen & Backup" showBack />

      <div className="space-y-8">
        {/* Backup Section */}
        <section className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl">
           <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
             <Download size={20} className="text-blue-500" />
             Daten sichern
           </h3>
           <p className="text-gray-400 text-sm mb-8 leading-relaxed">
             Exportieren Sie alle Ihre Themen und Lernfortschritte in eine JSON-Datei, um sie später wiederherzustellen oder auf ein anderes Gerät zu übertragen.
           </p>
           <button 
             onClick={handleExport}
             className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all border border-gray-800"
           >
             <Download size={20} />
             Backup exportieren
           </button>
        </section>

        {/* Restore Section */}
        <section className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl">
           <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
             <Upload size={20} className="text-green-500" />
             Daten wiederherstellen
           </h3>
           <p className="text-gray-400 text-sm mb-8 leading-relaxed">
             Wählen Sie eine zuvor exportierte Backup-Datei aus, um Ihre Daten zu importieren. Bestehende Daten werden dabei überschrieben.
           </p>
           
           <input 
             type="file" 
             ref={fileInputRef}
             onChange={handleImport}
             accept=".json"
             className="hidden"
           />
           
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all border border-gray-800"
           >
             <Upload size={20} />
             Backup importieren
           </button>

           {importStatus === 'success' && (
             <div className="mt-4 flex items-center gap-2 text-green-500 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
               <CheckCircle2 size={18} />
               <span className="text-sm font-bold uppercase tracking-widest">Import erfolgreich!</span>
             </div>
           )}
           {importStatus === 'error' && (
             <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
               <ShieldAlert size={18} />
               <span className="text-sm font-bold uppercase tracking-widest">Import fehlgeschlagen. Ungültige Datei.</span>
             </div>
           )}
        </section>

        {/* TTS Settings Section */}
        <section className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl">
           <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
             <Volume2 size={20} className="text-blue-500" />
             Text-to-Speech Einstellungen
           </h3>

           {/* Voice Selector */}
           <div className="space-y-3 mb-8">
             <label className="block text-sm font-medium text-gray-400">Stimme</label>
             <select
               value={voiceSettings.voiceURI}
               onChange={(e) => updateVoiceSettings({ voiceURI: e.target.value })}
               className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
             >
               <option value="">Automatische Auswahl (bevorzugt Deutsch)</option>
               {germanVoices.length === 0 && (
                 <option value="" disabled>Keine deutschen Stimmen gefunden</option>
               )}
               {germanVoices.map((v) => (
                 <option key={v.voiceURI} value={v.voiceURI}>
                   {v.name} ({v.lang})
                 </option>
               ))}
             </select>

             {/* Selected voice details */}
             {voiceSettings.voiceURI && (() => {
               const selected = voices.find(v => v.voiceURI === voiceSettings.voiceURI);
               return selected ? (
                 <div className="flex flex-wrap gap-4 mt-3 text-xs">
                   <span className="text-gray-500">Name: <span className="text-gray-300 font-medium">{selected.name}</span></span>
                   <span className="text-gray-500">Sprache: <span className="text-gray-300 font-medium">{selected.lang}</span></span>
                   <span className="text-gray-500">Anbieter: <span className="text-gray-300 font-medium">{getVoiceProvider(selected)}</span></span>
                 </div>
               ) : null;
             })()}

             <button
               onClick={handlePreview}
               className="mt-3 flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-gray-800"
             >
               <Play size={16} />
               Stimme testen
             </button>
           </div>

           {/* Pitch Slider */}
           <div className="space-y-3 mb-6">
             <div className="flex justify-between items-center">
               <label className="text-sm font-medium text-gray-400">Tonhöhe</label>
               <span className="text-sm font-bold text-blue-500">{voiceSettings.pitch.toFixed(1)}</span>
             </div>
             <input
               type="range"
               min="0.8"
               max="1.2"
               step="0.1"
               value={voiceSettings.pitch}
               onChange={(e) => updateVoiceSettings({ pitch: parseFloat(e.target.value) })}
               className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
             <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
               <span>Tief (0.8)</span>
               <span>Normal (1.0)</span>
               <span>Hoch (1.2)</span>
             </div>
           </div>

           {/* Volume Slider */}
           <div className="space-y-3 mb-6">
             <div className="flex justify-between items-center">
               <label className="text-sm font-medium text-gray-400">Lautstärke</label>
               <span className="text-sm font-bold text-blue-500">{Math.round(voiceSettings.volume * 100)}%</span>
             </div>
             <input
               type="range"
               min="0"
               max="100"
               step="1"
               value={Math.round(voiceSettings.volume * 100)}
               onChange={(e) => updateVoiceSettings({ volume: parseInt(e.target.value) / 100 })}
               className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
             <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
               <span>Stumm (0)</span>
               <span>Normal (50%)</span>
               <span>Max (100%)</span>
             </div>
           </div>

           {/* Rate Slider */}
           <div className="space-y-3">
             <div className="flex justify-between items-center">
               <label className="text-sm font-medium text-gray-400">Sprechgeschwindigkeit</label>
               <span className="text-sm font-bold text-blue-500">{voiceSettings.rate.toFixed(1)}x</span>
             </div>
             <input
               type="range"
               min="0.5"
               max="2"
               step="0.1"
               value={voiceSettings.rate}
               onChange={(e) => updateVoiceSettings({ rate: parseFloat(e.target.value) })}
               className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
             <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
               <span>Langsam (0.5x)</span>
               <span>Normal (1x)</span>
               <span>Schnell (2x)</span>
             </div>
           </div>
        </section>

        {/* Reset Section */}
        <section className="bg-red-600/5 border border-red-500/20 rounded-3xl p-8 shadow-xl">
           <h3 className="text-xl font-bold text-red-500 mb-6 flex items-center gap-2">
             <ShieldAlert size={20} />
             Gefahrenzone
           </h3>
           <p className="text-red-400/60 text-sm mb-8 leading-relaxed">
             Setzen Sie die App in den Werkszustand zurück. Dies kann nicht rückgängig gemacht werden.
           </p>
           <button 
             onClick={handleReset}
             className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all border border-red-500/30"
           >
             <Trash2 size={20} />
             Alle Daten löschen
           </button>
        </section>
      </div>
    </div>
  );
}
