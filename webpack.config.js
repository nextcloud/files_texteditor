const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const CleanWebpackPlugin = require('clean-webpack-plugin');

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
		jsonpFunction: 'webpackJsonpTexteditor'
	},
	resolve: {
		extensions: [".ts", ".js"]
	},
	plugins: [
		new CleanWebpackPlugin(['build']),
		new webpack.NamedModulesPlugin(),
		new ExtractTextPlugin({
			filename: "styles.css",
			allChunks: true
		}),
		new UglifyJSPlugin({sourceMap: true})
	],
	module: {
		loaders: [
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
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: "css-loader"
				})
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
	node: {
		fs: 'empty'
	}
};
