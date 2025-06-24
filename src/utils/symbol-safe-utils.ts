// src/utils/symbol-safe-utils.ts
// Utilities for safely handling Figma's Symbol values and preventing serialization errors

import { logger } from '@core/logger';

const MODULE_NAME = 'SymbolSafeUtils';

/**
 * Safely serialize any object, removing Symbols and other non-serializable values
 */
export function safeSerialize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle Symbols (figma.mixed)
  if (typeof obj === 'symbol') {
    logger.debug(MODULE_NAME, 'safeSerialize', 'Converted Symbol to string representation');
    return '[Symbol]';
  }

  // Handle functions
  if (typeof obj === 'function') {
    return '[Function]';
  }

  // Handle BigInt
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle Errors
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack
    };
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => safeSerialize(item));
  }

  // Handle Dates
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle RegExp
  if (obj instanceof RegExp) {
    return obj.toString();
  }

  // Handle Objects
  if (typeof obj === 'object') {
    const result: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        try {
          const value = obj[key];
          
          // Skip Symbol values entirely
          if (typeof value === 'symbol') {
            logger.debug(MODULE_NAME, 'safeSerialize', `Skipped Symbol property: ${key}`);
            continue;
          }

          // Skip functions
          if (typeof value === 'function') {
            continue;
          }

          result[key] = safeSerialize(value);
        } catch (error) {
          logger.warn(MODULE_NAME, 'safeSerialize', `Failed to serialize property ${key}:`, { error });
          result[key] = '[Unserializable]';
        }
      }
    }
    
    return result;
  }

  return obj;
}

/**
 * Clean an object specifically for UI transmission, ensuring no Symbols leak through
 */
export function cleanForUI(obj: any): any {
  try {
    // First pass: safe serialize
    const serialized = safeSerialize(obj);
    
    // Second pass: JSON stringify and parse to ensure complete serialization
    const jsonString = JSON.stringify(serialized, (key, value) => {
      // Extra safety check for any remaining problematic values
      if (typeof value === 'symbol') {
        return '[Symbol]';
      }
      if (typeof value === 'function') {
        return '[Function]';
      }
      if (typeof value === 'undefined') {
        return null;
      }
      return value;
    });
    
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error(MODULE_NAME, 'cleanForUI', 'Failed to clean object for UI:', error as Error);
    return {
      error: 'Failed to serialize object',
      message: 'Object contained non-serializable values'
    };
  }
}

/**
 * Safely send message to UI with automatic Symbol cleaning
 */
export function safePostMessage(messageType: string, data: any): void {
  try {
    const cleanData = cleanForUI(data);
    const message = {
      type: messageType,
      data: cleanData
    };

    figma.ui.postMessage(message);
    logger.debug(MODULE_NAME, 'safePostMessage', `Sent message: ${messageType}`);
  } catch (error) {
    logger.error(MODULE_NAME, 'safePostMessage', 'Failed to send message to UI:', error as Error);
    
    // Fallback: send minimal error message
    try {
      figma.ui.postMessage({
        type: 'error',
        error: 'Failed to send data - serialization error'
      });
    } catch (fallbackError) {
      console.error('Complete UI communication failure:', fallbackError);
    }
  }
}

/**
 * Check if a value is safe to serialize (no Symbols, functions, etc.)
 */
export function isSafeToSerialize(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  const type = typeof value;
  
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return true;
  }

  if (type === 'symbol' || type === 'function' || type === 'bigint') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.every(item => isSafeToSerialize(item));
  }

  if (type === 'object') {
    try {
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          if (!isSafeToSerialize(value[key])) {
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  return false;
}

/**
 * Create a safe version of any object by removing problematic properties
 */
export function createSafeObject<T extends object>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const safe: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      try {
        const value = obj[key];
        
        if (isSafeToSerialize(value)) {
          safe[key] = value;
        } else if (typeof value === 'object' && value !== null) {
          // Recursively clean nested objects
          safe[key] = safeSerialize(value);
        }
        // Skip unsafe values entirely
      } catch (error) {
        logger.debug(MODULE_NAME, 'createSafeObject', `Skipped problematic property: ${key}`);
      }
    }
  }
  
  return safe;
}

/**
 * Safe array mapping that handles Symbol values
 */
export function safeArrayMap<T, U>(array: T[], mapper: (item: T, index: number) => U): U[] {
  if (!Array.isArray(array)) {
    return [];
  }

  const result: U[] = [];
  
  for (let i = 0; i < array.length; i++) {
    try {
      const item = array[i];
      
      // Skip Symbol values
      if (typeof item === 'symbol') {
        logger.debug(MODULE_NAME, 'safeArrayMap', `Skipped Symbol at index ${i}`);
        continue;
      }

      const mapped = mapper(item, i);
      
      // Only add if the result is serializable
      if (isSafeToSerialize(mapped)) {
        result.push(mapped);
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'safeArrayMap', `Error mapping item at index ${i}:`, { error });
    }
  }
  
  return result;
}

/**
 * Safely filter an array, handling Symbol values
 */
export function safeArrayFilter<T>(array: T[], predicate: (item: T, index: number) => boolean): T[] {
  if (!Array.isArray(array)) {
    return [];
  }

  const result: T[] = [];
  
  for (let i = 0; i < array.length; i++) {
    try {
      const item = array[i];
      
      // Skip Symbol values
      if (typeof item === 'symbol') {
        continue;
      }

      if (predicate(item, i)) {
        result.push(item);
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'safeArrayFilter', `Error filtering item at index ${i}:`, { error });
    }
  }
  
  return result;
}

/**
 * Create a deep clone of an object, removing all Symbol values
 */
export function deepCleanClone(obj: any): any {
  try {
    // Use safe serialization followed by JSON round-trip for deep cloning
    const serialized = safeSerialize(obj);
    return JSON.parse(JSON.stringify(serialized));
  } catch (error) {
    logger.error(MODULE_NAME, 'deepCleanClone', 'Failed to clone object:', error as Error);
    return null;
  }
}

export default {
  safeSerialize,
  cleanForUI,
  safePostMessage,
  isSafeToSerialize,
  createSafeObject,
  safeArrayMap,
  safeArrayFilter,
  deepCleanClone
};