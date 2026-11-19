import { FormattedMessage } from 'react-intl'
import Box from '../box/box'
import styles from './crash-message.module.css'
import reloadIcon from './reload.svg'

/**
 * The page shown in place of the editor after it crashed.
 * @param props - React props.
 * @param props.onReload - Called by the Reload button.
 * @returns An apology with a Reload button, filling the page.
 */
const CrashMessage = ({ onReload }: { onReload: () => void }) => (
  <div className={styles.crashWrapper}>
    <Box className={styles.body}>
      <img alt="" src={reloadIcon} />
      <h2>
        <FormattedMessage
          defaultMessage="Oops! Something went wrong."
          description="Crash Message title"
          id="gui.crashMessage.label"
        />
      </h2>
      <p>
        <FormattedMessage
          defaultMessage="Sorry, ThingBlock has crashed. Please reload the page to try again."
          description="Message to inform the user that page has crashed."
          id="gui.crashMessage.reloadToRetry"
        />
      </p>
      <button className={styles.reloadButton} type="button" onClick={onReload}>
        <FormattedMessage
          defaultMessage="Reload"
          description="Button to reload the page when page crashes"
          id="gui.crashMessage.reload"
        />
      </button>
    </Box>
  </div>
)

export default CrashMessage
