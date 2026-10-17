import uid from '../util/uid';
import xmlEscape from '../util/xml-escape';

/** A workspace comment, or one attached to a block. */
class Comment {
    static readonly MIN_WIDTH = 20;
    static readonly MIN_HEIGHT = 20;
    static readonly DEFAULT_WIDTH = 100;
    static readonly DEFAULT_HEIGHT = 100;

    id: string;
    text: string;
    x: number;
    y: number;
    /** Full-size dimensions, used when the comment is expanded. */
    width: number;
    height: number;
    minimized: boolean;
    /** The block this comment is attached to; null for a workspace comment. */
    blockId: string | null = null;

    constructor (id: string | null, text: string, x: number, y: number, width: number, height: number,
        minimized?: boolean) {
        this.id = id || uid();
        this.text = text;
        this.x = x;
        this.y = y;
        this.width = Math.max(Number(width), Comment.MIN_WIDTH);
        this.height = Math.max(Number(height), Comment.MIN_HEIGHT);
        this.minimized = minimized || false;
    }

    toXML (): string {
        return `<comment id="${this.id}" x="${this.x}" y="${
            this.y}" w="${this.width}" h="${this.height}" pinned="${
            !this.minimized}" collapsed="${this.minimized}">${xmlEscape(this.text)}</comment>`;
    }
}

export default Comment;
