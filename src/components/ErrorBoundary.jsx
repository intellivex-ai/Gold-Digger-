import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0D0E16',
          color: '#fff',
          padding: '32px 24px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: '#FF6B6B' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, maxWidth: 320 }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginBottom: 32, maxWidth: 320 }}>
          This error has been logged. Your progress is safe.
        </p>
        <button
          onClick={this.handleReset}
          style={{
            background: 'linear-gradient(180deg, #F5C842 0%, #C49B20 100%)',
            color: '#1A1200',
            fontWeight: 800,
            fontSize: 14,
            padding: '12px 32px',
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 0 #8B6A00, 0 6px 16px rgba(245,200,66,0.35)',
          }}
        >
          Return to Home
        </button>
      </div>
    )
  }
}
