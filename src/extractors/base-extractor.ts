// src/extractors/base-extractor.ts
// Base extractor class with common extraction utilities

import { logger, LogFunction } from '@core/logger';
import { safeGetNumber, isValidNumber } from '@utils/number-utils';
import { hasFills, hasStrokes, hasEffects, rgbToHex } from '@utils/figma-helpers';

const MODULE_NAME = 'BaseExtractor';

export abstract class BaseExtractor {

  @LogFunction(MODULE_NAME)
  protected extractFromNode(node: any, extractionTarget: any): void {
    try {
      this.extractColors(node, extractionTarget);
      this.extractTypography(node, extractionTarget);
      this.extractSpacing(node, extractionTarget);
      this.extractBorderRadius(node, extractionTarget);
      this.extractShadows(node, extractionTarget);
      this.extractOpacity(node, extractionTarget);
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractFromNode', 'Error extracting from node:', { 
        error, 
        node: node?.name || 'unnamed' 
      });
    }
  }

  @LogFunction(MODULE_NAME)
  protected extractColors(node: any, target: any): void {
    try {
      // Extract from fills
      if (hasFills(node)) {
        node.fills.forEach((fill: any) => {
          if (this.isValidSolidFill(fill)) {
            const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            const opacity = safeGetNumber(fill.opacity, 1);
            
            if (opacity > 0.1) {
              target.colors?.add(hex);
            }
          }
        });
      }

      // Extract from strokes
      if (hasStrokes(node)) {
        node.strokes.forEach((stroke: any) => {
          if (this.isValidSolidStroke(stroke)) {
            const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
            target.colors?.add(hex);
          }
        });
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractColors', 'Color extraction error:', { error, node: node?.name });
    }
  }

  @LogFunction(MODULE_NAME)
  protected extractTypography(node: any, target: any): void {
    try {
      if (node.type === 'TEXT' && node.visible !== false) {
        // Font size
        if (isValidNumber(node.fontSize) && node.fontSize >= 8 && node.fontSize <= 72) {
          target.fontSizes?.add(Math.round(safeGetNumber(node.fontSize)));
        }

        // Font weight and family
        if (node.fontName && node.fontName !== figma?.mixed && typeof node.fontName === 'object') {
          if (node.fontName.style && typeof node.fontName.style === 'string') {
            target.fontWeights?.add(node.fontName.style);
          }
          if (node.fontName.family && typeof node.fontName.family === 'string') {
            target.fontFamilies?.add(node.fontName.family);
          }
        }
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractTypography', 'Typography extraction error:', { error, node: node?.name });
    }
  }

  @LogFunction(MODULE_NAME)
  protected extractSpacing(node: any, target: any): void {
    try {
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        // Extract padding values
        ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].forEach(prop => {
          if (prop in node && isValidNumber(node[prop]) && node[prop] >= 0 && node[prop] <= 200) {
            target.spacing?.add(Math.round(safeGetNumber(node[prop])));
          }
        });

        // Extract item spacing
        if ('itemSpacing' in node && isValidNumber(node.itemSpacing) && node.itemSpacing >= 0 && node.itemSpacing <= 200) {
          target.spacing?.add(Math.round(safeGetNumber(node.itemSpacing)));
        }
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractSpacing', 'Spacing extraction error:', { error, node: node?.name });
    }
  }

  @LogFunction(MODULE_NAME)
  protected extractBorderRadius(node: any, target: any): void {
    try {
      if (('cornerRadius' in node || 'topLeftRadius' in node) && 
          (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'COMPONENT')) {
        
        if ('cornerRadius' in node && isValidNumber(node.cornerRadius) && node.cornerRadius >= 0 && node.cornerRadius <= 100) {
          target.borderRadius?.add(Math.round(safeGetNumber(node.cornerRadius)));
        }
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractBorderRadius', 'Border radius extraction error:', { error, node: node?.name });
    }
  }

  @LogFunction(MODULE_NAME)
  protected extractShadows(node: any, target: any): void {
    try {
      if (hasEffects(node)) {
        node.effects.forEach((effect: any) => {
          if (this.isValidShadowEffect(effect)) {
            const shadow = `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${rgbToHex(effect.color.r, effect.color.g, effect.color.b)}`;
            target.shadows?.add(shadow);
          }
        });
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractShadows', 'Shadow extraction error:', { error, node: node?.name });
    }
  }

  @LogFunction(MODULE_NAME)
  protected extractOpacity(node: any, target: any): void {
    try {
      if ('opacity' in node && isValidNumber(node.opacity) && node.opacity < 1 && node.opacity > 0.1) {
        const rounded = Math.round(node.opacity * 100) / 100;
        target.opacity?.add(rounded);
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractOpacity', 'Opacity extraction error:', { error, node: node?.name });
    }
  }

  // Validation helpers
  protected isValidSolidFill(fill: any): boolean {
    return fill && 
           fill.type === 'SOLID' && 
           fill.color && 
           fill.visible !== false &&
           this.hasValidColorValues(fill.color);
  }

  protected isValidSolidStroke(stroke: any): boolean {
    return stroke && 
           stroke.type === 'SOLID' && 
           stroke.color && 
           stroke.visible !== false &&
           this.hasValidColorValues(stroke.color);
  }

  protected isValidShadowEffect(effect: any): boolean {
    return effect && 
           (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') && 
           effect.color && 
           effect.visible !== false &&
           this.hasValidColorValues(effect.color) &&
           safeGetNumber(effect.radius, 0) > 0;
  }

  protected hasValidColorValues(color: any): boolean {
    return color &&
           isValidNumber(color.r) && 
           isValidNumber(color.g) && 
           isValidNumber(color.b) &&
           color.r >= 0 && color.r <= 1 &&
           color.g >= 0 && color.g <= 1 &&
           color.b >= 0 && color.b <= 1;
  }

  // Abstract methods to be implemented by derived classes
  abstract extract(nodes: any[]): any;
}

export default BaseExtractor;