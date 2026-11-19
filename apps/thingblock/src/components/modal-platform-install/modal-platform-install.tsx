import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import log from '../../lib/log'
import { CLOUD_MODE } from '../../lib/settings/link-mode'
import Modal from '../modal/modal'
import styles from './modal-platform-install.module.css'

const messages = defineMessages({
  title: {
    defaultMessage: 'Board package',
    description: 'Title of the modal that offers to download a missing board package and shows its progress',
    id: 'gui.platformInstallModal.title',
  },
  prompt: {
    defaultMessage: 'The {name} board package isn’t installed. Download it now? This may take several minutes.',
    description: 'Question shown when the selected board needs a package that is not installed yet',
    id: 'gui.platformInstallModal.prompt',
  },
  installing: {
    defaultMessage: 'Downloading the {name} board package…',
    description: 'Status shown while the board package is being downloaded and installed',
    id: 'gui.platformInstallModal.installing',
  },
  done: {
    defaultMessage: 'The {name} board package is ready.',
    description: 'Status shown when the board package finished installing',
    id: 'gui.platformInstallModal.done',
  },
  cancelled: {
    defaultMessage: 'Download stopped.',
    description: 'Status shown when the user stopped the board package download',
    id: 'gui.platformInstallModal.cancelled',
  },
  error: {
    defaultMessage: 'Download didn’t finish.',
    description: 'Status shown when the board package download failed',
    id: 'gui.platformInstallModal.error',
  },
  showDetails: {
    defaultMessage: 'Details',
    description: 'Toggle that reveals the raw board package install log',
    id: 'gui.platformInstallModal.showDetails',
  },
  notNow: {
    defaultMessage: 'Not now',
    description: 'Button that dismisses the board package download offer',
    id: 'gui.platformInstallModal.notNow',
  },
  install: {
    defaultMessage: 'Download',
    description: 'Button that starts the board package download',
    id: 'gui.platformInstallModal.install',
  },
  cancel: {
    defaultMessage: 'Stop',
    description: 'Button that aborts the in-progress board package download',
    id: 'gui.platformInstallModal.cancel',
  },
  close: {
    defaultMessage: 'Close',
    description: 'Button that closes the board package modal once it has finished',
    id: 'gui.platformInstallModal.close',
  },
})

type InstallStatus = 'prompt' | 'installing' | 'done' | 'cancelled' | 'error'

interface Install {
  status: InstallStatus
  /** The package's name, as the helper's indexes give it. */
  platformName: string
  progress: { phase: string; percent: number } | null
  logs: string[]
  error: string | null
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

const DownloadIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path
      d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
    />
  </svg>
)

/**
 * Offers to download the selected board's package (a core such as `esp32:esp32`) when the link helper doesn't have
 * it, and shows the download's progress and log. Only the link helper installs packages, so in cloud mode it does
 * nothing.
 * @returns The modal, or nothing until there is a package to offer.
 */
const ModalPlatformInstall = () => {
  const intl = useIntl()
  const vm = useVm()
  const linkMode = useAppSelector((state) => state.scratchGui.settings.linkMode)
  const selectedDeviceId = useAppSelector((state) => state.scratchGui.board.selectedDeviceId)
  // The download the modal shows; null while it is closed
  const [install, setInstall] = useState<Install | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [detailsStatus, setDetailsStatus] = useState<InstallStatus | null>(null)
  const logRef = useRef<HTMLPreElement>(null)
  // The board last offered a download, so a dismissed offer doesn't come back until another board is offered one
  const promptedDeviceId = useRef<string | null>(null)
  const mounted = useRef(false)
  const status = install?.status ?? null
  const installing = status === 'installing'
  const joined = install ? install.logs.join('').trim() : ''

  // The log folds away on each new status, except a failure, which opens it to show the cause
  if (status !== detailsStatus) {
    setDetailsStatus(status)
    setShowDetails(status === 'error')
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    // A download in progress is never replaced by a new offer
    if (!selectedDeviceId || linkMode === CLOUD_MODE || installing) return
    if (promptedDeviceId.current === selectedDeviceId) return
    let stale = false
    vm.link
      .getPlatformStatus(selectedDeviceId)
      .then((platformStatus) => {
        // A reply for a board the user has moved on from is dropped
        if (stale || !platformStatus || platformStatus.installed) return
        if (!platformStatus.known) {
          log.warn(`ModalPlatformInstall: the helper's indexes don't list platform ${platformStatus.id}`)
          return
        }
        promptedDeviceId.current = selectedDeviceId
        setInstall({ status: 'prompt', platformName: platformStatus.name, progress: null, logs: [], error: null })
      })
      .catch((error: unknown) => {
        // An unreachable helper is shown by the upload, which needs it
        log.warn(`ModalPlatformInstall: getPlatformStatus failed: ${String(error)}`)
      })
    return () => {
      stale = true
    }
  }, [vm, selectedDeviceId, linkMode, installing])

  // Keeps the newest output in view as it streams in
  useEffect(() => {
    if (showDetails && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [joined, showDetails])

  if (!install) return null

  const update = (change: (current: Install) => Partial<Install>) => {
    if (!mounted.current) return
    setInstall((current) => current && { ...current, ...change(current) })
  }

  const handleInstall = () => {
    if (!selectedDeviceId) throw new Error('ModalPlatformInstall: no board is selected')
    update(() => ({ status: 'installing', progress: null, logs: [], error: null }))
    vm.link
      .installPlatform(selectedDeviceId, {
        onLog: (chunk) => {
          update((current) => ({ logs: [...current.logs, chunk] }))
        },
        onProgress: (progress) => {
          update(() => ({ progress }))
        },
      })
      .then(() => {
        update(() => ({ status: 'done' }))
      })
      .catch((error: unknown) => {
        // Stopping rejects the download with the helper's `cancelled` code
        if ((error as { code?: string } | null)?.code === 'cancelled') {
          update(() => ({ status: 'cancelled' }))
          return
        }
        update(() => ({ status: 'error', error: error instanceof Error ? error.message : String(error) }))
      })
  }

  const handleCancel = () => {
    // The stopped download rejects, which shows as cancelled
    vm.link.cancelPlatformInstall()
  }

  const handleClose = () => {
    setInstall(null)
  }

  const percent =
    installing && install.progress ? Math.max(0, Math.min(100, Math.round(install.progress.percent))) : null

  return (
    <Modal
      className={styles.modalContent}
      contentLabel={intl.formatMessage(messages.title)}
      id="platformInstallModal"
      // Closing while downloading stops first, so the helper isn't left downloading for a closed modal
      onRequestClose={installing ? handleCancel : handleClose}
    >
      <div className={styles.body}>
        <div aria-live="polite" className={styles.statusRow}>
          <div
            className={classNames(styles.statusIcon, {
              [styles.statusIconPrompt]: status === 'prompt',
              [styles.statusIconRunning]: installing,
              [styles.statusIconDone]: status === 'done',
              [styles.statusIconError]: status === 'error',
              [styles.statusIconCancelled]: status === 'cancelled',
            })}
          >
            {status === 'prompt' && <DownloadIcon />}
            {installing && <span className={styles.spinner} />}
            {status === 'done' && <CheckIcon />}
            {status === 'error' && <span className={styles.glyph}>!</span>}
            {status === 'cancelled' && <span className={styles.glyph}>–</span>}
          </div>
          <div className={styles.statusText}>
            {intl.formatMessage(messages[install.status], { name: install.platformName })}
          </div>
        </div>

        {installing && (
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            // An indeterminate bar has no value
            aria-valuenow={percent ?? undefined}
            className={styles.progressTrack}
            role="progressbar"
          >
            {percent === null ? (
              <div className={styles.progressIndeterminate} />
            ) : (
              <div className={styles.progressBar} style={{ width: `${percent}%` }}>
                <span className={styles.progressValue}>{`${percent}%`}</span>
              </div>
            )}
          </div>
        )}

        {installing && install.progress?.phase && <div className={styles.phase}>{install.progress.phase}</div>}

        {status === 'error' && install.error && <div className={styles.errorDetail}>{install.error}</div>}

        {joined && (
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
                {joined}
              </pre>
            )}
          </div>
        )}

        <div className={styles.footer}>
          {status === 'prompt' ? (
            <>
              <button
                className={classNames(styles.actionButton, styles.actionButtonSecondary)}
                type="button"
                onClick={handleClose}
              >
                {intl.formatMessage(messages.notNow)}
              </button>
              <button className={styles.actionButton} type="button" onClick={handleInstall}>
                {intl.formatMessage(messages.install)}
              </button>
            </>
          ) : (
            <button
              className={classNames(styles.actionButton, { [styles.actionButtonDanger]: installing })}
              type="button"
              onClick={installing ? handleCancel : handleClose}
            >
              {intl.formatMessage(installing ? messages.cancel : messages.close)}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ModalPlatformInstall
