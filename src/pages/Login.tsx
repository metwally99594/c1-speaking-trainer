import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { Shield, Mail, Lock, User as UserIcon, Check, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

const AVATARS = [
  '🤖', '🦁', '🦊', '🐯', '🦄', '🚀', '👑', '🎨', '🎸', '🧠', '🌟', '⚡'
];

export default function Login() {
  const navigate = useNavigate();
  const registerUser = useTopicStore(state => state.registerUser);
  const loginUser = useTopicStore(state => state.loginUser);

  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus.');
      return;
    }
    
    if (!isLoginTab && !name.trim()) {
      setError('Bitte geben Sie Ihren Namen ein.');
      return;
    }

    setLoading(true);

    // Artificial tiny delay for premium feel
    await new Promise(r => setTimeout(r, 800));

    try {
      if (isLoginTab) {
        const res = await loginUser(email, password);
        if (res.success) {
          setSuccess(true);
          setTimeout(() => navigate('/'), 400);
        } else {
          setError(res.error || 'Fehler beim Anmelden.');
        }
      } else {
        const res = await registerUser(name, email, password);
        if (res.success) {
          // Update avatar to the emoji selected
          const updateProfile = useTopicStore.getState().updateUserProfile;
          await updateProfile(name, selectedAvatar);
          
          setSuccess(true);
          setTimeout(() => navigate('/'), 400);
        } else {
          setError(res.error || 'Registrierung fehlgeschlagen.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Ein Systemfehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center relative py-12 px-4 overflow-hidden">
      {/* Soothing Animated Background */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-1"></div>
        <div className="aurora-blob aurora-2"></div>
        <div className="aurora-blob aurora-3"></div>
      </div>

      <div className="w-full max-w-md z-10 animate-fade-in-up">
        {/* Brand/Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-3xl shadow-xl shadow-blue-500/20 mb-4 animate-bounce" style={{ animationDuration: '3s' }}>
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight mb-2">
            C1 <span className="gradient-text font-black">Speaking Trainer</span>
          </h1>
          <p className="text-slate-500 text-sm">
            Simulieren Sie Ihre C1-Prüfung und meistern Sie Ihren Wortschatz.
          </p>
        </div>

        {/* Auth Panel Card */}
        <div className="glass-panel rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-800/60 bg-slate-900/30">
            <button
              onClick={() => { setIsLoginTab(true); setError(''); }}
              className={cn(
                "flex-1 py-4 text-center text-sm font-bold transition-all relative",
                isLoginTab ? "text-blue-500 bg-slate-950/40" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Anmelden
              {isLoginTab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              )}
            </button>
            <button
              onClick={() => { setIsLoginTab(false); setError(''); }}
              className={cn(
                "flex-1 py-4 text-center text-sm font-bold transition-all relative",
                !isLoginTab ? "text-blue-500 bg-slate-950/40" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Registrieren
              {!isLoginTab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Status alerts */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-pulse-subtle">
                <AlertCircle size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                <Check size={18} className="shrink-0" />
                <p>Erfolgreich! Weiterleitung...</p>
              </div>
            )}

            {/* Fields */}
            <div className="space-y-4">
              {!isLoginTab && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Vollständiger Name
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Max Mustermann"
                      className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Passwort
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Avatar selection for Signup */}
              {!isLoginTab && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Wähle deinen Avatar
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-3 bg-slate-950/30 border border-slate-800/80 rounded-2xl max-h-32 overflow-y-auto">
                    {AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all hover:scale-110",
                          selectedAvatar === emoji
                            ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-2 border-blue-500 shadow-md shadow-blue-500/10"
                            : "bg-slate-950/40 border border-slate-850 hover:bg-slate-900"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading || success}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-white gradient-btn flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                loading && "animate-pulse-subtle"
              )}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Wird verarbeitet...</span>
                </>
              ) : success ? (
                <span>Erfolgreich eingeloggt!</span>
              ) : isLoginTab ? (
                <span>Jetzt anmelden</span>
              ) : (
                <span>Konto erstellen</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
