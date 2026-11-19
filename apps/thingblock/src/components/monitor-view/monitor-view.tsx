import classNames from 'classnames'
import { type MouseEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import Fab from '../fab/fab'
import autoscrollIcon from './icon--autoscroll.svg'
import clearIcon from './icon--clear.svg'
import terminalIcon from './icon--terminal.svg'
import timestampIcon from './icon--timestamp.svg'
import styles from './monitor-view.module.css'

const MIN_HEIGHT = 48
const MAX_HEIGHT = 500
const DEFAULT_HEIGHT = 280

// An unbounded log slows the editor down once a chatty board floods it
const MAX_LOGS = 500

// The standard Arduino serial baud rates, slowest to fastest
const BAUD_RATES = [
  300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000,
]

// How close to the bottom, in pixels, the view still counts as following the newest line; absorbs sub-pixel scroll
// rounding
const BOTTOM_THRESHOLD = 16

const messages = defineMessages({
  actions: {
    defaultMessage: 'Monitor actions',
    description: 'Tooltip of the floating button that opens the serial monitor actions',
    id: 'gui.serialLog.actions',
  },
  autoscroll: {
    defaultMessage: 'Auto-scroll',
    description: 'Tooltip of the serial monitor action that turns auto-scrolling to new output on or off',
    id: 'gui.serialLog.autoscroll',
  },
  timestamps: {
    defaultMessage: 'Timestamps',
    description: 'Tooltip of the serial monitor action that shows or hides the time of each line',
    id: 'gui.serialLog.timestamps',
  },
  clearMonitor: {
    defaultMessage: 'Clear monitor',
    description: 'Accessible label for the button that clears all messages from the serial monitor',
    id: 'gui.serialLog.clearMonitor',
  },
  baudRate: {
    defaultMessage: 'Serial monitor baud rate',
    description: 'Accessible label for the dropdown that selects the serial monitor baud rate',
    id: 'gui.serialLog.baudRate',
  },
  baudOption: {
    defaultMessage: '{rate} baud',
    description: 'Label for a baud-rate option in the serial monitor, e.g. "115200 baud"',
    id: 'gui.serialLog.baudOption',
  },
  send: {
    defaultMessage: 'Send',
    description: 'Button label for sending a message from the serial monitor',
    id: 'gui.serialLog.send',
  },
  sendPlaceholder: {
    defaultMessage: 'Send message...',
    description: 'Placeholder text for the serial monitor message input',
    id: 'gui.serialLog.sendPlaceholder',
  },
  promptedInputPlaceholder: {
    defaultMessage: 'Type your answer...',
    description: 'Placeholder text for the monitor input when the program is waiting for a response',
    id: 'gui.serialLog.promptedInputPlaceholder',
  },
  jumpToLatest: {
    defaultMessage: 'Latest',
    description: 'Label for the button that scrolls the serial monitor back to the newest output',
    id: 'gui.serialLog.jumpToLatest',
  },
  jumpToLatestLabel: {
    defaultMessage: 'Scroll to latest output',
    description: 'Accessible label for the button that scrolls the serial monitor to the newest output',
    id: 'gui.serialLog.jumpToLatestLabel',
  },
})

/** One line of monitor output. */
export interface MonitorLog {
  message: string
}

/**
 * Appends monitor lines, dropping the oldest past the scrollback cap.
 * @param prev - The current lines.
 * @param additions - The lines to append.
 * @returns The capped lines.
 */
export const appendMonitorLogs = (prev: MonitorLog[], additions: MonitorLog[]) => {
  const next = prev.concat(additions)
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
}

interface MonitorViewProps {
  /** Whether the monitor fills the panel; otherwise it has its own height, which the user can drag. */
  fill?: boolean
  logs: MonitorLog[]
  /** The question the program waits for an answer to; null while it waits for none. */
  prompt?: string | null
  baudRate?: number
  /** Shows the baud rate choice. */
  onBaudChange?: (rate: number) => void
  onClear: () => void
  onSend: (value: string) => void
}

/**
 * A terminal: the output lines, which follow the newest unless the user scrolls up, and a line to send. It shows the
 * question while the program waits for an answer.
 * @param props - The lines, the question, the baud rate, and what clearing, sending and changing the rate do.
 * @returns The output lines over the input row.
 */
const MonitorView = (props: MonitorViewProps) => {
  const { baudRate, fill = false, logs, onBaudChange, onClear, onSend, prompt = null } = props
  const intl = useIntl()
  const hasPrompt = prompt !== null
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [inputValue, setInputValue] = useState('')
  const [shownPrompt, setShownPrompt] = useState(prompt)
  const [atBottom, setAtBottom] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Read by the effect that follows new lines, which would otherwise rerun on each change of `atBottom` and cut
  // short the smooth scroll to the latest line
  const atBottomRef = useRef(true)

  const follow = (value: boolean) => {
    atBottomRef.current = value
    setAtBottom(value)
  }

  // A new question starts with an empty answer
  if (prompt !== shownPrompt) {
    setShownPrompt(prompt)
    if (prompt !== null) setInputValue('')
  }

  useEffect(() => {
    if (prompt !== null) inputRef.current?.focus()
  }, [prompt])

  // Scrolls to the newest line before paint, so it never shows out of view first
  useLayoutEffect(() => {
    const el = contentRef.current
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight
  }, [logs])

  const handleScroll = () => {
    const el = contentRef.current
    if (!el) return
    follow(el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD)
  }

  const handleJumpToLatest = () => {
    const el = contentRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    follow(true)
  }

  const handleResizeMouseDown = (e: MouseEvent) => {
    const startY = e.clientY
    const startHeight = height
    const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const delta = startY - moveEvent.clientY
      setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + delta)))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    e.preventDefault()
  }

  const handleSend = () => {
    // An empty answer to a question is valid
    if (hasPrompt || inputValue.trim().length > 0) {
      onSend(inputValue)
      setInputValue('')
    }
  }

  return (
    <div className={classNames(styles.monitor, { [styles.fill]: fill })} style={fill ? undefined : { height }}>
      {!fill && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a drag handle; the keyboard has no use for it
        <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />
      )}
      <div className={styles.inner}>
        <div className={styles.contentWrap}>
          <div ref={contentRef} className={styles.content} onScroll={handleScroll}>
            {logs.map((entry, i) => (
              <div key={i} className={styles.entry}>
                {entry.message}
              </div>
            ))}
          </div>
          {!atBottom && (
            <button
              aria-label={intl.formatMessage(messages.jumpToLatestLabel)}
              className={styles.jumpButton}
              type="button"
              onClick={handleJumpToLatest}
            >
              <svg
                fill="none"
                height="14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
                width="14"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <FormattedMessage {...messages.jumpToLatest} />
            </button>
          )}
          <Fab
            className={styles.fab}
            img={terminalIcon}
            items={[
              { img: clearIcon, title: intl.formatMessage(messages.clearMonitor), onClick: onClear },
              { img: autoscrollIcon, title: intl.formatMessage(messages.autoscroll) },
              { img: timestampIcon, title: intl.formatMessage(messages.timestamps) },
            ]}
            title={intl.formatMessage(messages.actions)}
          />
        </div>
        {hasPrompt && <div className={styles.promptBanner}>{prompt}</div>}
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder={intl.formatMessage(hasPrompt ? messages.promptedInputPlaceholder : messages.sendPlaceholder)}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
          />
          {onBaudChange && (
            <select
              aria-label={intl.formatMessage(messages.baudRate)}
              className={styles.baudSelect}
              value={baudRate}
              onChange={(e) => {
                onBaudChange(Number(e.target.value))
              }}
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {intl.formatMessage(messages.baudOption, { rate })}
                </option>
              ))}
            </select>
          )}
          <button className={styles.sendButton} type="button" onClick={handleSend}>
            <FormattedMessage {...messages.send} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MonitorView
