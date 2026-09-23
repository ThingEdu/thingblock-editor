import {parseDOM} from 'htmlparser2';
import uid from '../util/uid';
import mutationAdapter, {type DomNode} from './mutation-adapter';
import type {Block} from './block-types';

/** The part of a Blockly create or end-drag event the adapter reads. */
export interface BlocklyXmlEvent {
    xml: {outerHTML: string}
}

/** Adds a block DOM node and everything it encloses to `blocks`; based on Blockly's `domToBlockHeadless_`. */
const domToBlock = function (blockDOM: DomNode, blocks: Record<string, Block>, isTopBlock: boolean,
    parent: string | null) {
    if (!blockDOM.attribs.id) {
        blockDOM.attribs.id = uid();
    }

    const block: Block = {
        id: blockDOM.attribs.id,
        opcode: blockDOM.attribs.type,
        inputs: {},
        fields: {},
        next: null,
        topLevel: isTopBlock,
        parent,
        shadow: blockDOM.name === 'shadow',
        x: blockDOM.attribs.x,
        y: blockDOM.attribs.y
    };
    blocks[block.id] = block;

    for (const xmlChild of blockDOM.children) {
        // Enclosed blocks and shadows; a real block covers the shadow.
        let childBlockNode: DomNode | null = null;
        let childShadowNode: DomNode | null = null;
        for (const grandChildNode of xmlChild.children) {
            if (!grandChildNode.name) continue; // Text node.
            const grandChildNodeName = grandChildNode.name.toLowerCase();
            if (grandChildNodeName === 'block') {
                childBlockNode = grandChildNode;
            } else if (grandChildNodeName === 'shadow') {
                childShadowNode = grandChildNode;
            }
        }
        childBlockNode ??= childShadowNode;

        // Only the Blockly tags Scratch uses are handled.
        switch (xmlChild.name.toLowerCase()) {
        case 'field': {
            const fieldName = xmlChild.attribs.name;
            block.fields[fieldName] = {
                name: fieldName,
                id: xmlChild.attribs.id,
                value: xmlChild.children[0]?.data ?? ''
            };
            const fieldVarType = xmlChild.attribs.variabletype;
            if (typeof fieldVarType === 'string') {
                block.fields[fieldName].variableType = fieldVarType;
            }
            break;
        }
        case 'comment':
            block.comment = `${block.id}_comment`;
            break;
        case 'value':
        case 'statement': {
            const inputName = xmlChild.attribs.name;
            if (!childBlockNode) {
                throw new Error(`adapter: input ${inputName} of block ${block.id} has no block or shadow`);
            }
            domToBlock(childBlockNode, blocks, false, block.id);
            if (childShadowNode && childBlockNode !== childShadowNode) {
                domToBlock(childShadowNode, blocks, false, block.id);
            }
            block.inputs[inputName] = {
                name: inputName,
                block: childBlockNode.attribs.id,
                shadow: childShadowNode ? childShadowNode.attribs.id : null
            };
            break;
        }
        case 'next':
            if (!childBlockNode?.attribs) continue;
            domToBlock(childBlockNode, blocks, false, block.id);
            block.next = childBlockNode.attribs.id;
            break;
        case 'mutation':
            block.mutation = mutationAdapter(xmlChild);
            break;
        }
    }
};

/** Flattens the top-level nodes of a Blockly event's XML into a block list; based on Blockly's `domToWorkspace`. */
const domToBlocks = function (blocksDOM: DomNode[]): Block[] {
    const blocks: Record<string, Block> = {};
    for (const block of blocksDOM) {
        if (!block.name || !block.attribs) continue;
        const tagName = block.name.toLowerCase();
        if (tagName === 'block' || tagName === 'shadow') {
            domToBlock(block, blocks, true, null);
        }
    }
    return Object.values(blocks);
};

/** Converts a Blockly create or end-drag event into the blocks it adds; undefined for events without XML. */
const adapter = function (e: BlocklyXmlEvent): Block[] | undefined {
    if (typeof e !== 'object') return;
    if (typeof e.xml !== 'object') return;
    return domToBlocks(parseDOM(e.xml.outerHTML, {decodeEntities: true}) as unknown as DomNode[]);
};

export default adapter;
