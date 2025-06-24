const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/main.ts',
    
    output: {
      filename: 'code.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@core': path.resolve(__dirname, 'src/core'),
        '@extractors': path.resolve(__dirname, 'src/extractors'),
        '@generators': path.resolve(__dirname, 'src/generators'),
        '@detectors': path.resolve(__dirname, 'src/detectors'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@handlers': path.resolve(__dirname, 'src/handlers'),
        '@types': path.resolve(__dirname, 'src/types'),
      },
    },
    
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.json',
                transpileOnly: !isProduction,
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'process.env.VERSION': JSON.stringify(require('./package.json').version),
      }),
      
      // Simple and reliable HTML injection using DefinePlugin
      new webpack.DefinePlugin({
        '__html__': JSON.stringify(
          fs.existsSync('./src/ui.html') 
            ? fs.readFileSync('./src/ui.html', 'utf8')
            : '<html><body><h1>UI not found</h1></body></html>'
        ),
      }),
      
      // Copy UI file to dist
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('CopyUIPlugin', (compilation, callback) => {
            try {
              const uiHtmlPath = path.resolve(__dirname, 'src/ui.html');
              if (fs.existsSync(uiHtmlPath)) {
                const uiHtmlContent = fs.readFileSync(uiHtmlPath, 'utf8');
                compilation.assets['ui.html'] = {
                  source: () => uiHtmlContent,
                  size: () => uiHtmlContent.length,
                };
                console.log('✅ UI HTML copied to dist');
              } else {
                console.log('⚠️  UI HTML file not found at src/ui.html');
              }
            } catch (error) {
              console.error('❌ Error copying UI HTML:', error.message);
            }
            callback();
          });
        },
      },
      
      new webpack.BannerPlugin({
        banner: `/**
 * Figma React Native Bridge Plugin
 * Built: ${new Date().toISOString()}
 * Mode: ${argv.mode || 'development'}
 */`,
        raw: false,
      }),
      
      // Simple validation
      {
        apply: (compiler) => {
          compiler.hooks.done.tap('ValidationPlugin', (stats) => {
            if (stats.compilation.errors.length === 0) {
              console.log('\n✅ Build completed successfully');
              console.log('🚀 Plugin ready for Figma testing');
              
              // Quick validation
              const codeJsPath = path.resolve(__dirname, 'dist/code.js');
              if (fs.existsSync(codeJsPath)) {
                const content = fs.readFileSync(codeJsPath, 'utf8');
                if (content.includes('<!DOCTYPE html>') || content.includes('<html>')) {
                  console.log('✅ HTML injection successful');
                } else {
                  console.log('⚠️  HTML injection may have failed - check debug output');
                }
              }
            } else {
              console.log('\n❌ Build completed with errors');
            }
          });
        },
      },
    ],
    
    optimization: {
      minimize: isProduction,
      splitChunks: false,
      usedExports: true,
      sideEffects: false,
    },
    
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    stats: {
      modules: false,
      chunks: false,
      colors: true,
      errors: true,
      errorDetails: true,
      warnings: true,
      assets: true,
      performance: true,
    },
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 2000000, // 2MB
      maxEntrypointSize: 2000000, // 2MB
    },
    
    node: false,
    
    watchOptions: {
      aggregateTimeout: 300,
      poll: false,
      ignored: /node_modules/,
    },
    
    externals: {
      'figma': 'figma'
    },
  };
};