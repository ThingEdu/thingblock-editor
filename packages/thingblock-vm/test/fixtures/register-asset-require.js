const path = require('path');

const registerAssetExtension = extension => {
    require.extensions[extension] = module => {
        module.exports = path.basename(module.filename);
    };
};

for (const extension of ['.svg', '.png', '.jpg', '.jpeg', '.gif']) {
    registerAssetExtension(extension);
}
