import {ScratchStorage} from '@thingblock/thingblock-storage';

import defaultProject from './default-project';
import {GUIStorage, TranslatorFunction} from '../gui-config';

export class LegacyStorage implements GUIStorage {
    private translator?: TranslatorFunction;

    readonly scratchStorage = new ScratchStorage();

    constructor () {
        this.cacheDefaultProject(this.scratchStorage);
    }

    setProjectMetadata (projectId: string | null | undefined): void {
        const {RequestMetadata, setMetadata, unsetMetadata} = this.scratchStorage.scratchFetch;

        // If project ID is '0' or zero, it's not a real project ID. In that case, remove the project ID metadata.
        // Same if it's null undefined.
        if (projectId && projectId !== '0') {
            setMetadata(RequestMetadata.ProjectId, projectId);
        } else {
            unsetMetadata(RequestMetadata.ProjectId);
        }
    }

    setTranslatorFunction (translator: TranslatorFunction): void {
        this.translator = translator;

        this.cacheDefaultProject(this.scratchStorage);
    }

    saveProject (): Promise<{id: string | number;}> {
        return Promise.reject(new Error('saveProject: no project server is configured'));
    }

    private cacheDefaultProject (storage: ScratchStorage) {
        const defaultProjectAssets = defaultProject(this.translator);
        defaultProjectAssets.forEach(asset => storage.builtinHelper._store(
            storage.AssetType[asset.assetType],
            storage.DataFormat[asset.dataFormat],
            asset.data,
            asset.id
        ));
    }
}
