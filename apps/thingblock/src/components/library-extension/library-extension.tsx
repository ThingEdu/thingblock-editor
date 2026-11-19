import { defineMessages, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useVm } from '../../hooks/use-vm'
import extensions, { type ExtensionInfo } from '../../lib/extensions'
import { closeExtensionLibrary } from '../../reducers/modals'
import Library from '../library/library'
import LibraryExtensionCard from './library-extension-card'

const messages = defineMessages({
  extensionTitle: {
    defaultMessage: 'Choose an Extension',
    description: 'Heading for the extension library',
    id: 'gui.extensionLibrary.chooseAnExtension',
  },
})

const items = extensions.map((extension) => ({ ...extension, key: extension.extensionId }))

/**
 * The library of extensions, shown while its modal is open. Choosing one loads it, if it is not loaded yet.
 * @param props React props.
 * @param props.onCategorySelected - Called with the extension's id once it is loaded, to show its blocks.
 * @returns The library, or nothing while it is closed.
 */
const LibraryExtension = ({ onCategorySelected }: { onCategorySelected: (extensionId: string) => void }) => {
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const visible = useAppSelector((state) => state.scratchGui.modals.extensionLibrary)

  if (!visible) return null

  const handleItemSelected = ({ extensionId }: ExtensionInfo) => {
    if (vm.extensionManager.isExtensionLoaded(extensionId)) {
      onCategorySelected(extensionId)
    } else {
      void vm.extensionManager.loadExtensionURL(extensionId).then(() => {
        onCategorySelected(extensionId)
      })
    }
  }

  return (
    <Library
      id="extensionLibrary"
      items={items}
      renderItem={(item, onSelect) => (
        <LibraryExtensionCard
          description={item.description}
          extensionId={item.extensionId}
          iconURL={item.iconURL}
          insetIconURL={item.insetIconURL}
          name={item.name}
          onSelect={onSelect}
        />
      )}
      title={intl.formatMessage(messages.extensionTitle)}
      onItemSelected={handleItemSelected}
      onRequestClose={() => dispatch(closeExtensionLibrary())}
    />
  )
}

export default LibraryExtension
