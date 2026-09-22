const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');

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

const playgroundBuilder = webBuilder
    .clone()
    .merge({
        devServer: {
            contentBase: false,
            host: '0.0.0.0',
            port: process.env.PORT || 8073
        },
        performance: {
            hints: false
        },
        entry: {
            'benchmark': './src/playground/benchmark',
            'extension-worker': path.join(
                __dirname,
                'src/extension-support/extension-worker.js'
            )
        },
        output: {
            path: path.resolve(__dirname, 'playground'),
            library: {
                name: 'VirtualMachine'
            }
        }
    })
    .addModuleRule({
        test: require.resolve('stats.js/build/stats.min.js'),
        loader: 'script-loader'
    })
    .addModuleRule({
        test: require.resolve('@scratch/scratch-blocks'),
        loader: 'expose-loader',
        options: {
            exposes: 'Blockly'
        }
    })
    .addModuleRule({
        test: require.resolve('scratch-audio/src/index.js'),
        loader: 'expose-loader',
        options: {
            exposes: 'AudioEngine'
        }
    })
    .addModuleRule({
        test: require.resolve('@scratch/scratch-storage'),
        loader: 'expose-loader',
        options: {
            exposes: 'ScratchStorage ScratchStorage'
        }
    })
    .addModuleRule({
        test: require.resolve('@scratch/scratch-render'),
        loader: 'expose-loader',
        options: {
            exposes: 'ScratchRender'
        }
    })
    .addPlugin(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: '../../packages/scratch-blocks/media',
                    to: 'media'
                },
                {
                    from: '../../node_modules/@scratch/scratch-storage/dist/web'
                },
                {
                    from: '../../node_modules/@scratch/scratch-render/dist/web'
                },
                {
                    from: '../../node_modules/@scratch/scratch-svg-renderer/dist/web'
                },
                {
                    from: 'src/playground'
                }
            ]
        })
    );

module.exports = [
    playgroundBuilder.get(), // webpack-dev-server only looks at the first configuration
    nodeBuilder.get(),
    webBuilder.get()
];
