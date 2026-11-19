import classNames from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import Modal from '../modal/modal'
import styles from './modal-upload.module.css'

const messages = defineMessages({
  title: {
    defaultMessage: 'Upload',
    description: 'Title of the modal that shows compile and upload progress',
    id: 'gui.uploadModal.title',
  },
  compiling: {
    defaultMessage: 'Compiling your project…',
    description: 'Status shown while the firmware is being compiled',
    id: 'gui.uploadModal.compiling',
  },
  uploading: {
    defaultMessage: 'Writing to your board…',
    description: 'Status shown while the compiled firmware is being flashed to the board',
    id: 'gui.uploadModal.uploading',
  },
  done: {
    defaultMessage: 'Your board is ready to go.',
    description: 'Status shown when the firmware has been flashed successfully',
    id: 'gui.uploadModal.done',
  },
  cancelled: {
    defaultMessage: 'Upload stopped.',
    description: 'Status shown when the user cancelled the compile or upload',
    id: 'gui.uploadModal.cancelled',
  },
  error: {
    defaultMessage: 'Upload didn’t finish.',
    description: 'Status shown when the compile or upload failed',
    id: 'gui.uploadModal.error',
  },
  showDetails: {
    defaultMessage: 'Details',
    description: 'Toggle that reveals the raw build and upload log',
    id: 'gui.uploadModal.showDetails',
  },
  cancel: {
    defaultMessage: 'Stop',
    description: 'Button that aborts the in-progress compile or upload',
    id: 'gui.uploadModal.cancel',
  },
  close: {
    defaultMessage: 'Close',
    description: 'Button that closes the upload modal once it has finished',
    id: 'gui.uploadModal.close',
  },
})

/** Where an upload is: compiling and uploading are in progress, the rest are its outcomes. */
export type UploadStatus = 'compiling' | 'uploading' | 'done' | 'cancelled' | 'error'

/** The compiler's progress through its phases. */
export interface UploadProgress {
  phase: string
  percent: number
}

// arduino-cli's upload tools (avrdude, esptool) paint their progress with ANSI cursor moves and carriage-return
// overwrites; stripping the escapes and flattening the overwrites leaves the log as plain text
// eslint-disable-next-line no-control-regex -- the escapes start with the ESC control character
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g
const cleanLog = (raw: string) =>
  raw
    .replace(ANSI, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

// The flash tools report no structured progress, so the bar follows the last `NN%` they printed
const lastPercent = (text: string) => {
  const matches = [...text.matchAll(/(\d{1,3}(?:\.\d+)?)\s*%/g)]
  return matches.length > 0 ? parseFloat(matches[matches.length - 1][1]) : null
}

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path
      d="M5 12.5l4.5 4.5L19 7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />
  </svg>
)

interface ModalUploadProps {
  /** The message of the error the upload failed with. */
  error: string | null
  /** The compile and upload output, in the chunks it arrived in. */
  logs: string[]
  onCancel: () => void
  onClose: () => void
  /** The compiler's progress, while compiling. */
  progress: UploadProgress | null
  status: UploadStatus
}

/**
 * The progress of compiling the project and writing it to the board, with the tools' log.
 * @param props - The upload's status, progress, log and error, and what stopping and closing do.
 * @returns The modal with the status, a progress bar while running, and the log.
 */
const ModalUpload = (props: ModalUploadProps) => {
  const { error, logs, onCancel, onClose, progress, status } = props
  const intl = useIntl()
  const logRef = useRef<HTMLPreElement>(null)
  const [showDetails, setShowDetails] = useState(status !== 'done' && status !== 'cancelled')
  const [detailsStatus, setDetailsStatus] = useState(status)
  const cleaned = useMemo(() => cleanLog(logs.join('')), [logs])

  // The log folds away on success and opens on failure, to show the cause
  if (status !== detailsStatus) {
    setDetailsStatus(status)
    if (status === 'done' || status === 'cancelled') setShowDetails(false)
    if (status === 'error') setShowDetails(true)
  }

  // Keeps the newest output in view as it streams in
  useEffect(() => {
    if (showDetails && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [cleaned, showDetails])

  const running = status === 'compiling' || status === 'uploading'
  let percent: number | null = null
  if (status === 'compiling' && progress) percent = progress.percent
  else if (status === 'uploading') percent = lastPercent(cleaned)
  const clampedPercent = percent === null ? null : Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <Modal
      className={styles.modalContent}
      contentLabel={intl.formatMessage(messages.title)}
      id="uploadModal"
      // Closing while running stops the upload first, so the helper isn't left building for a closed modal
      onRequestClose={running ? onCancel : onClose}
    >
      <div className={styles.body}>
        <div aria-live="polite" className={styles.statusRow}>
          <div
            className={classNames(styles.statusIcon, {
              [styles.statusIconRunning]: running,
              [styles.statusIconDone]: status === 'done',
              [styles.statusIconError]: status === 'error',
              [styles.statusIconCancelled]: status === 'cancelled',
            })}
          >
            {running && <span className={styles.spinner} />}
            {status === 'done' && <CheckIcon />}
            {status === 'error' && <span className={styles.glyph}>!</span>}
            {status === 'cancelled' && <span className={styles.glyph}>–</span>}
          </div>
          <div className={styles.statusText}>{intl.formatMessage(messages[status])}</div>
        </div>

        {running && (
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            // An indeterminate bar has no value
            aria-valuenow={clampedPercent ?? undefined}
            className={styles.progressTrack}
            role="progressbar"
          >
            {clampedPercent === null ? (
              <div className={styles.progressIndeterminate} />
            ) : (
              <div className={styles.progressBar} style={{ width: `${clampedPercent}%` }}>
                <span className={styles.progressValue}>{`${clampedPercent}%`}</span>
              </div>
            )}
          </div>
        )}

        {status === 'error' && error && <div className={styles.errorDetail}>{error}</div>}

        {cleaned && (
          <div className={styles.details}>
            <button
              aria-expanded={showDetails}
              className={styles.detailsToggle}
              type="button"
              onClick={() => {
                setShowDetails((open) => !open)
              }}
            >
              <span className={classNames(styles.chevron, { [styles.chevronOpen]: showDetails })}>▸</span>
              {intl.formatMessage(messages.showDetails)}
            </button>
            {showDetails && (
              <pre ref={logRef} className={styles.log}>
                {cleaned}
              </pre>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <button
            className={classNames(styles.actionButton, { [styles.actionButtonDanger]: running })}
            type="button"
            onClick={running ? onCancel : onClose}
          >
            {intl.formatMessage(running ? messages.cancel : messages.close)}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ModalUpload
