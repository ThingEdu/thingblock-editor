import type { ScratchStorage } from '@thingblock/thingblock-storage'
import type { ProjectId } from './reducers/project-state'

/** What the host gives the editor. */
export interface GUIConfig {
  storage: GUIStorage
}

/** Where the editor loads and saves projects. */
export interface GUIStorage {
  scratchStorage: ScratchStorage

  /** Called each time the project id changes. */
  setProjectMetadata?(projectId: ProjectId | null): void
  setTranslatorFunction?(formatMessageFn: TranslatorFunction): void

  saveProject(
    projectId: ProjectId | null | undefined,
    vmState: string,
    params: {
      originalId?: ProjectId
      isCopy?: boolean | 1
      isRemix?: boolean | 1
      title?: string
    },
  ): Promise<{ id: ProjectId }>
}

export type TranslatorFunction = (msgObj: MessageObject, options?: { index: number }) => string

/** A message to translate. */
export interface MessageObject {
  id: string
  description: string
  defaultMessage: string
}
