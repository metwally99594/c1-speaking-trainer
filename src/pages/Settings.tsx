import React, { useRef, useState } from 'react';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { Download, Upload, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const exportData = useTopicStore(state => state.exportData);
  const importData = useTopicStore(state => state.importData);
  const resetAll = useTopicStore(state => state.resetAll);
  
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
