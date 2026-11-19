import classNames from 'classnames'
import styles from './divider.module.css'

/**
 * A dashed vertical rule between items in a row.
 * @param props - React props.
 * @param props.className - An extra class, to size or space the rule.
 * @returns An empty `div` drawn as the rule.
 */
const Divider = ({ className }: { className?: string }) => <div className={classNames(styles.divider, className)} />

export default Divider
