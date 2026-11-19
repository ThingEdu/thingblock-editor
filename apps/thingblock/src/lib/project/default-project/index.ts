import sharedMessages from '../../shared-messages'
import messages from './messages'

interface MessageObject {
  id: string
  description: string
  defaultMessage: string
}

/** Localizes a message, as react-intl's `formatMessage` does. */
type TranslatorFunction = (message: MessageObject, values?: { index: number }) => string

// scratch-parser requires every target to carry a costume and a sounds list. Targets have neither, so the default
// project uses the VM's placeholder costume (see `serialization/sb3.js`), which references no asset data.
const PLACEHOLDER_COSTUME = {
  name: 'costume1',
  assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
  md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg',
  dataFormat: 'svg',
}

const defaultTranslator = (msgObj: MessageObject) => msgObj.defaultMessage

/**
 * Builds the project JSON of a new project: a stage with one variable, and the device target.
 * @param translator Localizes the default names.
 * @returns The project JSON.
 */
const defaultProject = (translator: TranslatorFunction = defaultTranslator) => ({
  targets: [
    {
      isStage: true,
      name: 'Stage',
      variables: {
        '`jEk@4|i[#Fk?(8x)AV.-my variable': [translator(messages.variable), 0],
      },
      lists: {},
      broadcasts: {},
      blocks: {},
      currentCostume: 0,
      costumes: [PLACEHOLDER_COSTUME],
      sounds: [],
    },
    {
      isStage: false,
      name: translator(sharedMessages.sprite, { index: 1 }),
      variables: {},
      lists: {},
      broadcasts: {},
      blocks: {},
      currentCostume: 0,
      costumes: [PLACEHOLDER_COSTUME],
      sounds: [],
    },
  ],
  meta: {
    semver: '3.0.0',
    vm: '0.1.0',
    agent: '',
  },
})

export default defaultProject
