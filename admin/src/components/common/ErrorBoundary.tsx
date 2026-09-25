import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, CheckCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => window.location.reload();
  handleHome = () => (window.location.href = "/");
  handleCopy = () => {
    const text = `${this.state.error?.message}\n\n${this.state.error?.stack}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const { error, copied } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg w-full text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-danger-bg flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-danger" strokeWidth={1.5} />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Something went wrong
          </h1>
          <p className="text-muted mb-8 leading-relaxed">
            An unexpected error occurred. You can try reloading the page or go back to the dashboard.
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
            <button
              onClick={this.handleHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-muted text-foreground font-medium text-sm border border-border-light hover:bg-border-light transition-colors"
            >
              <Home className="w-4 h-4" />
              Go to Dashboard
            </button>
          </div>

          {/* Error details (collapsible) */}
          {error && (
            <details className="text-left bg-surface-muted rounded-xl border border-border-light overflow-hidden">
              <summary className="px-5 py-3 text-sm font-medium text-muted cursor-pointer hover:bg-border-light/50 transition-colors select-none">
                Error details
              </summary>
              <div className="px-5 pb-4 pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-danger">{error.name}</span>
                  <button
                    onClick={this.handleCopy}
                    className="inline-flex items-center gap-1 text-xs text-tertiary hover:text-foreground transition-colors"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-foreground font-medium mb-3">{error.message}</p>
                {error.stack && (
                  <pre className="text-xs text-tertiary bg-background rounded-lg p-3 overflow-x-auto max-h-48 leading-5 border border-border-light">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }
}
