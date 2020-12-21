const webpack = require('webpack');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
	devtool: 'source-map',
	entry: {
		editor: "./js/index.js",
		"public-share": "./js/public-share.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: '[name].bundle.js',
		path: path.resolve(__dirname, "build"),
		uniqueName: 'files_texteditor',
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	plugins: [
		new CleanWebpackPlugin(),
	],
	module: {
		rules: [
			{
				test: /\.js$/,
				include: [
					path.resolve(__dirname, "js")
				],
				use: {
					loader: 'babel-loader'
				}
			},
			{
				test: /\.css$/,
				use: [
					'css-loader'
				]
			},
			{
				test: /\.(png|jpg|gif|svg|woff|woff2|ttf|eot)$/,
				use: [
					{
						loader: 'file-loader',
						options: {}
					}
				]
			}
		]
	},
};
