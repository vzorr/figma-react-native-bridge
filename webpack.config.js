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
      
      // Bulletproof HTML injection that handles all edge cases
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('BulletproofUIInjection', (compilation, callback) => {
            try {
              // Read the UI HTML file
              const uiHtmlPath = path.resolve(__dirname, 'src/ui.html');
              let uiHtmlContent = fs.readFileSync(uiHtmlPath, 'utf8');
              
              // Normalize line endings to Unix style first
              uiHtmlContent = uiHtmlContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
              
              // Use a more robust escaping approach
              // Convert to Base64 and then decode in JavaScript
              const base64Html = Buffer.from(uiHtmlContent, 'utf8').toString('base64');
              
              // Create the injection code that decodes Base64
              const htmlInjection = `// Auto-generated HTML content
var __html__ = (function() {
  try {
    var base64 = "${base64Html}";
    var binary = '';
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (var i = 0; i < base64.length; i += 4) {
      var encoded1 = chars.indexOf(base64.charAt(i));
      var encoded2 = chars.indexOf(base64.charAt(i + 1));
      var encoded3 = chars.indexOf(base64.charAt(i + 2));
      var encoded4 = chars.indexOf(base64.charAt(i + 3));
      var bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      binary += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) binary += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) binary += String.fromCharCode(bitmap & 255);
    }
    return binary;
  } catch (e) {
    console.error('Failed to decode HTML:', e);
    return '<html><body><h1>Error loading UI</h1></body></html>';
  }
})();

`;
              
              // Get the existing code.js content and prepend the HTML
              const codeAsset = compilation.assets['code.js'];
              if (codeAsset) {
                const existingCode = codeAsset.source();
                compilation.assets['code.js'] = {
                  source: () => htmlInjection + existingCode,
                  size: () => (htmlInjection + existingCode).length,
                };
              }
              
              // Also copy ui.html to dist for Figma to find
              compilation.assets['ui.html'] = {
                source: () => uiHtmlContent,
                size: () => uiHtmlContent.length,
              };
              
              console.log('✅ UI files injected using Base64 encoding (bulletproof method)');
              
            } catch (error) {
              console.error('❌ Error injecting UI files:', error);
              
              // Fallback: create a minimal HTML variable
              const fallbackInjection = `var __html__ = "<html><body><h1>Plugin UI Error</h1><p>Failed to load UI. Check console.</p></body></html>";

`;
              
              const codeAsset = compilation.assets['code.js'];
              if (codeAsset) {
                const existingCode = codeAsset.source();
                compilation.assets['code.js'] = {
                  source: () => fallbackInjection + existingCode,
                  size: () => (fallbackInjection + existingCode).length,
                };
              }
            }
            
            callback();
          });
        },
      },
      
      new webpack.BannerPlugin({
        banner: `
/**
 * Figma React Native Bridge Plugin
 * Built: ${new Date().toISOString()}
 * Mode: ${argv.mode || 'development'}
 */
        `.trim(),
        raw: false,
      }),
      
      // Module tracking plugin
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
      splitChunks: false,
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
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 500000,
      maxEntrypointSize: 500000,
    },
    
    node: false,
    
    watchOptions: {
      aggregateTimeout: 300,
      poll: false,
      ignored: /node_modules/,
    },
  };
};