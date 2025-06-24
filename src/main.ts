// src/main.ts
// Main entry point for the Figma React Native Bridge Plugin (Process-free)

import { logger, LogLevel } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import ExtractValuesHandler from '@handlers/extract-values-handler';
import ExtractScreensHandler from '@handlers/extract-screens-handler';
import { MESSAGE_TYPES, PLUGIN_CONFIG } from '@core/constants';

const MODULE_NAME = 'Main';

// Environment detection (avoiding process.env)
const ENVIRONMENT = (() => {
  try {
    const isDev = typeof module !== 'undefined' && module.hot;
    return { isDevelopment: isDev };
  } catch {
    return { isDevelopment: false };
  }
})();

// Initialize logging
logger.setLevel(ENVIRONMENT.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO);

// Plugin initialization
function initializePlugin() {
  const FUNC_NAME = 'initializePlugin';
  
  try {
    logger.info(MODULE_NAME, FUNC_NAME, 'Figma React Native Bridge Plugin starting...', {
      version: PLUGIN_CONFIG.version,
      environment: ENVIRONMENT.isDevelopment ? 'development' : 'production',
      figmaVersion: typeof figma !== 'undefined' ? 'available' : 'unavailable'
    });

    // Show UI
    if (typeof figma !== 'undefined' && figma.showUI) {
      figma.showUI(__html__, { 
        width: PLUGIN_CONFIG.ui.width, 
        height: PLUGIN_CONFIG.ui.height,
        title: PLUGIN_CONFIG.ui.title
      });
    } else {
      throw new Error('Figma API not available');
    }

    // Set up message handling
    setupMessageHandler();
    
    // Set up error handling
    setupGlobalErrorHandler();
    
    logger.info(MODULE_NAME, FUNC_NAME, 'Plugin initialized successfully');
    
  } catch (error) {
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: FUNC_NAME,
      operation: 'Plugin initialization'
    });
  }
}

function setupMessageHandler() {
  const FUNC_NAME = 'setupMessageHandler';
  
  if (typeof figma === 'undefined' || !figma.ui) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Figma UI not available for message handling');
    return;
  }

  figma.ui.onmessage = (msg: any) => {
    logger.info(MODULE_NAME, FUNC_NAME, `Received message: ${msg.type}`, {
      messageType: msg.type,
      hasData: !!msg.data,
      timestamp: Date.now()
    });
    
    try {
      switch (msg.type) {
        case MESSAGE_TYPES.EXTRACT_VALUES:
          handleExtractValues(msg);
          break;
          
        case MESSAGE_TYPES.EXTRACT_SCREENS:
          handleExtractScreens(msg);
          break;
          
        case MESSAGE_TYPES.CLOSE:
          handleClose();
          break;
          
        case MESSAGE_TYPES.GET_LOGS:
          handleGetLogs();
          break;
          
        case MESSAGE_TYPES.CLEAR_LOGS:
          handleClearLogs();
          break;
          
        case MESSAGE_TYPES.SET_LOG_LEVEL:
          handleSetLogLevel(msg);
          break;
          
        default:
          logger.warn(MODULE_NAME, FUNC_NAME, `Unknown message type: ${msg.type}`, { message: msg });
          if (figma.ui) {
            figma.ui.postMessage({
              type: MESSAGE_TYPES.ERROR,
              error: `Unknown message type: ${msg.type}`
            });
          }
      }
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: `Message handling for ${msg.type}`
      });
      
      if (figma.ui) {
        figma.ui.postMessage({
          type: MESSAGE_TYPES.ERROR,
          error: {
            message: (error as Error).message,
            type: msg.type,
            timestamp: Date.now()
          }
        });
      }
    }
  };
  
  logger.debug(MODULE_NAME, FUNC_NAME, 'Message handler set up');
}

function setupGlobalErrorHandler() {
  const FUNC_NAME = 'setupGlobalErrorHandler';
  
  // Catch unhandled errors in browser environment
  try {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        ErrorHandler.handle(event.error || new Error(event.message), {
          module: MODULE_NAME,
          function: 'globalErrorHandler',
          operation: 'Unhandled error'
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        ErrorHandler.handle(new Error(event.reason), {
          module: MODULE_NAME,
          function: 'globalErrorHandler', 
          operation: 'Unhandled promise rejection'
        });
      });
    }
  } catch (setupError) {
    // If we can't set up global handlers, just log it
    logger.warn(MODULE_NAME, FUNC_NAME, 'Could not set up global error handlers:', { error: setupError });
  }
  
  logger.debug(MODULE_NAME, FUNC_NAME, 'Global error handlers set up');
}

async function handleExtractValues(msg: any) {
  const FUNC_NAME = 'handleExtractValues';
  const timerKey = logger.startTimer(MODULE_NAME, FUNC_NAME);
  
  try {
    logger.info(MODULE_NAME, FUNC_NAME, 'Starting design values extraction');
    
    const handler = new ExtractValuesHandler();
    await handler.handle(msg.options);
    
    const duration = logger.endTimer(MODULE_NAME, FUNC_NAME);
    logger.info(MODULE_NAME, FUNC_NAME, `Design values extraction completed in ${duration}ms`);
    
  } catch (error) {
    logger.endTimer(MODULE_NAME, FUNC_NAME);
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: FUNC_NAME,
      operation: 'Design values extraction'
    });
    throw error;
  }
}

async function handleExtractScreens(msg: any) {
  const FUNC_NAME = 'handleExtractScreens';
  const timerKey = logger.startTimer(MODULE_NAME, FUNC_NAME);
  
  try {
    logger.info(MODULE_NAME, FUNC_NAME, 'Starting screens extraction');
    
    const handler = new ExtractScreensHandler();
    await handler.handle(msg.options);
    
    const duration = logger.endTimer(MODULE_NAME, FUNC_NAME);
    logger.info(MODULE_NAME, FUNC_NAME, `Screens extraction completed in ${duration}ms`);
    
  } catch (error) {
    logger.endTimer(MODULE_NAME, FUNC_NAME);
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: FUNC_NAME,
      operation: 'Screens extraction'
    });
    throw error;
  }
}

function handleClose() {
  const FUNC_NAME = 'handleClose';
  
  logger.info(MODULE_NAME, FUNC_NAME, 'Plugin closing...');
  
  // Send final logs before closing
  try {
    if (figma.ui) {
      figma.ui.postMessage({
        type: MESSAGE_TYPES.FINAL_LOGS,
        logs: logger.exportLogs(),
        summary: {
          totalLogs: logger.getLogs().length,
          errors: logger.getLogs().filter(l => l.level === LogLevel.ERROR).length,
          performance: logger.getMemoryUsage()
        }
      });
    }
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error sending final logs:', error as Error);
  }
  
  if (typeof figma !== 'undefined' && figma.closePlugin) {
    figma.closePlugin('React Native Bridge plugin closed');
  }
}

function handleGetLogs() {
  const FUNC_NAME = 'handleGetLogs';
  
  try {
    const logs = logger.getLogs();
    const errorSummary = logger.getErrorSummary();
    const memoryUsage = logger.getMemoryUsage();
    
    if (figma.ui) {
      figma.ui.postMessage({
        type: MESSAGE_TYPES.LOGS_DATA,
        data: {
          logs,
          errorSummary,
          memoryUsage,
          exportedLogs: logger.exportLogs()
        }
      });
    }
    
    logger.debug(MODULE_NAME, FUNC_NAME, `Sent ${logs.length} logs to UI`);
    
  } catch (error) {
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: FUNC_NAME,
      operation: 'Getting logs'
    });
  }
}

function handleClearLogs() {
  const FUNC_NAME = 'handleClearLogs';
  
  try {
    const oldCount = logger.getLogs().length;
    logger.clearLogs();
    
    if (figma.ui) {
      figma.ui.postMessage({
        type: MESSAGE_TYPES.LOGS_CLEARED,
        data: { previousCount: oldCount }
      });
    }
    
    logger.info(MODULE_NAME, FUNC_NAME, `Cleared ${oldCount} logs`);
    
  } catch (error) {
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: FUNC_NAME,
      operation: 'Clearing logs'
    });
  }
}

function handleSetLogLevel(msg: any) {
  const FUNC_NAME = 'handleSetLogLevel';
  
  try {
    const newLevel = msg.level as LogLevel;
    const oldLevel = logger.getLogs().length > 0 ? logger.getLogs()[0].level : LogLevel.INFO;
    
    logger.setLevel(newLevel);
    
    if (figma.ui) {
      figma.ui.postMessage({
        type: MESSAGE_TYPES.LOG_LEVEL_CHANGED,
        data: { oldLevel, newLevel }
      });
    }
    
    logger.info(MODULE_NAME, FUNC_NAME, `Log level changed from ${LogLevel[oldLevel]} to ${LogLevel[newLevel]}`);
    
  } catch (error) {
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: FUNC_NAME,
      operation: 'Setting log level'
    });
  }
}

// Plugin lifecycle
function handlePluginDrop() {
  const FUNC_NAME = 'handlePluginDrop';
  
  logger.info(MODULE_NAME, FUNC_NAME, 'Plugin dropped/reloaded');
  
  // Could save state here if needed
}

// Health check function
function healthCheck(): boolean {
  const FUNC_NAME = 'healthCheck';
  
  try {
    const checks = {
      figmaAvailable: typeof figma !== 'undefined',
      uiAvailable: typeof figma !== 'undefined' && !!figma.ui,
      currentPageExists: typeof figma !== 'undefined' && !!figma.currentPage,
      rootExists: typeof figma !== 'undefined' && !!figma.root,
    };
    
    const allPassed = Object.values(checks).every(Boolean);
    
    logger.debug(MODULE_NAME, FUNC_NAME, 'Health check completed', {
      checks,
      allPassed
    });
    
    if (!allPassed) {
      const failedChecks = Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([check]) => check);
      
      logger.warn(MODULE_NAME, FUNC_NAME, `Health check failed: ${failedChecks.join(', ')}`);
    }
    
    return allPassed;
    
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Health check error:', error as Error);
    return false;
  }
}

// Initialize plugin when script loads
try {
  // Run health check
  if (healthCheck()) {
    initializePlugin();
  } else {
    logger.error(MODULE_NAME, 'init', 'Health check failed - plugin may not work correctly');
    // Try to initialize anyway
    initializePlugin();
  }
} catch (error) {
  console.error('Critical plugin initialization error:', error);
  
  // Try to show some error to user
  try {
    if (typeof figma !== 'undefined' && figma.showUI) {
      figma.showUI(`<div style="padding: 20px; color: red;">
        <h3>Plugin Error</h3>
        <p>Failed to initialize: ${(error as Error).message}</p>
      </div>`, { width: 300, height: 200 });
    }
  } catch (uiError) {
    console.error('Cannot show error UI:', uiError);
  }
}

// Export for potential testing
export {
  initializePlugin,
  healthCheck,
  handleExtractValues,
  handleExtractScreens,
};