import { Component, type ErrorInfo, type ReactNode } from 'react'
import { FormattedMessage } from 'react-intl'
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
    return (
      <div role="alert">
        <h2>
          <FormattedMessage
            defaultMessage="Oops! Something went wrong."
            description="Crash Message title"
            id="gui.crashMessage.label"
          />
        </h2>
        <button type="button" onClick={this.handleReload}>
          <FormattedMessage
            defaultMessage="Reload"
            description="Button to reload the page when page crashes"
            id="gui.crashMessage.reload"
          />
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
