module.exports = [
  // Add support for native node modules
  {
    test: /\.node$/,
    use: 'node-loader',
  },
  {
    test: /\.js$/,
    enforce: "pre",
    use: ["source-map-loader"],
  },
  {
    test: /\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules',
      },
    },
  },
  {
    test: /\.jsx?$/,
    use: {
      loader: 'babel-loader',
      options: {
        exclude: /node_modules/,
        presets: ['@babel/preset-react'],
      }
    }
  },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    use: ['svg-inline-loader'],
  },
  {
    test: /\.(?:txt|sh)$/,
    type: 'asset/source',
  },
  {
    test: /\.(?:png|jpg)$/,
    type: 'asset/resource',
  },
  {
    test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'fonts/',
        }
      }
    ]
  }
];
