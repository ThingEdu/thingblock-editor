import { useEffect, useState } from 'react'
import { defineMessages, type MessageDescriptor, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../../app/store'
import { useFileUploader } from '../../hooks/use-file-uploader'
import { useVm } from '../../hooks/use-vm'
import log from '../../lib/log'
import { closeExampleLibrary } from '../../reducers/modals'
import Library from '../library/library'
import LibraryExampleCard from './library-example-card'

const messages = defineMessages({
  title: {
    defaultMessage: 'Examples',
    description: 'Heading for the library of example projects bundled with the editor',
    id: 'gui.exampleLibrary.title',
  },
})

/** Labels for the example groups of the resource pack's index, keyed by the index's group name. */
const groupMessages: Record<string, MessageDescriptor> = defineMessages({
  'K12 cơ bản': {
    defaultMessage: 'K12 basics',
    description: 'Example library tag: basic lessons from the K1-K12 curriculum',
    id: 'gui.exampleLibrary.groupK12',
  },
  'Âm nhạc': {
    defaultMessage: 'Music',
    description: 'Example library tag: tunes played on the ThingBot buzzer',
    id: 'gui.exampleLibrary.groupMusic',
  },
  CoBot: {
    defaultMessage: 'CoBot',
    description: 'Example library tag: the CoBot line-following robot of the Maker Village',
    id: 'gui.exampleLibrary.groupCoBot',
  },
  FanRoc: {
    defaultMessage: 'FanRoc',
    description: 'Example library tag: competition robot samples for the FanRoc contest',
    id: 'gui.exampleLibrary.groupFanRoc',
  },
  'Camera AI': {
    defaultMessage: 'Camera AI',
    description: 'Example library tag: games played with a hand in front of the webcam, no board needed',
    id: 'gui.exampleLibrary.groupCameraAi',
  },
})

/** An example in the resource pack's `examples/index.json`. */
interface Example {
  id: string
  /** The example's `.tb` file, relative to the examples base. */
  file: string
  title: string
  group: string
  level?: number
  description?: string
  hardware?: string[]
}

interface ExampleIndex {
  groups: string[]
  examples: Example[]
}

/**
 * The library of the example projects the resource pack ships, shown while its modal is open. Choosing one opens it
 * as a project loaded from a file is.
 * @returns The library, or nothing while it is closed.
 */
const LibraryExample = () => {
  const intl = useIntl()
  const vm = useVm()
  const dispatch = useAppDispatch()
  const { loadExample } = useFileUploader()
  const visible = useAppSelector((state) => state.scratchGui.modals.exampleLibrary)
  const [loaded, setLoaded] = useState<{ base: string; index: ExampleIndex } | null>(null)

  useEffect(() => {
    if (!visible) return
    const base = vm.devices.getExamplesOrigin()
    if (!base || loaded?.base === base) return
    fetch(`${base}/index.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<ExampleIndex>
      })
      .then((index) => {
        setLoaded({ base, index })
      })
      .catch((error: unknown) => {
        log.warn(`LibraryExample: could not load ${base}/index.json: ${String(error)}`)
      })
  }, [vm, visible, loaded])

  if (!visible) return null

  // A group the editor has no label for is shown by its index name
  const groupLabel = (group: string) =>
    Object.hasOwn(groupMessages, group) ? intl.formatMessage(groupMessages[group]) : group

  const items = loaded
    ? loaded.index.examples.map((example) => ({
        ...example,
        key: example.id,
        name: example.title,
        tags: [example.group],
        url: `${loaded.base}/${example.file}`,
      }))
    : []
  const tags = (loaded?.index.groups ?? []).map((group) => ({ tag: group, label: groupLabel(group) }))

  return (
    <Library
      filterable
      id="exampleLibrary"
      items={items}
      renderItem={(item, onSelect) => (
        <LibraryExampleCard
          description={item.description}
          group={groupLabel(item.group)}
          hardware={item.hardware}
          level={item.level}
          name={item.title}
          onSelect={onSelect}
        />
      )}
      tags={tags}
      title={intl.formatMessage(messages.title)}
      onItemSelected={(item) => void loadExample({ url: item.url, title: item.title })}
      onRequestClose={() => dispatch(closeExampleLibrary())}
    />
  )
}

export default LibraryExample
