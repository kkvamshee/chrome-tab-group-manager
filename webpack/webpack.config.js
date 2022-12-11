const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const manifestCopyOptions = {
   patterns: [{
      from: 'src/manifest.json',
      transform: (content, path) => {
         return Buffer.from(JSON.stringify({
            name: process.env.npm_package_name,
            description: process.env.npm_package_description,
            version: process.env.npm_package_version,
            ...JSON.parse(content.toString())
         }));
      }
   }]
}

module.exports = {
   mode: "production",
   entry: {
      background: path.resolve(__dirname, "..", "src", "background.ts"),
   },
   output: {
      path: path.join(__dirname, "../dist"),
      filename: "[name].js",
   },
   resolve: {
      extensions: [".ts", ".js"],
   },
   module: {
      rules: [
         {
            test: /\.tsx?$/,
            loader: "ts-loader",
            exclude: /node_modules/,
         },
      ],
   },
   plugins: [
     new CopyPlugin(manifestCopyOptions)
   ]
};