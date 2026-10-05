import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
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
    console.error("Uncaught React UI error:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem("mis_user");
      localStorage.removeItem("mis_token");
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Application Glitch Detected
              </h2>
              <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/50 rounded-xl text-xs text-rose-200 font-mono text-left break-words">
                {this.state.error?.message || "An unexpected error occurred while rendering the UI."}
              </div>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Clear Session & Sign In</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
