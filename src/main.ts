// Figma Plugin Main Entry Point
// This file contains the main plugin logic and UI initialization

// Import your existing handlers and utilities
// Uncomment these when you have the actual files
// import { FlowDetector } from '@detectors/FlowDetector';
// import { TokenExtractor } from '@extractors/TokenExtractor';
// import { CodeGenerator } from '@generators/CodeGenerator';
// import { ThemeGenerator } from '@generators/ThemeGenerator';

// The HTML content is injected by webpack and declared in global.d.ts

// Plugin state management
interface PluginState {
  currentSelection: readonly SceneNode[];
  detectedFlows: any[];
  extractedTokens: any;
  isProcessing: boolean;
}

let pluginState: PluginState = {
  currentSelection: [],
  detectedFlows: [],
  extractedTokens: null,
  isProcessing: false
};

// Plugin initialization
console.log('🚀 Figma React Native Bridge Plugin starting...');

// Show the UI when plugin starts
function showPluginUI() {
  try {
    // Validate that we have HTML content
    if (typeof __html__ === 'undefined') {
      console.error('❌ HTML content not found. Check webpack build.');
      figma.closePlugin('Build error: UI content not found');
      return;
    }

    if (!__html__ || __html__.length < 100) {
      console.error('❌ HTML content appears invalid or empty');
      figma.closePlugin('Build error: Invalid UI content');
      return;
    }

    console.log('✅ HTML content loaded successfully');
    console.log(`📏 HTML size: ${Math.round(__html__.length / 1024)}KB`);

    // Show the UI with embedded HTML
    figma.showUI(__html__, {
      width: 420,
      height: 680,
      title: '🌉 React Native Flow Bridge'
    });

    console.log('✅ Figma UI displayed successfully');

    // Initialize plugin state
    updateSelectionState();
    
    // Send initial state to UI
    sendMessageToUI({
      type: 'plugin-initialized',
      data: {
        hasSelection: figma.currentPage.selection.length > 0
      }
    });

  } catch (error) {
    console.error('❌ Error showing UI:', error);
    figma.closePlugin(`UI Error: ${error.message}`);
  }
}

function updateSelectionState() {
  pluginState.currentSelection = figma.currentPage.selection;
  console.log(`📌 Selection updated: ${pluginState.currentSelection.length} items`);
}

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  console.log('📨 Received message from UI:', msg.type);
  
  // Prevent multiple simultaneous operations
  if (pluginState.isProcessing && !['close-plugin', 'cancel-operation'].includes(msg.type)) {
    console.warn('⚠️  Operation in progress, ignoring request');
    sendMessageToUI({
      type: 'error',
      error: 'Another operation is in progress. Please wait.'
    });
    return;
  }
  
  try {
    switch (msg.type) {
      case 'detect-flows':
        await handleDetectFlows();
        break;
        
      case 'extract-tokens':
        await handleExtractTokens();
        break;
        
      case 'generate-flow-code':
        await handleGenerateFlowCode(msg);
        break;
        
      case 'generate-screen-code':
        await handleGenerateScreenCode(msg);
        break;
        
      case 'export-flow-theme':
        await handleExportFlowTheme(msg);
        break;
        
      case 'generate-project-structure':
        await handleGenerateProjectStructure(msg);
        break;
        
      case 'refresh-selection':
        updateSelectionState();
        sendMessageToUI({
          type: 'selection-refreshed',
          data: {
            selectionCount: pluginState.currentSelection.length,
            hasFrames: pluginState.currentSelection.some(node => 
              node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
            )
          }
        });
        break;
        
      case 'cancel-operation':
        pluginState.isProcessing = false;
        sendMessageToUI({
          type: 'operation-cancelled'
        });
        break;
        
      case 'close-plugin':
        figma.closePlugin('Plugin closed by user');
        break;
        
      default:
        console.warn('⚠️  Unknown message type:', msg.type);
        sendMessageToUI({
          type: 'error',
          error: `Unknown message type: ${msg.type}`
        });
    }
  } catch (error) {
    console.error('❌ Error handling message:', error);
    pluginState.isProcessing = false;
    sendMessageToUI({
      type: 'error',
      error: `Handler error: ${error.message}`
    });
  }
};

// Utility function to send messages to UI
function sendMessageToUI(message: any) {
  try {
    figma.ui.postMessage(message);
  } catch (error) {
    console.error('❌ Error sending message to UI:', error);
  }
}

// Utility function to send progress updates
function sendProgress(progress: number, message: string) {
  sendMessageToUI({
    type: 'progress',
    progress,
    message
  });
}

// Validate selection has frames/components
function validateSelection(): { isValid: boolean; error?: string } {
  if (pluginState.currentSelection.length === 0) {
    return { 
      isValid: false, 
      error: 'Please select some frames or components to analyze' 
    };
  }

  const hasFrames = pluginState.currentSelection.some(node => 
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  );

  if (!hasFrames) {
    return { 
      isValid: false, 
      error: 'Please select frames, components, or component instances' 
    };
  }

  return { isValid: true };
}

// Enhanced flow detection with real Figma API integration
async function handleDetectFlows() {
  try {
    pluginState.isProcessing = true;
    sendProgress(5, 'Validating selection...');

    const validation = validateSelection();
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    sendProgress(15, 'Analyzing design structure...');

    // Get all frames from selection and page
    const selectedFrames = pluginState.currentSelection.filter(node => 
      node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
    ) as (FrameNode | ComponentNode | InstanceNode)[];

    sendProgress(25, 'Extracting screen information...');

    // Process each frame to extract screen data
    const screens = await Promise.all(selectedFrames.map(async (frame, index) => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Prevent blocking
      
      return {
        id: frame.id,
        name: frame.name,
        width: Math.round(frame.width),
        height: Math.round(frame.height),
        deviceType: detectDeviceType(frame.width, frame.height),
        components: await analyzeFrameComponents(frame),
        x: frame.x,
        y: frame.y,
        fills: frame.fills,
        effects: frame.effects
      };
    }));

    sendProgress(50, 'Detecting user flows and patterns...');

    // Analyze naming patterns and structure
    const flows = detectFlowsFromScreens(screens);
    
    sendProgress(75, 'Identifying user roles...');

    // Detect user roles from naming conventions
    const userRoles = detectUserRoles(screens);

    sendProgress(90, 'Generating flow analysis...');

    // Create comprehensive flow data
    const flowData = {
      flows: flows,
      userRoles: userRoles,
      theme: await extractBasicTheme(selectedFrames),
      analysis: {
        overview: {
          totalScreens: screens.length,
          totalFrames: selectedFrames.length,
          deviceTypes: [...new Set(screens.map(s => s.deviceType))],
          averageScreenSize: calculateAverageScreenSize(screens)
        },
        patterns: analyzeNamingPatterns(screens),
        recommendations: generateRecommendations(flows, screens)
      }
    };

    pluginState.detectedFlows = flowData.flows;
    
    sendProgress(100, 'Flow detection complete!');

    sendMessageToUI({
      type: 'flows-detected',
      data: flowData
    });

    console.log(`✅ Detected ${flows.length} flows from ${screens.length} screens`);

  } catch (error) {
    console.error('❌ Error in flow detection:', error);
    sendMessageToUI({
      type: 'error',
      error: `Flow detection failed: ${error.message}`
    });
  } finally {
    pluginState.isProcessing = false;
  }
}

// Enhanced token extraction
async function handleExtractTokens() {
  try {
    pluginState.isProcessing = true;
    sendProgress(10, 'Starting token extraction...');

    const validation = validateSelection();
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const selectedNodes = pluginState.currentSelection;
    
    sendProgress(25, 'Extracting colors...');
    const colors = await extractColors(selectedNodes);
    
    sendProgress(40, 'Extracting typography...');
    const typography = await extractTypography(selectedNodes);
    
    sendProgress(55, 'Extracting spacing...');
    const spacing = await extractSpacing(selectedNodes);
    
    sendProgress(70, 'Extracting effects...');
    const effects = await extractEffects(selectedNodes);
    
    sendProgress(85, 'Generating theme file...');

    const themeContent = generateThemeFile({
      colors,
      typography,
      spacing,
      effects,
      metadata: {
        extractedFrom: selectedNodes.length + ' selected elements',
        extractedAt: new Date().toISOString(),
        figmaFileKey: getFileIdentifier(),
        fileName: figma.root.name || 'Untitled'
      }
    });

    pluginState.extractedTokens = { colors, typography, spacing, effects };

    sendProgress(100, 'Token extraction complete!');

    sendMessageToUI({
      type: 'tokens-extracted',
      data: {
        fileContent: themeContent,
        tokenCount: Object.keys(colors).length + Object.keys(typography).length + Object.keys(spacing).length
      }
    });

  } catch (error) {
    console.error('❌ Error in token extraction:', error);
    sendMessageToUI({
      type: 'error',
      error: `Token extraction failed: ${error.message}`
    });
  } finally {
    pluginState.isProcessing = false;
  }
}

// Enhanced code generation
async function handleGenerateFlowCode(msg: any) {
  try {
    pluginState.isProcessing = true;
    sendProgress(10, 'Preparing code generation...');

    const flowId = msg.flowId;
    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    
    if (!flow) {
      throw new Error('Flow not found. Please detect flows first.');
    }

    sendProgress(25, 'Generating navigation structure...');
    
    const navigationCode = generateNavigationCode(flow);
    
    sendProgress(45, 'Generating screen components...');
    
    const screenFiles = await generateScreenFiles(flow.screens);
    
    sendProgress(65, 'Generating theme integration...');
    
    const themeCode = generateFlowTheme(flow);
    
    sendProgress(80, 'Generating type definitions...');
    
    const typeDefinitions = generateTypeDefinitions(flow);
    
    sendProgress(95, 'Assembling package...');

    const files = {
      [`${flow.name}Navigator.tsx`]: navigationCode,
      'theme.ts': themeCode,
      'types.ts': typeDefinitions,
      ...screenFiles
    };

    sendProgress(100, 'Code generation complete!');

    sendMessageToUI({
      type: 'flow-code-generated',
      data: {
        files: files,
        flowName: flow.name,
        fileCount: Object.keys(files).length
      }
    });

  } catch (error) {
    console.error('❌ Error in code generation:', error);
    sendMessageToUI({
      type: 'error',
      error: `Code generation failed: ${error.message}`
    });
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleGenerateScreenCode(msg: any) {
  try {
    pluginState.isProcessing = true;
    const { flowId, screenName } = msg;
    
    sendProgress(10, `Generating code for ${screenName}...`);

    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    const screen = flow?.screens.find(s => s.name === screenName);
    
    if (!screen) {
      throw new Error('Screen not found');
    }

    sendProgress(50, 'Analyzing screen components...');
    
    const screenCode = await generateSingleScreenCode(screen, flow);
    
    sendProgress(100, 'Screen code generated!');

    sendMessageToUI({
      type: 'screen-code-generated',
      data: {
        code: screenCode,
        screenName: screen.name
      }
    });

  } catch (error) {
    sendMessageToUI({
      type: 'error',
      error: `Screen generation failed: ${error.message}`
    });
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleExportFlowTheme(msg: any) {
  try {
    pluginState.isProcessing = true;
    const { flowId } = msg;
    
    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    if (!flow) {
      throw new Error('Flow not found');
    }

    const themeContent = generateFlowSpecificTheme(flow);
    
    sendMessageToUI({
      type: 'flow-theme-exported',
      data: {
        themeContent,
        flowName: flow.name,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    sendMessageToUI({
      type: 'error',
      error: `Theme export failed: ${error.message}`
    });
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleGenerateProjectStructure(msg: any) {
  try {
    pluginState.isProcessing = true;
    const { flowId } = msg;
    
    sendProgress(20, 'Generating project structure...');
    
    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    if (!flow) {
      throw new Error('Flow not found');
    }

    const projectFiles = generateCompleteProjectStructure(flow, pluginState.extractedTokens);
    
    sendProgress(100, 'Project structure generated!');

    sendMessageToUI({
      type: 'project-structure-generated',
      data: {
        files: projectFiles
      }
    });

  } catch (error) {
    sendMessageToUI({
      type: 'error',
      error: `Project structure generation failed: ${error.message}`
    });
  } finally {
    pluginState.isProcessing = false;
  }
}

// Helper functions for analysis and generation

function detectDeviceType(width: number, height: number): 'mobile' | 'tablet' | 'desktop' {
  if (width <= 480) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

async function analyzeFrameComponents(frame: FrameNode | ComponentNode | InstanceNode) {
  const components = [];
  
  function traverse(node: SceneNode) {
    // Analyze node type and properties
    const component = {
      id: node.id,
      name: node.name,
      type: node.type,
      semanticType: determineSemanticType(node),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      visible: node.visible
    };
    
    components.push(component);
    
    // Recursively analyze children
    if ('children' in node) {
      node.children.forEach(traverse);
    }
  }
  
  if ('children' in frame) {
    frame.children.forEach(traverse);
  }
  
  return components;
}

function determineSemanticType(node: SceneNode): string {
  const name = node.name.toLowerCase();
  
  if (name.includes('button') || (node.type === 'FRAME' && name.includes('btn'))) {
    return 'button';
  }
  if (name.includes('input') || name.includes('textfield')) {
    return 'input';
  }
  if (name.includes('header') || name.includes('navbar')) {
    return 'header';
  }
  if (name.includes('card')) {
    return 'card';
  }
  if (node.type === 'TEXT') {
    return name.includes('title') || name.includes('heading') ? 'heading' : 'text';
  }
  if (name.includes('icon')) {
    return 'icon';
  }
  if (name.includes('image') || node.type === 'RECTANGLE' && name.includes('img')) {
    return 'image';
  }
  
  return 'element';
}

function detectFlowsFromScreens(screens: any[]) {
  const flows = [];
  const flowGroups = new Map();
  
  // Group screens by potential flow patterns
  screens.forEach(screen => {
    const flowKey = extractFlowIdentifier(screen.name);
    if (!flowGroups.has(flowKey)) {
      flowGroups.set(flowKey, []);
    }
    flowGroups.get(flowKey).push(screen);
  });
  
  // Convert groups to flow objects
  let flowIndex = 1;
  for (const [flowName, flowScreens] of flowGroups) {
    if (flowScreens.length > 0) {
      flows.push({
        id: `flow-${flowIndex++}`,
        name: flowName || `Flow ${flowIndex}`,
        flowType: detectFlowType(flowName, flowScreens),
        userRole: detectUserRole(flowName, flowScreens),
        deviceTargets: [...new Set(flowScreens.map(s => s.deviceType))],
        navigationPattern: 'stack', // Could be enhanced to detect other patterns
        screens: flowScreens,
        estimatedDuration: flowScreens.length * 60, // 1 minute per screen estimate
        createdAt: Date.now()
      });
    }
  }
  
  return flows;
}

function extractFlowIdentifier(screenName: string): string {
  // Extract flow name from screen names like "Onboarding_1", "Customer_Login", etc.
  const patterns = [
    /^([A-Za-z]+)_\d+/,  // Pattern: "Onboarding_1"
    /^([A-Za-z]+)_[A-Za-z]+/,  // Pattern: "Customer_Login"
    /^([A-Za-z]+)\s+\d+/,  // Pattern: "Onboarding 1"
    /^([A-Za-z]+)\s+[A-Za-z]+/  // Pattern: "Customer Login"
  ];
  
  for (const pattern of patterns) {
    const match = screenName.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback: use first word
  return screenName.split(/[\s_-]/)[0] || 'Unknown';
}

function detectFlowType(flowName: string, screens: any[]): string {
  const name = flowName.toLowerCase();
  
  if (name.includes('onboard')) return 'onboarding';
  if (name.includes('auth') || name.includes('login') || name.includes('signup')) return 'authentication';
  if (name.includes('setting') || name.includes('config')) return 'settings';
  if (name.includes('checkout') || name.includes('payment')) return 'checkout';
  if (name.includes('main') || name.includes('home') || name.includes('dashboard')) return 'main_feature';
  
  return 'unknown';
}

function detectUserRole(flowName: string, screens: any[]) {
  const name = flowName.toLowerCase();
  
  if (name.includes('admin')) {
    return { type: 'admin', name: 'Administrator' };
  }
  if (name.includes('customer') || name.includes('user')) {
    return { type: 'customer', name: 'Customer' };
  }
  if (name.includes('operator') || name.includes('staff')) {
    return { type: 'operator', name: 'Operator' };
  }
  if (name.includes('guest')) {
    return { type: 'guest', name: 'Guest' };
  }
  
  return { type: 'customer', name: 'User' };
}

function detectUserRoles(screens: any[]): string[] {
  const roles = new Set();
  
  screens.forEach(screen => {
    const flowName = extractFlowIdentifier(screen.name);
    const role = detectUserRole(flowName, [screen]);
    roles.add(role.type);
  });
  
  return Array.from(roles);
}

async function extractBasicTheme(frames: (FrameNode | ComponentNode | InstanceNode)[]) {
  const colors = new Set();
  const fonts = new Set();
  
  // Extract basic styling information
  frames.forEach(frame => {
    if (frame.fills && Array.isArray(frame.fills)) {
      frame.fills.forEach(fill => {
        if (fill.type === 'SOLID') {
          colors.add(rgbToHex(fill.color));
        }
      });
    }
  });
  
  return {
    primaryColors: Array.from(colors).slice(0, 5),
    fonts: Array.from(fonts)
  };
}

function calculateAverageScreenSize(screens: any[]) {
  if (screens.length === 0) return { width: 0, height: 0 };
  
  const total = screens.reduce((acc, screen) => ({
    width: acc.width + screen.width,
    height: acc.height + screen.height
  }), { width: 0, height: 0 });
  
  return {
    width: Math.round(total.width / screens.length),
    height: Math.round(total.height / screens.length)
  };
}

function analyzeNamingPatterns(screens: any[]) {
  return {
    hasConsistentNaming: screens.every(s => s.name.includes('_') || s.name.includes(' ')),
    usesUnderscores: screens.some(s => s.name.includes('_')),
    usesSpaces: screens.some(s => s.name.includes(' ')),
    averageNameLength: screens.reduce((acc, s) => acc + s.name.length, 0) / screens.length
  };
}

function generateRecommendations(flows: any[], screens: any[]) {
  const recommendations = [];
  
  if (flows.length === 0) {
    recommendations.push({
      type: 'naming',
      message: 'Consider using consistent naming patterns like "FlowName_ScreenNumber" to help with flow detection'
    });
  }
  
  if (screens.length < 3) {
    recommendations.push({
      type: 'scope',
      message: 'Select more screens to get better flow analysis results'
    });
  }
  
  return recommendations;
}

// Utility function to get file identifier
function getFileIdentifier(): string {
  try {
    // Use only available Figma API properties
    const fileName = figma.root.name || 'untitled';
    const pageName = figma.currentPage.name || 'page';
    const timestamp = Date.now().toString(36);
    
    // Create identifier from file name + page + timestamp
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanPageName = pageName.replace(/[^a-zA-Z0-9]/g, '_');
    
    return `figma_${cleanFileName}_${cleanPageName}_${timestamp}`;
    
  } catch (error) {
    console.warn('⚠️  Could not determine file identifier:', error);
    return `unknown_${Date.now().toString(36)}`;
  }
}

// Color and styling utilities
function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

async function extractColors(nodes: readonly SceneNode[]) {
  const colors: { [key: string]: string } = {};
  
  // Implementation for color extraction
  // This would analyze fills, strokes, etc.
  
  return colors;
}

async function extractTypography(nodes: readonly SceneNode[]) {
  const typography: { [key: string]: any } = {};
  
  // Implementation for typography extraction
  // This would analyze text nodes, fonts, sizes, etc.
  
  return typography;
}

async function extractSpacing(nodes: readonly SceneNode[]) {
  const spacing: { [key: string]: number } = {};
  
  // Implementation for spacing extraction
  // This would analyze gaps, margins, padding, etc.
  
  return spacing;
}

async function extractEffects(nodes: readonly SceneNode[]) {
  const effects: { [key: string]: any } = {};
  
  // Implementation for effects extraction
  // This would analyze shadows, blurs, etc.
  
  return effects;
}

function generateThemeFile(data: any): string {
  return `// Generated Theme File
// Extracted from Figma on ${new Date().toISOString()}

export const theme = {
  COLORS: ${JSON.stringify(data.colors, null, 2)},
  
  TYPOGRAPHY: ${JSON.stringify(data.typography, null, 2)},
  
  SPACING: ${JSON.stringify(data.spacing, null, 2)},
  
  EFFECTS: ${JSON.stringify(data.effects, null, 2)},
  
  // Metadata
  METADATA: ${JSON.stringify(data.metadata, null, 2)}
};

export default theme;
`;
}

// Code generation functions (these would be implemented based on your existing generators)
function generateNavigationCode(flow: any): string {
  return `// Navigation code for ${flow.name}`;
}

async function generateScreenFiles(screens: any[]): Promise<{ [key: string]: string }> {
  const files: { [key: string]: string } = {};
  
  screens.forEach(screen => {
    files[`${screen.name}Screen.tsx`] = `// Screen component for ${screen.name}`;
  });
  
  return files;
}

function generateFlowTheme(flow: any): string {
  return `// Theme for ${flow.name} flow`;
}

function generateTypeDefinitions(flow: any): string {
  return `// Type definitions for ${flow.name}`;
}

async function generateSingleScreenCode(screen: any, flow: any): Promise<string> {
  return `// Single screen code for ${screen.name}`;
}

function generateFlowSpecificTheme(flow: any): string {
  return `// Flow-specific theme for ${flow.name}`;
}

function generateCompleteProjectStructure(flow: any, tokens: any): { [key: string]: string } {
  return {
    'package.json': '{}',
    'App.tsx': '// Main app',
    'README.md': `# ${flow.name} Project`
  };
}

// Initialize the plugin
try {
  showPluginUI();
  console.log('✅ Plugin initialized successfully');
} catch (error) {
  console.error('❌ Critical error during plugin initialization:', error);
  figma.closePlugin(`Initialization error: ${error.message}`);
}