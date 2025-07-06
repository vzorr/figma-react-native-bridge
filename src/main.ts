// src/main.ts - Fixed with proper message handling
// Enhanced to support layer browsing and selective CSS extraction

import { LayerListHandler } from './handlers/layer-list-handler';

// Simple types for the plugin
interface PluginMessage {
  type: string;
  data?: any;
  options?: any;
  selectedLayerIds?: string[];
  timestamp?: number;
}

interface PluginState {
  isProcessing: boolean;
  currentSelection: any[];
  layerListHandler?: LayerListHandler;
}

// Plugin state
let pluginState: PluginState = {
  isProcessing: false,
  currentSelection: []
};

// Constants - ADDED MISSING MESSAGE TYPES
const MESSAGE_TYPES = {
  PLUGIN_READY: 'PLUGIN_READY',
  LIST_ALL_LAYERS: 'LIST_ALL_LAYERS',
  EXTRACT_SELECTED_LAYERS: 'EXTRACT_SELECTED_LAYERS',
  EXTRACT_HIERARCHY_CSS: 'EXTRACT_HIERARCHY_CSS',
  EXTRACT_CURRENT_SELECTION: 'EXTRACT_CURRENT_SELECTION',
  LAYERS_LISTED: 'LAYERS_LISTED',
  EXTRACTION_COMPLETE: 'EXTRACTION_COMPLETE',
  PROGRESS_UPDATE: 'PROGRESS_UPDATE',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
  SELECTION_CHANGED: 'SELECTION_CHANGED',
  // FIXED: Added missing message types
  REFRESH_SELECTION: 'REFRESH_SELECTION',
  CHECK_SELECTION: 'CHECK_SELECTION',
  CANCEL_OPERATION: 'CANCEL_OPERATION',
  CLOSE_PLUGIN: 'CLOSE_PLUGIN'
};

// Utility functions
function sendMessage(type: string, data?: any) {
  try {
    const message = { type, data, timestamp: Date.now() };
    figma.ui.postMessage(message);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function sendProgress(progress: number, message: string) {
  sendMessage(MESSAGE_TYPES.PROGRESS_UPDATE, { progress, message });
}

function sendError(message: string) {
  sendMessage(MESSAGE_TYPES.ERROR, { message });
}

function sendSuccess(message: string) {
  sendMessage(MESSAGE_TYPES.SUCCESS, { message });
}

// Helper function to safely get node properties
function safeGetProperty(node: any, property: string, defaultValue: any = null) {
  try {
    return node[property] ?? defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

// RGB to Hex conversion
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Get background color from node
function getNodeBackgroundColor(node: any): string | null {
  try {
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
        return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Sanitize class name
function sanitizeClassName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase() || 'component';
}

// Extract CSS from a single node
function extractNodeCSS(node: any, depth: number = 0): string {
  const className = sanitizeClassName(node.name);
  const uniqueClassName = `${className}-${depth}-${Date.now().toString(36)}`;
  
  let css = `/* ${node.name} (${node.type}) */\n.${uniqueClassName} {\n`;
  
  // Basic dimensions
  if (typeof node.width === 'number') {
    css += `  width: ${Math.round(node.width)}px;\n`;
  }
  if (typeof node.height === 'number') {
    css += `  height: ${Math.round(node.height)}px;\n`;
  }
  
  // Position
  if (typeof node.x === 'number' && typeof node.y === 'number') {
    css += `  position: absolute;\n`;
    css += `  left: ${Math.round(node.x)}px;\n`;
    css += `  top: ${Math.round(node.y)}px;\n`;
  }
  
  // Background color
  const bgColor = getNodeBackgroundColor(node);
  if (bgColor) {
    css += `  background-color: ${bgColor};\n`;
  }
  
  // Border radius
  if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    css += `  border-radius: ${Math.round(node.cornerRadius)}px;\n`;
  }
  
  // Text properties
  if (node.type === 'TEXT') {
    if (typeof node.fontSize === 'number') {
      css += `  font-size: ${Math.round(node.fontSize)}px;\n`;
    }
    
    // Text color
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const textFill = node.fills[0];
      if (textFill.type === 'SOLID' && textFill.color) {
        const textColor = rgbToHex(textFill.color.r, textFill.color.g, textFill.color.b);
        css += `  color: ${textColor};\n`;
      }
    }
    
    // Font weight
    try {
      if (node.fontName && typeof node.fontName === 'object' && node.fontName.style) {
        const weightMap: Record<string, string> = {
          'Thin': '100',
          'Light': '300',
          'Regular': '400',
          'Medium': '500',
          'Bold': '700',
          'Black': '900'
        };
        css += `  font-weight: ${weightMap[node.fontName.style] || '400'};\n`;
      }
    } catch (error) {
      // Skip font weight if there's an issue
    }
  }
  
  // Layout properties
  if (node.layoutMode) {
    css += `  display: flex;\n`;
    if (node.layoutMode === 'HORIZONTAL') {
      css += `  flex-direction: row;\n`;
    } else if (node.layoutMode === 'VERTICAL') {
      css += `  flex-direction: column;\n`;
    }
    
    if (typeof node.itemSpacing === 'number' && node.itemSpacing > 0) {
      css += `  gap: ${Math.round(node.itemSpacing)}px;\n`;
    }
  }
  
  // Padding
  const paddingProps = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
  const paddings = paddingProps.map(prop => typeof node[prop] === 'number' ? Math.round(node[prop]) : 0);
  
  if (paddings.some(p => p > 0)) {
    if (paddings.every(p => p === paddings[0])) {
      css += `  padding: ${paddings[0]}px;\n`;
    } else {
      css += `  padding: ${paddings[0]}px ${paddings[1]}px ${paddings[2]}px ${paddings[3]}px;\n`;
    }
  }
  
  // Opacity
  if (typeof node.opacity === 'number' && node.opacity < 1) {
    css += `  opacity: ${node.opacity};\n`;
  }
  
  css += `}\n\n`;
  
  return css;
}

// Process node hierarchy recursively
function processNodeHierarchy(node: any, depth: number = 0): { css: string; hierarchy: any; count: number } {
  let css = extractNodeCSS(node, depth);
  let count = 1;
  
  const hierarchyNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    depth: depth,
    className: sanitizeClassName(node.name),
    children: [] as any[]
  };
  
  // Process children
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      try {
        const childResult = processNodeHierarchy(child, depth + 1);
        css += childResult.css;
        count += childResult.count;
        hierarchyNode.children.push(childResult.hierarchy);
      } catch (error) {
        console.warn('Error processing child node:', error);
      }
    });
  }
  
  return { css, hierarchy: hierarchyNode, count };
}

// Generate visual hierarchy
function generateVisualHierarchy(hierarchy: any[], indent: string = ''): string {
  return hierarchy.map(node => {
    const nodeIcon = getNodeIcon(node.type);
    let result = `${indent}${nodeIcon} ${node.name} (${node.type})\n`;
    
    if (node.children && node.children.length > 0) {
      result += generateVisualHierarchy(node.children, indent + '  ');
    }
    
    return result;
  }).join('');
}

function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    'FRAME': '🖼️',
    'GROUP': '📦',
    'TEXT': '📝',
    'RECTANGLE': '▭',
    'ELLIPSE': '⭕',
    'COMPONENT': '🧩',
    'INSTANCE': '📱',
    'IMAGE': '🖼️',
    'VECTOR': '✨'
  };
  return icons[type] || '📄';
}

// Initialize Layer List Handler
function initializeLayerListHandler(): LayerListHandler {
  if (!pluginState.layerListHandler) {
    pluginState.layerListHandler = new LayerListHandler();
  }
  return pluginState.layerListHandler;
}

// FIXED: Added proper refresh selection handler
function refreshSelection() {
  try {
    const selection = figma.currentPage.selection;
    const selectionData = {
      count: selection.length,
      hasFrames: selection.some(node => 
        node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
      ),
      types: selection.map(node => node.type),
      names: selection.map(node => node.name)
    };
    
    sendMessage(MESSAGE_TYPES.SELECTION_CHANGED, {
      selectionCount: selection.length,
      hasFrames: selectionData.hasFrames,
      selection: selectionData
    });
    
    console.log('Selection refreshed:', selectionData);
  } catch (error) {
    console.error('Error refreshing selection:', error);
    sendError('Failed to refresh selection');
  }
}

// FIXED: Added cancel operation handler
function cancelOperation() {
  try {
    pluginState.isProcessing = false;
    console.log('Operation cancelled by user');
    sendMessage(MESSAGE_TYPES.SUCCESS, { message: 'Operation cancelled' });
  } catch (error) {
    console.error('Error cancelling operation:', error);
  }
}

// FIXED: Added close plugin handler
function closePlugin() {
  try {
    console.log('Closing plugin...');
    figma.closePlugin('Plugin closed by user');
  } catch (error) {
    console.error('Error closing plugin:', error);
    // Fallback close
    figma.closePlugin();
  }
}

// Main extraction function for all layers
async function extractHierarchyCSS(options: any = {}) {
  try {
    pluginState.isProcessing = true;
    sendProgress(10, 'Analyzing selection...');
    
    // Get nodes to process
    let nodesToProcess = figma.currentPage.selection;
    
    if (nodesToProcess.length === 0) {
      // Use all frames if nothing selected
      nodesToProcess = figma.currentPage.children.filter(node => 
        node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
      );
    }
    
    if (nodesToProcess.length === 0) {
      throw new Error('No frames found. Please select frames or create some frames first.');
    }
    
    sendProgress(30, 'Extracting CSS from hierarchy...');
    
    let allCSS = `/* Generated CSS from Figma Hierarchy */\n/* Generated on: ${new Date().toISOString()} */\n/* Total nodes processed: ${nodesToProcess.length} */\n\n`;
    let totalNodes = 0;
    const hierarchyMap: any[] = [];
    
    // Process each selected node
    nodesToProcess.forEach((node, index) => {
      sendProgress(30 + (index / nodesToProcess.length) * 50, `Processing ${node.name}...`);
      
      try {
        const result = processNodeHierarchy(node);
        allCSS += result.css;
        totalNodes += result.count;
        hierarchyMap.push(result.hierarchy);
      } catch (nodeError) {
        console.warn(`Error processing node ${node.name}:`, nodeError);
      }
    });
    
    sendProgress(85, 'Generating additional formats...');
    
    // Generate SCSS version
    const scssContent = allCSS.replace(/\.([a-zA-Z0-9-_]+)/g, '.figma-$1');
    
    // Generate React Native styles
    const reactNativeStyles = generateReactNativeStyles(hierarchyMap);
    
    // Generate visual hierarchy
    const visualHierarchy = generateVisualHierarchy(hierarchyMap);
    
    sendProgress(95, 'Finalizing results...');
    
    // Prepare files based on format option
    const files: Record<string, string> = {};
    const format = options.format || 'all';
    
    if (format === 'css' || format === 'all') {
      files['styles.css'] = allCSS;
    }
    
    if (format === 'scss' || format === 'all') {
      files['styles.scss'] = scssContent;
    }
    
    if (format === 'react-native' || format === 'all') {
      files['styles.ts'] = reactNativeStyles;
    }
    
    files['hierarchy.json'] = JSON.stringify(hierarchyMap, null, 2);
    files['README.md'] = generateReadme(totalNodes, nodesToProcess.length);
    
    sendProgress(100, 'Extraction complete!');
    
    // Send results
    sendMessage(MESSAGE_TYPES.EXTRACTION_COMPLETE, {
      files,
      totalNodes,
      visualHierarchy,
      summary: {
        processedNodes: nodesToProcess.length,
        totalElements: totalNodes,
        generatedFiles: Object.keys(files).length
      }
    });
    
  } catch (error) {
    console.error('Extraction error:', error);
    sendError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    pluginState.isProcessing = false;
  }
}

// Extract CSS from current Figma selection
async function extractCurrentSelection() {
  try {
    pluginState.isProcessing = true;
    sendProgress(10, 'Getting current selection...');
    
    const selectedNodes = figma.currentPage.selection;
    
    if (selectedNodes.length === 0) {
      throw new Error('Please select at least one layer in Figma to extract CSS from.');
    }
    
    sendProgress(30, `Extracting CSS from ${selectedNodes.length} selected layers...`);
    
    let allCSS = `/* Generated CSS from Selected Figma Layers */\n/* Generated on: ${new Date().toISOString()} */\n/* Selected layers: ${selectedNodes.length} */\n\n`;
    let totalNodes = 0;
    const hierarchyMap: any[] = [];
    
    // Process each selected node
    selectedNodes.forEach((node, index) => {
      sendProgress(30 + (index / selectedNodes.length) * 50, `Processing ${node.name}...`);
      
      try {
        const result = processNodeHierarchy(node);
        allCSS += result.css;
        totalNodes += result.count;
        hierarchyMap.push(result.hierarchy);
      } catch (nodeError) {
        console.warn(`Error processing selected node ${node.name}:`, nodeError);
      }
    });
    
    sendProgress(85, 'Generating additional formats...');
    
    const files: Record<string, string> = {
      'selection.css': allCSS,
      'selection.scss': allCSS.replace(/\.([a-zA-Z0-9-_]+)/g, '.figma-$1'),
      'selection.ts': generateReactNativeStyles(hierarchyMap),
      'selection-hierarchy.json': JSON.stringify(hierarchyMap, null, 2),
      'README.md': generateSelectionReadme(totalNodes, selectedNodes.length)
    };
    
    sendProgress(100, 'Selection extraction complete!');
    
    // Send results
    sendMessage(MESSAGE_TYPES.EXTRACTION_COMPLETE, {
      files,
      totalNodes,
      visualHierarchy: generateVisualHierarchy(hierarchyMap),
      summary: {
        selectedLayers: selectedNodes.length,
        totalElements: totalNodes,
        generatedFiles: Object.keys(files).length
      }
    });
    
  } catch (error) {
    console.error('Selection extraction error:', error);
    sendError(error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    pluginState.isProcessing = false;
  }
}

function generateReactNativeStyles(hierarchy: any[]): string {
  return `// Generated React Native Styles
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Extracted from ${hierarchy.length} top-level components
});

export default styles;`;
}

function generateReadme(totalNodes: number, processedNodes: number): string {
  return `# Figma Hierarchy CSS Extraction

Generated on: ${new Date().toISOString()}

## Summary
- **Processed Nodes**: ${processedNodes}
- **Total Elements**: ${totalNodes}
- **Extraction Method**: Complete hierarchy traversal

## Files Generated
- \`styles.css\` - Complete CSS with all extracted properties
- \`styles.scss\` - SCSS version with prefixed classes
- \`styles.ts\` - React Native StyleSheet template
- \`hierarchy.json\` - Complete hierarchy structure
- \`README.md\` - This documentation

## Usage
Import the generated styles into your project and apply the classes to your components.

Generated by Figma React Native Bridge Plugin`;
}

function generateSelectionReadme(totalNodes: number, selectedNodes: number): string {
  return `# Selected Layers CSS Extraction

Generated on: ${new Date().toISOString()}

## Summary
- **Selected Layers**: ${selectedNodes}
- **Total Elements**: ${totalNodes}
- **Extraction Method**: Current Figma selection with hierarchy

## Files Generated
- \`selection.css\` - CSS for selected layers and children
- \`selection.scss\` - SCSS version
- \`selection.ts\` - React Native styles
- \`selection-hierarchy.json\` - Layer structure
- \`README.md\` - This documentation

## Usage
These styles represent your currently selected Figma layers with complete hierarchy preservation.

Generated by Figma Layer CSS Extractor`;
}

// FIXED: Enhanced message handler with proper error handling
figma.ui.onmessage = async (msg: PluginMessage) => {
  console.log('Received message:', msg.type);
  
  // FIXED: Don't block processing for certain message types
  const allowedDuringProcessing = [
    MESSAGE_TYPES.CANCEL_OPERATION,
    MESSAGE_TYPES.CLOSE_PLUGIN,
    MESSAGE_TYPES.REFRESH_SELECTION,
    MESSAGE_TYPES.CHECK_SELECTION
  ];
  
  if (pluginState.isProcessing && !allowedDuringProcessing.includes(msg.type)) {
    sendError('Another operation is in progress. Please wait or cancel the current operation.');
    return;
  }
  
  try {
    switch (msg.type) {
      case MESSAGE_TYPES.LIST_ALL_LAYERS:
        const layerHandler = initializeLayerListHandler();
        await layerHandler.handleListAllLayers();
        break;
        
      case MESSAGE_TYPES.EXTRACT_SELECTED_LAYERS:
        if (msg.selectedLayerIds && msg.selectedLayerIds.length > 0) {
          const handler = initializeLayerListHandler();
          await handler.handleExtractSelectedLayers(msg.selectedLayerIds);
        } else {
          sendError('No layers selected for extraction.');
        }
        break;
        
      case MESSAGE_TYPES.EXTRACT_HIERARCHY_CSS:
        await extractHierarchyCSS(msg.options);
        break;
        
      case MESSAGE_TYPES.EXTRACT_CURRENT_SELECTION:
        await extractCurrentSelection();
        break;
        
      // FIXED: Added missing message handlers
      case MESSAGE_TYPES.REFRESH_SELECTION:
      case MESSAGE_TYPES.CHECK_SELECTION:
        refreshSelection();
        break;
        
      case MESSAGE_TYPES.CANCEL_OPERATION:
        cancelOperation();
        break;
        
      case MESSAGE_TYPES.CLOSE_PLUGIN:
        closePlugin();
        break;
        
      case MESSAGE_TYPES.PLUGIN_READY:
        // Send current selection state
        refreshSelection();
        sendMessage(MESSAGE_TYPES.SUCCESS, { message: 'Plugin ready' });
        break;
        
      // FIXED: Handle lowercase variants that might be sent from UI
      case 'refresh-selection':
        console.log('Received kebab-case refresh-selection, converting...');
        refreshSelection();
        break;
        
      case 'check-selection':
        console.log('Received kebab-case check-selection, converting...');
        refreshSelection();
        break;
        
      case 'cancel-operation':
        console.log('Received kebab-case cancel-operation, converting...');
        cancelOperation();
        break;
        
      case 'close-plugin':
        console.log('Received kebab-case close-plugin, converting...');
        closePlugin();
        break;
        
      default:
        // FIXED: Instead of throwing error, log and continue
        console.warn('Unknown message type received:', msg.type);
        console.log('Full message:', msg);
        
        // Try to handle common variations
        const upperCaseType = msg.type.toUpperCase().replace(/-/g, '_');
        if (MESSAGE_TYPES[upperCaseType as keyof typeof MESSAGE_TYPES]) {
          console.log(`Attempting to handle as: ${upperCaseType}`);
          // Re-process with converted type
          const convertedMsg = { ...msg, type: MESSAGE_TYPES[upperCaseType as keyof typeof MESSAGE_TYPES] };
          return figma.ui.onmessage(convertedMsg);
        }
        
        // If still unknown, send a friendly error but don't crash
        sendMessage(MESSAGE_TYPES.ERROR, { 
          message: `Unknown action: ${msg.type}`,
          suggestion: 'Please try refreshing the plugin or contact support.'
        });
    }
  } catch (error) {
    console.error('Message handler error:', error);
    sendError(error instanceof Error ? error.message : 'Unknown error occurred');
    pluginState.isProcessing = false;
  }
};

// FIXED: Enhanced selection change handler with error protection
function setupSelectionChangeHandler() {
  try {
    // Check if the 'on' method exists (older API)
    if (typeof (figma as any).on === 'function') {
      (figma as any).on('selectionchange', () => {
        try {
          refreshSelection();
        } catch (error) {
          console.error('Error in selection change handler:', error);
        }
      });
      console.log('Selection change handler set up successfully');
    } else {
      // For newer API, we'll handle selection changes in the message handler
      console.log('Selection change events not available in this Figma API version');
    }
  } catch (error) {
    console.warn('Could not set up selection change handler:', error);
  }
}

// Initialize plugin
function initializePlugin() {
  try {
    // Check if we have the HTML content
    if (typeof __html__ === 'undefined') {
      console.error('HTML content not found. This usually means there\'s a build issue.');
      figma.closePlugin('Build error: UI content not found. Please check your build process.');
      return;
    }

    console.log('Initializing plugin with HTML content...');
    
    figma.showUI(__html__, {
      width: 450,
      height: 700,
      title: '🎨 Layer CSS Extractor'
    });

    console.log('Plugin UI displayed successfully');
    
    // Update initial selection state
    pluginState.currentSelection = figma.currentPage.selection;
    
    // Set up selection change handler (if available)
    setupSelectionChangeHandler();
    
    // Send initial selection state
    setTimeout(() => {
      refreshSelection();
    }, 100);
    
  } catch (error) {
    console.error('Plugin initialization error:', error);
    figma.closePlugin(`Initialization error: ${error}`);
  }
}

// Start the plugin
initializePlugin();