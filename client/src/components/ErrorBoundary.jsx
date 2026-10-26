import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI exception captured by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    try {
      localStorage.removeItem('hms_user');
      localStorage.removeItem('hms_access_token');
      localStorage.removeItem('hms_refresh_token');
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-body, #f8fafc)',
          padding: '1.5rem',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-color, #e2e8f0)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 1.25rem',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary, #0f172a)',
              marginBottom: '0.5rem'
            }}>
              Something Went Wrong
            </h2>

            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary, #64748b)',
              marginBottom: '1.5rem',
              lineHeight: 1.5
            }}>
              An unexpected application error occurred while rendering this view. You can reload the page or reset your active session.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.04)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: '#ef4444',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.5rem',
                maxHeight: '100px'
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  background: '#0891b2',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} />
                Reload Page
              </button>

              <button
                onClick={this.handleResetSession}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--text-secondary, #64748b)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={15} />
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
