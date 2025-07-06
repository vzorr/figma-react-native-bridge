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
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@handlers': path.resolve(__dirname, 'src/handlers'),
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
      // CRITICAL: Figma-compatible HTML injection with enhanced UI
      new webpack.DefinePlugin({
        '__html__': JSON.stringify(
          (() => {
            try {
              // Use the enhanced UI HTML file
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
      
      // Enhanced validation plugin for layer list functionality
      {
        apply: (compiler) => {
          compiler.hooks.done.tap('ValidationPlugin', (stats) => {
            console.log('\n🔍 Build validation with Layer List support...');
            
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
                
                if (content.includes('LayerListHandler')) {
                  console.log('✅ Layer List functionality included');
                }
                
                if (content.includes('LIST_ALL_LAYERS')) {
                  console.log('✅ Layer listing messages detected');
                }
                
                if (content.includes('EXTRACT_SELECTED_LAYERS')) {
                  console.log('✅ Selective extraction functionality included');
                }
                
              } catch (readError) {
                console.log('⚠️  Could not analyze output file');
              }
            } else {
              console.log('❌ code.js not found');
            }
            
            console.log('🚀 Layer List build completed!');
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