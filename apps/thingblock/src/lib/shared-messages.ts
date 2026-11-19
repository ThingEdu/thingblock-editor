import { defineMessages } from 'react-intl'

const sharedMessages = defineMessages({
  sprite: {
    defaultMessage: 'Sprite{index}',
    description: 'Default name for a new sprite, scratch will automatically adjust the number if necessary',
    id: 'gui.sharedMessages.sprite',
  },
  replaceProjectWarning: {
    id: 'gui.sharedMessages.replaceProjectWarning',
    defaultMessage: 'Replace contents of the current project?',
    description: 'Confirmation that user wants to overwrite the current project contents',
  },
  replaceProjectConfirm: {
    id: 'gui.sharedMessages.replaceProjectConfirm',
    defaultMessage: 'Replace',
    description: 'Button that confirms replacing the current project',
  },
  cancel: {
    id: 'gui.sharedMessages.cancel',
    defaultMessage: 'Cancel',
    description: 'Button that cancels a confirmation dialog',
  },
  loadFromComputerTitle: {
    id: 'gui.sharedMessages.loadFromComputerTitle',
    defaultMessage: 'Load from your computer',
    description: 'Title for uploading a project from your computer',
  },
})

export default sharedMessages
