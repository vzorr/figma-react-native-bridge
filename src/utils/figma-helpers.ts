// src/utils/figma-helpers.ts
// Safe Figma API helpers with Symbol handling

import { logger, LogFunction } from '@core/logger';
import { safeGetNumber, isValidNumber } from '@utils/number-utils';
import type { FigmaNode } from '@core/types';

const MODULE_NAME = 'FigmaHelpers';

/**
 * Safely convert RGB values to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const FUNC_NAME = 'rgbToHex';
  
  try {
    const toHex = (c: number): string => {
      const value = Math.round(safeGetNumber(c * 255));
      const hex = value.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    logger.debug(MODULE_NAME, FUNC_NAME, 'Converted RGB to hex', { r, g, b, hex });
    return hex;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'RGB to hex conversion failed:', error as Error, { r, g, b });
    return '#000000';
  }
}

/**
 * Safely get node background color
 */
export function getNodeBackgroundColor(node: any): string | null {
  const FUNC_NAME = 'getNodeBackgroundColor';
  
  try {
    if (!node || !('fills' in node) || !node.fills || !Array.isArray(node.fills)) {
      return null;
    }

    for (const fill of node.fills) {
      try {
        if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
          const { r, g, b } = fill.color;
          if (isValidNumber(r) && isValidNumber(g) && isValidNumber(b)) {
            const hex = rgbToHex(r, g, b);
            logger.debug(MODULE_NAME, FUNC_NAME, 'Found background color', { node: node.name, hex });
            return hex;
          }
        }
      } catch (fillError) {
        logger.warn(MODULE_NAME, FUNC_NAME, 'Error processing fill:', { error: fillError, node: node.name });
        continue;
      }
    }

    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting background color:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get node text color
 */
export function getNodeTextColor(node: any): string | null {
  const FUNC_NAME = 'getNodeTextColor';
  
  try {
    // Direct text node
    if (node.type === 'TEXT' && 'fills' in node && node.fills && Array.isArray(node.fills)) {
      for (const fill of node.fills) {
        try {
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
            const { r, g, b } = fill.color;
            if (isValidNumber(r) && isValidNumber(g) && isValidNumber(b)) {
              return rgbToHex(r, g, b);
            }
          }
        } catch (fillError) {
          continue;
        }
      }
    }
    
    // Search in children
    if ('children' in node && node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child.type === 'TEXT') {
          const color = getNodeTextColor(child);
          if (color) return color;
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting text color:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get node border color
 */
export function getNodeBorderColor(node: any): string | null {
  const FUNC_NAME = 'getNodeBorderColor';
  
  try {
    if (!node || !('strokes' in node) || !node.strokes || !Array.isArray(node.strokes)) {
      return null;
    }

    for (const stroke of node.strokes) {
      try {
        if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
          const { r, g, b } = stroke.color;
          if (isValidNumber(r) && isValidNumber(g) && isValidNumber(b)) {
            return rgbToHex(r, g, b);
          }
        }
      } catch (strokeError) {
        continue;
      }
    }

    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting border color:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get node font size
 */
export function getNodeFontSize(node: any): number | null {
  const FUNC_NAME = 'getNodeFontSize';
  
  try {
    if (node.type === 'TEXT' && isValidNumber(node.fontSize)) {
      return safeGetNumber(node.fontSize);
    }
    
    if ('children' in node && node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const fontSize = getNodeFontSize(child);
        if (fontSize) return fontSize;
      }
    }
    
    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting font size:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get node font weight
 */
export function getNodeFontWeight(node: any): string | null {
  const FUNC_NAME = 'getNodeFontWeight';
  
  try {
    if (node.type === 'TEXT' && node.fontName && typeof node.fontName === 'object') {
      // Avoid figma.mixed symbol
      if (node.fontName !== figma?.mixed && node.fontName.style && typeof node.fontName.style === 'string') {
        return node.fontName.style;
      }
    }
    
    if ('children' in node && node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const fontWeight = getNodeFontWeight(child);
        if (fontWeight) return fontWeight;
      }
    }
    
    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting font weight:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get node shadow
 */
export function getNodeShadow(node: any): string | null {
  const FUNC_NAME = 'getNodeShadow';
  
  try {
    if (!node || !('effects' in node) || !node.effects || !Array.isArray(node.effects)) {
      return null;
    }

    for (const effect of node.effects) {
      try {
        if (effect.type === 'DROP_SHADOW' && effect.visible && effect.radius > 0) {
          const x = safeGetNumber(effect.offset?.x, 0);
          const y = safeGetNumber(effect.offset?.y, 0);
          const radius = safeGetNumber(effect.radius, 0);
          
          if (effect.color && isValidNumber(effect.color.r)) {
            const color = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
            return `${x}px ${y}px ${radius}px ${color}`;
          }
        }
      } catch (effectError) {
        continue;
      }
    }

    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting shadow:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get node padding
 */
export function getNodePadding(node: any): { top: number; right: number; bottom: number; left: number } {
  const FUNC_NAME = 'getNodePadding';
  
  try {
    return {
      top: safeGetNumber(node.paddingTop, 0),
      right: safeGetNumber(node.paddingRight, 0),
      bottom: safeGetNumber(node.paddingBottom, 0),
      left: safeGetNumber(node.paddingLeft, 0),
    };
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting padding:', error as Error, { node: node?.name });
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

/**
 * Safely get node line height
 */
export function getNodeLineHeight(node: any): number | null {
  const FUNC_NAME = 'getNodeLineHeight';
  
  try {
    if (node.type === 'TEXT' && node.lineHeight && typeof node.lineHeight === 'object') {
      if (isValidNumber(node.lineHeight.value)) {
        return safeGetNumber(node.lineHeight.value);
      }
    }
    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting line height:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get node placeholder text
 */
export function getNodePlaceholder(node: any): string | null {
  const FUNC_NAME = 'getNodePlaceholder';
  
  try {
    if (node.type === 'TEXT' && node.characters && typeof node.characters === 'string') {
      return node.characters;
    }
    return null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting placeholder:', error as Error, { node: node?.name });
    return null;
  }
}

/**
 * Safely get semantic color name
 */
export function getSemanticColorName(hex: string): string | null {
  const FUNC_NAME = 'getSemanticColorName';
  
  try {
    const colorMappings: Record<string, string> = {
      '#FFFFFF': 'white',
      '#000000': 'black',
      '#FF0000': 'red',
      '#00FF00': 'green',
      '#0000FF': 'blue',
      '#FFC107': 'warning',
      '#28A745': 'success',
      '#DC3545': 'danger',
      '#007BFF': 'primary',
      '#6C757D': 'secondary',
      '#F8F9FA': 'light',
      '#343A40': 'dark'
    };
    
    const semantic = colorMappings[hex.toUpperCase()];
    if (semantic) {
      logger.debug(MODULE_NAME, FUNC_NAME, 'Found semantic color', { hex, semantic });
    }
    return semantic || null;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting semantic color:', error as Error, { hex });
    return null;
  }
}

/**
 * Safely sanitize name for code generation
 */
export function sanitizeName(name: string): string {
  const FUNC_NAME = 'sanitizeName';
  
  try {
    if (!name || typeof name !== 'string') {
      return 'component';
    }
    
    const sanitized = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, '_');
    
    return sanitized.toLowerCase() || 'component';
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error sanitizing name:', error as Error, { name });
    return 'component';
  }
}

/**
 * Check if node has fills
 */
export function hasFills(node: any): boolean {
  try {
    return 'fills' in node && node.fills && Array.isArray(node.fills) && node.fills.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if node has strokes
 */
export function hasStrokes(node: any): boolean {
  try {
    return 'strokes' in node && node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if node has effects
 */
export function hasEffects(node: any): boolean {
  try {
    return 'effects' in node && node.effects && Array.isArray(node.effects) && node.effects.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if node has multiple children
 */
export function hasMultipleChildren(node: any): boolean {
  try {
    return 'children' in node && node.children && Array.isArray(node.children) && node.children.length > 1;
  } catch (error) {
    return false;
  }
}

/**
 * Find text content in node hierarchy
 */
export function findTextInChildren(node: any): boolean {
  try {
    if (node.type === 'TEXT') return true;
    
    if (!node.children || !Array.isArray(node.children)) return false;
    
    return node.children.some((child: any) => 
      child.type === 'TEXT' || findTextInChildren(child)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Safely get all pages
 */
export function getAllPages(): any[] {
  const FUNC_NAME = 'getAllPages';
  
  try {
    if (!figma || !figma.root || !figma.root.children) {
      logger.warn(MODULE_NAME, FUNC_NAME, 'No Figma root or children available');
      return [];
    }
    
    const pages = figma.root.children.filter((node: any) => node.type === 'PAGE');
    logger.debug(MODULE_NAME, FUNC_NAME, `Found ${pages.length} pages`);
    return pages;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting pages:', error as Error);
    return [];
  }
}

/**
 * Safely get all frames from pages
 */
export function getAllFrames(): any[] {
  const FUNC_NAME = 'getAllFrames';
  
  try {
    const allPages = getAllPages();
    let allFrames: any[] = [];
    
    allPages.forEach((page: any) => {
      try {
        if (page.children && Array.isArray(page.children)) {
          const pageFrames = page.children.filter((node: any) => node.type === 'FRAME');
          allFrames = allFrames.concat(pageFrames);
          logger.debug(MODULE_NAME, FUNC_NAME, `Page ${page.name}: ${pageFrames.length} frames`);
        }
      } catch (pageError) {
        logger.warn(MODULE_NAME, FUNC_NAME, `Error processing page ${page.name}:`, { error: pageError });
      }
    });
    
    logger.info(MODULE_NAME, FUNC_NAME, `Total frames found: ${allFrames.length}`);
    return allFrames;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error getting frames:', error as Error);
    return [];
  }
}

/**
 * Safely find all nodes in a page
 */
export function findAllNodes(page: any): any[] {
  const FUNC_NAME = 'findAllNodes';
  
  try {
    if (!page || typeof page.findAll !== 'function') {
      logger.warn(MODULE_NAME, FUNC_NAME, 'Invalid page or no findAll method');
      return [];
    }
    
    const nodes = page.findAll();
    logger.debug(MODULE_NAME, FUNC_NAME, `Found ${nodes.length} nodes in page ${page.name}`);
    return nodes;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error finding nodes:', error as Error, { page: page?.name });
    return [];
  }
}

/**
 * Send progress update to UI
 */
export function sendProgress(progress: number): void {
  const FUNC_NAME = 'sendProgress';
  
  try {
    if (!figma || !figma.ui) {
      logger.warn(MODULE_NAME, FUNC_NAME, 'Figma UI not available');
      return;
    }
    
    figma.ui.postMessage({
      type: 'progress-update',
      progress: Math.min(100, Math.max(0, progress))
    });
    
    logger.debug(MODULE_NAME, FUNC_NAME, `Progress: ${progress}%`);
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error sending progress:', error as Error, { progress });
  }
}

export default {
  rgbToHex,
  getNodeBackgroundColor,
  getNodeTextColor,
  getNodeBorderColor,
  getNodeFontSize,
  getNodeFontWeight,
  getNodeShadow,
  getNodePadding,
  getNodeLineHeight,
  getNodePlaceholder,
  getSemanticColorName,
  sanitizeName,
  hasFills,
  hasStrokes,
  hasEffects,
  hasMultipleChildren,
  findTextInChildren,
  getAllPages,
  getAllFrames,
  findAllNodes,
  sendProgress
};