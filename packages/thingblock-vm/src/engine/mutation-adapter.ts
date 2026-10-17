import {parseDOM} from 'htmlparser2';
import decodeHtml from 'decode-html';

/**
 * A node as htmlparser2 3.x parses it. That release ships no types, so TS reads the hoisted 10.x ones instead.
 * Text nodes have `data` and no `name`.
 */
export interface DomNode {
    name: string
    attribs: Record<string, string>
    children: DomNode[]
    data?: string
}

/** A block mutation: its XML attributes as decoded strings, plus the tag name, children and parsed `blockInfo`. */
export interface Mutation {
    tagName: string
    children: Mutation[]
    blockInfo?: unknown
    proccode?: string
    /** JSON-encoded arrays of the procedure's argument ids, names and default values. */
    argumentids?: string
    argumentnames?: string
    argumentdefaults?: string
    /** Deserialized projects store a boolean, XML a `'true'`/`'false'` string. */
    warp?: boolean | string
    [attribute: string]: unknown
}

const mutatorTagToObject = function (dom: DomNode): Mutation {
    // No prototype, so an attribute named like an Object.prototype key can't collide with it.
    const obj: Mutation = Object.create(null);
    obj.tagName = dom.name;
    obj.children = [];
    for (const prop in dom.attribs) {
        if (prop === 'xmlns') continue;
        obj[prop] = decodeHtml(dom.attribs[prop]);
        // XML parsing lowercases attribute names; the VM uses camel case everywhere else.
        if (prop === 'blockinfo') {
            obj.blockInfo = JSON.parse(obj.blockinfo as string);
            delete obj.blockinfo;
        }
    }
    for (const child of dom.children) {
        obj.children.push(mutatorTagToObject(child));
    }
    return obj;
};

/** Converts a `<mutation>` XML string or parsed node into the VM's mutation object. */
const mutationAdapter = function (mutation: DomNode | string): Mutation {
    const mutationParsed = typeof mutation === 'object' ? mutation : parseDOM(mutation)[0] as unknown as DomNode;
    return mutatorTagToObject(mutationParsed);
};

export default mutationAdapter;
