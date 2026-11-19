import { useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import bottomBlock from './bottom-block.svg'
import styles from './loader.module.css'
import middleBlock from './middle-block.svg'
import topBlock from './top-block.svg'

const messages = [
  {
    message: (
      <FormattedMessage
        defaultMessage="Creating blocks …"
        description="One of the loading messages"
        id="gui.loader.message1"
      />
    ),
    weight: 50,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Loading sprites …"
        description="One of the loading messages"
        id="gui.loader.message2"
      />
    ),
    weight: 50,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Loading sounds …"
        description="One of the loading messages"
        id="gui.loader.message3"
      />
    ),
    weight: 50,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Loading extensions …"
        description="One of the loading messages"
        id="gui.loader.message4"
      />
    ),
    weight: 50,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Creating blocks …"
        description="One of the loading messages"
        id="gui.loader.message1"
      />
    ),
    weight: 20,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Herding cats …"
        description="One of the loading messages"
        id="gui.loader.message5"
      />
    ),
    weight: 1,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Transmitting nanos …"
        description="One of the loading messages"
        id="gui.loader.message6"
      />
    ),
    weight: 1,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Inflating gobos …"
        description="One of the loading messages"
        id="gui.loader.message7"
      />
    ),
    weight: 1,
  },
  {
    message: (
      <FormattedMessage
        defaultMessage="Preparing emojis …"
        description="One of the loading messages"
        id="gui.loader.message8"
      />
    ),
    weight: 1,
  },
]

const mainMessages = {
  'gui.loader.headline': (
    <FormattedMessage defaultMessage="Loading Project" description="Main loading message" id="gui.loader.headline" />
  ),
  'gui.loader.creating': (
    <FormattedMessage
      defaultMessage="Creating Project"
      description="Main creating message"
      id="gui.loader.creating"
    />
  ),
}

const totalWeight = messages.reduce((sum, m) => sum + m.weight, 0)

const chooseRandomMessage = () => {
  let rand = totalWeight * Math.random()
  return messages.findIndex((m) => (rand -= m.weight) <= 0)
}

/**
 * The full-panel loading screen: animated blocks, a headline, and a loading message that changes every 5 seconds.
 * @param props React props.
 * @param props.messageId - Which headline to show.
 * @returns The loading screen.
 */
const Loader = ({ messageId = 'gui.loader.headline' }: { messageId?: keyof typeof mainMessages }) => {
  const [messageNumber, setMessageNumber] = useState(chooseRandomMessage)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessageNumber(chooseRandomMessage())
    }, 5000)
    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return (
    <div className={styles.background}>
      <div className={styles.container}>
        <div className={styles.blockAnimation}>
          <img alt="" className={styles.topBlock} src={topBlock} />
          <img alt="" className={styles.middleBlock} src={middleBlock} />
          <img alt="" className={styles.bottomBlock} src={bottomBlock} />
        </div>
        <div className={styles.title}>{mainMessages[messageId]}</div>
        <div className={styles.messageContainerOuter}>
          <div
            className={styles.messageContainerInner}
            style={{ transform: `translate(0, -${messageNumber * 25}px)` }}
          >
            {messages.map((m, i) => (
              <div className={styles.message} key={i}>
                {m.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Loader
