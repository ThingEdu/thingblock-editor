import PropTypes from 'prop-types';
import {ScratchStorage} from '@thingblock/thingblock-storage';

export type GUIConfigFactory = () => GUIConfig;
export type ProjectId = string | number;

export interface GUIConfig {
    storage: GUIStorage;
}

export interface GUIStorage {
    scratchStorage: ScratchStorage;

    // Called multiple times (as changes happen)
    setProjectMetadata?(projectId: string | null | undefined): void;
    setTranslatorFunction?(formatMessageFn: TranslatorFunction): void;

    saveProject(
        projectId: ProjectId | null | undefined,
        vmState: string,
        params: {
            originalId?: ProjectId;
            isCopy?: boolean | 1;
            isRemix?: boolean | 1;
            title?: string;
        }
    ): Promise<{id: ProjectId}>;

    saveProjectThumbnail?(projectId: ProjectId, thumbnail: Blob, onSuccess?: () => void, onError?: () => void): void;
}

export type TranslatorFunction = (
    msgObj: MessageObject,
    options?: {index: number}
) => string;

export interface MessageObject {
    id: string;
    description: string;
    defaultMessage: string;
}

export const GUIStoragePropType = PropTypes.shape({
    scratchStorage: PropTypes.object.isRequired,

    setProjectMetadata: PropTypes.func,
    setTranslatorFunction: PropTypes.func,

    saveProject: PropTypes.func.isRequired,

    saveProjectThumbnail: PropTypes.func
});
