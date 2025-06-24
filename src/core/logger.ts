// src/core/logger.ts
// Centralized logging system with module and function tracking (Process-free)

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  function: string;
  message: string;
  data?: any;
  error?: Error;
  performance?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
}

// Environment detection without process.env
const ENVIRONMENT = (() => {
  try {
    // Try to detect if we're in development by checking for webpack dev features
    const isDev = typeof module !== 'undefined' && module.hot;
    return {
      isDevelopment: isDev,
      isProduction: !isDev
    };
  } catch {
    return {
      isDevelopment: false,
      isProduction: true
    };
  }
})();

class Logger {
  private logs: LogEntry[] = [];
  private level: LogLevel = ENVIRONMENT.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  private maxLogs: number = 1000;
  private performanceTimers: Map<string, number> = new Map();

  setLevel(level: LogLevel) {
    this.level = level;
    this.log(LogLevel.INFO, 'Logger', 'setLevel', `Log level set to ${LogLevel[level]}`);
  }

  setMaxLogs(max: number) {
    this.maxLogs = max;
  }

  private log(level: LogLevel, module: string, func: string, message: string, data?: any, error?: Error) {
    if (level < this.level) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      function: func,
      message,
      data,
      error,
    };

    // Add to logs with rotation
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
    
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${levelNames[level]}] ${module}::${func}`;
    
    // Console output with appropriate method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.log(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || '', error || '');
        // Also send critical errors to Figma UI
        try {
          if (typeof figma !== 'undefined' && figma.ui) {
            figma.ui.postMessage({
              type: 'error-log',
              error: {
                module,
                function: func,
                message,
                timestamp: entry.timestamp,
                stack: error?.stack,
              }
            });
          }
        } catch (uiError) {
          console.error('Failed to send error to UI:', uiError);
        }
        break;
    }
  }

  debug(module: string, func: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, func, message, data);
  }

  info(module: string, func: string, message: string, data?: any) {
    this.log(LogLevel.INFO, module, func, message, data);
  }

  warn(module: string, func: string, message: string, data?: any) {
    this.log(LogLevel.WARN, module, func, message, data);
  }

  error(module: string, func: string, message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, module, func, message, data, error);
  }

  // Performance tracking
  startTimer(module: string, func: string): string {
    const key = `${module}::${func}`;
    const startTime = Date.now(); // Use Date.now() instead of performance.now() for Figma compatibility
    this.performanceTimers.set(key, startTime);
    this.debug(module, func, 'Performance timer started');
    return key;
  }

  endTimer(module: string, func: string): number {
    const key = `${module}::${func}`;
    const startTime = this.performanceTimers.get(key);
    
    if (!startTime) {
      this.warn(module, func, 'No timer found for performance measurement');
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.performanceTimers.delete(key);
    this.debug(module, func, `Performance timer ended`, { duration: `${duration}ms` });
    
    return duration;
  }

  // Batch operations
  getLogs(filter?: { module?: string; level?: LogLevel; since?: number }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.module) {
        filteredLogs = filteredLogs.filter(log => log.module === filter.module);
      }
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
      }
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
      }
    }

    return filteredLogs;
  }

  getErrorSummary(): { module: string; function: string; count: number; lastError: string }[] {
    const errorCounts = new Map<string, { count: number; lastError: string }>();
    
    this.logs
      .filter(log => log.level === LogLevel.ERROR)
      .forEach(log => {
        const key = `${log.module}::${log.function}`;
        const existing = errorCounts.get(key) || { count: 0, lastError: '' };
        errorCounts.set(key, {
          count: existing.count + 1,
          lastError: log.message
        });
      });

    return Array.from(errorCounts.entries()).map(([key, data]) => {
      const [module, func] = key.split('::');
      return {
        module,
        function: func,
        count: data.count,
        lastError: data.lastError
      };
    });
  }

  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      summary: {
        totalLogs: this.logs.length,
        errorCount: this.logs.filter(l => l.level === LogLevel.ERROR).length,
        warnCount: this.logs.filter(l => l.level === LogLevel.WARN).length,
        timeRange: {
          start: this.logs[0]?.timestamp,
          end: this.logs[this.logs.length - 1]?.timestamp
        }
      },
      errorSummary: this.getErrorSummary()
    }, null, 2);
  }

  clearLogs() {
    const oldCount = this.logs.length;
    this.logs = [];
    this.info('Logger', 'clearLogs', `Cleared ${oldCount} logs`);
  }

  // Memory usage
  getMemoryUsage(): { logCount: number; estimatedSize: string } {
    const size = JSON.stringify(this.logs).length;
    return {
      logCount: this.logs.length,
      estimatedSize: `${(size / 1024).toFixed(2)}KB`
    };
  }
}

export const logger = new Logger();

// Decorator for automatic function logging with performance tracking
export function LogFunction(module: string, trackPerformance: boolean = false) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      logger.debug(module, propertyName, `Called with ${args.length} arguments`);
      
      let timerStarted = false;
      if (trackPerformance) {
        logger.startTimer(module, propertyName);
        timerStarted = true;
      }
      
      try {
        const result = method.apply(this, args);
        
        if (timerStarted) {
          const duration = logger.endTimer(module, propertyName);
          logger.info(module, propertyName, `Completed in ${duration}ms`);
        } else {
          logger.debug(module, propertyName, `Completed successfully`);
        }
        
        return result;
      } catch (error) {
        logger.error(module, propertyName, `Failed with error: ${(error as Error).message}`, error as Error);
        
        if (timerStarted) {
          logger.endTimer(module, propertyName);
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Helper for safe async function logging
export function LogAsyncFunction(module: string, trackPerformance: boolean = false) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      logger.debug(module, propertyName, `Async call started with ${args.length} arguments`);
      
      let timerStarted = false;
      if (trackPerformance) {
        logger.startTimer(module, propertyName);
        timerStarted = true;
      }
      
      try {
        const result = await method.apply(this, args);
        
        if (timerStarted) {
          const duration = logger.endTimer(module, propertyName);
          logger.info(module, propertyName, `Async completed in ${duration}ms`);
        } else {
          logger.debug(module, propertyName, `Async completed successfully`);
        }
        
        return result;
      } catch (error) {
        logger.error(module, propertyName, `Async failed: ${(error as Error).message}`, error as Error);
        
        if (timerStarted) {
          logger.endTimer(module, propertyName);
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Development helper - only logs in development mode
export const devLogger = {
  debug: (module: string, func: string, message: string, data?: any) => {
    if (ENVIRONMENT.isDevelopment) {
      logger.debug(module, func, message, data);
    }
  },
  info: (module: string, func: string, message: string, data?: any) => {
    if (ENVIRONMENT.isDevelopment) {
      logger.info(module, func, message, data);
    }
  }
};

export default logger;// src/core/logger.ts
// Centralized logging system with module and function tracking

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  function: string;
  message: string;
  data?: any;
  error?: Error;
  performance?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
}

class Logger {
  private logs: LogEntry[] = [];
  private level: LogLevel = LogLevel.INFO;
  private maxLogs: number = 1000;
  private performanceTimers: Map<string, number> = new Map();

  setLevel(level: LogLevel) {
    this.level = level;
    this.log(LogLevel.INFO, 'Logger', 'setLevel', `Log level set to ${LogLevel[level]}`);
  }

  setMaxLogs(max: number) {
    this.maxLogs = max;
  }

  private log(level: LogLevel, module: string, func: string, message: string, data?: any, error?: Error) {
    if (level < this.level) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      function: func,
      message,
      data,
      error,
    };

    // Add to logs with rotation
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
    
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `[${timestamp}] [${levelNames[level]}] ${module}::${func}`;
    
    // Console output with appropriate method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LogLevel.INFO:
        console.log(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data || '', error || '');
        // Also send critical errors to Figma UI
        try {
          figma.ui.postMessage({
            type: 'error-log',
            error: {
              module,
              function: func,
              message,
              timestamp: entry.timestamp,
              stack: error?.stack,
            }
          });
        } catch (uiError) {
          console.error('Failed to send error to UI:', uiError);
        }
        break;
    }
  }

  debug(module: string, func: string, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, func, message, data);
  }

  info(module: string, func: string, message: string, data?: any) {
    this.log(LogLevel.INFO, module, func, message, data);
  }

  warn(module: string, func: string, message: string, data?: any) {
    this.log(LogLevel.WARN, module, func, message, data);
  }

  error(module: string, func: string, message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, module, func, message, data, error);
  }

  // Performance tracking
  startTimer(module: string, func: string): string {
    const key = `${module}::${func}`;
    const startTime = performance.now();
    this.performanceTimers.set(key, startTime);
    this.debug(module, func, 'Performance timer started');
    return key;
  }

  endTimer(module: string, func: string): number {
    const key = `${module}::${func}`;
    const startTime = this.performanceTimers.get(key);
    
    if (!startTime) {
      this.warn(module, func, 'No timer found for performance measurement');
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.performanceTimers.delete(key);
    this.debug(module, func, `Performance timer ended`, { duration: `${duration.toFixed(2)}ms` });
    
    return duration;
  }

  // Batch operations
  getLogs(filter?: { module?: string; level?: LogLevel; since?: number }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.module) {
        filteredLogs = filteredLogs.filter(log => log.module === filter.module);
      }
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
      }
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
      }
    }

    return filteredLogs;
  }

  getErrorSummary(): { module: string; function: string; count: number; lastError: string }[] {
    const errorCounts = new Map<string, { count: number; lastError: string }>();
    
    this.logs
      .filter(log => log.level === LogLevel.ERROR)
      .forEach(log => {
        const key = `${log.module}::${log.function}`;
        const existing = errorCounts.get(key) || { count: 0, lastError: '' };
        errorCounts.set(key, {
          count: existing.count + 1,
          lastError: log.message
        });
      });

    return Array.from(errorCounts.entries()).map(([key, data]) => {
      const [module, func] = key.split('::');
      return {
        module,
        function: func,
        count: data.count,
        lastError: data.lastError
      };
    });
  }

  exportLogs(): string {
    return JSON.stringify({
      logs: this.logs,
      summary: {
        totalLogs: this.logs.length,
        errorCount: this.logs.filter(l => l.level === LogLevel.ERROR).length,
        warnCount: this.logs.filter(l => l.level === LogLevel.WARN).length,
        timeRange: {
          start: this.logs[0]?.timestamp,
          end: this.logs[this.logs.length - 1]?.timestamp
        }
      },
      errorSummary: this.getErrorSummary()
    }, null, 2);
  }

  clearLogs() {
    const oldCount = this.logs.length;
    this.logs = [];
    this.info('Logger', 'clearLogs', `Cleared ${oldCount} logs`);
  }

  // Memory usage
  getMemoryUsage(): { logCount: number; estimatedSize: string } {
    const size = JSON.stringify(this.logs).length;
    return {
      logCount: this.logs.length,
      estimatedSize: `${(size / 1024).toFixed(2)}KB`
    };
  }
}

export const logger = new Logger();

// Decorator for automatic function logging with performance tracking
export function LogFunction(module: string, trackPerformance: boolean = false) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      logger.debug(module, propertyName, `Called with ${args.length} arguments`);
      
      let timerKey: string | undefined;
      if (trackPerformance) {
        timerKey = logger.startTimer(module, propertyName);
      }
      
      try {
        const result = method.apply(this, args);
        
        if (trackPerformance && timerKey) {
          const duration = logger.endTimer(module, propertyName);
          logger.info(module, propertyName, `Completed in ${duration.toFixed(2)}ms`);
        } else {
          logger.debug(module, propertyName, `Completed successfully`);
        }
        
        return result;
      } catch (error) {
        logger.error(module, propertyName, `Failed with error: ${(error as Error).message}`, error as Error);
        
        if (trackPerformance && timerKey) {
          logger.endTimer(module, propertyName);
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Helper for safe async function logging
export function LogAsyncFunction(module: string, trackPerformance: boolean = false) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      logger.debug(module, propertyName, `Async call started with ${args.length} arguments`);
      
      let timerKey: string | undefined;
      if (trackPerformance) {
        timerKey = logger.startTimer(module, propertyName);
      }
      
      try {
        const result = await method.apply(this, args);
        
        if (trackPerformance && timerKey) {
          const duration = logger.endTimer(module, propertyName);
          logger.info(module, propertyName, `Async completed in ${duration.toFixed(2)}ms`);
        } else {
          logger.debug(module, propertyName, `Async completed successfully`);
        }
        
        return result;
      } catch (error) {
        logger.error(module, propertyName, `Async failed: ${(error as Error).message}`, error as Error);
        
        if (trackPerformance && timerKey) {
          logger.endTimer(module, propertyName);
        }
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Development helper - only logs in development mode
export const devLogger = {
  debug: (module: string, func: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(module, func, message, data);
    }
  },
  info: (module: string, func: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      logger.info(module, func, message, data);
    }
  }
};

export default logger;