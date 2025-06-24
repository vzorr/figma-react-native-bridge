// src/main.ts
// Main entry point for Figma React Native Bridge Plugin

import { logger, LogLevel } from './core/logger';
import { ErrorHandler } from './core/error-handler';
import { MESSAGE_TYPES } from './core/constants';
import { ExtractValuesHandler } from './handlers/extract-values-handler';
import { ExtractScreensHandler } from './handlers/extract-screens-handler';

declare const figma: any;
declare const __html__: string;

const MODULE_NAME = 'Main';

class FigmaReactNativeBridge {
  private extractValuesHandler: ExtractValuesHandler;
  private extractScreensHandler: ExtractScreensHandler;

  constructor() {
    try {
      // Initialize handlers
      this.extractValuesHandler = new ExtractValuesHandler();
      this.extractScreensHandler = new ExtractScreensHandler();
      
      logger.info(MODULE_NAME, 'constructor', 'Figma React Native Bridge Plugin initialized');
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
      logger.info(MODULE_NAME, 'init', 'Starting plugin initialization');
      
      // Show UI
      figma.showUI(__html__, { 
        width: 400, 
        height: 600,
        title: 'React Native Bridge'
      });

      // Set up message handling
      figma.ui.onmessage = (msg: any) => {
        this.handleMessage(msg).catch((error) => {
          ErrorHandler.handle(error as Error, {
            module: MODULE_NAME,
            function: 'onmessage',
            operation: 'message handling',
            additionalData: { messageType: msg?.type }
          });
        });
      };

      logger.info(MODULE_NAME, 'init', 'Plugin initialization complete');
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'init',
        operation: 'plugin UI initialization'
      });
    }
  }

  private async handleMessage(msg: any): Promise<void> {
    try {
      logger.info(MODULE_NAME, 'handleMessage', `Received message: ${msg.type}`);
      
      switch (msg.type) {
        case MESSAGE_TYPES.EXTRACT_VALUES:
          await this.extractValuesHandler.handle(msg.options);
          break;
          
        case MESSAGE_TYPES.EXTRACT_SCREENS:
          await this.extractScreensHandler.handle(msg.options);
          break;
          
        case MESSAGE_TYPES.CLOSE:
          logger.info(MODULE_NAME, 'handleMessage', 'Closing plugin');
          figma.closePlugin();
          break;
          
        case MESSAGE_TYPES.GET_LOGS:
          this.sendLogs();
          break;
          
        case MESSAGE_TYPES.CLEAR_LOGS:
          logger.clearLogs();
          figma.ui.postMessage({
            type: MESSAGE_TYPES.LOGS_CLEARED
          });
          break;
          
        case MESSAGE_TYPES.SET_LOG_LEVEL:
          if (msg.level !== undefined) {
            logger.setLevel(msg.level as LogLevel);
            figma.ui.postMessage({
              type: MESSAGE_TYPES.LOG_LEVEL_CHANGED,
              level: msg.level
            });
          }
          break;
          
        default:
          logger.warn(MODULE_NAME, 'handleMessage', `Unknown message type: ${msg.type}`);
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
  }
}

// Error boundary for the entire plugin
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
    }

    // Initialize and start the plugin
    const bridge = new FigmaReactNativeBridge();
    bridge.init();
    
    logger.info(MODULE_NAME, 'initializePluginWithErrorHandling', 'Plugin successfully loaded');
    
  } catch (error) {
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'initializePluginWithErrorHandling',
      operation: 'plugin startup'
    });
    
    // Try to show a basic error message to the user
    try {
      figma.ui.postMessage({
        type: MESSAGE_TYPES.CRITICAL_ERROR,
        error: {
          message: 'Plugin failed to initialize',
          timestamp: Date.now()
        }
      });
    } catch (uiError) {
      console.error('Critical error: Failed to initialize plugin and cannot communicate with UI:', error);
    }
  }
}

// Start the plugin
logger.info(MODULE_NAME, 'startup', 'Figma React Native Bridge Plugin loading...');
initializePluginWithErrorHandling();