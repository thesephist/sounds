const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './static/js/index.js',
    mode: process.env.NODE_ENV,
    plugins: [
        new CopyWebpackPlugin([
            'static/index.html',
            'static/main.css',
            'static/mp3/*.mp3',
        ]),
    ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.min.js',
    },
}
