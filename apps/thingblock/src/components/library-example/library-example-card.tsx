import styles from './library-example-card.module.css'

interface ExampleCardProps {
  description?: string
  /** The example's group, as shown in the editor's language. */
  group: string
  /** The parts the example needs, as the example index names them. */
  hardware?: string[]
  /** How hard the example is, shown as that many stars. */
  level?: number
  name: string
  onSelect: () => void
}

/**
 * An example project's card in the example library. Its text is the example index's, as written.
 * @param props - The example's group, title, summary, level and hardware, and what choosing it does.
 * @returns A button with the example's group and level, title, summary and hardware list.
 */
const LibraryExampleCard = (props: ExampleCardProps) => {
  const { description, group, hardware = [], level = 1, name, onSelect } = props
  return (
    <div className={styles.card}>
      <button className={styles.selectButton} type="button" onClick={onSelect}>
        <span className={styles.group}>{`${group} · ${'★'.repeat(level)}`}</span>
        <span className={styles.name}>{name}</span>
        <span className={styles.description}>{description}</span>
        {hardware.length > 0 && (
          <ul className={styles.hardware}>
            {hardware.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ul>
        )}
      </button>
    </div>
  )
}

export default LibraryExampleCard
