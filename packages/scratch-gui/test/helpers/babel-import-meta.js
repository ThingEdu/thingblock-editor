/**
 * Babel plugin for Jest: its CommonJS output has no `import.meta`, so `import.meta.url` (used to locate
 * worker entry points for webpack) becomes a fixed file URL.
 * @returns {object} The Babel plugin.
 */
module.exports = () => ({
    visitor: {
        MetaProperty (path) {
            if (path.node.meta.name !== 'import') return;
            path.replaceWithSourceString('({url: "file:///jest/module.js"})');
        }
    }
});
