import React, { Component, ErrorInfo, ReactNode } from 'react';
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
    console.error('Pocket-Depo ErrorBoundary yakaladı:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Arayüz Kurtarma Modu</h1>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Beklenmeyen bir arayüz hatası oluştu. Verileriniz güvendedir (telefon hafızasında kayıtlıdır).
          </p>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Uygulamayı Yenile</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
