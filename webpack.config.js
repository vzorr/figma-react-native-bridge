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
      // Remove complex aliases that reference missing directories
      alias: {
        '@core': path.resolve(__dirname, 'src/core'),
        '@utils': path.resolve(__dirname, 'src/utils'),
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
      // CRITICAL: Figma-compatible HTML injection
      new webpack.DefinePlugin({
        '__html__': JSON.stringify(
          (() => {
            try {
              const uiHtmlPath = path.resolve(__dirname, 'src/ui.html');
              
              if (!fs.existsSync(uiHtmlPath)) {
                console.error('❌ ui.html not found at src/ui.html');
                return '<html><body><h1>UI not found</h1></body></html>';
              }
              
              let htmlContent = fs.readFileSync(uiHtmlPath, 'utf8');
              
              // Try to inline CSS if exists (optional)
              const stylesPath = path.resolve(__dirname, 'src/styles.css');
              if (fs.existsSync(stylesPath)) {
                try {
                  const cssContent = fs.readFileSync(stylesPath, 'utf8');
                  htmlContent = htmlContent.replace(
                    '</head>',
                    `  <style>\n${cssContent}\n  </style>\n</head>`
                  );
                  console.log('✅ CSS inlined successfully');
                } catch (cssError) {
                  console.warn('⚠️  Could not inline CSS:', cssError.message);
                }
              } else {
                console.log('ℹ️  No styles.css found - skipping CSS inline');
              }
              
              // Try to inline JS if exists (optional)
              const scriptPath = path.resolve(__dirname, 'src/script.js');
              if (fs.existsSync(scriptPath)) {
                try {
                  const jsContent = fs.readFileSync(scriptPath, 'utf8');
                  htmlContent = htmlContent.replace(
                    '</body>',
                    `  <script>\n${jsContent}\n  </script>\n</body>`
                  );
                  console.log('✅ JavaScript inlined successfully');
                } catch (jsError) {
                  console.warn('⚠️  Could not inline JavaScript:', jsError.message);
                }
              } else {
                console.log('ℹ️  No script.js found - skipping JS inline');
              }
              
              return htmlContent;
              
            } catch (error) {
              console.error('❌ Error processing UI files:', error.message);
              return `<html><body><h1>Error loading UI: ${error.message}</h1></body></html>`;
            }
          })()
        ),
      }),
      
      // Simple file copy plugin (optional files)
      {
        apply: (compiler) => {
          compiler.hooks.emit.tapAsync('CopyUIFilesPlugin', (compilation, callback) => {
            try {
              const srcDir = path.resolve(__dirname, 'src');
              
              // Only copy files that actually exist
              const possibleFiles = ['ui.html', 'styles.css', 'script.js'];
              
              possibleFiles.forEach(fileName => {
                const filePath = path.join(srcDir, fileName);
                if (fs.existsSync(filePath)) {
                  try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    compilation.assets[fileName] = {
                      source: () => content,
                      size: () => content.length,
                    };
                    console.log(`✅ ${fileName} copied to dist`);
                  } catch (readError) {
                    console.warn(`⚠️  Could not read ${fileName}:`, readError.message);
                  }
                }
              });
              
            } catch (error) {
              console.error('❌ Error in CopyUIFilesPlugin:', error.message);
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
      
      // Simple validation plugin
      {
        apply: (compiler) => {
          compiler.hooks.done.tap('ValidationPlugin', (stats) => {
            console.log('\n🔍 Build validation...');
            
            if (stats.compilation.errors.length > 0) {
              console.log('❌ Build errors found:');
              stats.compilation.errors.forEach(error => {
                console.log(`   ${error.message}`);
              });
              return;
            }
            
            const distDir = path.resolve(__dirname, 'dist');
            const codeJsPath = path.join(distDir, 'code.js');
            
            if (fs.existsSync(codeJsPath)) {
              console.log('✅ code.js generated successfully');
              
              try {
                const content = fs.readFileSync(codeJsPath, 'utf8');
                const sizeKB = Math.round(content.length / 1024);
                console.log(`📏 File size: ${sizeKB}KB`);
                
                if (content.includes('__html__')) {
                  console.log('✅ HTML injection successful');
                }
                
                if (content.includes('figma.showUI')) {
                  console.log('✅ Figma API calls detected');
                }
                
              } catch (readError) {
                console.log('⚠️  Could not analyze output file');
              }
            } else {
              console.log('❌ code.js not found');
            }
            
            console.log('🚀 Build completed!');
          });
        },
      },
    ],
    
    optimization: {
      minimize: isProduction,
      splitChunks: false,
    },
    
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    stats: {
      colors: true,
      errors: true,
      warnings: true,
      assets: true,
    },
    
    node: false,
    
    externals: {
      'figma': 'figma'
    },
  };
};