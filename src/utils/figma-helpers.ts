// src/utils/figma-helpers.ts
// Enhanced Figma API helpers with complete hierarchy traversal support

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
 * Safely check for figma.mixed values
 */
export function isNotMixed(value: any): boolean {
  try {
    return typeof value !== 'symbol' && value !== figma?.mixed;
  } catch (error) {
    return value !== undefined && value !== null;
  }
}

/**
 * Get all pages from the document
 */
export function getAllPages(): any[] {
  const FUNC_NAME = 'getAllPages';
  
  try {
    // Try to access figma.root first (newer API)
    if (figma && 'root' in figma && figma.root && figma.root.children) {
      return figma.root.children.filter((node: any) => node.type === 'PAGE');
    }
    
    // Fallback to current page only if root is not available
    if (figma && figma.currentPage) {
      logger.warn(MODULE_NAME, 'getAllPages', 'figma.root not available, using current page only');
      return [figma.currentPage];
    }
    
    logger.error(MODULE_NAME, 'getAllPages', 'No Figma API access available');
    return [];
  } catch (error) {
    logger.error(MODULE_NAME, 'getAllPages', 'Error accessing Figma pages:', error as Error);
    return figma.currentPage ? [figma.currentPage] : [];
  }
}

/**
 * Get all frames from all pages
 */
export function getAllFrames(): any[] {
  const FUNC_NAME = 'getAllFrames';
  
  try {
    const allPages = getAllPages();
    let allFrames: any[] = [];
    
    allPages.forEach((page: any) => {
      try {
        if (page.children && Array.isArray(page.children)) {
          const pageFrames = page.children.filter((node: any) => 
            node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
          );
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
 * NEW: Find all nodes recursively in a page or node, including ALL children
 */
export function findAllNodesRecursively(rootNode: any): any[] {
  const FUNC_NAME = 'findAllNodesRecursively';
  
  try {
    const allNodes: any[] = [];
    
    const traverseNode = (node: any) => {
      try {
        allNodes.push(node);
        
        // Check if node can have children
        if (nodeCanHaveChildren(node) && node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any) => {
            traverseNode(child);
          });
        }
      } catch (nodeError) {
        logger.warn(MODULE_NAME, FUNC_NAME, `Error traversing node ${node?.name}:`, { error: nodeError });
      }
    };
    
    traverseNode(rootNode);
    
    logger.debug(MODULE_NAME, FUNC_NAME, `Found ${allNodes.length} total nodes in hierarchy`);
    return allNodes;
    
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error finding nodes recursively:', error as Error);
    return [];
  }
}

/**
 * NEW: Check if a node can have children
 */
export function nodeCanHaveChildren(node: any): boolean {
  if (!node || !node.type) return false;
  
  const parentNodeTypes = [
    'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 
    'COMPONENT_SET', 'BOOLEAN_OPERATION', 'SECTION',
    'PAGE', 'DOCUMENT'
  ];
  
  return parentNodeTypes.includes(node.type);
}

/**
 * Find all nodes in a page using the safe findAll method
 */
export function findAllNodes(page: any): any[] {
  const FUNC_NAME = 'findAllNodes';
  
  try {
    if (!page || typeof page.findAll !== 'function') {
      logger.warn(MODULE_NAME, FUNC_NAME, 'Invalid page or no findAll method, using recursive search');
      return findAllNodesRecursively(page);
    }
    
    const nodes = page.findAll();
    logger.debug(MODULE_NAME, FUNC_NAME, `Found ${nodes.length} nodes in page ${page.name}`);
    return nodes;
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error finding nodes:', error as Error, { page: page?.name });
    // Fallback to recursive search
    return findAllNodesRecursively(page);
  }
}

/**
 * NEW: Extract complete hierarchy from selected nodes or current page
 */
export function extractCompleteHierarchy(selectedNodes?: any[]): any[] {
  const FUNC_NAME = 'extractCompleteHierarchy';
  
  try {
    let rootNodes: any[] = [];
    
    if (selectedNodes && selectedNodes.length > 0) {
      rootNodes = selectedNodes;
      logger.info(MODULE_NAME, FUNC_NAME, `Using ${selectedNodes.length} selected nodes as roots`);
    } else {
      // Get all top-level frames from current page
      rootNodes = figma.currentPage.children.filter(node => 
        node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
      );
      logger.info(MODULE_NAME, FUNC_NAME, `Using ${rootNodes.length} frames from current page`);
    }
    
    // Extract complete hierarchy for each root node
    const allNodes: any[] = [];
    rootNodes.forEach(rootNode => {
      const hierarchyNodes = findAllNodesRecursively(rootNode);
      allNodes.push(...hierarchyNodes);
    });
    
    logger.info(MODULE_NAME, FUNC_NAME, `Extracted complete hierarchy: ${allNodes.length} total nodes`);
    return allNodes;
    
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error extracting complete hierarchy:', error as Error);
    return [];
  }
}

/**
 * Get node background color safely
 */
export function getNodeBackgroundColor(node: any): string | null {
  const FUNC_NAME = 'getNodeBackgroundColor';
  
  try {
    if (!node || !('fills' in node) || !node.fills || !Array.isArray(node.fills)) {
      return null;
    }

    for (const fill of node.fills) {
      try {
        if (fill.type === 'SOLID' && fill.color && fill.visible !== false && isNotMixed(fill.color)) {
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
 * Get node text color safely
 */
export function getNodeTextColor(node: any): string | null {
  const FUNC_NAME = 'getNodeTextColor';
  
  try {
    // Direct text node
    if (node.type === 'TEXT' && 'fills' in node && node.fills && Array.isArray(node.fills)) {
      for (const fill of node.fills) {
        try {
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false && isNotMixed(fill.color)) {
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
    if (nodeCanHaveChildren(node) && node.children && Array.isArray(node.children)) {
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
 * Get node border color safely
 */
export function getNodeBorderColor(node: any): string | null {
  const FUNC_NAME = 'getNodeBorderColor';
  
  try {
    if (!node || !('strokes' in node) || !node.strokes || !Array.isArray(node.strokes)) {
      return null;
    }

    for (const stroke of node.strokes) {
      try {
        if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false && isNotMixed(stroke.color)) {
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
 * Get node font size safely
 */
export function getNodeFontSize(node: any): number | null {
  const FUNC_NAME = 'getNodeFontSize';
  
  try {
    if (node.type === 'TEXT' && isValidNumber(node.fontSize) && isNotMixed(node.fontSize)) {
      return safeGetNumber(node.fontSize);
    }
    
    if (nodeCanHaveChildren(node) && node.children && Array.isArray(node.children)) {
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
 * Get node font weight safely
 */
export function getNodeFontWeight(node: any): string | null {
  const FUNC_NAME = 'getNodeFontWeight';
  
  try {
    if (node.type === 'TEXT' && node.fontName && typeof node.fontName === 'object') {
      // Avoid figma.mixed symbol
      if (isNotMixed(node.fontName) && node.fontName.style && typeof node.fontName.style === 'string') {
        return node.fontName.style;
      }
    }
    
    if (nodeCanHaveChildren(node) && node.children && Array.isArray(node.children)) {
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
 * Get node shadow safely
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
 * Get node padding safely
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
 * Get node line height safely
 */
export function getNodeLineHeight(node: any): number | null {
  const FUNC_NAME = 'getNodeLineHeight';
  
  try {
    if (node.type === 'TEXT' && node.lineHeight && typeof node.lineHeight === 'object' && isNotMixed(node.lineHeight)) {
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
 * Get node placeholder text
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
 * Get semantic color name from hex
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
 * Sanitize name for code generation
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
    return nodeCanHaveChildren(node) && node.children && Array.isArray(node.children) && node.children.length > 1;
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
    
    if (!nodeCanHaveChildren(node) || !node.children || !Array.isArray(node.children)) return false;
    
    return node.children.some((child: any) => 
      child.type === 'TEXT' || findTextInChildren(child)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Send progress update to UI
 */
export function sendProgress(progress: number, message?: string): void {
  const FUNC_NAME = 'sendProgress';
  
  try {
    if (!figma || !figma.ui) {
      logger.warn(MODULE_NAME, FUNC_NAME, 'Figma UI not available');
      return;
    }
    
    figma.ui.postMessage({
      type: 'PROGRESS_UPDATE',
      progress: Math.min(100, Math.max(0, progress)),
      message: message || `Progress: ${progress}%`
    });
    
    logger.debug(MODULE_NAME, FUNC_NAME, `Progress: ${progress}%`, { message });
  } catch (error) {
    logger.error(MODULE_NAME, FUNC_NAME, 'Error sending progress:', error as Error, { progress, message });
  }
}

/**
 * NEW: Count total nodes in a hierarchy
 */
export function countNodesInHierarchy(rootNodes: any[]): number {
  let count = 0;
  
  rootNodes.forEach(rootNode => {
    const allNodes = findAllNodesRecursively(rootNode);
    count += allNodes.length;
  });
  
  return count;
}

/**
 * NEW: Get node dimensions safely
 */
export function getNodeDimensions(node: any): { x: number; y: number; width: number; height: number } {
  return {
    x: safeGetNumber(node.x, 0),
    y: safeGetNumber(node.y, 0),
    width: safeGetNumber(node.width, 0),
    height: safeGetNumber(node.height, 0)
  };
}

export default {
  rgbToHex,
  isNotMixed,
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
  findAllNodesRecursively,
  nodeCanHaveChildren,
  extractCompleteHierarchy,
  sendProgress,
  countNodesInHierarchy,
  getNodeDimensions
};