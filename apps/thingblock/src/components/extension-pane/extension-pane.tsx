import type { ReactNode } from 'react'
import styles from './extension-pane.module.css'

interface ExtensionPaneProps {
  /** Shown at the left of the header. */
  title: ReactNode
  /** Controls at the right of the header. Its CSS can query the header's width as the `extension-pane-header` container. */
  actions?: ReactNode
  children: ReactNode
}

/**
 * The frame of an extension's pane in the side panel: a header with the pane's title and controls, over its content.
 * An extension names its pane in its `ExtensionInfo`.
 * @param props - The title, the header's controls and the content.
 * @returns A `section` with the header and the content.
 */
const ExtensionPane = (props: ExtensionPaneProps) => {
  const { actions, children, title } = props
  return (
    <section className={styles.extensionPane}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {actions}
      </div>
      {children}
    </section>
  )
}

export default ExtensionPane
