// src/extractors/hierarchy-css-extractor.ts
// Enhanced CSS extraction that preserves exact Figma layer hierarchy

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { safeGetNumber, isValidNumber } from '@utils/number-utils';
import { rgbToHex, getAllPages, findAllNodes } from '@utils/figma-helpers';

const MODULE_NAME = 'HierarchyCSSExtractor';

export interface CSSRule {
  selector: string;
  properties: Record<string, string>;
  children?: CSSRule[];
  figmaNode?: {
    id: string;
    name: string;
    type: string;
    layer: string;
  };
}

export interface HierarchyExtractionResult {
  cssRules: CSSRule[];
  cssText: string;
  scssText: string;
  reactNativeStyles: string;
  hierarchyMap: HierarchyNode[];
  totalNodes: number;
  extractedProperties: string[];
}

export interface HierarchyNode {
  id: string;
  name: string;
  type: string;
  depth: number;
  path: string[];
  parentId?: string;
  children: HierarchyNode[];
  cssClass: string;
  styles: Record<string, string>;
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class HierarchyCSSExtractor {

  @LogFunction(MODULE_NAME, true)
  extractHierarchicalCSS(selectedNodes?: any[]): HierarchyExtractionResult {
    const FUNC_NAME = 'extractHierarchicalCSS';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting hierarchical CSS extraction');
      
      // Get nodes to process - either selected or all frames
      const nodesToProcess = selectedNodes && selectedNodes.length > 0 
        ? selectedNodes 
        : this.getAllSelectableNodes();
      
      if (nodesToProcess.length === 0) {
        throw new Error('No nodes selected or found for CSS extraction');
      }

      logger.info(MODULE_NAME, FUNC_NAME, `Processing ${nodesToProcess.length} nodes`);

      // Build complete hierarchy map including all children
      const hierarchyMap = this.buildCompleteHierarchyMap(nodesToProcess);
      
      // Extract CSS rules maintaining hierarchy
      const cssRules = this.extractCSSFromHierarchy(hierarchyMap);
      
      // Generate different CSS formats
      const cssText = this.generateCSSText(cssRules);
      const scssText = this.generateSCSSText(cssRules);
      const reactNativeStyles = this.generateReactNativeStyles(cssRules);
      
      // Collect all extracted properties
      const extractedProperties = this.collectAllProperties(cssRules);
      
      const result: HierarchyExtractionResult = {
        cssRules,
        cssText,
        scssText,
        reactNativeStyles,
        hierarchyMap,
        totalNodes: this.countTotalNodes(hierarchyMap),
        extractedProperties
      };

      logger.info(MODULE_NAME, FUNC_NAME, 'Hierarchical CSS extraction complete', {
        totalNodes: result.totalNodes,
        cssRules: result.cssRules.length,
        properties: result.extractedProperties.length
      });

      return result;

    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'hierarchical CSS extraction'
      });
      throw error;
    }
  }

  @LogFunction(MODULE_NAME)
  private getAllSelectableNodes(): any[] {
    try {
      // Get from current selection first
      if (figma.currentPage.selection.length > 0) {
        return figma.currentPage.selection;
      }
      
      // Otherwise get all frames from current page
      return figma.currentPage.children.filter(node => 
        node.type === 'FRAME' || 
        node.type === 'COMPONENT' || 
        node.type === 'INSTANCE'
      );
    } catch (error) {
      logger.error(MODULE_NAME, 'getAllSelectableNodes', 'Error getting nodes:', error as Error);
      return [];
    }
  }

  @LogFunction(MODULE_NAME)
  private buildCompleteHierarchyMap(nodes: any[]): HierarchyNode[] {
    const FUNC_NAME = 'buildCompleteHierarchyMap';
    
    try {
      const hierarchyMap: HierarchyNode[] = [];
      const processedIds = new Set<string>();

      nodes.forEach(node => {
        if (!processedIds.has(node.id)) {
          const hierarchyNode = this.processNodeHierarchyRecursively(node, [], 0);
          if (hierarchyNode) {
            hierarchyMap.push(hierarchyNode);
            this.markProcessedIds(hierarchyNode, processedIds);
          }
        }
      });

      logger.debug(MODULE_NAME, FUNC_NAME, `Built hierarchy map with ${hierarchyMap.length} root nodes`);
      return hierarchyMap;

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error building hierarchy map:', error as Error);
      return [];
    }
  }

  @LogFunction(MODULE_NAME)
  private processNodeHierarchyRecursively(node: any, path: string[], depth: number): HierarchyNode | null {
    try {
      const currentPath = [...path, this.sanitizeClassName(node.name)];
      const cssClass = this.generateUniqueClassName(currentPath, depth);
      
      const hierarchyNode: HierarchyNode = {
        id: node.id,
        name: node.name,
        type: node.type,
        depth,
        path: currentPath,
        parentId: node.parent?.id,
        children: [],
        cssClass,
        styles: this.extractNodeStyles(node),
        dimensions: {
          x: safeGetNumber(node.x, 0),
          y: safeGetNumber(node.y, 0),
          width: safeGetNumber(node.width, 0),
          height: safeGetNumber(node.height, 0)
        }
      };

      // Process children recursively for ALL node types that can have children
      if (this.nodeCanHaveChildren(node) && node.children && Array.isArray(node.children)) {
        logger.debug(MODULE_NAME, 'processNodeHierarchyRecursively', 
          `Processing ${node.children.length} children for ${node.name}`);
        
        node.children.forEach((child: any) => {
          const childNode = this.processNodeHierarchyRecursively(child, currentPath, depth + 1);
          if (childNode) {
            hierarchyNode.children.push(childNode);
          }
        });
      }

      return hierarchyNode;

    } catch (error) {
      logger.warn(MODULE_NAME, 'processNodeHierarchyRecursively', 'Error processing node:', { 
        error, 
        node: node?.name 
      });
      return null;
    }
  }

  @LogFunction(MODULE_NAME)
  private nodeCanHaveChildren(node: any): boolean {
    // Comprehensive list of node types that can contain children
    const parentNodeTypes = [
      'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 
      'COMPONENT_SET', 'BOOLEAN_OPERATION', 'SECTION'
    ];
    
    return parentNodeTypes.includes(node.type);
  }

  @LogFunction(MODULE_NAME)
  private extractNodeStyles(node: any): Record<string, string> {
    const styles: Record<string, string> = {};

    try {
      // Position and Size - always extract dimensions
      styles.width = `${safeGetNumber(node.width)}px`;
      styles.height = `${safeGetNumber(node.height)}px`;
      
      // Position if available
      if (this.hasPositionData(node)) {
        styles.position = 'absolute';
        styles.left = `${safeGetNumber(node.x)}px`;
        styles.top = `${safeGetNumber(node.y)}px`;
      }

      // Background & Fills
      const backgroundColor = this.getNodeBackgroundColor(node);
      if (backgroundColor) {
        styles['background-color'] = backgroundColor;
      }

      // Border & Strokes
      const borderColor = this.getNodeBorderColor(node);
      if (borderColor) {
        styles['border-color'] = borderColor;
        const strokeWeight = safeGetNumber(node.strokeWeight, 1);
        styles['border-width'] = `${strokeWeight}px`;
        styles['border-style'] = 'solid';
      }

      // Border Radius
      if (this.hasCornerRadius(node)) {
        const cornerRadius = safeGetNumber(node.cornerRadius);
        if (cornerRadius > 0) {
          styles['border-radius'] = `${cornerRadius}px`;
        }
      }

      // Typography (for text nodes)
      if (node.type === 'TEXT') {
        this.extractTextStyles(node, styles);
      }

      // Layout Properties
      this.extractLayoutStyles(node, styles);

      // Effects (shadows, blur, etc.)
      this.extractEffectStyles(node, styles);

      // Opacity
      if (isValidNumber(node.opacity) && node.opacity < 1) {
        styles.opacity = node.opacity.toString();
      }

      // Visibility
      if (node.visible === false) {
        styles.display = 'none';
      }

      // Node type specific styles
      this.addNodeTypeSpecificStyles(node, styles);

    } catch (error) {
      logger.warn(MODULE_NAME, 'extractNodeStyles', 'Error extracting styles:', { 
        error, 
        node: node?.name 
      });
    }

    return styles;
  }

  private addNodeTypeSpecificStyles(node: any, styles: Record<string, string>): void {
    switch (node.type) {
      case 'TEXT':
        styles['white-space'] = 'pre-wrap';
        styles['word-wrap'] = 'break-word';
        break;
      case 'FRAME':
      case 'COMPONENT':
      case 'INSTANCE':
        styles.display = 'block';
        styles.position = 'relative';
        break;
      case 'GROUP':
        styles.display = 'block';
        break;
      case 'RECTANGLE':
      case 'ELLIPSE':
      case 'POLYGON':
        styles.display = 'block';
        break;
    }
  }

  private extractTextStyles(node: any, styles: Record<string, string>): void {
    try {
      // Font Size
      if (isValidNumber(node.fontSize)) {
        styles['font-size'] = `${safeGetNumber(node.fontSize)}px`;
      }

      // Font Family & Weight
      if (node.fontName && typeof node.fontName === 'object' && node.fontName !== figma?.mixed) {
        if (node.fontName.family) {
          styles['font-family'] = `"${node.fontName.family}", sans-serif`;
        }
        if (node.fontName.style) {
          styles['font-weight'] = this.mapFontWeight(node.fontName.style);
        }
      }

      // Text Color
      const textColor = this.getNodeTextColor(node);
      if (textColor) {
        styles.color = textColor;
      }

      // Text Alignment
      if (node.textAlignHorizontal) {
        styles['text-align'] = node.textAlignHorizontal.toLowerCase();
      }

      // Line Height
      if (node.lineHeight && typeof node.lineHeight === 'object') {
        if (node.lineHeight.unit === 'PIXELS') {
          styles['line-height'] = `${safeGetNumber(node.lineHeight.value)}px`;
        } else if (node.lineHeight.unit === 'PERCENT') {
          styles['line-height'] = `${safeGetNumber(node.lineHeight.value) / 100}`;
        }
      }

      // Letter Spacing
      if (node.letterSpacing && typeof node.letterSpacing === 'object') {
        styles['letter-spacing'] = `${safeGetNumber(node.letterSpacing.value)}px`;
      }

      // Text Decoration
      if (node.textDecoration && node.textDecoration !== 'NONE') {
        styles['text-decoration'] = node.textDecoration.toLowerCase().replace('_', '-');
      }

      // Text Content as CSS comment
      if (node.characters && typeof node.characters === 'string') {
        styles['/* content */'] = `"${node.characters.substring(0, 50)}${node.characters.length > 50 ? '...' : ''}"`;
      }

    } catch (error) {
      logger.warn(MODULE_NAME, 'extractTextStyles', 'Error extracting text styles:', { error });
    }
  }

  private extractLayoutStyles(node: any, styles: Record<string, string>): void {
    try {
      // Flexbox Layout
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        styles.display = 'flex';
        
        if (node.layoutMode === 'HORIZONTAL') {
          styles['flex-direction'] = 'row';
        } else if (node.layoutMode === 'VERTICAL') {
          styles['flex-direction'] = 'column';
        }

        // Alignment
        if (node.primaryAxisAlignItems) {
          styles['justify-content'] = this.mapAlignment(node.primaryAxisAlignItems);
        }
        if (node.counterAxisAlignItems) {
          styles['align-items'] = this.mapAlignment(node.counterAxisAlignItems);
        }

        // Gap/Item Spacing
        if (isValidNumber(node.itemSpacing) && node.itemSpacing > 0) {
          styles.gap = `${safeGetNumber(node.itemSpacing)}px`;
        }
      }

      // Padding
      if (this.hasPadding(node)) {
        const padding = this.getNodePadding(node);
        if (this.isUniformPadding(padding)) {
          styles.padding = `${padding.top}px`;
        } else {
          styles.padding = `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`;
        }
      }

      // Auto Layout Constraints
      if (node.layoutGrow && node.layoutGrow > 0) {
        styles['flex-grow'] = node.layoutGrow.toString();
      }

    } catch (error) {
      logger.warn(MODULE_NAME, 'extractLayoutStyles', 'Error extracting layout styles:', { error });
    }
  }

  private extractEffectStyles(node: any, styles: Record<string, string>): void {
    try {
      if (!('effects' in node) || !node.effects || !Array.isArray(node.effects)) {
        return;
      }

      const shadows: string[] = [];
      let blurValue = 0;

      node.effects.forEach((effect: any) => {
        if (!effect.visible) return;

        switch (effect.type) {
          case 'DROP_SHADOW':
          case 'INNER_SHADOW':
            const shadow = this.buildShadowString(effect);
            if (shadow) shadows.push(shadow);
            break;
            
          case 'LAYER_BLUR':
            blurValue = safeGetNumber(effect.radius);
            break;
        }
      });

      if (shadows.length > 0) {
        styles['box-shadow'] = shadows.join(', ');
      }

      if (blurValue > 0) {
        styles.filter = `blur(${blurValue}px)`;
      }

    } catch (error) {
      logger.warn(MODULE_NAME, 'extractEffectStyles', 'Error extracting effects:', { error });
    }
  }

  @LogFunction(MODULE_NAME)
  private extractCSSFromHierarchy(hierarchyMap: HierarchyNode[]): CSSRule[] {
    const cssRules: CSSRule[] = [];

    hierarchyMap.forEach(node => {
      const rule = this.createCSSRuleRecursively(node);
      cssRules.push(rule);
    });

    return cssRules;
  }

  private createCSSRuleRecursively(node: HierarchyNode): CSSRule {
    const rule: CSSRule = {
      selector: `.${node.cssClass}`,
      properties: { ...node.styles },
      figmaNode: {
        id: node.id,
        name: node.name,
        type: node.type,
        layer: node.path.join(' > ')
      }
    };

    // Process children recursively
    if (node.children.length > 0) {
      rule.children = node.children.map(child => this.createCSSRuleRecursively(child));
    }

    return rule;
  }

  @LogFunction(MODULE_NAME)
  private generateCSSText(cssRules: CSSRule[]): string {
    let css = `/* Generated CSS from Figma Hierarchy */\n/* Generated on: ${new Date().toISOString()} */\n\n`;
    
    const generateRuleCSS = (rule: CSSRule, depth: number = 0): string => {
      const indent = '  '.repeat(depth);
      let ruleCSS = `${indent}/* Layer: ${rule.figmaNode?.layer} (${rule.figmaNode?.type}) */\n`;
      ruleCSS += `${indent}${rule.selector} {\n`;
      
      // Add properties
      Object.entries(rule.properties).forEach(([property, value]) => {
        ruleCSS += `${indent}  ${property}: ${value};\n`;
      });
      
      ruleCSS += `${indent}}\n\n`;
      
      // Add children
      if (rule.children) {
        rule.children.forEach(child => {
          ruleCSS += generateRuleCSS(child, depth);
        });
      }
      
      return ruleCSS;
    };

    cssRules.forEach(rule => {
      css += generateRuleCSS(rule);
    });

    return css;
  }

  @LogFunction(MODULE_NAME)
  private generateSCSSText(cssRules: CSSRule[]): string {
    let scss = `/* Generated SCSS from Figma Hierarchy */\n/* Generated on: ${new Date().toISOString()} */\n\n`;
    
    const generateRuleSCSS = (rule: CSSRule, depth: number = 0): string => {
      const indent = '  '.repeat(depth);
      const className = rule.selector.replace('.', '');
      let ruleCSS = `${indent}/* Layer: ${rule.figmaNode?.layer} (${rule.figmaNode?.type}) */\n`;
      ruleCSS += `${indent}.${className} {\n`;
      
      // Add properties
      Object.entries(rule.properties).forEach(([property, value]) => {
        ruleCSS += `${indent}  ${property}: ${value};\n`;
      });
      
      // Add nested children
      if (rule.children) {
        rule.children.forEach(child => {
          const childClassName = child.selector.replace('.', '');
          ruleCSS += `\n${indent}  .${childClassName} {\n`;
          Object.entries(child.properties).forEach(([property, value]) => {
            ruleCSS += `${indent}    ${property}: ${value};\n`;
          });
          ruleCSS += `${indent}  }\n`;
        });
      }
      
      ruleCSS += `${indent}}\n\n`;
      
      return ruleCSS;
    };

    cssRules.forEach(rule => {
      scss += generateRuleSCSS(rule);
    });

    return scss;
  }

  @LogFunction(MODULE_NAME)
  private generateReactNativeStyles(cssRules: CSSRule[]): string {
    let rnStyles = `// Generated React Native Styles from Figma Hierarchy\n// Generated on: ${new Date().toISOString()}\n\nimport { StyleSheet } from 'react-native';\n\nexport const styles = StyleSheet.create({\n`;
    
    const convertCSSToRN = (properties: Record<string, string>): Record<string, any> => {
      const rnProps: Record<string, any> = {};
      
      Object.entries(properties).forEach(([prop, value]) => {
        const rnProp = this.convertCSSPropertyToRN(prop, value);
        if (rnProp) {
          rnProps[rnProp.property] = rnProp.value;
        }
      });
      
      return rnProps;
    };

    const generateStyleObject = (rule: CSSRule): void => {
      const rnProperties = convertCSSToRN(rule.properties);
      const styleName = rule.selector.replace('.', '');
      
      rnStyles += `  // Layer: ${rule.figmaNode?.layer} (${rule.figmaNode?.type})\n`;
      rnStyles += `  ${styleName}: {\n`;
      Object.entries(rnProperties).forEach(([prop, value]) => {
        const valueStr = typeof value === 'string' ? `'${value}'` : value;
        rnStyles += `    ${prop}: ${valueStr},\n`;
      });
      rnStyles += `  },\n\n`;
      
      // Process children
      if (rule.children) {
        rule.children.forEach(child => generateStyleObject(child));
      }
    };

    cssRules.forEach(rule => generateStyleObject(rule));
    
    rnStyles += `});\n\nexport default styles;`;
    
    return rnStyles;
  }

  // Helper methods implementation
  private sanitizeClassName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  private generateUniqueClassName(path: string[], depth: number): string {
    const baseName = path.join('-').toLowerCase();
    const timestamp = Date.now().toString(36);
    return `${baseName}-${depth}-${timestamp}`;
  }

  private countTotalNodes(hierarchyMap: HierarchyNode[]): number {
    let count = 0;
    const countRecursive = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        count++;
        if (node.children.length > 0) {
          countRecursive(node.children);
        }
      });
    };
    countRecursive(hierarchyMap);
    return count;
  }

  // Continue with helper methods...
  private hasPositionData(node: any): boolean {
    return isValidNumber(node.x) && isValidNumber(node.y);
  }

  private hasCornerRadius(node: any): boolean {
    return 'cornerRadius' in node && isValidNumber(node.cornerRadius);
  }

  private hasPadding(node: any): boolean {
    return ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
      .some(prop => prop in node && isValidNumber(node[prop]));
  }

  private getNodeBackgroundColor(node: any): string | null {
    try {
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
            return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private getNodeBorderColor(node: any): string | null {
    try {
      if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        for (const stroke of node.strokes) {
          if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
            return rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private getNodeTextColor(node: any): string | null {
    try {
      if (node.type === 'TEXT' && 'fills' in node && node.fills && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
            return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private getNodePadding(node: any): { top: number; right: number; bottom: number; left: number } {
    return {
      top: safeGetNumber(node.paddingTop, 0),
      right: safeGetNumber(node.paddingRight, 0),
      bottom: safeGetNumber(node.paddingBottom, 0),
      left: safeGetNumber(node.paddingLeft, 0),
    };
  }

  private isUniformPadding(padding: { top: number; right: number; bottom: number; left: number }): boolean {
    return padding.top === padding.right && 
           padding.right === padding.bottom && 
           padding.bottom === padding.left;
  }

  private mapFontWeight(figmaWeight: string): string {
    const weightMap: Record<string, string> = {
      'Thin': '100',
      'Extra Light': '200',
      'Light': '300',
      'Regular': '400',
      'Medium': '500',
      'Semi Bold': '600',
      'Bold': '700',
      'Extra Bold': '800',
      'Black': '900'
    };
    return weightMap[figmaWeight] || '400';
  }

  private mapAlignment(figmaAlignment: string): string {
    const alignmentMap: Record<string, string> = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between'
    };
    return alignmentMap[figmaAlignment] || 'flex-start';
  }

  private buildShadowString(effect: any): string | null {
    try {
      const x = safeGetNumber(effect.offset?.x, 0);
      const y = safeGetNumber(effect.offset?.y, 0);
      const blur = safeGetNumber(effect.radius, 0);
      const spread = safeGetNumber(effect.spread, 0);
      
      if (effect.color) {
        const color = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
        const alpha = safeGetNumber(effect.color.a, 1);
        
        let shadowString = `${x}px ${y}px ${blur}px`;
        if (spread !== 0) shadowString += ` ${spread}px`;
        
        if (alpha < 1) {
          const rgba = this.hexToRgba(color, alpha);
          shadowString += ` ${rgba}`;
        } else {
          shadowString += ` ${color}`;
        }
        
        if (effect.type === 'INNER_SHADOW') {
          shadowString += ' inset';
        }
        
        return shadowString;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private convertCSSPropertyToRN(property: string, value: string): { property: string; value: any } | null {
    const conversions: Record<string, string> = {
      'background-color': 'backgroundColor',
      'border-color': 'borderColor',
      'border-width': 'borderWidth',
      'border-radius': 'borderRadius',
      'font-size': 'fontSize',
      'font-family': 'fontFamily',
      'font-weight': 'fontWeight',
      'text-align': 'textAlign',
      'line-height': 'lineHeight',
      'letter-spacing': 'letterSpacing',
      'flex-direction': 'flexDirection',
      'justify-content': 'justifyContent',
      'align-items': 'alignItems',
      'flex-grow': 'flexGrow'
    };

    const rnProperty = conversions[property] || property;
    
    // Convert pixel values to numbers
    if (value.endsWith('px')) {
      const numValue = parseFloat(value);
      return { property: rnProperty, value: numValue };
    }
    
    // Convert other values
    return { property: rnProperty, value: value };
  }

  private collectAllProperties(cssRules: CSSRule[]): string[] {
    const properties = new Set<string>();
    
    const collectFromRule = (rule: CSSRule) => {
      Object.keys(rule.properties).forEach(prop => properties.add(prop));
      if (rule.children) {
        rule.children.forEach(child => collectFromRule(child));
      }
    };
    
    cssRules.forEach(rule => collectFromRule(rule));
    
    return Array.from(properties).sort();
  }

  private markProcessedIds(node: HierarchyNode, processedIds: Set<string>): void {
    processedIds.add(node.id);
    node.children.forEach(child => this.markProcessedIds(child, processedIds));
  }
}

export default HierarchyCSSExtractor;