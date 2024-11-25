const path = require('path');
const nodeExternals = require('webpack-node-externals');

// Конфигурация для сервера
const serverConfig = {
    target: 'node',
    mode: 'production',
    entry: './server.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'server.js'
    },
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    }
};

// Конфигурация для клиентских файлов
const clientConfig = {
    target: 'web',
    mode: 'production',
    entry: {
        main: './main.js',
        game: './game.js',
        friends: './friends.js',
        tasks: './tasks.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        chunkFilename: '[id].js',
        publicPath: '/dist/',
        clean: true // Очищает папку dist перед сборкой
    },
    // Добавим resolve
    resolve: {
        extensions: ['.js'],
        modules: ['node_modules']
    },
    optimization: {
        minimize: false,
        splitChunks: {
            chunks: 'all',
            name: false,
            cacheGroups: {
                vendors: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10
                },
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true
                }
            }
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-transform-runtime']
                    }
                }
            }
        ]
    }
};

module.exports = [serverConfig, clientConfig];