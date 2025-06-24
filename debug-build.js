// debug-build.js - Enhanced version to debug minified code
const fs = require('fs');
const path = require('path');

function debugBuild() {
  console.log('🔍 Enhanced Figma Plugin Build Debug\n');
  
  // Check if dist folder exists
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Run npm run build first.');
    return false;
  }
  
  // Check files in dist
  const files = fs.readdirSync(distPath);
  console.log('📁 Files in dist:', files);
  
  // Check code.js specifically
  const codeJsPath = path.join(distPath, 'code.js');
  if (fs.existsSync(codeJsPath)) {
    const codeContent = fs.readFileSync(codeJsPath, 'utf8');
    
    console.log('\n📄 code.js analysis:');
    console.log(`   Size: ${(codeContent.length / 1024).toFixed(2)}KB`);
    console.log(`   Lines: ${codeContent.split('\n').length}`);
    
    // Look for HTML injection in minified code
    console.log('\n🔍 Searching for HTML injection patterns...');
    
    // Check for various __html__ patterns
    const htmlPatterns = [
      /__html__/g,
      /window\.__html__/g,
      /global\.__html__/g,
      /self\.__html__/g,
      /"__html__"/g,
      /'__html__'/g
    ];
    
    let htmlFound = false;
    htmlPatterns.forEach((pattern, index) => {
      const matches = codeContent.match(pattern);
      if (matches) {
        console.log(`✅ Pattern ${index + 1} found: ${pattern.source} (${matches.length} occurrences)`);
        htmlFound = true;
      }
    });
    
    if (!htmlFound) {
      console.log('❌ No __html__ patterns found in code');
    }
    
    // Look for HTML content injection
    if (codeContent.includes('<!DOCTYPE html>') || codeContent.includes('<html>')) {
      console.log('✅ HTML content detected in code.js');
      
      // Try to find the approximate location
      const htmlStart = codeContent.indexOf('<!DOCTYPE html>') !== -1 ? 
        codeContent.indexOf('<!DOCTYPE html>') : codeContent.indexOf('<html>');
      if (htmlStart >= 0) {
        const context = codeContent.substring(Math.max(0, htmlStart - 50), htmlStart + 100);
        console.log(`   HTML context: ...${context.substring(0, 150)}...`);
      }
    } else {
      console.log('❌ No HTML content found in code.js');
    }
    
    // Look for the HTML injection function
    if (codeContent.includes('htmlContent') || codeContent.includes('HTML Content Injection')) {
      console.log('✅ HTML injection code detected');
    } else {
      console.log('❌ No HTML injection code detected');
    }
    
    // Check for module exports pattern
    if (codeContent.includes('module.exports.__html__')) {
      console.log('✅ Module export pattern found');
    }
    
    // More sophisticated analysis for minified code
    console.log('\n🔍 Advanced analysis of minified code:');
    
    // Look for JSON-encoded HTML (will be a long string)
    const longStringPattern = /"[^"\\]*(?:\\.[^"\\]*)*"/g;
    const longStrings = codeContent.match(longStringPattern);
    if (longStrings) {
      const htmlStrings = longStrings.filter(str => str.length > 1000);
      if (htmlStrings.length > 0) {
        console.log(`✅ Found ${htmlStrings.length} long encoded string(s) (likely HTML content)`);
        htmlStrings.forEach((str, index) => {
          if (str.includes('<!DOCTYPE') || str.includes('<html>') || str.includes('</html>')) {
            console.log(`   String ${index + 1}: Contains HTML content (${(str.length / 1024).toFixed(2)}KB)`);
          }
        });
      } else {
        console.log('❌ No long encoded strings found (HTML may not be injected)');
      }
    } else {
      console.log('❌ No encoded strings found');
    }
    
    // Check if the code structure is valid
    try {
      // Don't actually eval, just check basic structure
      if (codeContent.includes('(()=>{') || codeContent.includes('(function()')) {
        console.log('✅ Valid webpack bundle structure detected');
      } else {
        console.log('⚠️  Unexpected code structure');
      }
    } catch (e) {
      console.log('❌ Code structure validation failed');
    }
    
  } else {
    console.log('❌ code.js not found in dist folder');
    return false;
  }
  
  // Check ui.html
  const uiHtmlPath = path.join(distPath, 'ui.html');
  if (fs.existsSync(uiHtmlPath)) {
    const uiContent = fs.readFileSync(uiHtmlPath, 'utf8');
    console.log(`\n📄 ui.html: ${(uiContent.length / 1024).toFixed(2)}KB`);
    
    // Verify HTML structure
    if (uiContent.includes('<!DOCTYPE html>') && uiContent.includes('</html>')) {
      console.log('✅ Valid HTML document structure');
    } else {
      console.log('⚠️  HTML document may be incomplete');
    }
    
    // Check for key UI components
    const uiChecks = [
      { pattern: 'extractTokens', name: 'Extract Tokens function' },
      { pattern: 'extractScreens', name: 'Extract Screens function' },
      { pattern: 'onmessage', name: 'Message handler' },
      { pattern: 'postMessage', name: 'Plugin communication' }
    ];
    
    uiChecks.forEach(check => {
      if (uiContent.includes(check.pattern)) {
        console.log(`✅ ${check.name} found`);
      } else {
        console.log(`❌ ${check.name} missing`);
      }
    });
    
  } else {
    console.log('\n❌ ui.html not found in dist folder');
  }
  
  // Check manifest.json
  const manifestPath = path.join(__dirname, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('\n📄 manifest.json validation:');
    console.log(`   main: ${manifest.main}`);
    console.log(`   ui: ${manifest.ui}`);
    
    // Verify paths exist
    const mainExists = fs.existsSync(path.join(__dirname, manifest.main));
    const uiExists = fs.existsSync(path.join(__dirname, manifest.ui));
    
    console.log(`   main file exists: ${mainExists ? '✅' : '❌'}`);
    console.log(`   ui file exists: ${uiExists ? '✅' : '❌'}`);
    
    if (mainExists && uiExists) {
      console.log('✅ All manifest paths are valid');
    }
  } else {
    console.log('\n❌ manifest.json not found');
  }
  
  // Final recommendation
  console.log('\n🎯 Build Assessment:');
  
  if (!fs.existsSync(codeJsPath)) {
    console.log('❌ Cannot assess: code.js not found');
    return false;
  }
  
  // Re-read the code content for final assessment
  const finalCodeContent = fs.readFileSync(codeJsPath, 'utf8');
  
  const hasHtmlContent = finalCodeContent.includes('<!DOCTYPE html>') || finalCodeContent.includes('<html>');
  const hasHtmlVariable = finalCodeContent.includes('__html__');
  const hasValidStructure = finalCodeContent.includes('(()=>{') || finalCodeContent.includes('(function()');
  const hasWebpackBundle = finalCodeContent.includes('webpack') || finalCodeContent.includes('__webpack');
  
  console.log(`   HTML Content: ${hasHtmlContent ? '✅' : '❌'}`);
  console.log(`   HTML Variable: ${hasHtmlVariable ? '✅' : '❌'}`);
  console.log(`   Valid Structure: ${hasValidStructure ? '✅' : '❌'}`);
  console.log(`   Webpack Bundle: ${hasWebpackBundle ? '✅' : '❌'}`);
  
  if (hasHtmlContent && (hasHtmlVariable || hasValidStructure)) {
    console.log('\n🎉 BUILD SUCCESS! Your plugin should work in Figma.');
    console.log('   - HTML content is properly injected');
    console.log('   - Code structure is valid');
    console.log('   - Ready for testing in Figma');
    return true;
  } else if (hasValidStructure && !hasHtmlContent) {
    console.log('\n⚠️  BUILD PARTIAL: Code is valid but HTML injection failed.');
    console.log('   - Try rebuilding with the new webpack config');
    console.log('   - Check that src/ui.html exists');
    console.log('   - Verify webpack HTML injection plugin is working');
    return false;
  } else {
    console.log('\n❌ BUILD ISSUES: There may be problems with the build.');
    console.log('   - Check webpack configuration');
    console.log('   - Verify all source files exist');
    console.log('   - Try a clean rebuild: rm -rf dist && npm run build');
    return false;
  }
}

// Export for potential testing
if (require.main === module) {
  debugBuild();
}

module.exports = debugBuild;