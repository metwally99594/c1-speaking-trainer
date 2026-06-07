import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-gray-950 border border-gray-900 rounded-3xl p-10 shadow-2xl">
            <div className="bg-red-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            <h1 className="text-2xl font-black text-white mb-4">Etwas ist schief gelaufen.</h1>
            <p className="text-gray-500 mb-8">
              Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu oder setzen Sie die App zurück.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw size={20} />
                <span>Seite neu laden</span>
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('c1-speaking-trainer-storage');
                  window.location.href = '/';
                }}
                className="text-gray-600 hover:text-red-500 text-sm font-medium transition-colors"
              >
                Daten löschen & App zurücksetzen
              </button>
            </div>
            {this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-xs text-gray-700 cursor-pointer hover:text-gray-500 uppercase tracking-widest font-bold">
                  Fehlerdetails
                </summary>
                <pre className="mt-2 p-4 bg-black rounded-lg text-[10px] text-gray-600 overflow-auto max-h-40 font-mono">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
