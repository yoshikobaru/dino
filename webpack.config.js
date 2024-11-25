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
        filename: '[name].js'
    },
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

module.exports = [serverConfig, clientConfig];