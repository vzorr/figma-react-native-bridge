const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/main.ts',
    
    output: {
      filename: 'code.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true, // Clean dist folder on each build
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
                transpileOnly: !isProduction, // Skip type checking in dev for speed
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
      
      // Custom plugin to log module information
      new webpack.BannerPlugin({
        banner: `
/**
 * Figma React Native Bridge Plugin
 * Built: ${new Date().toISOString()}
 * Mode: ${argv.mode || 'development'}
 * Modules: [See console for detailed module map]
 */
        `.trim(),
        raw: false,
      }),
      
      // Custom plugin for module tracking
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('ModuleTracker', (compilation, callback) => {
            const moduleMap = {};
            const errors = [];
            
            compilation.modules.forEach((module) => {
              if (module.resource) {
                const relativePath = path.relative(__dirname, module.resource);
                const size = module.size ? module.size() : 0;
                
                moduleMap[relativePath] = {
                  size,
                  dependencies: module.dependencies ? module.dependencies.length : 0,
                  id: module.id,
                };
              }
              
              if (module.errors && module.errors.length > 0) {
                module.errors.forEach(error => {
                  errors.push({
                    module: module.resource ? path.relative(__dirname, module.resource) : 'unknown',
                    error: error.message,
                  });
                });
              }
            });
            
            // Write module map to file
            const moduleMapContent = JSON.stringify({
              buildTime: new Date().toISOString(),
              mode: argv.mode || 'development',
              totalModules: Object.keys(moduleMap).length,
              modules: moduleMap,
              errors,
              stats: {
                totalSize: Object.values(moduleMap).reduce((sum, mod) => sum + mod.size, 0),
                avgSize: Object.values(moduleMap).reduce((sum, mod) => sum + mod.size, 0) / Object.keys(moduleMap).length,
              }
            }, null, 2);
            
            compilation.assets['module-map.json'] = {
              source: () => moduleMapContent,
              size: () => moduleMapContent.length,
            };
            
            console.log('\n📊 Build Analysis:');
            console.log(`   Modules: ${Object.keys(moduleMap).length}`);
            console.log(`   Errors: ${errors.length}`);
            console.log(`   Total Size: ${(Object.values(moduleMap).reduce((sum, mod) => sum + mod.size, 0) / 1024).toFixed(2)}KB`);
            
            if (errors.length > 0) {
              console.log('\n❌ Build Errors:');
              errors.forEach(err => {
                console.log(`   ${err.module}: ${err.error}`);
              });
            }
            
            callback();
          });
        },
      },
    ],
    
    optimization: {
      minimize: isProduction,
      
      // Split chunks for better caching (though not needed for Figma plugins)
      splitChunks: false,
      
      // Remove unused exports
      usedExports: true,
      sideEffects: false,
    },
    
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    stats: {
      modules: true,
      modulesSpace: 50,
      reasons: !isProduction,
      errorDetails: true,
      colors: true,
      chunks: true,
      chunkModules: true,
    },
    
    // Development server (not used for Figma plugins but useful for testing)
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      hot: true,
      open: false,
    },
    
    // Performance hints
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 500000, // 500KB
      maxEntrypointSize: 500000,
    },
    
    // External dependencies (if any)
    externals: {
      // figma: 'figma', // If figma was external
    },
    
    // Node polyfills (disable for smaller bundle)
    node: false,
    
    // Watch options for development
    watchOptions: {
      aggregateTimeout: 300,
      poll: false,
      ignored: /node_modules/,
    },
  };
};

// Export configuration for different environments
module.exports.development = {
  ...module.exports,
  mode: 'development',
  devtool: 'eval-source-map',
  optimization: {
    minimize: false,
  },
};

module.exports.production = {
  ...module.exports,
  mode: 'production',
  devtool: 'source-map',
  optimization: {
    minimize: true,
  },
};