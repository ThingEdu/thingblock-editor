import type { ReactNode } from 'react'
import styles from './extension-pane.module.css'

/**
 * The frame of an extension's pane in the side panel. An extension names its pane in its `ExtensionInfo`.
 * @param props - React props.
 * @param props.children - The pane's content.
 * @returns A `section` around the content.
 */
const ExtensionPane = ({ children }: { children: ReactNode }) => (
  <section className={styles.extensionPane}>{children}</section>
)

export default ExtensionPane
