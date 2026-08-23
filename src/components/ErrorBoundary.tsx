import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--bg-main)',
            color: 'var(--fg-main)',
            gap: '12px',
          }}
        >
          <AlertTriangle size={32} color="#f43f5e" />
          <div style={{ fontSize: '15px', fontWeight: 600 }}>
            {this.props.fallbackTitle || 'コンポーネントでエラーが発生しました'}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--fg-muted)',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '8px 12px',
              borderRadius: '6px',
              maxWidth: '80%',
            }}
          >
            {this.state.error?.message}
          </div>
          <button
            className="btn-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '8px' }}
          >
            <RefreshCw size={14} />
            <span>再試行</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
