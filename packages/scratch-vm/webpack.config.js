const path = require('path');

const ScratchWebpackConfigBuilder = require('scratch-webpack-configuration');

const common = {
    enableTs: true,
    libraryName: 'scratch-vm',
    rootPath: path.resolve(__dirname)
};

const imageAssetRule = {
    test: /\.(svg|png|jpg|jpeg|gif)$/,
    resourceQuery: /^$/,
    type: 'asset'
};

const nodeBuilder = new ScratchWebpackConfigBuilder(common)
    .setTarget('node')
    .merge({
        entry: {
            'extension-worker': path.join(__dirname, 'src/extension-support/extension-worker.js')
        },
        output: {
            library: {
                name: 'VirtualMachine'
            }
        }
    })
    .addModuleRule(imageAssetRule);

const webBuilder = new ScratchWebpackConfigBuilder(common)
    .setTarget('browserslist')
    .merge({
        entry: {
            'extension-worker': path.join(__dirname, 'src/extension-support/extension-worker.js')
        },
        resolve: {
            fallback: {
                Buffer: require.resolve('buffer/')
            }
        },
        output: {
            library: {
                name: 'VirtualMachine'
            }
        }
    })
    .addModuleRule({
        test: require.resolve('./src/index.js'),
        loader: 'expose-loader',
        options: {
            exposes: 'VirtualMachine'
        }
    })
    .addModuleRule(imageAssetRule);

module.exports = [
    nodeBuilder.get(),
    webBuilder.get()
];
