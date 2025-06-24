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
      // Remove process.env definitions since they're not available in Figma runtime
      // new webpack.DefinePlugin({
      //   'process.env.NODE_ENV': JSON.stringify(argv.mode || 'development'),
      //   'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
      //   'process.env.VERSION': JSON.stringify(require('./package.json').version),
      // }),
      
      // CRITICAL: Figma-compatible HTML injection
      new webpack.DefinePlugin({
        '__html__': JSON.stringify(
          (() => {
            try {
              const uiHtmlPath = path.resolve(__dirname, 'src/ui.html');
              const stylesPath = path.resolve(__dirname, 'src/styles.css');
              const scriptPath = path.resolve(__dirname, 'src/script.js');
              
              if (!fs.existsSync(uiHtmlPath)) {
                console.error('❌ ui.html not found at src/ui.html');
                return '<html><body><h1>UI not found</h1></body></html>';
              }
              
              let htmlContent = fs.readFileSync(uiHtmlPath, 'utf8');
              
              // Remove any existing external references first
              htmlContent = htmlContent.replace(/<link[^>]*href=["']styles\.css["'][^>]*>/gi, '');
              htmlContent = htmlContent.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '');
              
              // Inline CSS if exists
              if (fs.existsSync(stylesPath)) {
                const cssContent = fs.readFileSync(stylesPath, 'utf8');
                // Insert CSS before closing </head> tag
                htmlContent = htmlContent.replace(
                  '</head>',
                  `  <style>\n${cssContent}\n  </style>\n</head>`
                );
                console.log('✅ CSS inlined successfully');
              } else {
                console.warn('⚠️  styles.css not found - CSS will not be inlined');
              }
              
              // Inline JS if exists
              if (fs.existsSync(scriptPath)) {
                const jsContent = fs.readFileSync(scriptPath, 'utf8');
                // Insert JS before closing </body> tag
                htmlContent = htmlContent.replace(
                  '</body>',
                  `  <script>\n${jsContent}\n  </script>\n</body>`
                );
                console.log('✅ JavaScript inlined successfully');
              } else {
                console.warn('⚠️  script.js not found - JavaScript will not be inlined');
              }
              
              // Validate the final HTML
              if (!htmlContent.includes('<!DOCTYPE html>')) {
                console.warn('⚠️  HTML may be missing DOCTYPE declaration');
              }
              
              return htmlContent;
              
            } catch (error) {
              console.error('❌ Error processing UI files:', error.message);
              console.error(error.stack);
              return `<html><body><h1>Error loading UI: ${error.message}</h1></body></html>`;
            }
          })()
        ),
      }),
      
      // Copy UI files to dist with better error handling
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('CopyUIFilesPlugin', (compilation, callback) => {
            try {
              const srcDir = path.resolve(__dirname, 'src');
              const uiFiles = [
                { name: 'ui.html', required: true },
                { name: 'styles.css', required: false },
                { name: 'script.js', required: false }
              ];
              
              let filesProcessed = 0;
              
              // Copy individual files
              uiFiles.forEach(file => {
                const filePath = path.join(srcDir, file.name);
                if (fs.existsSync(filePath)) {
                  try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    compilation.assets[file.name] = {
                      source: () => content,
                      size: () => content.length,
                    };
                    console.log(`✅ ${file.name} copied to dist (${content.length} bytes)`);
                    filesProcessed++;
                  } catch (readError) {
                    console.error(`❌ Error reading ${file.name}:`, readError.message);
                  }
                } else if (file.required) {
                  console.error(`❌ Required file ${file.name} not found at src/${file.name}`);
                  compilation.errors.push(new Error(`Required file ${file.name} not found`));
                }
              });
              
              // Create combined HTML file ONLY if we have the base HTML
              const uiHtmlPath = path.join(srcDir, 'ui.html');
              if (fs.existsSync(uiHtmlPath)) {
                try {
                  let combinedHtml = fs.readFileSync(uiHtmlPath, 'utf8');
                  
                  // Remove external references first
                  combinedHtml = combinedHtml.replace(/<link[^>]*href=["']styles\.css["'][^>]*>/gi, '');
                  combinedHtml = combinedHtml.replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '');
                  
                  // Inline CSS
                  const stylesPath = path.join(srcDir, 'styles.css');
                  if (fs.existsSync(stylesPath)) {
                    const cssContent = fs.readFileSync(stylesPath, 'utf8');
                    combinedHtml = combinedHtml.replace(
                      '</head>',
                      `  <style>\n${cssContent}\n  </style>\n</head>`
                    );
                  }
                  
                  // Inline JavaScript
                  const scriptPath = path.join(srcDir, 'script.js');
                  if (fs.existsSync(scriptPath)) {
                    const jsContent = fs.readFileSync(scriptPath, 'utf8');
                    combinedHtml = combinedHtml.replace(
                      '</body>',
                      `  <script>\n${jsContent}\n  </script>\n</body>`
                    );
                  }
                  
                  // Save combined version
                  compilation.assets['ui-combined.html'] = {
                    source: () => combinedHtml,
                    size: () => combinedHtml.length,
                  };
                  console.log(`✅ ui-combined.html created (${combinedHtml.length} bytes)`);
                  
                } catch (combineError) {
                  console.error('❌ Error creating combined HTML:', combineError.message);
                }
              }
              
              console.log(`📦 Total files processed: ${filesProcessed}`);
              
            } catch (error) {
              console.error('❌ Critical error in CopyUIFilesPlugin:', error.message);
              console.error(error.stack);
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
 * This file contains the main plugin logic and embedded UI.
 * The UI HTML is available via the __html__ variable.
 * 
 * Note: process.env is not available in Figma plugin runtime
 */`,
        raw: false,
      }),
      
      // Enhanced validation with Figma-specific checks
      {
        apply: (compiler) => {
          compiler.hooks.done.tap('FigmaValidationPlugin', (stats) => {
            console.log('\n🔍 Running Figma compatibility checks...');
            
            if (stats.compilation.errors.length > 0) {
              console.log('\n❌ Build completed with errors:');
              stats.compilation.errors.forEach(error => {
                console.log(`   ${error.message}`);
              });
              return;
            }
            
            // Validate output files
            const distDir = path.resolve(__dirname, 'dist');
            const codeJsPath = path.join(distDir, 'code.js');
            
            if (!fs.existsSync(codeJsPath)) {
              console.log('❌ code.js not found in dist folder');
              return;
            }
            
            console.log('✅ code.js exists in dist');
            
            try {
              const codeContent = fs.readFileSync(codeJsPath, 'utf8');
              
              // Check for HTML injection
              if (codeContent.includes('__html__')) {
                console.log('✅ HTML variable injection detected');
                
                if (codeContent.includes('<!DOCTYPE html>')) {
                  console.log('✅ Valid HTML DOCTYPE found');
                } else {
                  console.log('⚠️  HTML DOCTYPE not found - may cause issues');
                }
                
                if (codeContent.includes('<style>')) {
                  console.log('✅ Inlined CSS detected');
                } else {
                  console.log('⚠️  No inlined CSS found');
                }
                
                if (codeContent.includes('<script>')) {
                  console.log('✅ Inlined JavaScript detected');
                } else {
                  console.log('⚠️  No inlined JavaScript found');
                }
                
              } else {
                console.log('❌ HTML injection failed - __html__ variable not found');
              }
              
              // Check for common Figma API usage
              if (codeContent.includes('figma.showUI')) {
                console.log('✅ figma.showUI call detected');
              } else {
                console.log('⚠️  figma.showUI not found - plugin may not show UI');
              }
              
              if (codeContent.includes('figma.ui.postMessage')) {
                console.log('✅ Message posting detected');
              }
              
              // File size check
              const fileSizeKB = Math.round(codeContent.length / 1024);
              console.log(`📏 code.js size: ${fileSizeKB}KB`);
              
              if (fileSizeKB > 2000) {
                console.log('⚠️  Large file size - consider optimization');
              }
              
            } catch (readError) {
              console.log('❌ Error reading code.js:', readError.message);
            }
            
            // Check for additional files
            const additionalFiles = ['ui.html', 'styles.css', 'script.js', 'ui-combined.html'];
            additionalFiles.forEach(file => {
              const filePath = path.join(distDir, file);
              if (fs.existsSync(filePath)) {
                console.log(`✅ ${file} available in dist`);
              }
            });
            
            console.log('\n🚀 Build completed successfully!');
            console.log('📋 Next steps:');
            console.log('   1. Copy dist/code.js to your Figma plugin directory');
            console.log('   2. Update manifest.json to point to code.js');
            console.log('   3. Test in Figma development environment');
            
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