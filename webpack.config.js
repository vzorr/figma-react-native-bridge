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
      
      // Fixed HTML injection using JSON.stringify for proper escaping
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('SafeUIInjection', (compilation, callback) => {
            try {
              // Read the UI HTML file
              const uiHtmlPath = path.resolve(__dirname, 'src/ui.html');
              
              if (!fs.existsSync(uiHtmlPath)) {
                throw new Error(`UI HTML file not found at: ${uiHtmlPath}`);
              }
              
              let uiHtmlContent = fs.readFileSync(uiHtmlPath, 'utf8');
              
              // Use JSON.stringify to properly escape all characters
              // This handles quotes, newlines, special characters, etc.
              const escapedHtml = JSON.stringify(uiHtmlContent);
              
              // Create the injection code with proper escaping
              const htmlInjection = `// Auto-generated HTML content - Figma React Native Bridge
var __html__ = ${escapedHtml};

// Export for webpack compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports.__html__ = __html__;
}

`;
              
              // Get the existing code.js content and prepend the HTML
              const codeAsset = compilation.assets['code.js'];
              if (codeAsset) {
                const existingCode = codeAsset.source();
                const finalCode = htmlInjection + existingCode;
                
                compilation.assets['code.js'] = {
                  source: () => finalCode,
                  size: () => finalCode.length,
                };
                
                console.log('✅ UI HTML injected successfully using JSON.stringify');
                console.log(`   HTML size: ${(uiHtmlContent.length / 1024).toFixed(2)}KB`);
                console.log(`   Final code size: ${(finalCode.length / 1024).toFixed(2)}KB`);
              } else {
                throw new Error('code.js asset not found in compilation');
              }
              
              // Also copy ui.html to dist for Figma to find
              compilation.assets['ui.html'] = {
                source: () => uiHtmlContent,
                size: () => uiHtmlContent.length,
              };
              
            } catch (error) {
              console.error('❌ Error injecting UI files:', error.message);
              
              // Fallback: create a safe minimal HTML variable
              const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Plugin Error</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .error { color: #d32f2f; background: #ffebee; padding: 16px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="error">
    <h2>Plugin UI Error</h2>
    <p>Failed to load the main UI. Please check the console for details.</p>
    <p>Error: ${error.message.replace(/"/g, '&quot;')}</p>
  </div>
</body>
</html>`;
              
              const fallbackInjection = `// Fallback HTML due to injection error
var __html__ = ${JSON.stringify(fallbackHtml)};

`;
              
              const codeAsset = compilation.assets['code.js'];
              if (codeAsset) {
                const existingCode = codeAsset.source();
                compilation.assets['code.js'] = {
                  source: () => fallbackInjection + existingCode,
                  size: () => (fallbackInjection + existingCode).length,
                };
              }
              
              // Still create a basic ui.html
              compilation.assets['ui.html'] = {
                source: () => fallbackHtml,
                size: () => fallbackHtml.length,
              };
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
 * 
 * This plugin extracts design tokens and generates React Native components
 * from Figma designs with responsive, semantic analysis.
 */`,
        raw: false,
      }),
      
      // Build validation plugin
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('BuildValidator', (compilation, callback) => {
            const errors = [];
            const warnings = [];
            
            // Check if required assets exist
            const requiredAssets = ['code.js', 'ui.html'];
            requiredAssets.forEach(asset => {
              if (!compilation.assets[asset]) {
                errors.push(`Required asset missing: ${asset}`);
              }
            });
            
            // Check code.js for __html__ variable
            const codeAsset = compilation.assets['code.js'];
            if (codeAsset) {
              const codeContent = codeAsset.source();
              if (!codeContent.includes('var __html__')) {
                warnings.push('__html__ variable not found in code.js');
              }
              
              // Basic syntax validation
              if (codeContent.includes('undefined') && isProduction) {
                warnings.push('Found undefined values in production build');
              }
            }
            
            // Report results
            if (errors.length > 0) {
              console.log('\n❌ Build Validation Errors:');
              errors.forEach(error => console.log(`   ${error}`));
            }
            
            if (warnings.length > 0) {
              console.log('\n⚠️  Build Validation Warnings:');
              warnings.forEach(warning => console.log(`   ${warning}`));
            }
            
            if (errors.length === 0 && warnings.length === 0) {
              console.log('\n✅ Build validation passed');
            }
            
            // Generate build info
            const buildInfo = {
              timestamp: new Date().toISOString(),
              mode: argv.mode || 'development',
              validation: {
                errors: errors.length,
                warnings: warnings.length,
                passed: errors.length === 0
              },
              assets: Object.keys(compilation.assets).map(name => ({
                name,
                size: compilation.assets[name].size()
              }))
            };
            
            compilation.assets['build-info.json'] = {
              source: () => JSON.stringify(buildInfo, null, 2),
              size: () => JSON.stringify(buildInfo, null, 2).length,
            };
            
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
      maxAssetSize: 1000000, // 1MB
      maxEntrypointSize: 1000000, // 1MB
    },
    
    node: false,
    
    watchOptions: {
      aggregateTimeout: 300,
      poll: false,
      ignored: /node_modules/,
    },
    
    // Add fallback for missing modules
    externals: {
      'figma': 'figma'
    },
  };
};