/**
 * @file
 * Registers extensions on the runtime: fills a category from an extension's `getInfo()`, records its primitives
 * and hats, and builds the palette XML and block JSON scratch-blocks reads.
 */

import BlockType from '../../extension-support/block-type';
import TargetType from '../../extension-support/target-type';
import log from '../../util/log';
import maybeFormatMessage from '../../util/maybe-format-message';
import StringUtil from '../../util/string-util';
import {RuntimeEventNames} from './runtime-events';
import {
    buildCustomFieldInfo,
    buildMenuForScratchBlocks,
    convertForScratchBlocks,
    type BlockJSON
} from './extension-block-converter';
import type Runtime from '../runtime';
import type {BlockFunction, CategoryInfo} from '../runtime';
import type Target from '../target';
import type {BlockInfo, ExtensionInfo} from '../../extensions/extension';

const defaultExtensionColors = ['#0FBD8C', '#0DA57A', '#0B8E69'];

/** A category's palette XML, from `<category>` to `</category>`. */
export interface CategoryXML {
    id: string
    xml: string
}

/** Rebuilds a category's menus, custom field types and blocks, registering the blocks' primitives and hats. */
const fillExtensionCategory = (runtime: Runtime, categoryInfo: CategoryInfo, extensionInfo: ExtensionInfo) => {
    categoryInfo.blocks = [];
    categoryInfo.customFieldTypes = {};
    categoryInfo.menus = [];
    categoryInfo.menuInfo = {};

    for (const [menuName, menuInfo] of Object.entries(extensionInfo.menus ?? {})) {
        categoryInfo.menus.push(buildMenuForScratchBlocks(runtime, menuName, menuInfo, categoryInfo));
        categoryInfo.menuInfo[menuName] = menuInfo;
    }
    for (const [fieldTypeName, fieldType] of Object.entries(extensionInfo.customFieldTypes ?? {})) {
        categoryInfo.customFieldTypes[fieldTypeName] =
            buildCustomFieldInfo(fieldTypeName, fieldType, extensionInfo.id, categoryInfo);
    }

    for (const blockInfo of extensionInfo.blocks) {
        try {
            const convertedBlock = convertForScratchBlocks(runtime, blockInfo, categoryInfo);
            categoryInfo.blocks.push(convertedBlock);
            if (!convertedBlock.json) continue;
            // Only blocks have JSON, never separators
            const {blockType, func, isEdgeActivated, shouldRestartExistingThreads} = blockInfo as BlockInfo;
            const opcode = convertedBlock.json.type;
            // An event hat has no predicate; its threads start from `startHats`
            if (blockType !== BlockType.EVENT) {
                runtime._primitives[opcode] = func as BlockFunction;
            }
            if (blockType === BlockType.EVENT || blockType === BlockType.HAT) {
                runtime._hats[opcode] = {
                    edgeActivated: isEdgeActivated,
                    restartExistingThreads: shouldRestartExistingThreads
                };
            }
        } catch (e) {
            log.error('Error parsing block: ', {block: blockInfo, error: e});
        }
    }
};

/** Adds an extension's category and registers its blocks, announcing the category and its custom fields. */
export const registerExtensionPrimitives = (runtime: Runtime, extensionInfo: ExtensionInfo) => {
    const colors = extensionInfo.color1 ?
        [extensionInfo.color1, extensionInfo.color2, extensionInfo.color3] :
        defaultExtensionColors;
    const categoryInfo = {
        id: extensionInfo.id,
        name: maybeFormatMessage(extensionInfo.name),
        showStatusButton: extensionInfo.showStatusButton,
        blockIconURI: extensionInfo.blockIconURI,
        menuIconURI: extensionInfo.menuIconURI,
        color1: colors[0],
        color2: colors[1],
        color3: colors[2]
    } as CategoryInfo;
    runtime._blockInfo.push(categoryInfo);

    fillExtensionCategory(runtime, categoryInfo, extensionInfo);

    for (const fieldTypeInfo of Object.values(categoryInfo.customFieldTypes)) {
        runtime.events.emit(RuntimeEventNames.EXTENSION_FIELD_ADDED, {
            name: `field_${fieldTypeInfo.extendedName}`,
            implementation: fieldTypeInfo.fieldImplementation
        });
    }
    runtime.events.emit(RuntimeEventNames.EXTENSION_ADDED, categoryInfo);
};

/** Rebuilds a registered extension's category from new `getInfo()` results, e.g. after a locale change. */
export const refreshExtensionPrimitives = (runtime: Runtime, extensionInfo: ExtensionInfo) => {
    const categoryInfo = runtime._blockInfo.find(info => info.id === extensionInfo.id);
    if (!categoryInfo) return;
    categoryInfo.name = maybeFormatMessage(extensionInfo.name);
    fillExtensionCategory(runtime, categoryInfo, extensionInfo);
    runtime.events.emit(RuntimeEventNames.BLOCKSINFO_UPDATE, categoryInfo);
};

/** Each category's palette XML, without blocks hidden from the palette or filtered out for `target`. */
export const getBlocksXML = (runtime: Runtime, target?: Target | null): CategoryXML[] =>
    runtime._blockInfo.map(categoryInfo => {
        const {name, color1, color2} = categoryInfo;
        const targetType = target?.isStage ? TargetType.STAGE : TargetType.SPRITE;
        const paletteBlocks = categoryInfo.blocks.filter(({info}) => {
            if (info === '---') return true;
            // Without a target, or a filter on the block, the block shows
            const inFilter = !target || !info.filter || info.filter.includes(targetType);
            return inFilter && !info.hideFromPalette;
        });

        const colorXML = `colour="${color1}" secondaryColour="${color2}"`;
        // Without an icon the category menu shows a coloured circle
        const menuIconURI = categoryInfo.menuIconURI || categoryInfo.blockIconURI || '';
        const menuIconXML = menuIconURI ? `iconURI="${menuIconURI}"` : '';
        const statusButtonXML = categoryInfo.showStatusButton ? 'showStatusButton="true"' : '';

        return {
            id: categoryInfo.id,
            xml: `<category name="${name}" toolboxitemid="${categoryInfo.id}" ` +
                `${statusButtonXML} ${colorXML} ${menuIconXML}>` +
                `${paletteBlocks.map(block => block.xml).join('')}</category>`
        };
    });

/** The JSON of every extension palette entry; separators and buttons have none. */
export const getBlocksJSON = (runtime: Runtime): BlockJSON[] =>
    runtime._blockInfo.flatMap(categoryInfo => categoryInfo.blocks.map(block => block.json));

/** The monitor label for an extension opcode such as `ext_block`; undefined for unknown ones. */
export const getLabelForOpcode = (
    runtime: Runtime, extendedOpcode: string
): {category: string, label: string} | undefined => {
    const [category, opcode] = StringUtil.splitFirst(extendedOpcode, '_');
    if (!(category && opcode)) return;

    const categoryInfo = runtime._blockInfo.find(info => info.id === category);
    const block = categoryInfo?.blocks.find(({info}) => info !== '---' && info.opcode === opcode);
    if (!block) return;
    return {
        // All extensions share the monitor colour
        category: 'extension',
        label: `${categoryInfo.name}: ${(block.info as BlockInfo).text}`
    };
};
