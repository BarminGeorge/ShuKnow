import { Component, ReactNode } from "react";
import { AlertTriangle, Home } from "lucide-react";

interface WorkspaceErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface WorkspaceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class WorkspaceErrorBoundary extends Component<
  WorkspaceErrorBoundaryProps,
  WorkspaceErrorBoundaryState
> {
  constructor(props: WorkspaceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): WorkspaceErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[WorkspaceErrorBoundary] Error in workspace:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-[#141414] border border-red-500/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-white">Ошибка в рабочей области</h2>
            </div>
            
            <p className="text-gray-400 mb-4">
              Произошла ошибка при отображении содержимого. Попробуйте вернуться в чат или перезагрузить страницу.
            </p>
            
            {this.state.error && (
              <div className="mb-6 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Детали ошибки:</p>
                <p className="text-sm text-red-400 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Вернуться в чат
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-3 px-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-medium transition-colors"
              >
                Перезагрузить
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
