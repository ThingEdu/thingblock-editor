import fs from 'fs';
import Module from 'module';
import path from 'path';

/**
 * Resolves an extensionless `src/` import to `x.ts` over a sibling `x.js`, as webpack does, so a test
 * importing this first runs the TS ports all the way down. Explicit `x.js` requests stay JS.
 */
const src = path.resolve(__dirname, '../../src') + path.sep;
const NodeModule = Module as unknown as {_resolveFilename: (request: string, ...rest: unknown[]) => string};
const resolveFilename = NodeModule._resolveFilename;

NodeModule._resolveFilename = function (request, ...rest) {
    const file = resolveFilename.call(this, request, ...rest);
    if (!path.extname(request) && file.startsWith(src) && file.endsWith('.js')) {
        const tsFile = `${file.slice(0, -3)}.ts`;
        if (fs.existsSync(tsFile)) return tsFile;
    }
    return file;
};
