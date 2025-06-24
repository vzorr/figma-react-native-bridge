// src/main.ts - Enhanced with Flow Handling - FIXED VERSION
// Main entry point for Figma React Native Bridge Plugin

import { logger, LogLevel } from './core/logger';
import { ErrorHandler } from './core/error-handler';
import { MESSAGE_TYPES, FLOW_MESSAGE_TYPES } from './core/constants';
import { ExtractValuesHandler } from './handlers/extract-values-handler';
import ExtractScreensHandler from './handlers/extract-screens-handler';
import { ExtractFlowsHandler } from './handlers/extract-flows-handler';
import { ScreenGenerator } from './generators/screen-generator';
import { ThemeGenerator } from './generators/theme-generator';

declare const figma: any;
declare const __html__: string;

const MODULE_NAME = 'Main';

class FigmaReactNativeBridge {
  private extractValuesHandler: ExtractValuesHandler;
  private extractScreensHandler: ExtractScreensHandler;
  private extractFlowsHandler: ExtractFlowsHandler;
  private screenGenerator: ScreenGenerator;
  private themeGenerator: ThemeGenerator;

  constructor() {
    try {
      // Initialize handlers
      this.extractValuesHandler = new ExtractValuesHandler();
      this.extractScreensHandler = new ExtractScreensHandler();
      this.extractFlowsHandler = new ExtractFlowsHandler();
      this.screenGenerator = new ScreenGenerator();
      this.themeGenerator = new ThemeGenerator();
      
      logger.info(MODULE_NAME, 'constructor', 'Figma React Native Bridge Plugin initialized with flow support');
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'constructor',
        operation: 'plugin initialization'
      });
      throw error;
    }
  }

  init(): void {
    try {
      logger.info(MODULE_NAME, 'init', 'Starting plugin initialization with enhanced flow support');
      
      // Show UI using the injected HTML content
      figma.showUI(__html__, { 
        width: 400, 
        height: 600,
        title: 'React Native Flow Bridge'
      });

      // Set up message handling
      figma.ui.onmessage = (msg: any) => {
        this.incrementMessageCount();
        this.handleMessage(msg).catch((error) => {
          ErrorHandler.handle(error as Error, {
            module: MODULE_NAME,
            function: 'onmessage',
            operation: 'message handling',
            additionalData: { messageType: msg?.type }
          });
        });
      };

      logger.info(MODULE_NAME, 'init', 'Plugin initialization complete with flow support');
      
      // Send initial ready message with enhanced capabilities
      setTimeout(() => {
        try {
          figma.ui.postMessage({
            type: 'plugin-ready',
            data: {
              version: '1.0.0',
              timestamp: Date.now(),
              capabilities: [
                'extract-tokens',
                'extract-screens', 
                'detect-flows',
                'generate-flow-code',
                'generate-screen-code',
                'export-flow-theme',
                'semantic-analysis',
                'user-role-detection'
              ]
            }
          });
        } catch (uiError) {
          logger.warn(MODULE_NAME, 'init', 'Failed to send ready message to UI');
        }
      }, 100);
      
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'init',
        operation: 'plugin UI initialization'
      });
      
      // Try to show a fallback UI
      try {
        figma.showUI(`
          <html>
            <body style="padding: 20px; font-family: Arial, sans-serif;">
              <h3>Plugin Error</h3>
              <p>Failed to load the main UI. Please check the console for details.</p>
              <p>Error: ${(error as Error).message}</p>
            </body>
          </html>
        `, { width: 400, height: 200 });
      } catch (fallbackError) {
        console.error('Failed to show fallback UI:', fallbackError);
      }
    }
  }

  private async handleMessage(msg: any): Promise<void> {
    try {
      logger.info(MODULE_NAME, 'handleMessage', `Received message: ${msg.type || msg.pluginMessage?.type}`);
      
      // Handle both direct and nested message formats
      const messageType = msg.type || msg.pluginMessage?.type;
      const messageData = msg.data || msg.pluginMessage || msg;
      
      switch (messageType) {
        // Existing handlers
        case MESSAGE_TYPES.EXTRACT_VALUES:
        case 'extract-tokens':
          await this.extractValuesHandler.handle(messageData.options);
          break;
          
        case MESSAGE_TYPES.EXTRACT_SCREENS:
        case 'extract-screens':
          await this.extractScreensHandler.handle(messageData.options);
          break;
          
        // Flow-specific handlers
        case MESSAGE_TYPES.DETECT_FLOWS:
        case 'detect-flows':
          await this.extractFlowsHandler.handleFlowDetection(messageData.options);
          break;
          
        case MESSAGE_TYPES.FLOW_SELECTED:
        case 'flow-selected':
          await this.extractFlowsHandler.handleFlowSelection(messageData.flowId);
          break;
          
        case MESSAGE_TYPES.GENERATE_FLOW_CODE:
        case 'generate-flow-code':
          await this.handleGenerateFlowCode(messageData.flowId);
          break;
          
        case MESSAGE_TYPES.GENERATE_SCREEN_CODE:
        case 'generate-screen-code':
          await this.handleGenerateScreenCode(messageData.flowId, messageData.screenName);
          break;
          
        case MESSAGE_TYPES.EXPORT_FLOW_THEME:
        case 'export-flow-theme':
          await this.handleExportFlowTheme(messageData.flowId);
          break;
          
        // System handlers
        case MESSAGE_TYPES.CLOSE:
        case 'close':
          logger.info(MODULE_NAME, 'handleMessage', 'Closing plugin');
          figma.closePlugin();
          break;
          
        case MESSAGE_TYPES.GET_LOGS:
        case 'get-logs':
          this.sendLogs();
          break;
          
        case MESSAGE_TYPES.CLEAR_LOGS:
        case 'clear-logs':
          logger.clearLogs();
          figma.ui.postMessage({
            type: MESSAGE_TYPES.LOGS_CLEARED
          });
          break;
          
        case MESSAGE_TYPES.SET_LOG_LEVEL:
        case 'set-log-level':
          if (messageData.level !== undefined) {
            logger.setLevel(messageData.level as LogLevel);
            figma.ui.postMessage({
              type: MESSAGE_TYPES.LOG_LEVEL_CHANGED,
              level: messageData.level
            });
          }
          break;
          
        default:
          logger.warn(MODULE_NAME, 'handleMessage', `Unknown message type: ${messageType}`);
      }
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'handleMessage',
        operation: 'message processing',
        additionalData: { messageType: msg?.type, messageData: msg }
      });
      
      // Send error to UI
      figma.ui.postMessage({
        type: MESSAGE_TYPES.ERROR,
        error: {
          message: 'Failed to process message',
          context: `Message type: ${msg?.type}`,
          timestamp: Date.now()
        }
      });
    }
  }

  // Generate complete flow code
  private async handleGenerateFlowCode(flowId: string): Promise<void> {
    const FUNC_NAME = 'handleGenerateFlowCode';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, `Generating code for flow: ${flowId}`);
      
      // Get the specific flow from the flow extractor
      const flow = this.extractFlowsHandler.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow ${flowId} not found`);
      }
      
      // Generate code for all screens in the flow
      const flowCode = await this.generateCompleteFlowCode(flow);
      
      figma.ui.postMessage({
        type: FLOW_MESSAGE_TYPES.FLOW_CODE_GENERATED,
        data: {
          flowId,
          code: flowCode,
          timestamp: Date.now()
        }
      });
      
      logger.info(MODULE_NAME, FUNC_NAME, 'Flow code generation complete');
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error generating flow code:', error as Error);
      figma.ui.postMessage({
        type: MESSAGE_TYPES.ERROR,
        error: {
          message: `Failed to generate code for flow ${flowId}`,
          details: (error as Error).message
        }
      });
    }
  }

  // Generate specific screen code
  private async handleGenerateScreenCode(flowId: string, screenName: string): Promise<void> {
    const FUNC_NAME = 'handleGenerateScreenCode';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, `Generating code for screen: ${screenName} in flow: ${flowId}`);
      
      // Get the specific screen from the flow
      const flow = this.extractFlowsHandler.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow ${flowId} not found`);
      }
      
      const screen = flow.screens.find((s: any) => s.name === screenName);
      if (!screen) {
        throw new Error(`Screen ${screenName} not found in flow ${flowId}`);
      }
      
      // Generate theme for context
      const theme = this.themeGenerator.generateTheme(this.extractDesignValuesFromFlow(flow));
      
      // Generate screen code
      const screenCode = this.screenGenerator.generateScreenCode(screen, theme);
      
      figma.ui.postMessage({
        type: FLOW_MESSAGE_TYPES.SCREEN_CODE_GENERATED,
        data: {
          flowId,
          screenName,
          code: screenCode,
          timestamp: Date.now()
        }
      });
      
      logger.info(MODULE_NAME, FUNC_NAME, 'Screen code generation complete');
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error generating screen code:', error as Error);
      figma.ui.postMessage({
        type: MESSAGE_TYPES.ERROR,
        error: {
          message: `Failed to generate code for screen ${screenName}`,
          details: (error as Error).message
        }
      });
    }
  }

  // Export flow-specific theme
  private async handleExportFlowTheme(flowId: string): Promise<void> {
    const FUNC_NAME = 'handleExportFlowTheme';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, `Exporting theme for flow: ${flowId}`);
      
      const flow = this.extractFlowsHandler.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow ${flowId} not found`);
      }
      
      // Extract design values specific to this flow
      const flowDesignValues = this.extractDesignValuesFromFlow(flow);
      
      // Generate flow-specific theme
      const theme = this.themeGenerator.generateTheme(flowDesignValues);
      const themeContent = this.themeGenerator.generateThemeFileContent(theme);
      
      figma.ui.postMessage({
        type: FLOW_MESSAGE_TYPES.FLOW_THEME_EXPORTED,
        data: {
          flowId,
          themeContent,
          flowName: flow.name,
          timestamp: Date.now()
        }
      });
      
      logger.info(MODULE_NAME, FUNC_NAME, 'Flow theme export complete');
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error exporting flow theme:', error as Error);
      figma.ui.postMessage({
        type: MESSAGE_TYPES.ERROR,
        error: {
          message: `Failed to export theme for flow ${flowId}`,
          details: (error as Error).message
        }
      });
    }
  }

  // Helper methods for flow code generation
  private async generateCompleteFlowCode(flow: any): Promise<string> {
    const screens = flow.screens || [];
    const theme = this.themeGenerator.generateTheme(this.extractDesignValuesFromFlow(flow));
    
    // Generate individual screen components
    const screenComponents = screens.map((screen: any) => 
      this.screenGenerator.generateScreenCode(screen, theme)
    );
    
    // Generate flow navigator
    const flowNavigator = this.generateFlowNavigator(flow, theme);
    
    // Combine into complete flow code
    return `// ${flow.name} - Complete Flow Implementation
// Generated from Figma React Native Bridge
// Flow Type: ${flow.flowType}
// User Role: ${flow.userRole?.name || 'Unknown'}
// Screens: ${screens.length}

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screen imports
${screens.map((screen: any, index: number) => 
  `import ${this.sanitizeComponentName(screen.name)} from './screens/${this.sanitizeComponentName(screen.name)}';`
).join('\n')}

const Stack = createStackNavigator();

interface ${this.sanitizeComponentName(flow.name)}Props {
  initialRoute?: string;
}

const ${this.sanitizeComponentName(flow.name)}: React.FC<${this.sanitizeComponentName(flow.name)}Props> = ({ 
  initialRoute = '${screens[0]?.name || 'Home'}' 
}) => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: '${theme.colors?.primary || '#007AFF'}',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
${screens.map((screen: any) => `        <Stack.Screen 
          name="${screen.name}" 
          component={${this.sanitizeComponentName(screen.name)}} 
          options={{ title: '${screen.name}' }}
        />`).join('\n')}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default ${this.sanitizeComponentName(flow.name)};

/*
Flow Information:
- Flow Type: ${flow.flowType}
- User Role: ${flow.userRole?.name || 'Unknown'}
- Navigation Pattern: ${flow.navigationPattern || 'stack'}
- Estimated Duration: ${flow.estimatedDuration || 'Unknown'} seconds
- Device Targets: ${flow.deviceTargets?.join(', ') || 'Unknown'}

Screens in Flow:
${screens.map((screen: any, index: number) => 
  `${index + 1}. ${screen.name} (${screen.width}x${screen.height})`
).join('\n')}
*/

${screenComponents.join('\n\n')}`;
  }

  private generateFlowNavigator(flow: any, theme: any): string {
    const componentName = this.sanitizeComponentName(flow.name);
    const screens = flow.screens || [];
    
    return `// ${componentName}Navigator.tsx - Generated Flow Navigator
// Flow: ${flow.name}
// Navigation Pattern: ${flow.navigationPattern}

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Screen imports
${screens.map((screen: any) => 
  `import ${this.sanitizeComponentName(screen.name)} from '../screens/${this.sanitizeComponentName(screen.name)}';`
).join('\n')}

// Theme import
import theme from '../theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

interface ${componentName}NavigatorProps {
  initialRoute?: string;
  onNavigationStateChange?: (state: any) => void;
}

${this.generateNavigatorComponent(flow, screens, componentName)}

export default ${componentName}Navigator;

// Navigation utilities
export const navigate${componentName} = {
${screens.map((screen: any, index: number) => `  to${this.sanitizeComponentName(screen.name)}: () => navigate('${screen.name}'),`).join('\n')}
};

// Type exports for navigation
export type ${componentName}StackParamList = {
${screens.map((screen: any) => `  ${screen.name}: undefined;`).join('\n')}
};

/*
Flow Information:
- User Role: ${flow.userRole?.name || 'Unknown'}
- Flow Type: ${flow.flowType}
- Device Targets: ${flow.deviceTargets?.join(', ') || 'Unknown'}
- Estimated Duration: ${flow.estimatedDuration || 'Unknown'} seconds
- Screen Count: ${screens.length}
*/`;
  }

  private generateNavigatorComponent(flow: any, screens: any[], componentName: string): string {
    const pattern = flow.navigationPattern || 'stack';
    
    switch (pattern) {
      case 'tab':
        return this.generateTabNavigator(screens, componentName);
      case 'drawer':
        return this.generateDrawerNavigator(screens, componentName);
      case 'modal':
        return this.generateModalNavigator(screens, componentName);
      default:
        return this.generateStackNavigator(screens, componentName);
    }
  }

  private generateStackNavigator(screens: any[], componentName: string): string {
    return `const ${componentName}Navigator: React.FC<${componentName}NavigatorProps> = ({ 
  initialRoute = '${screens[0]?.name || 'Home'}',
  onNavigationStateChange 
}) => {
  return (
    <NavigationContainer onStateChange={onNavigationStateChange}>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors?.primary || '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
${screens.map((screen: any) => `        <Stack.Screen 
          name="${screen.name}" 
          component={${this.sanitizeComponentName(screen.name)}} 
          options={{ 
            title: '${screen.name}',
            headerShown: true
          }}
        />`).join('\n')}
      </Stack.Navigator>
    </NavigationContainer>
  );
};`;
  }

  private generateTabNavigator(screens: any[], componentName: string): string {
    return `const ${componentName}Navigator: React.FC<${componentName}NavigatorProps> = ({ 
  initialRoute = '${screens[0]?.name || 'Home'}',
  onNavigationStateChange 
}) => {
  return (
    <NavigationContainer onStateChange={onNavigationStateChange}>
      <Tab.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          tabBarStyle: {
            backgroundColor: theme.colors?.white || '#FFFFFF',
          },
          tabBarActiveTintColor: theme.colors?.primary || '#007AFF',
          tabBarInactiveTintColor: theme.colors?.gray || '#999999',
        }}
      >
${screens.slice(0, 5).map((screen: any) => `        <Tab.Screen 
          name="${screen.name}" 
          component={${this.sanitizeComponentName(screen.name)}} 
          options={{ 
            title: '${screen.name}',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>📱</Text>
            )
          }}
        />`).join('\n')}
      </Tab.Navigator>
    </NavigationContainer>
  );
};`;
  }

  private generateDrawerNavigator(screens: any[], componentName: string): string {
    return `const ${componentName}Navigator: React.FC<${componentName}NavigatorProps> = ({ 
  initialRoute = '${screens[0]?.name || 'Home'}',
  onNavigationStateChange 
}) => {
  return (
    <NavigationContainer onStateChange={onNavigationStateChange}>
      <Drawer.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          drawerStyle: {
            backgroundColor: theme.colors?.white || '#FFFFFF',
          },
          drawerActiveTintColor: theme.colors?.primary || '#007AFF',
        }}
      >
${screens.map((screen: any) => `        <Drawer.Screen 
          name="${screen.name}" 
          component={${this.sanitizeComponentName(screen.name)}} 
          options={{ title: '${screen.name}' }}
        />`).join('\n')}
      </Drawer.Navigator>
    </NavigationContainer>
  );
};`;
  }

  private generateModalNavigator(screens: any[], componentName: string): string {
    return `const ${componentName}Navigator: React.FC<${componentName}NavigatorProps> = ({ 
  initialRoute = '${screens[0]?.name || 'Home'}',
  onNavigationStateChange 
}) => {
  return (
    <NavigationContainer onStateChange={onNavigationStateChange}>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          presentation: 'modal',
          headerStyle: {
            backgroundColor: theme.colors?.primary || '#007AFF',
          },
          headerTintColor: '#fff',
        }}
      >
${screens.map((screen: any) => `        <Stack.Screen 
          name="${screen.name}" 
          component={${this.sanitizeComponentName(screen.name)}} 
          options={{ 
            title: '${screen.name}',
            presentation: 'modal'
          }}
        />`).join('\n')}
      </Stack.Navigator>
    </NavigationContainer>
  );
};`;
  }

  private extractDesignValuesFromFlow(flow: any): any {
    // Extract design values specific to this flow
    const values = {
      colors: new Set<string>(),
      fontSizes: new Set<number>(),
      fontWeights: new Set<string>(),
      fontFamilies: new Set<string>(),
      borderRadius: new Set<number>(),
      spacing: new Set<number>(),
      shadows: new Set<string>(),
      opacity: new Set<number>(),
      buttons: [] as any[],
      inputs: [] as any[],
      headings: [] as any[],
      labels: [] as any[],
      cards: [] as any[],
      navigationItems: [] as any[]
    };

    flow.screens?.forEach((screen: any) => {
      this.extractValuesFromComponents(screen.components || [], values);
    });

    return values;
  }

  private extractValuesFromComponents(components: any[], values: any): void {
    components.forEach(component => {
      // Extract colors
      if (component.backgroundColor) values.colors.add(component.backgroundColor);
      if (component.textColor) values.colors.add(component.textColor);
      
      // Extract typography
      if (component.fontSize) values.fontSizes.add(component.fontSize);
      if (component.fontWeight) values.fontWeights.add(component.fontWeight);
      
      // Extract other properties
      if (component.borderRadius) values.borderRadius.add(component.borderRadius);
      
      // Categorize components
      if (component.semanticType === 'button') values.buttons.push(component);
      if (component.semanticType === 'input') values.inputs.push(component);
      if (component.semanticType === 'heading') values.headings.push(component);
      
      // Process children
      if (component.children) {
        this.extractValuesFromComponents(component.children, values);
      }
    });
  }

  private sanitizeComponentName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[0-9]/, '_') || 'Component';
  }

  // Existing methods remain the same...
  private sendLogs(): void {
    try {
      const logs = logger.getLogs();
      const errorSummary = logger.getErrorSummary();
      const memoryUsage = logger.getMemoryUsage();
      
      figma.ui.postMessage({
        type: MESSAGE_TYPES.LOGS_DATA,
        data: {
          logs,
          errorSummary,
          memoryUsage,
          exportedAt: Date.now()
        }
      });
      
      logger.info(MODULE_NAME, 'sendLogs', `Sent ${logs.length} log entries to UI`);
    } catch (error) {
      logger.error(MODULE_NAME, 'sendLogs', 'Error sending logs to UI:', error as Error);
    }
  }

  private sendFinalLogs(): void {
    try {
      const finalLogs = logger.exportLogs();
      const errorStats = ErrorHandler.getStatistics();
      
      figma.ui.postMessage({
        type: MESSAGE_TYPES.FINAL_LOGS,
        data: {
          logs: finalLogs,
          errorStats,
          pluginStats: {
            sessionDuration: Date.now() - this.startTime,
            totalMessages: this.messageCount,
            finalTimestamp: Date.now()
          }
        }
      });
    } catch (error) {
      console.error('Failed to send final logs:', error);
    }
  }

  // Session tracking
  private startTime = Date.now();
  private messageCount = 0;

  private incrementMessageCount(): void {
    this.messageCount++;
    logger.debug(MODULE_NAME, 'incrementMessageCount', `Message count: ${this.messageCount}`);
  }

  // Cleanup method
  destroy(): void {
    try {
      this.sendFinalLogs();
      logger.info(MODULE_NAME, 'destroy', 'Plugin cleanup complete');
    } catch (error) {
      console.error('Error during plugin cleanup:', error);
    }
  }
}

// Global instance for cleanup
let bridgeInstance: FigmaReactNativeBridge | null = null;

// Error boundary and initialization
function initializePluginWithErrorHandling(): void {
  try {
    // Set up global error handling
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        ErrorHandler.handle(event.error, {
          module: MODULE_NAME,
          function: 'globalErrorHandler',
          operation: 'global error handling',
          additionalData: { 
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        ErrorHandler.handle(new Error(event.reason), {
          module: MODULE_NAME,
          function: 'globalRejectionHandler',
          operation: 'unhandled promise rejection',
          additionalData: { reason: event.reason }
        });
      });

      window.addEventListener('beforeunload', () => {
        if (bridgeInstance) {
          bridgeInstance.destroy();
        }
      });
    }

    // Initialize and start the plugin
    bridgeInstance = new FigmaReactNativeBridge();
    bridgeInstance.init();
    
    logger.info(MODULE_NAME, 'initializePluginWithErrorHandling', 'Plugin successfully loaded with enhanced flow support');
    
  } catch (error) {
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'initializePluginWithErrorHandling',
      operation: 'plugin startup'
    });
    
    // Try to show a basic error message to the user
    try {
      if (figma && figma.ui && figma.ui.postMessage) {
        figma.ui.postMessage({
          type: MESSAGE_TYPES.CRITICAL_ERROR,
          error: {
            message: 'Plugin failed to initialize',
            timestamp: Date.now(),
            details: (error as Error).message
          }
        });
      }
    } catch (uiError) {
      console.error('Critical error: Failed to initialize plugin and cannot communicate with UI:', error);
      console.error('UI communication error:', uiError);
    }
  }
}

// Start the plugin
logger.info(MODULE_NAME, 'startup', 'Figma React Native Bridge Plugin with Flow Support loading...');
initializePluginWithErrorHandling();