// src/utils/number-utils.ts
// Safe number operations to handle Figma's mixed values and Symbols

import { logger, LogFunction } from '@core/logger';

const MODULE_NAME = 'NumberUtils';

/**
 * Safely converts any value to a number, handling Figma's Symbol values
 * @param value - The value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns Safe numeric value
 */
export function safeGetNumber(value: any, defaultValue: number = 0): number {
  const FUNC_NAME = 'safeGetNumber';
  
  try {
    // Handle null/undefined
    if (value == null) {
      logger.debug(MODULE_NAME, FUNC_NAME, 'Null/undefined value, using default', { defaultValue });
      return defaultValue;
    }

    // Handle direct numbers
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        logger.debug(MODULE_NAME, FUNC_NAME, 'Invalid number (NaN/Infinity), using default', { value, defaultValue });
        return defaultValue;
      }
      return value;
    }

    // Handle Symbol values (figma.mixed)
    if (typeof value === 'symbol') {
      logger.debug(MODULE_NAME, FUNC_NAME, 'Symbol value detected, using default', { defaultValue });
      return defaultValue;
    }

    // Handle string numbers
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && isFinite(parsed)) {
        logger.debug(MODULE_NAME, FUNC_NAME, 'Parsed string to number', { value, parsed });
        return parsed;
      }
    }

    // Handle objects with numeric properties (like {value: 10})
    if (typeof value === 'object' && value !== null) {
      if ('value' in value && typeof value.value === 'number') {
        return safeGetNumber(value.value, defaultValue);
      }
      if ('width' in value && typeof value.width === 'number') {
        return safeGetNumber(value.width, defaultValue);
      }
      if ('height' in value && typeof value.height === 'number') {
        return safeGetNumber(value.height, defaultValue);
      }
    }

    logger.debug(MODULE_NAME, FUNC_NAME, 'Unhandled value type, using default', { 
      value, 
      type: typeof value, 
      defaultValue 
    });
    return defaultValue;
    
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error processing value:', error as Error, { value, defaultValue });
    return defaultValue;
  }
}

/**
 * Checks if a value is a valid finite number (not Symbol, NaN, or Infinity)
 */
export function isValidNumber(value: any): boolean {
  const FUNC_NAME = 'isValidNumber';
  
  try {
    const result = typeof value === 'number' && !isNaN(value) && isFinite(value);
    logger.debug(MODULE_NAME, FUNC_NAME, 'Validation result', { value, result, type: typeof value });
    return result;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Validation error:', error as Error, { value });
    return false;
  }
}

/**
 * Safely rounds a number to specified decimal places
 */
export function safeRound(value: any, decimals: number = 0): number {
  const FUNC_NAME = 'safeRound';
  
  try {
    const num = safeGetNumber(value);
    const multiplier = Math.pow(10, decimals);
    const rounded = Math.round(num * multiplier) / multiplier;
    
    logger.debug(MODULE_NAME, FUNC_NAME, 'Rounded number', { 
      original: value, 
      converted: num, 
      rounded, 
      decimals 
    });
    
    return rounded;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Rounding error:', error as Error, { value, decimals });
    return 0;
  }
}

/**
 * Clamps a number between min and max values
 */
export function clampNumber(value: any, min: number, max: number): number {
  const FUNC_NAME = 'clampNumber';
  
  try {
    const num = safeGetNumber(value);
    const clamped = Math.min(Math.max(num, min), max);
    
    logger.debug(MODULE_NAME, FUNC_NAME, 'Clamped number', { 
      original: value, 
      converted: num, 
      clamped, 
      min, 
      max 
    });
    
    return clamped;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Clamping error:', error as Error, { value, min, max });
    return min;
  }
}

/**
 * Safely gets integer value
 */
export function safeGetInteger(value: any, defaultValue: number = 0): number {
  const FUNC_NAME = 'safeGetInteger';
  
  try {
    const num = safeGetNumber(value, defaultValue);
    const integer = Math.round(num);
    
    logger.debug(MODULE_NAME, FUNC_NAME, 'Converted to integer', { 
      original: value, 
      number: num, 
      integer 
    });
    
    return integer;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Integer conversion error:', error as Error, { value, defaultValue });
    return defaultValue;
  }
}

/**
 * Gets percentage value (0-1) from various formats
 */
export function safeGetPercentage(value: any, defaultValue: number = 0): number {
  const FUNC_NAME = 'safeGetPercentage';
  
  try {
    const num = safeGetNumber(value, defaultValue);
    
    // If value is greater than 1, assume it's a percentage out of 100
    if (num > 1) {
      const percentage = num / 100;
      logger.debug(MODULE_NAME, FUNC_NAME, 'Converted percentage from 0-100 scale', { 
        original: value, 
        converted: percentage 
      });
      return clampNumber(percentage, 0, 1);
    }
    
    // Otherwise assume it's already 0-1
    return clampNumber(num, 0, 1);
    
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Percentage conversion error:', error as Error, { value, defaultValue });
    return defaultValue;
  }
}

/**
 * Batch process array of numeric values safely
 */
export function safeBatchNumbers(values: any[], defaultValue: number = 0): number[] {
  const FUNC_NAME = 'safeBatchNumbers';
  
  try {
    logger.debug(MODULE_NAME, FUNC_NAME, `Processing batch of ${values.length} values`);
    
    const results = values.map((value, index) => {
      try {
        return safeGetNumber(value, defaultValue);
      } catch (error) {
        logger.warn(MODULE_NAME, FUNC_NAME, `Error processing value at index ${index}:`, { value, error });
        return defaultValue;
      }
    });
    
    logger.debug(MODULE_NAME, FUNC_NAME, 'Batch processing complete', { 
      inputCount: values.length, 
      outputCount: results.length 
    });
    
    return results;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Batch processing error:', error as Error, { valuesLength: values?.length });
    return [];
  }
}

/**
 * Calculate statistics from array of numeric values
 */
export function calculateStats(values: any[]): {
  min: number;
  max: number;
  average: number;
  median: number;
  count: number;
} {
  const FUNC_NAME = 'calculateStats';
  
  try {
    const numbers = safeBatchNumbers(values).filter(isValidNumber);
    
    if (numbers.length === 0) {
      logger.warn(MODULE_NAME, FUNC_NAME, 'No valid numbers for statistics');
      return { min: 0, max: 0, average: 0, median: 0, count: 0 };
    }
    
    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    
    const stats = {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      average: sum / numbers.length,
      median: sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)],
      count: numbers.length
    };
    
    logger.debug(MODULE_NAME, FUNC_NAME, 'Statistics calculated', stats);
    return stats;
    
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Statistics calculation error:', error as Error);
    return { min: 0, max: 0, average: 0, median: 0, count: 0 };
  }
}

/**
 * Create safe numeric getter for object properties
 */
export function createSafeGetter(propertyName: string, defaultValue: number = 0) {
  return function(obj: any): number {
    const FUNC_NAME = `getSafe${propertyName}`;
    
    try {
      if (!obj || typeof obj !== 'object') {
        logger.debug(MODULE_NAME, FUNC_NAME, 'Invalid object, using default', { defaultValue });
        return defaultValue;
      }
      
      const value = obj[propertyName];
      return safeGetNumber(value, defaultValue);
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, `Error getting ${propertyName}:`, error as Error, { obj });
      return defaultValue;
    }
  };
}

// Pre-built safe getters for common Figma properties
export const safeGetWidth = createSafeGetter('width', 0);
export const safeGetHeight = createSafeGetter('height', 0);
export const safeGetX = createSafeGetter('x', 0);
export const safeGetY = createSafeGetter('y', 0);
export const safeGetCornerRadius = createSafeGetter('cornerRadius', 0);
export const safeGetOpacity = createSafeGetter('opacity', 1);
export const safeGetFontSize = createSafeGetter('fontSize', 16);

// Padding helpers
export const safeGetPadding = {
  top: createSafeGetter('paddingTop', 0),
  right: createSafeGetter('paddingRight', 0),
  bottom: createSafeGetter('paddingBottom', 0),
  left: createSafeGetter('paddingLeft', 0),
  all: (obj: any) => ({
    top: safeGetPadding.top(obj),
    right: safeGetPadding.right(obj),
    bottom: safeGetPadding.bottom(obj),
    left: safeGetPadding.left(obj),
  })
};

export default {
  safeGetNumber,
  isValidNumber,
  safeRound,
  clampNumber,
  safeGetInteger,
  safeGetPercentage,
  safeBatchNumbers,
  calculateStats,
  createSafeGetter,
  safeGetWidth,
  safeGetHeight,
  safeGetX,
  safeGetY,
  safeGetCornerRadius,
  safeGetOpacity,
  safeGetFontSize,
  safeGetPadding,
};