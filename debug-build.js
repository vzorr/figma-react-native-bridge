// debug-build.js - Run this to check your generated code
const fs = require('fs');
const path = require('path');

function debugBuild() {
  console.log('🔍 Debugging Figma Plugin Build\n');
  
  // Check if dist folder exists
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    console.log('❌ No dist folder found. Run npm run build first.');
    return;
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
    
    // Check first 10 lines for syntax issues
    const lines = codeContent.split('\n');
    console.log('\n🔍 First 10 lines of code.js:');
    lines.slice(0, 10).forEach((line, index) => {
      console.log(`${String(index + 1).padStart(3, ' ')}: ${line}`);
    });
    
    // Check for HTML injection
    if (codeContent.includes('__html__')) {
      console.log('\n✅ __html__ variable found in code.js');
      
      // Find the HTML declaration line
      const htmlLineIndex = lines.findIndex(line => line.includes('__html__'));
      if (htmlLineIndex >= 0) {
        console.log(`   HTML declaration on line ${htmlLineIndex + 1}`);
        console.log(`   Content: ${lines[htmlLineIndex].substring(0, 100)}...`);
      }
    } else {
      console.log('\n❌ __html__ variable NOT found in code.js');
    }
    
    // Basic syntax check
    try {
      // Try to parse as JavaScript (this won't catch all issues but helps)
      new Function(codeContent.substring(0, 1000)); // Check first 1000 chars
      console.log('\n✅ Basic syntax check passed');
    } catch (error) {
      console.log('\n❌ Syntax error detected:');
      console.log(`   ${error.message}`);
    }
    
  } else {
    console.log('❌ code.js not found in dist folder');
  }
  
  // Check ui.html
  const uiHtmlPath = path.join(distPath, 'ui.html');
  if (fs.existsSync(uiHtmlPath)) {
    const uiContent = fs.readFileSync(uiHtmlPath, 'utf8');
    console.log(`\n📄 ui.html: ${(uiContent.length / 1024).toFixed(2)}KB`);
    console.log('✅ ui.html copied successfully');
  } else {
    console.log('\n❌ ui.html not found in dist folder');
  }
  
  // Check manifest.json
  const manifestPath = path.join(__dirname, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('\n📄 manifest.json:');
    console.log(`   main: ${manifest.main}`);
    console.log(`   ui: ${manifest.ui}`);
    
    // Verify paths exist
    const mainExists = fs.existsSync(path.join(__dirname, manifest.main));
    const uiExists = fs.existsSync(path.join(__dirname, manifest.ui));
    
    console.log(`   main file exists: ${mainExists ? '✅' : '❌'}`);
    console.log(`   ui file exists: ${uiExists ? '✅' : '❌'}`);
  }
  
  console.log('\n🎉 Debug complete!');
}

debugBuild();