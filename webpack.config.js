'use strict';

const path = require('path');

/** @type {import('webpack').Configuration} */
const nodeConfig = {
  target: 'node',
  entry: './src/themeswitcher.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'themeswitcher.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
};

/** @type {import('webpack').Configuration} */
const webviewConfig = {
  target: 'web',
  entry: './src/webview/settings.tsx',
  output: {
    path: path.resolve(__dirname, 'dist', 'webview'),
    filename: 'settings.js',
    publicPath: '',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          { loader: 'postcss-loader' },
        ],
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
};

module.exports = [nodeConfig, webviewConfig];
