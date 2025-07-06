// Figma Plugin Main Entry Point
// Updated to use the comprehensive architecture modules with proper constants
// FIXED: Component detection result assignment

// Import the actual handlers and utilities from your architecture
import FlowDetector from './detectors/flow-detector';
import ComponentDetector from './detectors/component-detector';
import DeviceDetector from './detectors/device-detector';
import { RoleDetector } from './detectors/role-detector';

import { DesignValuesExtractor } from './extractors/design-values-extractor';
import { ScreenExtractor } from './extractors/screen-extractor';
import { FlowExtractor } from './extractors/flow-extractor';

import { ScreenGenerator } from './generators/screen-generator';
import { ThemeGenerator } from './generators/theme-generator';

import { ExtractFlowsHandler } from './handlers/extract-flows-handler';
import ExtractScreensHandler from './handlers/extract-screens-handler';
import { ExtractValuesHandler } from './handlers/extract-values-handler';

import FigmaHelpers from './utils/figma-helpers';
import SymbolSafeUtils from './utils/symbol-safe-utils';
import { logger } from './core/logger';
import { ErrorHandler } from './core/error-handler';

// Import constants and types
import { MESSAGE_TYPES, FLOW_MESSAGE_TYPES, UI_MESSAGE_TYPES } from './core/constants';
import { 
  PluginState, 
  FlowStructure, 
  ExtractedValues,
  PluginUIMessage,
  SelectionValidation,
  ScreenStructure,
  ComponentDetectionResult,
  DeviceType,
  ErrorMessage
} from './core/types';

// Initialize logger
const MODULE_NAME = 'main';

// Plugin state management with proper typing
let pluginState: PluginState = {
  currentSelection: [],
  detectedFlows: [],
  extractedTokens: null,
  isProcessing: false
};

// Initialize core components
const flowDetector = new FlowDetector();
const componentDetector = new ComponentDetector();
const deviceDetector = new DeviceDetector();
const roleDetector = new RoleDetector();

const designValuesExtractor = new DesignValuesExtractor();
const screenExtractor = new ScreenExtractor();
const flowExtractor = new FlowExtractor();

const screenGenerator = new ScreenGenerator();
const themeGenerator = new ThemeGenerator();

const extractFlowsHandler = new ExtractFlowsHandler();
const extractScreensHandler = new ExtractScreensHandler();
const extractValuesHandler = new ExtractValuesHandler();

// Plugin initialization
logger.info(MODULE_NAME, 'init', '🚀 Figma React Native Bridge Plugin starting...');

function showPluginUI() {
  try {
    if (typeof __html__ === 'undefined') {
      logger.error(MODULE_NAME, 'showPluginUI', 'HTML content not found. Check webpack build.');
      figma.closePlugin('Build error: UI content not found');
      return;
    }

    if (!__html__ || __html__.length < 100) {
      logger.error(MODULE_NAME, 'showPluginUI', 'HTML content appears invalid or empty');
      figma.closePlugin('Build error: Invalid UI content');
      return;
    }

    logger.info(MODULE_NAME, 'showPluginUI', 'HTML content loaded successfully');
    logger.info(MODULE_NAME, 'showPluginUI', `HTML size: ${Math.round(__html__.length / 1024)}KB`);

    figma.showUI(__html__, {
      width: 420,
      height: 680,
      title: '🌉 React Native Flow Bridge'
    });

    logger.info(MODULE_NAME, 'showPluginUI', 'Figma UI displayed successfully');
    updateSelectionState();
    
    sendMessageToUI({
      type: MESSAGE_TYPES.PLUGIN_READY,
      data: {
        hasSelection: figma.currentPage.selection.length > 0
      }
    });

  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'showPluginUI',
      operation: 'UI initialization'
    });
    logger.error(MODULE_NAME, 'showPluginUI', `Error showing UI: ${errorInfo}`);
    figma.closePlugin(`UI Error: ${errorInfo}`);
  }
}

function updateSelectionState() {
  pluginState.currentSelection = figma.currentPage.selection;
  logger.info(MODULE_NAME, 'updateSelectionState', `Selection updated: ${pluginState.currentSelection.length} items`);
}

// Handle messages from the UI using the proper handlers
figma.ui.onmessage = async (msg) => {
  logger.info(MODULE_NAME, 'onmessage', 'Received message from UI:', msg.type);
  
  if (pluginState.isProcessing && ![UI_MESSAGE_TYPES.CLOSE_PLUGIN, UI_MESSAGE_TYPES.CANCEL_OPERATION].includes(msg.type)) {
    logger.warn(MODULE_NAME, 'onmessage', 'Operation in progress, ignoring request');
    sendErrorToUI('Another operation is in progress. Please wait.');
    return;
  }
  
  try {
    switch (msg.type) {
      case UI_MESSAGE_TYPES.DETECT_FLOWS:
        await handleDetectFlowsWithArchitecture();
        break;
        
      case UI_MESSAGE_TYPES.EXTRACT_TOKENS:
        await handleExtractTokensWithArchitecture();
        break;
        
      case UI_MESSAGE_TYPES.GENERATE_FLOW_CODE:
        await handleGenerateFlowCodeWithArchitecture(msg);
        break;
        
      case UI_MESSAGE_TYPES.GENERATE_SCREEN_CODE:
        await handleGenerateScreenCodeWithArchitecture(msg);
        break;
        
      case UI_MESSAGE_TYPES.EXPORT_FLOW_THEME:
        await handleExportFlowThemeWithArchitecture(msg);
        break;
        
      case UI_MESSAGE_TYPES.GENERATE_PROJECT_STRUCTURE:
        await handleGenerateProjectStructureWithArchitecture(msg);
        break;
        
      case UI_MESSAGE_TYPES.REFRESH_SELECTION:
        updateSelectionState();
        sendMessageToUI({
          type: MESSAGE_TYPES.SELECTION_CHANGED,
          data: {
            selectionCount: pluginState.currentSelection.length,
            hasFrames: pluginState.currentSelection.some(node => 
              node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
            )
          }
        });
        break;
        
      case UI_MESSAGE_TYPES.CANCEL_OPERATION:
        pluginState.isProcessing = false;
        sendMessageToUI({
          type: MESSAGE_TYPES.SUCCESS
        });
        break;
        
      case UI_MESSAGE_TYPES.CLOSE_PLUGIN:
        figma.closePlugin('Plugin closed by user');
        break;
        
      default:
        logger.warn(MODULE_NAME, 'onmessage', 'Unknown message type:', msg.type);
        sendErrorToUI(`Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'messageHandler',
      operation: 'message handling'
    });
    logger.error(MODULE_NAME, 'onmessage', `Error handling message: ${errorInfo}`);
    pluginState.isProcessing = false;
    sendErrorToUI(`Handler error: ${errorInfo}`);
  }
};

// Updated handlers using the architecture components

async function handleDetectFlowsWithArchitecture() {
  try {
    pluginState.isProcessing = true;
    sendProgress(5, 'Validating selection...');

    const validation = validateSelection();
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    sendProgress(15, 'Using FlowExtractor to analyze design structure...');

    // Use the sophisticated FlowExtractor
    const flowExtractionResult = await flowExtractor.extractFlowsFromDesign();

    sendProgress(40, 'Using ComponentDetector for semantic analysis...');

    // FIXED: Enhance with component detection
    const enhancedFlows = await Promise.all(
      flowExtractionResult.flows.map(async (flow) => {
        const enhancedScreens = await Promise.all(
          flow.screens.map(async (screen) => {
            // Get component detection result
            const componentAnalysis = componentDetector.detectComponentType(screen);
            const deviceDetectionResult = deviceDetector.detectDevice(screen.width, screen.height);
            
            // Create enhanced screen with proper typing
            const enhancedScreen: ScreenStructure = {
              ...screen,
              deviceType: deviceDetectionResult.deviceType,
              semanticAnalysis: componentAnalysis
            };

            return enhancedScreen;
          })
        );

        return {
          ...flow,
          screens: enhancedScreens,
          userRole: roleDetector.detectUserRoles([flow])[0] || flow.userRole
        };
      })
    );

    sendProgress(70, 'Using ThemeGenerator for design system analysis...');

    // Generate theme using ThemeGenerator
    const designValues = extractDesignValuesFromFlows(enhancedFlows);
    const theme = themeGenerator.generateTheme(designValues);

    sendProgress(90, 'Finalizing flow analysis...');

    const flowData = {
      flows: enhancedFlows,
      theme,
      analysis: flowExtractionResult.detectionQuality,
      userRoles: flowExtractionResult.roleDistribution,
      quality: flowExtractionResult.detectionQuality
    };

    pluginState.detectedFlows = enhancedFlows;
    
    sendProgress(100, 'Flow detection complete using architecture!');

    sendMessageToUI({
      type: FLOW_MESSAGE_TYPES.FLOWS_DETECTED,
      data: SymbolSafeUtils.cleanForUI(flowData)
    });

    logger.info(MODULE_NAME, 'handleDetectFlowsWithArchitecture', `Detected ${enhancedFlows.length} flows using architecture`);

  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'handleDetectFlowsWithArchitecture',
      operation: 'flow detection'
    });
    logger.error(MODULE_NAME, 'handleDetectFlowsWithArchitecture', `Error in flow detection: ${errorInfo}`);
    sendErrorToUI(`Flow detection failed: ${errorInfo}`);
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleExtractTokensWithArchitecture() {
  try {
    pluginState.isProcessing = true;
    sendProgress(10, 'Starting token extraction with DesignValuesExtractor...');

    const validation = validateSelection();
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Use the sophisticated DesignValuesExtractor
    const extractedValues = designValuesExtractor.extract(pluginState.currentSelection);

    sendProgress(60, 'Using ThemeGenerator to create theme file...');

    // Use ThemeGenerator to create comprehensive theme
    const theme = themeGenerator.generateTheme(extractedValues);
    const themeContent = themeGenerator.generateThemeFileContent(theme);

    pluginState.extractedTokens = extractedValues;

    sendProgress(100, 'Token extraction complete using architecture!');

    sendMessageToUI({
      type: MESSAGE_TYPES.EXTRACTION_COMPLETE,
      data: SymbolSafeUtils.cleanForUI({
        fileContent: themeContent,
        tokenCount: Object.keys(theme.colors).length + 
                   Object.keys(theme.typography.fontSize).length + 
                   Object.keys(theme.spacing).length,
        extractedValues: extractedValues
      })
    });

  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'handleExtractTokensWithArchitecture',
      operation: 'token extraction'
    });
    logger.error(MODULE_NAME, 'handleExtractTokensWithArchitecture', `Error in token extraction: ${errorInfo}`);
    sendErrorToUI(`Token extraction failed: ${errorInfo}`);
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleGenerateFlowCodeWithArchitecture(msg: any) {
  try {
    pluginState.isProcessing = true;
    sendProgress(10, 'Preparing code generation with ScreenGenerator...');

    const flowId = msg.flowId;
    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    
    if (!flow) {
      throw new Error('Flow not found. Please detect flows first.');
    }

    sendProgress(30, 'Using ScreenGenerator for comprehensive code generation...');
    
    // Use the sophisticated ScreenGenerator
    const theme = pluginState.extractedTokens ? 
      themeGenerator.generateTheme(pluginState.extractedTokens) : 
      themeGenerator.generateTheme({
        colors: new Set(),
        fontSizes: new Set(),
        fontWeights: new Set(),
        fontFamilies: new Set(),
        borderRadius: new Set(),
        spacing: new Set(),
        shadows: new Set(),
        opacity: new Set(),
        buttons: [],
        inputs: [],
        headings: [],
        labels: [],
        cards: [],
        navigationItems: []
      });

    const generatedFiles: Record<string, string> = {};
    
    flow.screens.forEach((screen, index) => {
      const screenCode = screenGenerator.generateScreenCode(screen, theme, flow);
      generatedFiles[`${screen.name}.tsx`] = screenCode;
    });

    sendProgress(80, 'Finalizing generated package...');

    const files = SymbolSafeUtils.cleanForUI(generatedFiles);

    sendProgress(100, 'Code generation complete using architecture!');

    sendMessageToUI({
      type: FLOW_MESSAGE_TYPES.FLOW_CODE_GENERATED,
      data: {
        files,
        flowName: flow.name,
        fileCount: Object.keys(files).length
      }
    });

  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'handleGenerateFlowCodeWithArchitecture',
      operation: 'code generation'
    });
    logger.error(MODULE_NAME, 'handleGenerateFlowCodeWithArchitecture', `Error in code generation: ${errorInfo}`);
    sendErrorToUI(`Code generation failed: ${errorInfo}`);
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleGenerateScreenCodeWithArchitecture(msg: any) {
  try {
    pluginState.isProcessing = true;
    const { flowId, screenName } = msg;
    
    sendProgress(10, `Generating code for ${screenName} using ScreenGenerator...`);

    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    const screen = flow?.screens.find(s => s.name === screenName);
    
    if (!screen) {
      throw new Error('Screen not found');
    }

    sendProgress(50, 'Using ScreenGenerator for single screen generation...');
    
    const theme = pluginState.extractedTokens ? 
      themeGenerator.generateTheme(pluginState.extractedTokens) : 
      themeGenerator.generateTheme({
        colors: new Set(),
        fontSizes: new Set(),
        fontWeights: new Set(),
        fontFamilies: new Set(),
        borderRadius: new Set(),
        spacing: new Set(),
        shadows: new Set(),
        opacity: new Set(),
        buttons: [],
        inputs: [],
        headings: [],
        labels: [],
        cards: [],
        navigationItems: []
      });
    
    // Use the sophisticated ScreenGenerator for single screen
    const screenCode = screenGenerator.generateScreenCode(screen, theme, flow);
    
    sendProgress(100, 'Screen code generated using architecture!');

    sendMessageToUI({
      type: FLOW_MESSAGE_TYPES.SCREEN_CODE_GENERATED,
      data: {
        code: screenCode,
        screenName: screen.name
      }
    });

  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'handleGenerateScreenCodeWithArchitecture',
      operation: 'screen generation'
    });
    sendErrorToUI(`Screen generation failed: ${errorInfo}`);
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleExportFlowThemeWithArchitecture(msg: any) {
  try {
    pluginState.isProcessing = true;
    const { flowId } = msg;
    
    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    if (!flow) {
      throw new Error('Flow not found');
    }

    // Extract design values from flow screens
    const flowDesignValues = extractDesignValuesFromFlows([flow]);
    const theme = themeGenerator.generateTheme(flowDesignValues);
    const themeContent = themeGenerator.generateThemeFileContent(theme);
    
    sendMessageToUI({
      type: FLOW_MESSAGE_TYPES.FLOW_THEME_EXPORTED,
      data: {
        themeContent,
        flowName: flow.name,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'handleExportFlowThemeWithArchitecture',
      operation: 'theme export'
    });
    sendErrorToUI(`Theme export failed: ${errorInfo}`);
  } finally {
    pluginState.isProcessing = false;
  }
}

async function handleGenerateProjectStructureWithArchitecture(msg: any) {
  try {
    pluginState.isProcessing = true;
    const { flowId } = msg;
    
    sendProgress(20, 'Generating project structure using ScreenGenerator...');
    
    const flow = pluginState.detectedFlows.find(f => f.id === flowId);
    if (!flow) {
      throw new Error('Flow not found');
    }

    // Generate complete project files
    const projectFiles: Record<string, string> = {};
    
    // Generate theme file
    const flowDesignValues = extractDesignValuesFromFlows([flow]);
    const theme = themeGenerator.generateTheme(flowDesignValues);
    projectFiles['theme/index.ts'] = themeGenerator.generateThemeFileContent(theme);
    
    // Generate screen files
    flow.screens.forEach(screen => {
      const screenCode = screenGenerator.generateScreenCode(screen, theme, flow);
      projectFiles[`screens/${screen.name}.tsx`] = screenCode;
    });
    
    // Generate navigation file
    projectFiles['navigation/index.ts'] = generateNavigationFile(flow);
    
    sendProgress(100, 'Project structure generated using architecture!');

    sendMessageToUI({
      type: MESSAGE_TYPES.SUCCESS,
      data: {
        files: SymbolSafeUtils.cleanForUI(projectFiles)
      }
    });

  } catch (error) {
    const errorInfo = ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'handleGenerateProjectStructureWithArchitecture',
      operation: 'project structure generation'
    });
    sendErrorToUI(`Project structure generation failed: ${errorInfo}`);
  } finally {
    pluginState.isProcessing = false;
  }
}

// Utility functions using architecture components
function sendMessageToUI(message: any) {
  try {
    figma.ui.postMessage(SymbolSafeUtils.cleanForUI(message));
  } catch (error) {
    logger.error(MODULE_NAME, 'sendMessageToUI', 'Error sending message to UI:', error as Error);
  }
}

function sendErrorToUI(errorMessage: string) {
  const errorMsg: ErrorMessage = {
    type: 'error',
    error: errorMessage
  };
  sendMessageToUI(errorMsg);
}

function sendProgress(progress: number, message: string) {
  sendMessageToUI({
    type: MESSAGE_TYPES.PROGRESS_UPDATE,
    progress,
    message
  });
}

function validateSelection(): SelectionValidation {
  if (pluginState.currentSelection.length === 0) {
    return { 
      isValid: false, 
      error: 'Please select some frames or components to analyze',
      frameCount: 0,
      componentCount: 0
    };
  }

  const hasValidFrames = pluginState.currentSelection.some(node => 
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  );

  if (!hasValidFrames) {
    return { 
      isValid: false, 
      error: 'Please select frames, components, or component instances',
      frameCount: 0,
      componentCount: pluginState.currentSelection.length
    };
  }

  const frameCount = pluginState.currentSelection.filter(node => 
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  ).length;

  return { 
    isValid: true,
    frameCount,
    componentCount: pluginState.currentSelection.length
  };
}

function extractDesignValuesFromFlows(flows: FlowStructure[]): ExtractedValues {
  const values: ExtractedValues = {
    colors: new Set<string>(),
    fontSizes: new Set<number>(),
    fontWeights: new Set<string>(),
    fontFamilies: new Set<string>(),
    borderRadius: new Set<number>(),
    spacing: new Set<number>(),
    shadows: new Set<string>(),
    opacity: new Set<number>(),
    buttons: [],
    inputs: [],
    headings: [],
    labels: [],
    cards: [],
    navigationItems: []
  };

  flows.forEach(flow => {
    flow.screens.forEach(screen => {
      if (screen.backgroundColor) {
        values.colors.add(screen.backgroundColor);
      }
    });
  });

  return values;
}

function generateNavigationFile(flow: FlowStructure): string {
  return `// navigation/index.ts - Generated Navigation for ${flow.name}
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

${flow.screens.map(screen => 
  `import ${screen.name} from '../screens/${screen.name}';`
).join('\n')}

const Stack = createNativeStackNavigator();

export default function ${flow.name}Navigator() {
  return (
    <Stack.Navigator initialRouteName="${flow.screens[0]?.name || 'Home'}">
      ${flow.screens.map(screen => 
        `<Stack.Screen name="${screen.name}" component={${screen.name}} />`
      ).join('\n      ')}
    </Stack.Navigator>
  );
}`;
}

// Initialize the plugin
try {
  showPluginUI();
  logger.info(MODULE_NAME, 'init', 'Plugin initialized successfully with comprehensive architecture');
} catch (error) {
  const errorInfo = ErrorHandler.handle(error as Error, {
    module: MODULE_NAME,
    function: 'initialization',
    operation: 'plugin startup'
  });
      logger.error(MODULE_NAME, 'init', `Critical error during plugin initialization: ${errorInfo}`);
  figma.closePlugin(`Initialization error: ${errorInfo}`);
}