import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. Receives the caught error. */
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches rendering errors in its subtree and renders a fallback UI.
 * Wrap route-level or widget-level subtrees with this component.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Replace with a monitoring service (e.g. Sentry) in production
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) return fallback(error);

      return (
        <div
          role="alert"
          className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <p className="text-lg font-semibold text-red-400">
            Что-то пошло не так
          </p>
          <p className="text-sm text-gray-500 max-w-sm">{error.message}</p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-gray-200 rounded-lg text-sm transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      );
    }

    return children;
  }
}
