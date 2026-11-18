import { ScratchStorage } from '@thingblock/thingblock-storage'
import type { GUIStorage, TranslatorFunction } from '../../gui-config'
import { type ProjectId, defaultProjectId } from '../../reducers/project-state'
import defaultProject from './default-project'

/** Storage that serves only the default project; projects are opened from and saved to files instead. */
export class LegacyStorage implements GUIStorage {
  private translator?: TranslatorFunction

  readonly scratchStorage = new ScratchStorage()

  constructor() {
    this.cacheDefaultProject()
  }

  setProjectMetadata(projectId: ProjectId | null): void {
    const { RequestMetadata, setMetadata, unsetMetadata } = this.scratchStorage.scratchFetch

    // The default project's id is not a real project id, so it carries no project id metadata.
    if (projectId && String(projectId) !== defaultProjectId) {
      setMetadata(RequestMetadata.ProjectId, String(projectId))
    } else {
      unsetMetadata(RequestMetadata.ProjectId)
    }
  }

  setTranslatorFunction(translator: TranslatorFunction): void {
    this.translator = translator

    this.cacheDefaultProject()
  }

  saveProject(): Promise<{ id: ProjectId }> {
    return Promise.reject(new Error('saveProject: no project server is configured'))
  }

  private cacheDefaultProject() {
    const storage = this.scratchStorage
    storage.builtinHelper._store(
      storage.AssetType.Project,
      storage.DataFormat.JSON,
      JSON.stringify(defaultProject(this.translator)),
      defaultProjectId,
    )
  }
}
