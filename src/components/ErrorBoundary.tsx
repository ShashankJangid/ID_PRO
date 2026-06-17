import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 bg-red-50/30 border border-red-100 rounded-2xl max-w-lg mx-auto text-center my-8">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-500 mb-6">
            An error occurred while loading this section. Click below to try reloading.
          </p>
          {this.state.error && (
            <pre className="text-[10px] bg-gray-50 border border-gray-200 text-gray-400 p-3 rounded-lg font-mono text-left max-w-full overflow-auto mb-6">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
