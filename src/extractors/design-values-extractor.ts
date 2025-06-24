// src/extractors/design-values-extractor.ts
// Extract design tokens from Figma with comprehensive analysis

import { BaseExtractor } from './base-extractor';
import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { ExtractedValues } from '@core/types';
import { safeGetNumber, isValidNumber } from '@utils/number-utils';
import { rgbToHex, getAllPages, findAllNodes } from '@utils/figma-helpers';

const MODULE_NAME = 'DesignValuesExtractor';

export class DesignValuesExtractor extends BaseExtractor {

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

      // Extract from all pages
      const allPages = getAllPages();
      
      allPages.forEach((page: any) => {
        try {
          logger.debug(MODULE_NAME, FUNC_NAME, `Processing page: ${page.name}`);
          const allNodes = findAllNodes(page);
          
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
        } catch (pageError) {
          logger.warn(MODULE_NAME, FUNC_NAME, `Error processing page ${page.name}:`, { error: pageError });
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
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'comprehensive design values extraction'
      });
      throw error;
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
      const cornerRadius = safeGetNumber(node.cornerRadius);
      
      return (
        width > 200 && height > 100 &&
        'children' in node && node.children && node.children.length > 1 &&
        (cornerRadius > 0 || ('effects' in node && node.effects && node.effects.length > 0))
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

  // Helper methods (delegate to utils)
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
}

export default DesignValuesExtractor;