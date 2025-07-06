// src/extractors/design-values-extractor.ts
// Extract design tokens from Figma - Fixed imports

import { logger, LogFunction } from '@core/logger';

const MODULE_NAME = 'DesignValuesExtractor';

// Simple safe number utility (avoiding import)
function safeGetNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
}

function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// RGB to Hex conversion
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Simple extracted values interface
interface ExtractedValues {
  colors: Set<string>;
  fontSizes: Set<number>;
  fontWeights: Set<string>;
  fontFamilies: Set<string>;
  borderRadius: Set<number>;
  spacing: Set<number>;
  shadows: Set<string>;
  opacity: Set<number>;
  buttons: any[];
  inputs: any[];
  headings: any[];
  labels: any[];
  cards: any[];
  navigationItems: any[];
}

export class DesignValuesExtractor {

  @LogFunction(MODULE_NAME, true)
  extractFromAllPages(): ExtractedValues {
    const FUNC_NAME = 'extractFromAllPages';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting comprehensive design values extraction');
      
      const values: ExtractedValues = {
        colors: new Set<string>(),
        fontSizes: new Set<number>(),
        fontWeights: new Set<string>(),
        fontFamilies: new Set<string>(),
        borderRadius: new Set<number>(),
        spacing: new Set<number>(),
        shadows: new Set<string>(),
        opacity: new Set<number>(),
        buttons: [],
        inputs: [],
        headings: [],
        labels: [],
        cards: [],
        navigationItems: []
      };

      // Extract from current page
      const allNodes = this.findAllNodes(figma.currentPage);
      
      allNodes.forEach((node: any) => {
        try {
          this.extractBasicTokens(node, values);
          this.extractSemanticComponents(node, values);
        } catch (nodeError) {
          // Skip problematic nodes silently
          logger.debug(MODULE_NAME, FUNC_NAME, 'Skipped problematic node', { 
            node: node?.name,
            error: nodeError 
          });
        }
      });

      logger.info(MODULE_NAME, FUNC_NAME, 'Extraction complete', {
        colors: values.colors.size,
        fontSizes: values.fontSizes.size,
        buttons: values.buttons.length,
        inputs: values.inputs.length
      });

      return values;
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error in extraction:', error as Error);
      throw error;
    }
  }

  // Implementation of the extract method
  extract(nodes: any[]): ExtractedValues {
    const values: ExtractedValues = {
      colors: new Set<string>(),
      fontSizes: new Set<number>(),
      fontWeights: new Set<string>(),
      fontFamilies: new Set<string>(),
      borderRadius: new Set<number>(),
      spacing: new Set<number>(),
      shadows: new Set<string>(),
      opacity: new Set<number>(),
      buttons: [],
      inputs: [],
      headings: [],
      labels: [],
      cards: [],
      navigationItems: []
    };

    nodes.forEach((node: any) => {
      try {
        this.extractBasicTokens(node, values);
        this.extractSemanticComponents(node, values);
      } catch (nodeError) {
        logger.debug(MODULE_NAME, 'extract', 'Skipped problematic node', { 
          node: node?.name,
          error: nodeError 
        });
      }
    });

    return values;
  }

  private findAllNodes(page: any): any[] {
    try {
      if (page && typeof page.findAll === 'function') {
        return page.findAll();
      }
      
      // Fallback: traverse manually
      const nodes: any[] = [];
      const traverse = (node: any) => {
        nodes.push(node);
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any) => traverse(child));
        }
      };
      
      if (page.children) {
        page.children.forEach((child: any) => traverse(child));
      }
      
      return nodes;
    } catch (error) {
      logger.error(MODULE_NAME, 'findAllNodes', 'Error finding nodes:', error as Error);
      return [];
    }
  }

  @LogFunction(MODULE_NAME)
  extractBasicTokens(node: any, values: ExtractedValues): void {
    const FUNC_NAME = 'extractBasicTokens';
    
    try {
      // Extract colors from fills and strokes
      this.extractColors(node, values);
      
      // Extract typography
      this.extractTypography(node, values);
      
      // Extract spacing
      this.extractSpacing(node, values);
      
      // Extract border radius
      this.extractBorderRadius(node, values);
      
      // Extract opacity
      this.extractOpacity(node, values);
      
      // Extract shadows
      this.extractShadows(node, values);
      
    } catch (error) {
      logger.debug(MODULE_NAME, FUNC_NAME, 'Error extracting basic tokens:', { 
        node: node?.name,
        error 
      });
    }
  }

  private extractColors(node: any, values: ExtractedValues): void {
    try {
      // Extract from fills
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach((fill: any) => {
          if (this.isValidSolidFill(fill)) {
            const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            const opacity = safeGetNumber(fill.opacity, 1);
            
            if (opacity > 0.1) {
              values.colors.add(hex);
            }
          }
        });
      }

      // Extract from strokes
      if (node.strokes && Array.isArray(node.strokes)) {
        node.strokes.forEach((stroke: any) => {
          if (this.isValidSolidStroke(stroke)) {
            const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
            values.colors.add(hex);
          }
        });
      }
    } catch (error) {
      // Skip problematic color extractions
    }
  }

  private extractTypography(node: any, values: ExtractedValues): void {
    try {
      if (node.type === 'TEXT' && node.visible !== false) {
        // Font size
        if (isValidNumber(node.fontSize) && node.fontSize >= 8 && node.fontSize <= 72) {
          values.fontSizes.add(Math.round(safeGetNumber(node.fontSize)));
        }

        // Font weight and family
        if (node.fontName && node.fontName !== figma?.mixed && typeof node.fontName === 'object') {
          if (node.fontName.style && typeof node.fontName.style === 'string') {
            values.fontWeights.add(node.fontName.style);
          }
          if (node.fontName.family && typeof node.fontName.family === 'string') {
            values.fontFamilies.add(node.fontName.family);
          }
        }
      }
    } catch (error) {
      // Skip problematic typography extractions
    }
  }

  private extractSpacing(node: any, values: ExtractedValues): void {
    try {
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        // Extract padding values
        ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].forEach(prop => {
          if (prop in node && isValidNumber(node[prop]) && node[prop] >= 0 && node[prop] <= 200) {
            values.spacing.add(Math.round(safeGetNumber(node[prop])));
          }
        });

        // Extract item spacing
        if ('itemSpacing' in node && isValidNumber(node.itemSpacing) && node.itemSpacing >= 0 && node.itemSpacing <= 200) {
          values.spacing.add(Math.round(safeGetNumber(node.itemSpacing)));
        }
      }
    } catch (error) {
      // Skip problematic spacing extractions
    }
  }

  private extractBorderRadius(node: any, values: ExtractedValues): void {
    try {
      if (('cornerRadius' in node || 'topLeftRadius' in node) && 
          (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'COMPONENT')) {
        
        if ('cornerRadius' in node && isValidNumber(node.cornerRadius) && node.cornerRadius >= 0 && node.cornerRadius <= 100) {
          values.borderRadius.add(Math.round(safeGetNumber(node.cornerRadius)));
        }
      }
    } catch (error) {
      // Skip problematic border radius extractions
    }
  }

  private extractShadows(node: any, values: ExtractedValues): void {
    try {
      if (node.effects && Array.isArray(node.effects)) {
        node.effects.forEach((effect: any) => {
          if (this.isValidShadowEffect(effect)) {
            const shadow = `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${rgbToHex(effect.color.r, effect.color.g, effect.color.b)}`;
            values.shadows.add(shadow);
          }
        });
      }
    } catch (error) {
      // Skip problematic shadow extractions
    }
  }

  private extractOpacity(node: any, values: ExtractedValues): void {
    try {
      if ('opacity' in node && isValidNumber(node.opacity) && node.opacity < 1 && node.opacity > 0.1) {
        const rounded = Math.round(node.opacity * 100) / 100;
        values.opacity.add(rounded);
      }
    } catch (error) {
      // Skip problematic opacity extractions
    }
  }

  @LogFunction(MODULE_NAME)
  extractSemanticComponents(node: any, values: ExtractedValues): void {
    const FUNC_NAME = 'extractSemanticComponents';
    
    try {
      const name = (node.name || '').toLowerCase();
      
      // Detect and extract different component types
      if (this.isButton(node, name)) {
        const buttonData = this.extractButtonData(node);
        if (buttonData) {
          values.buttons.push(buttonData);
          logger.debug(MODULE_NAME, FUNC_NAME, 'Extracted button', { name: node.name });
        }
      }
      
      if (this.isInputField(node, name)) {
        const inputData = this.extractInputData(node);
        if (inputData) {
          values.inputs.push(inputData);
          logger.debug(MODULE_NAME, FUNC_NAME, 'Extracted input', { name: node.name });
        }
      }
      
      if (this.isHeading(node, name)) {
        const headingData = this.extractHeadingData(node);
        if (headingData) {
          values.headings.push(headingData);
          logger.debug(MODULE_NAME, FUNC_NAME, 'Extracted heading', { name: node.name });
        }
      }
      
      if (this.isLabel(node, name)) {
        const labelData = this.extractLabelData(node);
        if (labelData) {
          values.labels.push(labelData);
          logger.debug(MODULE_NAME, FUNC_NAME, 'Extracted label', { name: node.name });
        }
      }
      
      if (this.isCard(node, name)) {
        const cardData = this.extractCardData(node);
        if (cardData) {
          values.cards.push(cardData);
          logger.debug(MODULE_NAME, FUNC_NAME, 'Extracted card', { name: node.name });
        }
      }
      
      if (this.isNavigationItem(node, name)) {
        const navData = this.extractNavigationData(node);
        if (navData) {
          values.navigationItems.push(navData);
          logger.debug(MODULE_NAME, FUNC_NAME, 'Extracted navigation', { name: node.name });
        }
      }
      
    } catch (error) {
      logger.debug(MODULE_NAME, FUNC_NAME, 'Error extracting semantic components:', { 
        node: node?.name,
        error 
      });
    }
  }

  // Component detection methods
  private isButton(node: any, name: string): boolean {
    return (
      name.includes('button') || 
      name.includes('btn') || 
      name.includes('cta') ||
      name.includes('action') ||
      name.includes('submit') ||
      name.includes('primary') ||
      name.includes('secondary') ||
      (node.type === 'COMPONENT' && this.hasButtonCharacteristics(node))
    );
  }

  private isInputField(node: any, name: string): boolean {
    return (
      name.includes('input') ||
      name.includes('field') ||
      name.includes('textbox') ||
      name.includes('text field') ||
      name.includes('form') ||
      name.includes('search') ||
      (node.type === 'FRAME' && this.hasInputCharacteristics(node))
    );
  }

  private isHeading(node: any, name: string): boolean {
    return (
      node.type === 'TEXT' && (
        name.includes('heading') ||
        name.includes('title') ||
        name.includes('h1') ||
        name.includes('h2') ||
        name.includes('h3') ||
        name.includes('header') ||
        (typeof node.fontSize === 'number' && node.fontSize >= 24)
      )
    );
  }

  private isLabel(node: any, name: string): boolean {
    return (
      node.type === 'TEXT' && (
        name.includes('label') ||
        name.includes('caption') ||
        name.includes('subtitle') ||
        name.includes('description') ||
        (typeof node.fontSize === 'number' && node.fontSize <= 14)
      )
    );
  }

  private isCard(node: any, name: string): boolean {
    return (
      name.includes('card') ||
      name.includes('item') ||
      name.includes('tile') ||
      name.includes('container') ||
      (node.type === 'FRAME' && this.hasCardCharacteristics(node))
    );
  }

  private isNavigationItem(node: any, name: string): boolean {
    return (
      name.includes('nav') ||
      name.includes('tab') ||
      name.includes('menu') ||
      name.includes('bar') ||
      name.includes('header') ||
      name.includes('footer')
    );
  }

  // Characteristic detection helpers
  private hasButtonCharacteristics(node: any): boolean {
    try {
      const width = safeGetNumber(node.width);
      const height = safeGetNumber(node.height);
      const cornerRadius = safeGetNumber(node.cornerRadius);
      
      return (
        cornerRadius > 0 &&
        'fills' in node && node.fills && node.fills.length > 0 &&
        width > 60 && height > 30 && height < 80
      );
    } catch (error) {
      return false;
    }
  }

  private hasInputCharacteristics(node: any): boolean {
    try {
      const width = safeGetNumber(node.width);
      const height = safeGetNumber(node.height);
      
      return (
        width > 100 && height > 30 && height < 60 &&
        'strokes' in node && node.strokes && node.strokes.length > 0
      );
    } catch (error) {
      return false;
    }
  }

  private hasCardCharacteristics(node: any): boolean {
    try {
      const width = safeGetNumber(node.width);
      const height = safeGetNumber(node.height);
      
      return (
        width > 200 && height > 100 &&
        'children' in node && node.children && node.children.length > 1 &&
        (safeGetNumber(node.cornerRadius) > 0 || ('effects' in node && node.effects && node.effects.length > 0))
      );
    } catch (error) {
      return false;
    }
  }

  // Data extraction methods
  private extractButtonData(node: any): any {
    try {
      return {
        type: 'button',
        name: node.name || 'Button',
        variant: this.getButtonVariant(node),
        backgroundColor: this.getNodeBackgroundColor(node),
        textColor: this.getNodeTextColor(node),
        borderRadius: safeGetNumber(node.cornerRadius),
        width: Math.round(safeGetNumber(node.width)),
        height: Math.round(safeGetNumber(node.height)),
        padding: this.getNodePadding(node),
        fontSize: this.getNodeFontSize(node),
        fontWeight: this.getNodeFontWeight(node),
        shadow: this.getNodeShadow(node)
      };
    } catch (error) {
      return null;
    }
  }

  private extractInputData(node: any): any {
    try {
      return {
        type: 'input',
        name: node.name || 'Input',
        backgroundColor: this.getNodeBackgroundColor(node),
        borderColor: this.getNodeBorderColor(node),
        borderRadius: safeGetNumber(node.cornerRadius),
        width: Math.round(safeGetNumber(node.width)),
        height: Math.round(safeGetNumber(node.height)),
        padding: this.getNodePadding(node),
        fontSize: this.getNodeFontSize(node),
        placeholder: this.getNodePlaceholder(node)
      };
    } catch (error) {
      return null;
    }
  }

  private extractHeadingData(node: any): any {
    try {
      return {
        type: 'heading',
        name: node.name || 'Heading',
        level: this.getHeadingLevel(node),
        fontSize: safeGetNumber(node.fontSize, 24),
        fontWeight: this.getNodeFontWeight(node),
        color: this.getNodeTextColor(node),
        lineHeight: this.getNodeLineHeight(node)
      };
    } catch (error) {
      return null;
    }
  }

  private extractLabelData(node: any): any {
    try {
      return {
        type: 'label',
        name: node.name || 'Label',
        fontSize: safeGetNumber(node.fontSize, 14),
        fontWeight: this.getNodeFontWeight(node),
        color: this.getNodeTextColor(node),
        opacity: safeGetNumber(node.opacity, 1)
      };
    } catch (error) {
      return null;
    }
  }

  private extractCardData(node: any): any {
    try {
      return {
        type: 'card',
        name: node.name || 'Card',
        backgroundColor: this.getNodeBackgroundColor(node),
        borderRadius: safeGetNumber(node.cornerRadius),
        padding: this.getNodePadding(node),
        shadow: this.getNodeShadow(node),
        width: Math.round(safeGetNumber(node.width)),
        height: Math.round(safeGetNumber(node.height))
      };
    } catch (error) {
      return null;
    }
  }

  private extractNavigationData(node: any): any {
    try {
      return {
        type: 'navigation',
        name: node.name || 'Navigation',
        backgroundColor: this.getNodeBackgroundColor(node),
        height: Math.round(safeGetNumber(node.height)),
        padding: this.getNodePadding(node)
      };
    } catch (error) {
      return null;
    }
  }

  // Helper methods
  private getNodeBackgroundColor(node: any): string | null {
    if ('fills' in node && node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      }
    }
    return null;
  }

  private getNodeTextColor(node: any): string | null {
    if (node.type === 'TEXT' && 'fills' in node && node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      }
    }
    return null;
  }

  private getNodeBorderColor(node: any): string | null {
    if ('strokes' in node && node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];
      if (stroke.type === 'SOLID' && stroke.color) {
        return rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
      }
    }
    return null;
  }

  private getNodePadding(node: any): any {
    return {
      top: safeGetNumber(node.paddingTop, 0),
      right: safeGetNumber(node.paddingRight, 0),
      bottom: safeGetNumber(node.paddingBottom, 0),
      left: safeGetNumber(node.paddingLeft, 0)
    };
  }

  private getNodeFontSize(node: any): number | null {
    if (node.type === 'TEXT' && isValidNumber(node.fontSize)) {
      return safeGetNumber(node.fontSize);
    }
    return null;
  }

  private getNodeFontWeight(node: any): string | null {
    try {
      if (node.type === 'TEXT' && node.fontName && node.fontName !== figma?.mixed && typeof node.fontName === 'object') {
        if (node.fontName.style && typeof node.fontName.style === 'string') {
          return node.fontName.style;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private getNodeShadow(node: any): string | null {
    if ('effects' in node && node.effects && node.effects.length > 0) {
      const shadow = node.effects.find((effect: any) => effect.type === 'DROP_SHADOW' && effect.visible);
      if (shadow) {
        return `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${rgbToHex(shadow.color.r, shadow.color.g, shadow.color.b)}`;
      }
    }
    return null;
  }

  private getNodeLineHeight(node: any): number | null {
    if (node.type === 'TEXT' && typeof node.lineHeight === 'object' && node.lineHeight?.value) {
      return safeGetNumber(node.lineHeight.value);
    }
    return null;
  }

  private getNodePlaceholder(node: any): string | null {
    if (node.type === 'TEXT' && node.characters) {
      return node.characters;
    }
    return null;
  }

  private getButtonVariant(node: any): string {
    const name = (node.name || '').toLowerCase();
    if (name.includes('primary')) return 'primary';
    if (name.includes('secondary')) return 'secondary';
    if (name.includes('outline')) return 'outline';
    if (name.includes('ghost')) return 'ghost';
    return 'primary';
  }

  private getHeadingLevel(node: any): number {
    const name = (node.name || '').toLowerCase();
    if (name.includes('h1') || name.includes('title')) return 1;
    if (name.includes('h2') || name.includes('subtitle')) return 2;
    if (name.includes('h3') || name.includes('heading')) return 3;
    
    const fontSize = safeGetNumber(node.fontSize, 16);
    if (fontSize >= 32) return 1;
    if (fontSize >= 24) return 2;
    if (fontSize >= 20) return 3;
    return 2;
  }

  // Validation helpers
  private isValidSolidFill(fill: any): boolean {
    return fill && 
           fill.type === 'SOLID' && 
           fill.color && 
           fill.visible !== false &&
           this.hasValidColorValues(fill.color);
  }

  private isValidSolidStroke(stroke: any): boolean {
    return stroke && 
           stroke.type === 'SOLID' && 
           stroke.color && 
           stroke.visible !== false &&
           this.hasValidColorValues(stroke.color);
  }

  private isValidShadowEffect(effect: any): boolean {
    return effect && 
           (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') && 
           effect.color && 
           effect.visible !== false &&
           this.hasValidColorValues(effect.color) &&
           safeGetNumber(effect.radius, 0) > 0;
  }

  private hasValidColorValues(color: any): boolean {
    return color &&
           isValidNumber(color.r) && 
           isValidNumber(color.g) && 
           isValidNumber(color.b) &&
           color.r >= 0 && color.r <= 1 &&
           color.g >= 0 && color.g <= 1 &&
           color.b >= 0 && color.b <= 1;
  }
}

export default DesignValuesExtractor;