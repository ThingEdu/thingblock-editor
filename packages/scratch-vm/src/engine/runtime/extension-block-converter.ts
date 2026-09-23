/**
 * @file
 * Converts extension block metadata (an extension's `getInfo()`) into the JSON and XML scratch-blocks reads.
 * Registering the converted blocks is the extension registry's job.
 */

import ArgumentType from '../../extension-support/argument-type';
import BlockType from '../../extension-support/block-type';
import ScratchBlocksConstants from '../scratch-blocks-constants';
import log from '../../util/log';
import maybeFormatMessage from '../../util/maybe-format-message';
import xmlEscape from '../../util/xml-escape';
import type Runtime from '../runtime';
import type {CategoryInfo} from '../runtime';
import type {ArgumentInfo, BlockInfo, CustomFieldType, MenuInfo, MenuItem} from '../../extensions/extension';

/** scratch-blocks block JSON; `type` is the block's extended opcode. */
export type BlockJSON = {type: string} & Record<string, unknown>;

/** A converted palette entry; a separator's `info` is `'---'`, and only blocks and menus have `json`. */
export interface ConvertedBlockInfo {
    info: BlockInfo | '---'
    json?: BlockJSON
    xml?: string
}

export interface ConvertedMenu {
    json: BlockJSON
}

/** How an argument type shows on a block: a shadow block in its input, an inline field, or a Boolean check. */
interface ArgumentTypeInfo {
    shadow?: {
        type: string
        /** The shadow field that shows the default value; without one, scratch-blocks shows its own default. */
        fieldName?: string
    }
    fieldType?: string
    check?: string
}

export interface CustomFieldInfo {
    fieldName: string
    /** Namespaced to the extension, so extensions can't clash. */
    extendedName: string
    argumentTypeInfo: ArgumentTypeInfo
    scratchBlocksDefinition: ConvertedMenu
    fieldImplementation: unknown
}

type MessageContext = ReturnType<Runtime['makeMessageContextForTarget']>;

/** Shared between a block's conversion and its placeholder conversions, which fill the JSON args and XML. */
interface PlaceholderContext {
    /** Each argument's position in the block text, for re-mapping translated text. */
    argsMap: Record<string, number>
    blockJSON: BlockJSON
    categoryInfo: CategoryInfo
    blockInfo: BlockInfo
    inputList: string[]
    outLineNum?: number
    messageContext: MessageContext
}

const ArgumentTypeMap: Record<string, ArgumentTypeInfo> = {
    [ArgumentType.ANGLE]: {shadow: {type: 'math_angle', fieldName: 'NUM'}},
    [ArgumentType.COLOR]: {shadow: {type: 'colour_picker', fieldName: 'COLOUR'}},
    [ArgumentType.NUMBER]: {shadow: {type: 'math_number', fieldName: 'NUM'}},
    [ArgumentType.STRING]: {shadow: {type: 'text', fieldName: 'TEXT'}},
    [ArgumentType.BOOLEAN]: {check: 'Boolean'},
    [ArgumentType.MATRIX]: {shadow: {type: 'matrix', fieldName: 'MATRIX'}},
    // An inline image is part of the block's label rather than an input
    [ArgumentType.IMAGE]: {fieldType: 'field_image'}
};

const makeExtensionMenuId = (menuName: string, extensionId: string) =>
    `${extensionId}_menu_${xmlEscape(menuName)}`;

/** Menu items as scratch-blocks `[text, value]` pairs; a dynamic menu's function passes through. */
const convertMenuItems = (runtime: Runtime, menuItems: MenuInfo['items']) => {
    if (typeof menuItems === 'function') return menuItems;
    const messageContext = runtime.makeMessageContextForTarget();
    return (menuItems as MenuItem[]).map(item => {
        const formattedItem = maybeFormatMessage(item, messageContext);
        switch (typeof formattedItem) {
        case 'string':
            return [formattedItem, formattedItem];
        case 'object':
            return [maybeFormatMessage(formattedItem.text, messageContext), formattedItem.value];
        default:
            throw new Error(`Can't interpret menu item: ${JSON.stringify(item)}`);
        }
    });
};

/** A menu as scratch-blocks defines it: a block holding one dropdown field. */
export const buildMenuForScratchBlocks = (
    runtime: Runtime, menuName: string, menuInfo: MenuInfo, categoryInfo: CategoryInfo
): ConvertedMenu => ({
    json: {
        message0: '%1',
        type: makeExtensionMenuId(menuName, categoryInfo.id),
        inputsInline: true,
        output: 'String',
        style: categoryInfo.id,
        outputShape: menuInfo.acceptReporters ?
            ScratchBlocksConstants.OUTPUT_SHAPE_ROUND : ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE,
        args0: [
            {
                type: 'field_dropdown',
                name: menuName,
                options: convertMenuItems(runtime, menuInfo.items)
            }
        ]
    }
});

/** A custom field type's info, with the block scratch-blocks shows it in. */
export const buildCustomFieldInfo = (
    fieldName: string, fieldInfo: CustomFieldType, extensionId: string, categoryInfo: CategoryInfo
): CustomFieldInfo => {
    const extendedName = `${extensionId}_${fieldName}`;
    return {
        fieldName,
        extendedName,
        argumentTypeInfo: {
            shadow: {
                type: extendedName,
                fieldName: `field_${extendedName}`
            }
        },
        scratchBlocksDefinition: {
            json: {
                type: extendedName,
                message0: '%1',
                inputsInline: true,
                output: fieldInfo.output,
                style: categoryInfo.id,
                outputShape: fieldInfo.outputShape,
                args0: [
                    {
                        name: `field_${extendedName}`,
                        type: `field_${extendedName}`
                    }
                ]
            }
        },
        fieldImplementation: fieldInfo.implementation
    };
};

const constructInlineImageJson = (argInfo: ArgumentInfo) => {
    if (!argInfo.dataURI) {
        log.warn('Missing data URI in extension block with argument type IMAGE');
    }
    return {
        type: 'field_image',
        src: argInfo.dataURI || '',
        width: 24,
        height: 24,
        // Whether RTL languages show the image mirrored
        flip_rtl: argInfo.flipRTL || false
    };
};

/**
 * Replaces a `[NAME]` placeholder with its scratch-blocks `%n`, adding the argument's JSON to the block's args
 * and its input XML to the context.
 */
const convertPlaceholder = (runtime: Runtime, context: PlaceholderContext, rawPlaceholder: string): string => {
    // Keeps the XML valid
    const placeholder = rawPlaceholder.replace(/[<"&]/, '_');
    const argInfo: Partial<ArgumentInfo> = context.blockInfo.arguments?.[placeholder] || {};
    const argTypeInfo: ArgumentTypeInfo = ArgumentTypeMap[argInfo.type] ||
        context.categoryInfo.customFieldTypes[argInfo.type]?.argumentTypeInfo || {};

    let argJSON: Record<string, unknown>;
    if (argTypeInfo.fieldType === 'field_image') {
        argJSON = constructInlineImageJson(argInfo as ArgumentInfo);
    } else {
        // An input: a slot other blocks can plug into
        argJSON = {type: 'input_value', name: placeholder};
        const defaultValue = typeof argInfo.defaultValue === 'undefined' ? '' :
            xmlEscape(maybeFormatMessage(argInfo.defaultValue, context.messageContext).toString());
        if (argTypeInfo.check) {
            // Only Boolean inputs have a check, which makes them hexagonal
            argJSON.check = argTypeInfo.check;
        }

        let valueName: string | null;
        let shadowType: string | null;
        let fieldName: string | null;
        if (argInfo.menu) {
            const menuInfo = context.categoryInfo.menuInfo[argInfo.menu];
            if (menuInfo.acceptReporters) {
                valueName = placeholder;
                shadowType = makeExtensionMenuId(argInfo.menu, context.categoryInfo.id);
                fieldName = argInfo.menu;
            } else {
                argJSON.type = 'field_dropdown';
                argJSON.options = convertMenuItems(runtime, menuInfo.items);
                valueName = null;
                shadowType = null;
                fieldName = placeholder;
            }
        } else {
            valueName = placeholder;
            shadowType = argTypeInfo.shadow?.type || null;
            fieldName = argTypeInfo.shadow?.fieldName || null;
        }

        // A <value> is an input, its <shadow> shows while nothing is plugged in, and a <field> holds the default
        if (valueName) {
            context.inputList.push(`<value name="${placeholder}">`);
        }
        if (shadowType) {
            context.inputList.push(`<shadow type="${shadowType}">`);
        }
        if (defaultValue && fieldName) {
            context.inputList.push(`<field name="${fieldName}">${defaultValue}</field>`);
        }
        if (shadowType) {
            context.inputList.push('</shadow>');
        }
        if (valueName) {
            context.inputList.push('</value>');
        }
    }

    const argsName = `args${context.outLineNum}`;
    const blockArgs = (context.blockJSON[argsName] ??= []) as unknown[];
    blockArgs.push(argJSON);
    context.argsMap[placeholder] = blockArgs.length;
    return `%${blockArgs.length}`;
};

/** A button, whose `func` names one of the callbacks scratch-blocks supports. */
const convertButtonForScratchBlocks = (runtime: Runtime, buttonInfo: BlockInfo): ConvertedBlockInfo => {
    const supportedCallbackKeys = ['MAKE_A_LIST', 'MAKE_A_PROCEDURE', 'MAKE_A_VARIABLE'];
    if (!supportedCallbackKeys.includes(buttonInfo.func as string)) {
        log.error(`Custom button callbacks not supported yet: ${buttonInfo.func}`);
    }
    const buttonText = maybeFormatMessage(buttonInfo.text, runtime.makeMessageContextForTarget());
    return {
        info: buttonInfo,
        xml: `<button text="${buttonText}" callbackKey="${buttonInfo.func}"></button>`
    };
};

/** A block's JSON and palette XML; also defaults `isEdgeActivated` and `branchCount` on `blockInfo`. */
const convertBlockForScratchBlocks = (
    runtime: Runtime, blockInfo: BlockInfo, categoryInfo: CategoryInfo
): ConvertedBlockInfo => {
    const extendedOpcode = `${categoryInfo.id}_${blockInfo.opcode}`;
    const blockJSON: BlockJSON = {
        type: extendedOpcode,
        inputsInline: true,
        category: categoryInfo.name,
        style: categoryInfo.id,
        extensions: []
    };
    const extensions = blockJSON.extensions as string[];
    const context: PlaceholderContext = {
        argsMap: {},
        blockJSON,
        categoryInfo,
        blockInfo,
        inputList: [],
        messageContext: runtime.makeMessageContextForTarget()
    };

    // A block starts with its icon, or else its category's, and a separator
    const iconURI = blockInfo.blockIconURI || categoryInfo.blockIconURI;
    if (iconURI) {
        extensions.push('scratch_extension');
        blockJSON.message0 = '%1 %2';
        blockJSON.args0 = [
            {type: 'field_image', src: iconURI, width: 40, height: 40},
            {type: 'field_vertical_separator'}
        ];
    }

    // A null statement is an open connection; an absent one is a hat top or terminal bottom
    switch (blockInfo.blockType) {
    case BlockType.COMMAND:
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
        blockJSON.previousStatement = null;
        if (!blockInfo.isTerminal) {
            blockJSON.nextStatement = null;
        }
        break;
    case BlockType.REPORTER:
        blockJSON.output = 'String';
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_ROUND;
        break;
    case BlockType.BOOLEAN:
        blockJSON.output = 'Boolean';
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL;
        break;
    case BlockType.HAT:
    case BlockType.EVENT:
        if (!Object.hasOwn(blockInfo, 'isEdgeActivated')) {
            blockInfo.isEdgeActivated = true;
        }
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
        blockJSON.nextStatement = null;
        extensions.push('shape_hat');
        break;
    case BlockType.CONDITIONAL:
    case BlockType.LOOP:
        blockInfo.branchCount = blockInfo.branchCount || 1;
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
        blockJSON.previousStatement = null;
        if (!blockInfo.isTerminal) {
            blockJSON.nextStatement = null;
        }
        break;
    }

    // Alternate text arms with substack slots, numbering scratch-blocks `message<n>`/`args<n>` lines
    const blockText = Array.isArray(blockInfo.text) ? blockInfo.text : [blockInfo.text];
    let inTextNum = 0;
    let inBranchNum = 0;
    let outLineNum = 0;
    while (inTextNum < blockText.length || inBranchNum < blockInfo.branchCount) {
        if (inTextNum < blockText.length) {
            context.outLineNum = outLineNum;
            const lineText: string = maybeFormatMessage(blockText[inTextNum], context.messageContext);
            const convertedText = lineText.replace(
                /\[(.+?)]/g,
                (match, placeholder: string) => convertPlaceholder(runtime, context, placeholder)
            );
            blockJSON[`message${outLineNum}`] = (blockJSON[`message${outLineNum}`] as string ?? '') + convertedText;
            ++inTextNum;
            ++outLineNum;
        }
        if (inBranchNum < blockInfo.branchCount) {
            blockJSON[`message${outLineNum}`] = '%1';
            blockJSON[`args${outLineNum}`] = [{
                type: 'input_statement',
                name: `SUBSTACK${inBranchNum > 0 ? inBranchNum + 1 : ''}`
            }];
            ++inBranchNum;
            ++outLineNum;
        }
    }

    if (blockInfo.blockType === BlockType.REPORTER) {
        // A reporter with inputs has no single value to monitor
        if (!blockInfo.disableMonitor && context.inputList.length === 0) {
            extensions.push('monitor_block');
        }
    } else if (blockInfo.blockType === BlockType.LOOP) {
        // The loop arrow at the bottom right
        blockJSON[`lastDummyAlign${outLineNum}`] = 'RIGHT';
        blockJSON[`message${outLineNum}`] = '%1';
        blockJSON[`args${outLineNum}`] = [{
            type: 'field_image',
            src: './static/blocks-media/repeat.svg',
            width: 24,
            height: 24,
            alt: '*',
            flip_rtl: true
        }];
        ++outLineNum;
    }

    const mutation = blockInfo.isDynamic ? `<mutation blockInfo="${xmlEscape(JSON.stringify(blockInfo))}"/>` : '';
    return {
        info: blockInfo,
        json: blockJSON,
        xml: `<block type="${extendedOpcode}">${mutation}${context.inputList.join('')}</block>`
    };
};

/** A separator, button or block, ready for scratch-blocks. */
export const convertForScratchBlocks = (
    runtime: Runtime, blockInfo: BlockInfo | '---', categoryInfo: CategoryInfo
): ConvertedBlockInfo => {
    if (blockInfo === '---') {
        return {info: blockInfo, xml: '<sep gap="36"/>'};
    }
    if (blockInfo.blockType === BlockType.BUTTON) {
        return convertButtonForScratchBlocks(runtime, blockInfo);
    }
    return convertBlockForScratchBlocks(runtime, blockInfo, categoryInfo);
};
