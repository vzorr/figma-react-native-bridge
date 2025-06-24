// src/extractors/color-extractor.ts
// Color extraction with safe Symbol handling

import { logger, LogFunction } from '@core/logger';
import { safeGetNumber, isValidNumber } from '@utils/number-utils';
import { rgbToHex, hasFills, hasStrokes } from '@utils/figma-helpers';

const MODULE_NAME = 'ColorExtractor';

export class ColorExtractor {
  
  @LogFunction(MODULE_NAME)
  extractFromNode(node: any, colors: Set<string>): void {
    this.extractFromFills(node, colors);
    this.extractFromStrokes(node, colors);
  }

  @LogFunction(MODULE_NAME)
  private extractFromFills(node: any, colors: Set<string>): void {
    if (!hasFills(node)) {
      return;
    }

    node.fills.forEach((fill: any, index: number) => {
      try {
        if (this.isValidSolidFill(fill)) {
          const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
          const opacity = safeGetNumber(fill.opacity, 1);
          
          if (opacity > 0.1) {
            colors.add(hex);
            logger.debug(MODULE_NAME, 'extractFromFills', `Added fill color: ${hex}`, { 
              opacity, 
              node: node.name,
              fillIndex: index 
            });
          }
        }
      } catch (fillError) {
        logger.warn(MODULE_NAME, 'extractFromFills', `Error processing fill ${index}:`, { 
          error: fillError, 
          node: node.name 
        });
      }
    });
  }

  @LogFunction(MODULE_NAME)
  private extractFromStrokes(node: any, colors: Set<string>): void {
    if (!hasStrokes(node)) {
      return;
    }

    node.strokes.forEach((stroke: any, index: number) => {
      try {
        if (this.isValidSolidStroke(stroke)) {
          const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
          colors.add(hex);
          logger.debug(MODULE_NAME, 'extractFromStrokes', `Added stroke color: ${hex}`, { 
            node: node.name,
            strokeIndex: index 
          });
        }
      } catch (strokeError) {
        logger.warn(MODULE_NAME, 'extractFromStrokes', `Error processing stroke ${index}:`, { 
          error: strokeError, 
          node: node.name 
        });
      }
    });
  }

  @LogFunction(MODULE_NAME)
  extractFromEffect(node: any, colors: Set<string>): void {
    if (!node || !('effects' in node) || !node.effects || !Array.isArray(node.effects)) {
      return;
    }

    node.effects.forEach((effect: any, index: number) => {
      try {
        if (this.isValidShadowEffect(effect)) {
          const hex = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
          colors.add(hex);
          logger.debug(MODULE_NAME, 'extractFromEffect', `Added effect color: ${hex}`, { 
            node: node.name,
            effectIndex: index,
            effectType: effect.type 
          });
        }
      } catch (effectError) {
        logger.warn(MODULE_NAME, 'extractFromEffect', `Error processing effect ${index}:`, { 
          error: effectError, 
          node: node.name 
        });
      }
    });
  }

  @LogFunction(MODULE_NAME)
  extractAllColors(nodes: any[]): Set<string> {
    const colors = new Set<string>();
    
    logger.info(MODULE_NAME, 'extractAllColors', `Processing ${nodes.length} nodes for color extraction`);
    
    nodes.forEach((node: any, index: number) => {
      try {
        if (node && node.visible !== false) {
          this.extractFromNode(node, colors);
          this.extractFromEffect(node, colors);
        }
      } catch (nodeError) {
        logger.warn(MODULE_NAME, 'extractAllColors', `Error processing node ${index}:`, { 
          error: nodeError,
          node: node?.name || 'unnamed'
        });
      }
    });
    
    logger.info(MODULE_NAME, 'extractAllColors', `Extracted ${colors.size} unique colors`);
    return colors;
  }

  @LogFunction(MODULE_NAME)
  categorizeColors(colors: Set<string>): {
    semantic: Record<string, string>;
    grays: Record<string, string>;
    accents: Record<string, string>;
  } {
    const result = {
      semantic: {} as Record<string, string>,
      grays: {} as Record<string, string>,
      accents: {} as Record<string, string>
    };

    const colorArray = Array.from(colors);
    let grayCount = 1;
    let accentCount = 1;

    colorArray.forEach(color => {
      const semantic = this.getSemanticColorName(color);
      
      if (semantic) {
        result.semantic[semantic] = color;
      } else if (this.isGrayColor(color)) {
        result.grays[`gray${grayCount}`] = color;
        grayCount++;
      } else {
        result.accents[`accent${accentCount}`] = color;
        accentCount++;
      }
    });

    logger.debug(MODULE_NAME, 'categorizeColors', 'Color categorization complete', {
      semanticCount: Object.keys(result.semantic).length,
      grayCount: Object.keys(result.grays).length,
      accentCount: Object.keys(result.accents).length
    });

    return result;
  }

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

  private getSemanticColorName(hex: string): string | null {
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
    
    return colorMappings[hex.toUpperCase()] || null;
  }

  private isGrayColor(hex: string): boolean {
    // Convert hex to RGB to check if it's grayscale
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      
      // Check if RGB values are close to each other (grayscale)
      const tolerance = 10;
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      
      return maxDiff <= tolerance;
    } catch (error) {
      return false;
    }
  }

  @LogFunction(MODULE_NAME)
  optimizeColorPalette(colors: Set<string>, maxColors: number = 20): Set<string> {
    if (colors.size <= maxColors) {
      return colors;
    }

    logger.info(MODULE_NAME, 'optimizeColorPalette', `Optimizing ${colors.size} colors to ${maxColors}`);

    const colorArray = Array.from(colors);
    const categorized = this.categorizeColors(colors);
    
    // Priority: semantic > frequently used > unique hues
    const prioritizedColors = [
      ...Object.values(categorized.semantic),
      ...Object.values(categorized.grays).slice(0, 5), // Keep most important grays
      ...Object.values(categorized.accents).slice(0, Math.max(1, maxColors - Object.keys(categorized.semantic).length - 5))
    ];

    const optimized = new Set(prioritizedColors.slice(0, maxColors));
    
    logger.info(MODULE_NAME, 'optimizeColorPalette', `Optimized to ${optimized.size} colors`);
    return optimized;
  }
}

export default ColorExtractor;