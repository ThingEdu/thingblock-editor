import classNames from 'classnames'
import { type ReactNode, useEffect } from 'react'
import { FormattedMessage } from 'react-intl'
import ReactModal from 'react-modal'
import { useAppSelector } from '../../app/store'
import backIcon from '../../lib/assets/icon--back.svg'
import helpIcon from '../../lib/assets/icon--help.svg'
import Box from '../box/box'
import ButtonClose from '../button-close/button-close'
import Button from '../button/button'
import styles from './modal.module.css'

interface ModalProps {
  children?: ReactNode
  className?: string
  /** The modal's title, shown in its header and read out as its label. */
  contentLabel: string
  /** Covers the whole editor, with a Back button in place of the close button. */
  fullScreen?: boolean
  headerClassName?: string
  headerImage?: string
  /** Names the modal's entry in the browser history. */
  id: string
  /** Shows a Help button in the header. */
  onHelp?: () => void
  onRequestClose: () => void
}

/**
 * A modal with a header holding its title and a way to close it. The browser's Back closes it too.
 * @param props - The modal's content, title, look and handlers.
 * @returns The modal, over the editor.
 */
const Modal = (props: ModalProps) => {
  const { children, className, contentLabel, fullScreen, headerClassName, headerImage, id, onHelp, onRequestClose } =
    props
  const isRtl = useAppSelector((state) => state.locales.isRtl)

  useEffect(() => {
    // One history entry per modal, so that Back closes it; a modal that opens again reuses its entry
    const historyState = `modal-${id}`
    if (history.state !== historyState) history.pushState(historyState, '')
  }, [id])

  useEffect(() => {
    const handlePopState = () => {
      onRequestClose()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [onRequestClose])

  return (
    <ReactModal
      isOpen
      className={classNames(styles.modalContent, className, { [styles.fullScreen]: fullScreen })}
      contentLabel={contentLabel}
      overlayClassName={styles.modalOverlay}
      onRequestClose={onRequestClose}
    >
      <Box dir={isRtl ? 'rtl' : 'ltr'} direction="column" grow={1}>
        <div className={classNames(styles.header, headerClassName)}>
          {onHelp ? (
            <div className={classNames(styles.headerItem, styles.headerItemHelp)}>
              <Button className={styles.helpButton} iconSrc={helpIcon} onClick={onHelp}>
                <FormattedMessage defaultMessage="Help" description="Help button in modal" id="gui.modal.help" />
              </Button>
            </div>
          ) : null}
          <div className={classNames(styles.headerItem, styles.headerItemTitle)}>
            {headerImage ? <img alt="" className={styles.headerImage} src={headerImage} /> : null}
            {contentLabel}
          </div>
          <div className={classNames(styles.headerItem, styles.headerItemClose)}>
            {fullScreen ? (
              <Button className={styles.backButton} iconSrc={backIcon} onClick={onRequestClose}>
                <FormattedMessage defaultMessage="Back" description="Back button in modal" id="gui.modal.back" />
              </Button>
            ) : (
              <ButtonClose size="large" onClick={onRequestClose} />
            )}
          </div>
        </div>
        {children}
      </Box>
    </ReactModal>
  )
}

export default Modal
