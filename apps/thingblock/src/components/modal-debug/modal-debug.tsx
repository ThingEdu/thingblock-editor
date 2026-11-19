import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { defineMessages, FormattedMessage, useIntl } from 'react-intl'
import ReactModal from 'react-modal'
import { KEY } from '../../lib/ui/navigation-keys'
import closeIcon from './icon--close.svg'
import debugIconInverted from './icon--debug-inverted.svg'
import debugIcon from './icon--debug.svg'
import nextIcon from './icon--next.svg'
import prevIcon from './icon--prev.svg'
import { sections } from './modal-debug-sections'
import styles from './modal-debug.module.css'

const messages = defineMessages({
  title: {
    defaultMessage: 'Debugging | Getting Unstuck',
    description: 'title for the debugging modal',
    id: 'gui.debugModal.title',
  },
  previous: {
    defaultMessage: 'Previous',
    description: 'Button to go to previous debugging topic',
    id: 'gui.debugModal.previous',
  },
  next: {
    defaultMessage: 'Next',
    description: 'Button to go to next debugging topic',
    id: 'gui.debugModal.next',
  },
})

const clampIndex = (index: number) => Math.max(0, Math.min(index, sections.length - 1))

interface ModalDebugProps {
  onClose: () => void
}

/**
 * Tips for finding what is wrong with a project, one topic at a time. The arrow keys step through the topics.
 * @param props - What closing the modal does.
 * @returns The modal, with the topic list and the selected topic.
 */
const ModalDebug = (props: ModalDebugProps) => {
  const { onClose } = props
  const intl = useIntl()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = sections[selectedIndex]

  const showPrevious = () => {
    setSelectedIndex((index) => clampIndex(index - 1))
  }
  const showNext = () => {
    setSelectedIndex((index) => clampIndex(index + 1))
  }

  // Loads every topic's image up front, so that stepping through the topics doesn't wait on each one
  useEffect(() => {
    sections.forEach((section) => {
      new Image().src = section.image
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEY.ARROW_LEFT || e.key === KEY.ARROW_UP) {
        e.preventDefault()
        setSelectedIndex((index) => clampIndex(index - 1))
      } else if (e.key === KEY.ARROW_RIGHT || e.key === KEY.ARROW_DOWN) {
        e.preventDefault()
        setSelectedIndex((index) => clampIndex(index + 1))
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <ReactModal
      isOpen
      className={styles.debugModalContainer}
      overlayClassName={styles.debugModalOverlay}
      onRequestClose={onClose}
    >
      <div className={styles.modalHeader}>
        <div className={styles.headerTitle}>
          <img alt="" className={styles.debugIcon} src={debugIcon} />
          <FormattedMessage {...messages.title} />
        </div>
        <button className={styles.closeButton} type="button" onClick={onClose}>
          <img alt="" src={closeIcon} />
        </button>
      </div>
      <div className={styles.modalContent}>
        <div className={styles.topicList}>
          {sections.map((section, index) => (
            <button
              key={section.id}
              className={classNames(styles.topicItem, styles.buttonStyleRemover, {
                [styles.active]: selectedIndex === index,
              })}
              tabIndex={-1}
              type="button"
              onClick={() => {
                setSelectedIndex(index)
              }}
            >
              <div className={styles.debugIcon}>
                <img
                  alt=""
                  className={classNames({ [styles.hidden]: selectedIndex !== index })}
                  src={debugIconInverted}
                />
              </div>
              <FormattedMessage {...(section.sectionTitle ?? section.title)} />
            </button>
          ))}
        </div>
        <div className={styles.infoContainer}>
          <div className={styles.textContainer}>
            <div className={styles.titleText}>
              <FormattedMessage {...selected.title} />
            </div>
            <div className={styles.description}>{selected.description}</div>
          </div>
          <div className={styles.imageContainer}>
            <img alt="" className={styles.topicImage} src={selected.image} />
          </div>
          <div className={styles.navigationButtons}>
            <button
              className={classNames(styles.buttonStyleRemover, styles.previousIcon, {
                [styles.hidden]: selectedIndex === 0,
              })}
              type="button"
              onClick={showPrevious}
            >
              <img alt={intl.formatMessage(messages.previous)} src={prevIcon} />
            </button>
            <button
              className={classNames(styles.nextIcon, styles.buttonStyleRemover, {
                [styles.hidden]: selectedIndex === sections.length - 1,
              })}
              type="button"
              onClick={showNext}
            >
              <img alt={intl.formatMessage(messages.next)} src={nextIcon} />
            </button>
          </div>
        </div>
      </div>
    </ReactModal>
  )
}

export default ModalDebug
