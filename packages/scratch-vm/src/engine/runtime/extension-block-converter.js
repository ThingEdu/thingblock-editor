/**
 * Conversion of extension block metadata (the result of an extension's `getInfo()`) into the
 * JSON and XML formats consumed by scratch-blocks.
 *
 * The exported functions take the runtime as their first parameter; it is only used to build
 * message contexts for translation and is never mutated. Registration of the converted blocks
 * (primitives, hats, category info) remains the runtime's responsibility.
 */

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const ScratchBlocksConstants = require('../scratch-blocks-constants');
const log = require('../../util/log');
const maybeFormatMessage = require('../../util/maybe-format-message');
const xmlEscape = require('../../util/xml-escape');

/**
 * Information used for converting Scratch argument types into scratch-blocks data.
 * @type {object.<ArgumentType, {shadowType: string, fieldType: string}>}
 */
const ArgumentTypeMap = (() => {
    const map = {};
    map[ArgumentType.ANGLE] = {
        shadow: {
            type: 'math_angle',
            // We specify fieldNames here so that we can pick
            // create and populate a field with the defaultValue
            // specified in the extension.
            // When the `fieldName` property is not specified,
            // the <field></field> will be left out of the XML and
            // the scratch-blocks defaults for that field will be
            // used instead (e.g. default of 0 for number fields)
            fieldName: 'NUM'
        }
    };
    map[ArgumentType.COLOR] = {
        shadow: {
            type: 'colour_picker',
            fieldName: 'COLOUR'
        }
    };
    map[ArgumentType.NUMBER] = {
        shadow: {
            type: 'math_number',
            fieldName: 'NUM'
        }
    };
    map[ArgumentType.STRING] = {
        shadow: {
            type: 'text',
            fieldName: 'TEXT'
        }
    };
    map[ArgumentType.BOOLEAN] = {
        check: 'Boolean'
    };
    map[ArgumentType.MATRIX] = {
        shadow: {
            type: 'matrix',
            fieldName: 'MATRIX'
        }
    };
    map[ArgumentType.IMAGE] = {
        // Inline images are weird because they're not actually "arguments".
        // They are more analagous to the label on a block.
        fieldType: 'field_image'
    };
    return map;
})();

/**
 * Generate an extension-specific menu ID.
 * @param {string} menuName - the name of the menu.
 * @param {string} extensionId - the ID of the extension hosting the menu.
 * @returns {string} - the constructed ID.
 */
const makeExtensionMenuId = (menuName, extensionId) =>
    `${extensionId}_menu_${xmlEscape(menuName)}`;

/**
 * Convert the given extension menu items into the scratch-blocks style of list of pairs.
 * If the menu is dynamic (e.g. the passed in argument is a function), return the input unmodified.
 * @param {Runtime} runtime - the runtime, used to build the message context for translation
 * @param {object} menuItems - an array of menu items or a function to retrieve such an array
 * @returns {object} - an array of 2 element arrays or the original input function
 */
const convertMenuItems = (runtime, menuItems) => {
    if (typeof menuItems !== 'function') {
        const extensionMessageContext = runtime.makeMessageContextForTarget();
        return menuItems.map(item => {
            const formattedItem = maybeFormatMessage(item, extensionMessageContext);
            switch (typeof formattedItem) {
            case 'string':
                return [formattedItem, formattedItem];
            case 'object':
                return [maybeFormatMessage(item.text, extensionMessageContext), item.value];
            default:
                throw new Error(`Can't interpret menu item: ${JSON.stringify(item)}`);
            }
        });
    }
    return menuItems;
};

/**
 * Build the scratch-blocks JSON for a menu. Note that scratch-blocks treats menus as a special kind of block.
 * @param {Runtime} runtime - the runtime, used to build the message context for translation
 * @param {string} menuName - the name of the menu
 * @param {object} menuInfo - a description of this menu and its items
 * @property {*} items - an array of menu items or a function to retrieve such an array
 * @property {boolean} [acceptReporters] - if true, allow dropping reporters onto this menu
 * @param {CategoryInfo} categoryInfo - the category for this block
 * @returns {object} - a JSON-esque object ready for scratch-blocks' consumption
 */
const buildMenuForScratchBlocks = (runtime, menuName, menuInfo, categoryInfo) => {
    const menuId = makeExtensionMenuId(menuName, categoryInfo.id);
    const menuItems = convertMenuItems(runtime, menuInfo.items);
    return {
        json: {
            message0: '%1',
            type: menuId,
            inputsInline: true,
            output: 'String',
            style: categoryInfo.id,
            outputShape: menuInfo.acceptReporters ?
                ScratchBlocksConstants.OUTPUT_SHAPE_ROUND : ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE,
            args0: [
                {
                    type: 'field_dropdown',
                    name: menuName,
                    options: menuItems
                }
            ]
        }
    };
};

/**
 * Build the scratch-blocks JSON needed for a fieldType.
 * Custom field types need to be namespaced to the extension so that extensions can't interfere with each other
 * @param {string} fieldName - The name of the field
 * @param {string} output - The output of the field
 * @param {number} outputShape - Shape of the field (from ScratchBlocksConstants)
 * @param {object} categoryInfo - The category the field belongs to (Used to set its colors)
 * @returns {object} - Object to be inserted into scratch-blocks
 */
const buildCustomFieldTypeForScratchBlocks = (fieldName, output, outputShape, categoryInfo) => ({
    json: {
        type: fieldName,
        message0: '%1',
        inputsInline: true,
        output: output,
        style: categoryInfo.id,
        outputShape: outputShape,
        args0: [
            {
                name: `field_${fieldName}`,
                type: `field_${fieldName}`
            }
        ]
    }
});

/**
 * Build the information about a custom field type, including its scratch-blocks definition.
 * @param {string} fieldName - the name of the custom field type
 * @param {object} fieldInfo - the custom field type's info from the extension
 * @param {string} extensionId - the ID of the extension hosting the field type
 * @param {CategoryInfo} categoryInfo - the category the field type belongs to
 * @returns {object} - the constructed field type info
 */
const buildCustomFieldInfo = (fieldName, fieldInfo, extensionId, categoryInfo) => {
    const extendedName = `${extensionId}_${fieldName}`;
    return {
        fieldName: fieldName,
        extendedName: extendedName,
        argumentTypeInfo: {
            shadow: {
                type: extendedName,
                fieldName: `field_${extendedName}`
            }
        },
        scratchBlocksDefinition: buildCustomFieldTypeForScratchBlocks(
            extendedName,
            fieldInfo.output,
            fieldInfo.outputShape,
            categoryInfo
        ),
        fieldImplementation: fieldInfo.implementation
    };
};

/**
 * Helper for convertPlaceholders which handles inline images which are a specialized case of block "arguments".
 * @param {object} argInfo Metadata about the inline image as specified by the extension
 * @returns {object} JSON blob for a scratch-blocks image field.
 */
const constructInlineImageJson = argInfo => {
    if (!argInfo.dataURI) {
        log.warn('Missing data URI in extension block with argument type IMAGE');
    }
    return {
        type: 'field_image',
        src: argInfo.dataURI || '',
        // TODO these probably shouldn't be hardcoded...?
        width: 24,
        height: 24,
        // Whether or not the inline image should be flipped horizontally
        // in RTL languages. Defaults to false, indicating that the
        // image will not be flipped.
        flip_rtl: argInfo.flipRTL || false
    };
};

/**
 * Helper for convertBlockForScratchBlocks which handles linearization of argument placeholders. Called as a
 * callback from string#replace. In addition to the return value the JSON and XML items in the context will
 * be filled.
 * @param {Runtime} runtime - the runtime, used to build the message context for translation
 * @param {object} context - information shared with convertBlockForScratchBlocks about the block, etc.
 * @param {string} match - the overall string matched by the placeholder regex, including brackets: '[FOO]'.
 * @param {string} placeholder - the name of the placeholder being matched: 'FOO'.
 * @returns {string} scratch-blocks placeholder for the argument: '%1'.
 */
const convertPlaceholders = (runtime, context, match, placeholder) => {
    // Sanitize the placeholder to ensure valid XML
    placeholder = placeholder.replace(/[<"&]/, '_');

    // Determine whether the argument type is one of the known standard field types
    const argInfo = context.blockInfo.arguments[placeholder] || {};
    let argTypeInfo = ArgumentTypeMap[argInfo.type] || {};

    // Field type not a standard field type, see if extension has registered custom field type
    if (!ArgumentTypeMap[argInfo.type] && context.categoryInfo.customFieldTypes[argInfo.type]) {
        argTypeInfo = context.categoryInfo.customFieldTypes[argInfo.type].argumentTypeInfo;
    }

    // Start to construct the scratch-blocks style JSON defining how the block should be
    // laid out
    let argJSON;

    // Most field types are inputs (slots on the block that can have other blocks plugged into them)
    // check if this is not one of those cases. E.g. an inline image on a block.
    if (argTypeInfo.fieldType === 'field_image') {
        argJSON = constructInlineImageJson(argInfo);
    } else {
        // Construct input value

        // Layout a block argument (e.g. an input slot on the block)
        argJSON = {
            type: 'input_value',
            name: placeholder
        };

        const defaultValue =
            typeof argInfo.defaultValue === 'undefined' ? '' :
                xmlEscape(maybeFormatMessage(argInfo.defaultValue, runtime.makeMessageContextForTarget()).toString());

        if (argTypeInfo.check) {
            // Right now the only type of 'check' we have specifies that the
            // input slot on the block accepts Boolean reporters, so it should be
            // shaped like a hexagon
            argJSON.check = argTypeInfo.check;
        }

        let valueName;
        let shadowType;
        let fieldName;
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
            shadowType = (argTypeInfo.shadow && argTypeInfo.shadow.type) || null;
            fieldName = (argTypeInfo.shadow && argTypeInfo.shadow.fieldName) || null;
        }

        // <value> is the ScratchBlocks name for a block input.
        if (valueName) {
            context.inputList.push(`<value name="${placeholder}">`);
        }

        // The <shadow> is a placeholder for a reporter and is visible when there's no reporter in this input.
        // Boolean inputs don't need to specify a shadow in the XML.
        if (shadowType) {
            context.inputList.push(`<shadow type="${shadowType}">`);
        }

        // A <field> displays a dynamic value: a user-editable text field, a drop-down menu, etc.
        // Leave out the field if defaultValue or fieldName are not specified
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
    const blockArgs = (context.blockJSON[argsName] = context.blockJSON[argsName] || []);
    if (argJSON) blockArgs.push(argJSON);
    const argNum = blockArgs.length;
    context.argsMap[placeholder] = argNum;

    return `%${argNum}`;
};

/**
 * Generate a separator between blocks categories or sub-categories.
 * @param {ExtensionBlockMetadata} blockInfo - the block to convert
 * @returns {ConvertedBlockInfo} - the converted & original block information
 */
const convertSeparatorForScratchBlocks = blockInfo => ({
    info: blockInfo,
    xml: '<sep gap="36"/>'
});

/**
 * Convert a button for scratch-blocks. A button has no opcode but specifies a callback name in the `func` field.
 * @param {Runtime} runtime - the runtime, used to build the message context for translation
 * @param {ExtensionBlockMetadata} buttonInfo - the button to convert
 * @property {string} func - the callback name
 * @returns {ConvertedBlockInfo} - the converted & original button information
 */
const convertButtonForScratchBlocks = (runtime, buttonInfo) => {
    // for now we only support these pre-defined callbacks handled in scratch-blocks
    const supportedCallbackKeys = ['MAKE_A_LIST', 'MAKE_A_PROCEDURE', 'MAKE_A_VARIABLE'];
    if (supportedCallbackKeys.indexOf(buttonInfo.func) < 0) {
        log.error(`Custom button callbacks not supported yet: ${buttonInfo.func}`);
    }

    const extensionMessageContext = runtime.makeMessageContextForTarget();
    const buttonText = maybeFormatMessage(buttonInfo.text, extensionMessageContext);
    return {
        info: buttonInfo,
        xml: `<button text="${buttonText}" callbackKey="${buttonInfo.func}"></button>`
    };
};

/**
 * Convert ExtensionBlockMetadata into scratch-blocks JSON & XML, and generate a proxy function.
 * @param {Runtime} runtime - the runtime, used to build the message context for translation
 * @param {ExtensionBlockMetadata} blockInfo - the block to convert
 * @param {CategoryInfo} categoryInfo - the category for this block
 * @returns {ConvertedBlockInfo} - the converted & original block information
 */
const convertBlockForScratchBlocks = (runtime, blockInfo, categoryInfo) => {
    const extendedOpcode = `${categoryInfo.id}_${blockInfo.opcode}`;

    const blockJSON = {
        type: extendedOpcode,
        inputsInline: true,
        category: categoryInfo.name,
        style: categoryInfo.id,
        extensions: []
    };
    const context = {
        // TODO: store this somewhere so that we can map args appropriately after translation.
        // This maps an arg name to its relative position in the original (usually English) block text.
        // When displaying a block in another language we'll need to run a `replace` action similar to the one
        // below, but each `[ARG]` will need to be replaced with the number in this map.
        argsMap: {},
        blockJSON,
        categoryInfo,
        blockInfo,
        inputList: []
    };

    // If an icon for the extension exists, prepend it to each block, with a vertical separator.
    // We can overspecify an icon for each block, but if no icon exists on a block, fall back to
    // the category block icon.
    const iconURI = blockInfo.blockIconURI || categoryInfo.blockIconURI;

    if (iconURI) {
        blockJSON.extensions.push('scratch_extension');
        blockJSON.message0 = '%1 %2';
        const iconJSON = {
            type: 'field_image',
            src: iconURI,
            width: 40,
            height: 40
        };
        const separatorJSON = {
            type: 'field_vertical_separator'
        };
        blockJSON.args0 = [
            iconJSON,
            separatorJSON
        ];
    }

    switch (blockInfo.blockType) {
    case BlockType.COMMAND:
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
        blockJSON.previousStatement = null; // null = available connection; undefined = hat
        if (!blockInfo.isTerminal) {
            blockJSON.nextStatement = null; // null = available connection; undefined = terminal
        }
        break;
    case BlockType.REPORTER:
        blockJSON.output = 'String'; // TODO: distinguish number & string here?
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_ROUND;
        break;
    case BlockType.BOOLEAN:
        blockJSON.output = 'Boolean';
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_HEXAGONAL;
        break;
    case BlockType.HAT:
    case BlockType.EVENT:
        if (!Object.prototype.hasOwnProperty.call(blockInfo, 'isEdgeActivated')) {
            // if absent, this property defaults to true
            blockInfo.isEdgeActivated = true;
        }
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
        blockJSON.nextStatement = null; // null = available connection; undefined = terminal
        blockJSON.extensions.push('shape_hat');
        break;
    case BlockType.CONDITIONAL:
    case BlockType.LOOP:
        blockInfo.branchCount = blockInfo.branchCount || 1;
        blockJSON.outputShape = ScratchBlocksConstants.OUTPUT_SHAPE_SQUARE;
        blockJSON.previousStatement = null; // null = available connection; undefined = hat
        if (!blockInfo.isTerminal) {
            blockJSON.nextStatement = null; // null = available connection; undefined = terminal
        }
        break;
    }

    const blockText = Array.isArray(blockInfo.text) ? blockInfo.text : [blockInfo.text];
    let inTextNum = 0; // text for the next block "arm" is blockText[inTextNum]
    let inBranchNum = 0; // how many branches have we placed into the JSON so far?
    let outLineNum = 0; // used for scratch-blocks `message${outLineNum}` and `args${outLineNum}`
    const extensionMessageContext = runtime.makeMessageContextForTarget();

    // alternate between a block "arm" with text on it and an open slot for a substack
    while (inTextNum < blockText.length || inBranchNum < blockInfo.branchCount) {
        if (inTextNum < blockText.length) {
            context.outLineNum = outLineNum;
            const lineText = maybeFormatMessage(blockText[inTextNum], extensionMessageContext);
            const convertedText = lineText.replace(
                /\[(.+?)]/g,
                (match, placeholder) => convertPlaceholders(runtime, context, match, placeholder)
            );
            if (blockJSON[`message${outLineNum}`]) {
                blockJSON[`message${outLineNum}`] += convertedText;
            } else {
                blockJSON[`message${outLineNum}`] = convertedText;
            }
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
        if (!blockInfo.disableMonitor && context.inputList.length === 0) {
            blockJSON.extensions.push('monitor_block');
        }
    } else if (blockInfo.blockType === BlockType.LOOP) {
        // Add icon to the bottom right of a loop block
        blockJSON[`lastDummyAlign${outLineNum}`] = 'RIGHT';
        blockJSON[`message${outLineNum}`] = '%1';
        blockJSON[`args${outLineNum}`] = [{
            type: 'field_image',
            src: './static/blocks-media/repeat.svg', // TODO: use a constant or make this configurable?
            width: 24,
            height: 24,
            alt: '*', // TODO remove this since we don't use collapsed blocks in scratch
            flip_rtl: true
        }];
        ++outLineNum;
    }

    const mutation = blockInfo.isDynamic ? `<mutation blockInfo="${xmlEscape(JSON.stringify(blockInfo))}"/>` : '';
    const inputs = context.inputList.join('');
    const blockXML = `<block type="${extendedOpcode}">${mutation}${inputs}</block>`;

    return {
        info: context.blockInfo,
        json: context.blockJSON,
        xml: blockXML
    };
};

/**
 * Convert ExtensionBlockMetadata into data ready for scratch-blocks.
 * @param {Runtime} runtime - the runtime, used to build the message context for translation
 * @param {ExtensionBlockMetadata} blockInfo - the block info to convert
 * @param {CategoryInfo} categoryInfo - the category for this block
 * @returns {ConvertedBlockInfo} - the converted & original block information
 */
const convertForScratchBlocks = (runtime, blockInfo, categoryInfo) => {
    if (blockInfo === '---') {
        return convertSeparatorForScratchBlocks(blockInfo);
    }

    if (blockInfo.blockType === BlockType.BUTTON) {
        return convertButtonForScratchBlocks(runtime, blockInfo);
    }

    return convertBlockForScratchBlocks(runtime, blockInfo, categoryInfo);
};

module.exports = {
    buildCustomFieldInfo,
    buildMenuForScratchBlocks,
    convertForScratchBlocks
};
