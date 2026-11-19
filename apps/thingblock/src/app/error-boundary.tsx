import { Component, type ErrorInfo, type ReactNode } from 'react'
import CrashMessage from '../components/crash-message/crash-message'
import log from '../lib/log'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  crashed: boolean
}

/** Shows a crash message, with a way to reload, in place of a tree that threw while rendering. */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { crashed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error(`Unhandled error: ${error.stack ?? error.message}\nComponent stack: ${errorInfo.componentStack ?? ''}`)
  }

  handleReload = () => {
    window.location.replace(window.location.origin + window.location.pathname)
  }

  render() {
    if (!this.state.crashed) return this.props.children
    return <CrashMessage onReload={this.handleReload} />
  }
}

export default ErrorBoundary
