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
    // When a new version is deployed, old chunk hashes (e.g. Settings-[hash].js) are replaced.
    // Detect "Failed to fetch dynamically imported module" or chunk load error and auto-reload once.
    const isChunkError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Loading chunk') ||
      error?.name === 'ChunkLoadError'

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('kormiis_chunk_reload')
      const now = Date.now()
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('kormiis_chunk_reload', String(now))
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = 
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk')

      return (
        <div className="flex flex-col items-center justify-center min-h-screen font-sans text-foreground p-5 text-center bg-background">
          <div className="glass-kormiis p-8 rounded-3xl max-w-md w-full border border-border/60 flex flex-col items-center gap-4">
            <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <span className="material-symbols-rounded text-2xl">sync</span>
            </div>
            <h1 className="text-fluid-lg font-bold m-0">
              {isChunkError ? 'App Update Available' : 'Something went wrong'}
            </h1>
            <p role="alert" className="text-fluid-sm text-muted-foreground m-0">
              {isChunkError 
                ? 'A new version of Kormiis was deployed. Please refresh to load the latest update.' 
                : (this.state.error?.message || 'An unexpected error occurred.')}
            </p>
            <button
              aria-label="Refresh application"
              onClick={() => {
                sessionStorage.removeItem('kormiis_chunk_reload')
                window.location.reload()
              }}
              className="px-6 py-2.5 text-sm font-semibold rounded-2xl bg-primary text-primary-foreground cursor-pointer transition-transform active:scale-95 shadow-sm"
            >
              Update & Refresh
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
