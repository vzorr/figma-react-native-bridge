// src/core/error-handler.ts
// Symbol-safe error handling with proper serialization

import { logger, LogLevel } from './logger';

const MODULE_NAME = 'ErrorHandler';

export interface ErrorContext {
  module: string;
  function: string;
  operation: string;
  userAction?: string;
  nodeInfo?: {
    id?: string;
    name?: string;
    type?: string;
  };
  additionalData?: any;
}

export interface ErrorReport {
  id: string;
  timestamp: number;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  userImpact: string;
  suggestedAction: string;
}

export class ErrorHandler {
  private static errorCount = 0;
  private static errorHistory: ErrorReport[] = [];
  private static maxHistorySize = 100;

  /**
   * Safe serialization that removes Symbols and other non-serializable values
   */
  private static safeSerialize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'symbol') {
      return '[Symbol]';
    }

    if (typeof obj === 'function') {
      return '[Function]';
    }

    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: obj.stack
      };
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.safeSerialize(item));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          try {
            const value = obj[key];
            result[key] = this.safeSerialize(value);
          } catch (error) {
            result[key] = '[Unserializable]';
          }
        }
      }
      return result;
    }

    return obj;
  }

  /**
   * Main error handling method with safe serialization
   */
  static handle(
    error: Error,
    context: string | ErrorContext,
    module?: string,
    func?: string,
    additionalData?: any
  ): string {
    const FUNC_NAME = 'handle';
    
    try {
      // Normalize context with safe serialization
      const errorContext: ErrorContext = typeof context === 'string' 
        ? {
            module: module || 'Unknown',
            function: func || 'unknown',
            operation: context,
            additionalData: this.safeSerialize(additionalData)
          }
        : {
            ...context,
            additionalData: this.safeSerialize(context.additionalData)
          };

      // Generate error report with safe serialization
      const report = this.generateErrorReport(error, errorContext);
      
      // Log the error
      logger.error(
        errorContext.module,
        errorContext.function,
        `${errorContext.operation}: ${error.message}`,
        error,
        {
          errorId: report.id,
          severity: report.severity,
          recoverable: report.recoverable,
          additionalData: errorContext.additionalData
        }
      );

      // Store in history
      this.addToHistory(report);

      // Send to UI with safe serialization
      this.sendToUI(report);

      // Apply recovery strategy
      this.attemptRecovery(report);

      // Increment error count
      this.errorCount++;

      return report.id;

    } catch (handlingError) {
      // Fallback error handling with minimal serialization
      console.error('Error in error handler:', handlingError);
      console.error('Original error:', error);
      
      try {
        // Send minimal safe error message
        const safeErrorMessage = {
          type: 'critical-error',
          error: {
            message: 'Error handler failed',
            originalError: typeof error === 'object' && error.message ? error.message : String(error),
            timestamp: Date.now()
          }
        };

        figma.ui.postMessage(safeErrorMessage);
      } catch (uiError) {
        console.error('Cannot send error to UI:', uiError);
      }

      return 'error-handler-failed';
    }
  }

  /**
   * Generate detailed error report with safe serialization
   */
  private static generateErrorReport(error: Error, context: ErrorContext): ErrorReport {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const severity = this.determineSeverity(error, context);
    const recoverable = this.isRecoverable(error, context);
    const userImpact = this.determineUserImpact(error, context);
    const suggestedAction = this.suggestAction(error, context);

    return {
      id: errorId,
      timestamp: Date.now(),
      error: {
        name: error.name || 'Error',
        message: error.message || 'Unknown error',
        stack: error.stack,
      },
      context: this.safeSerialize(context),
      severity,
      recoverable,
      userImpact,
      suggestedAction,
    };
  }

  /**
   * Send error report to UI with safe serialization
   */
  private static sendToUI(report: ErrorReport): void {
    try {
      // Create a safe, minimal version of the error report for UI
      const safeReport = {
        id: report.id,
        timestamp: report.timestamp,
        message: report.error.message,
        severity: report.severity,
        recoverable: report.recoverable,
        userImpact: report.userImpact,
        suggestedAction: report.suggestedAction,
        context: {
          module: report.context.module,
          operation: report.context.operation,
        }
      };

      const message = {
        type: 'error-report',
        report: safeReport
      };

      figma.ui.postMessage(message);
    } catch (uiError) {
      // If even the safe version fails, log to console only
      console.warn('Failed to send error to UI:', {
        errorId: report.id,
        message: report.error.message,
        uiError: uiError
      });
    }
  }

  /**
   * Attempt error recovery based on context
   */
  private static attemptRecovery(report: ErrorReport): void {
    if (!report.recoverable) {
      return;
    }

    const context = report.context;

    try {
      // Recovery strategies based on operation type
      if (context.operation.includes('extraction') && 
          report.error.message.includes('Symbol')) {
        
        // For Symbol conversion errors, send a message to continue with next item
        const recoveryMessage = {
          type: 'recovery-action',
          action: 'skip-current-node',
          reason: 'Symbol conversion error',
          errorId: report.id
        };

        figma.ui.postMessage(recoveryMessage);
      }

      if (context.operation.includes('generation') && 
          report.error.name === 'TypeError') {
        
        // For generation errors, try with fallback values
        const recoveryMessage = {
          type: 'recovery-action',
          action: 'use-fallback-values',
          reason: 'Type error in generation',
          errorId: report.id
        };

        figma.ui.postMessage(recoveryMessage);
      }

    } catch (recoveryError) {
      console.warn('Recovery attempt failed:', {
        originalError: report.id,
        recoveryError: recoveryError
      });
    }
  }

  /**
   * Determine error severity based on context and error type
   */
  private static determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // Critical errors
    if (error.name === 'TypeError' && error.message.includes('Cannot convert a Symbol')) {
      return 'medium'; // Symbol conversion errors are medium but recoverable
    }
    
    if (context.operation.includes('initialization') || context.operation.includes('plugin')) {
      return 'critical';
    }

    // High severity errors
    if (error.name === 'ReferenceError' || 
        error.name === 'SyntaxError' ||
        error.message.includes('figma is not defined')) {
      return 'high';
    }

    // Medium severity
    if (error.name === 'TypeError' || 
        context.operation.includes('extraction') ||
        context.operation.includes('generation')) {
      return 'medium';
    }

    // Low severity (data processing, validation, etc.)
    return 'low';
  }

  /**
   * Determine if error is recoverable
   */
  private static isRecoverable(error: Error, context: ErrorContext): boolean {
    // Non-recoverable errors
    const nonRecoverablePatterns = [
      'figma is not defined',
      'Cannot read property.*of undefined.*figma',
      'plugin.*initialization.*failed',
    ];

    if (nonRecoverablePatterns.some(pattern => 
      new RegExp(pattern, 'i').test(error.message))) {
      return false;
    }

    // Symbol conversion errors are recoverable (skip the node)
    if (error.message.includes('Cannot convert a Symbol') || 
        error.message.includes('Cannot unwrap symbol')) {
      return true;
    }

    // Most other errors are recoverable
    return true;
  }

  /**
   * Determine user impact description
   */
  private static determineUserImpact(error: Error, context: ErrorContext): string {
    if (context.operation.includes('extraction')) {
      if (error.message.includes('Symbol') || error.message.includes('symbol')) {
        return 'Some design elements may be skipped during extraction';
      }
      return 'Design extraction may fail or produce incomplete results';
    }

    if (context.operation.includes('generation')) {
      return 'Code generation may fail or produce incorrect output';
    }

    if (context.operation.includes('initialization')) {
      return 'Plugin may not function correctly';
    }

    return 'Feature may not work as expected';
  }

  /**
   * Suggest action to user
   */
  private static suggestAction(error: Error, context: ErrorContext): string {
    if (error.message.includes('Cannot convert a Symbol') || 
        error.message.includes('Cannot unwrap symbol')) {
      return 'This is a known issue with certain Figma elements. The plugin will skip problematic elements and continue.';
    }

    if (context.operation.includes('extraction') && error.name === 'TypeError') {
      return 'Try selecting different frames or check for invalid design elements';
    }

    if (context.operation.includes('initialization')) {
      return 'Try reloading the plugin or restarting Figma';
    }

    if (error.message.includes('figma') && error.message.includes('undefined')) {
      return 'Make sure you are running this in Figma and not in a browser';
    }

    return 'If this error persists, try reloading the plugin or contact support';
  }

  /**
   * Add error to history with rotation
   */
  private static addToHistory(report: ErrorReport): void {
    this.errorHistory.push(report);
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift(); // Remove oldest
    }
  }

  /**
   * Create a safe wrapper for functions that might throw
   */
  static createSafeWrapper<T extends (...args: any[]) => any>(
    func: T,
    context: Partial<ErrorContext>,
    fallback?: ReturnType<T>
  ): T {
    return ((...args: any[]) => {
      try {
        return func(...args);
      } catch (error) {
        this.handle(error as Error, {
          module: context.module || 'Unknown',
          function: context.function || 'wrapped',
          operation: context.operation || 'wrapped function call',
          additionalData: this.safeSerialize({ args })
        });
        return fallback;
      }
    }) as T;
  }

  /**
   * Create safe async wrapper
   */
  static createSafeAsyncWrapper<T extends (...args: any[]) => Promise<any>>(
    func: T,
    context: Partial<ErrorContext>,
    fallback?: Awaited<ReturnType<T>>
  ): T {
    return (async (...args: any[]) => {
      try {
        return await func(...args);
      } catch (error) {
        this.handle(error as Error, {
          module: context.module || 'Unknown',
          function: context.function || 'wrappedAsync',
          operation: context.operation || 'wrapped async function call',
          additionalData: this.safeSerialize({ args })
        });
        return fallback;
      }
    }) as T;
  }

  /**
   * Get error statistics with safe serialization
   */
  static getStatistics(): {
    totalErrors: number;
    recentErrors: number;
    errorsByModule: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverableErrors: number;
    criticalErrors: number;
  } {
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(err => err.timestamp > last24Hours);
    
    const errorsByModule: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    
    this.errorHistory.forEach(error => {
      errorsByModule[error.context.module] = (errorsByModule[error.context.module] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorCount,
      recentErrors: recentErrors.length,
      errorsByModule,
      errorsBySeverity,
      recoverableErrors: this.errorHistory.filter(e => e.recoverable).length,
      criticalErrors: this.errorHistory.filter(e => e.severity === 'critical').length,
    };
  }

  /**
   * Export error history for debugging with safe serialization
   */
  static exportErrorHistory(): string {
    try {
      const safeHistory = this.safeSerialize({
        exportTime: new Date().toISOString(),
        statistics: this.getStatistics(),
        errors: this.errorHistory
      });

      return JSON.stringify(safeHistory, null, 2);
    } catch (error) {
      return JSON.stringify({
        exportTime: new Date().toISOString(),
        error: 'Failed to serialize error history',
        message: error instanceof Error ? error.message : String(error)
      }, null, 2);
    }
  }

  /**
   * Clear error history
   */
  static clearHistory(): void {
    const oldCount = this.errorHistory.length;
    this.errorHistory = [];
    this.errorCount = 0;
    
    logger.info(MODULE_NAME, 'clearHistory', `Cleared ${oldCount} error records`);
  }

  /**
   * Check if error rate is too high
   */
  static isErrorRateHigh(): boolean {
    const last5Minutes = Date.now() - (5 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(err => err.timestamp > last5Minutes);
    
    return recentErrors.length > 10; // More than 10 errors in 5 minutes
  }

  /**
   * Get recent critical errors
   */
  static getRecentCriticalErrors(): ErrorReport[] {
    const last10Minutes = Date.now() - (10 * 60 * 1000);
    return this.errorHistory.filter(err => 
      err.timestamp > last10Minutes && err.severity === 'critical'
    );
  }
}

export default ErrorHandler;