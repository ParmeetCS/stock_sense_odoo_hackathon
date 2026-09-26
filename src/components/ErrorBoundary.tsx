import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

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
    console.error('Uncaught error in StockSense application:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-900 rounded-xl border border-red-500/30 shadow-2xl p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Application Error</h2>
            <p className="text-sm text-slate-400 mb-4">
              An unexpected runtime error occurred in StockSense module.
            </p>
            <pre className="text-xs bg-slate-950 p-3 rounded-lg text-left overflow-x-auto mb-4 text-red-300 font-mono">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer"
            >
              Reload StockSense Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
