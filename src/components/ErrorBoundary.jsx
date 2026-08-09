import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen font-sans text-[#333] p-5 text-center">
          <h1 className="text-fluid-xl mb-3">Something went wrong</h1>
          <p role="alert" className="mb-5 text-[#666]">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            aria-label="Try again"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="px-6 py-2.5 text-base border-none rounded-lg bg-[#3b82f6] text-white cursor-pointer"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
