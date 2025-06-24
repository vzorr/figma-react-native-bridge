// src/handlers/extract-values-handler.ts
// Handler for design values extraction using existing extraction logic

import { logger, LogFunction } from '../core/logger';
import { ErrorHandler } from '../core/error-handler';
import { sendProgress } from '../utils/figma-helpers';
import { MESSAGE_TYPES } from '../core/constants';

const MODULE_NAME = 'ExtractValuesHandler';

export default class ExtractValuesHandler {
  private log: typeof logger;

  constructor() {
    this.log = logger;
    this.log.info(MODULE_NAME, 'constructor', 'ExtractValuesHandler initialized');
  }

  @LogFunction(MODULE_NAME, true)
  async handle(options?: any): Promise<void> {
    const FUNC_NAME = 'handle';
    
    try {
      this.log.info(MODULE_NAME, FUNC_NAME, 'Starting design values extraction');
      sendProgress(10);
      
      // Use existing extraction logic from code.ts
      const extractedValues = this.extractDesignValues();
      sendProgress(50);
      
      const theme = this.generateTheme(extractedValues);
      sendProgress(80);
      
      // Generate proper theme file content using existing logic
      const themeFileContent = this.generateThemeFileContent(theme);
      
      sendProgress(100);
      
      const result = {
        extracted: {
          colors: Array.from(extractedValues.colors) as string[],
          fontSizes: Array.from(extractedValues.fontSizes) as number[],
          fontWeights: Array.from(extractedValues.fontWeights) as string[],
          fontFamilies: Array.from(extractedValues.fontFamilies) as string[],
          borderRadius: Array.from(extractedValues.borderRadius) as number[],
          spacing: Array.from(extractedValues.spacing) as number[],
          shadows: Array.from(extractedValues.shadows) as string[],
          opacity: Array.from(extractedValues.opacity) as number[]
        },
        theme: theme,
        fileContent: themeFileContent
      };
      
      this.log.info(MODULE_NAME, FUNC_NAME, 'Design values extraction complete');
      
      figma.ui.postMessage({
        type: MESSAGE_TYPES.EXTRACTION_COMPLETE,
        data: result
      });
      
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'design values extraction'
      });
      throw error;
    }
  }

  // Use existing extraction logic from code.ts
  private extractDesignValues() {
    const values = {
      colors: new Set<string>(),
      fontSizes: new Set<number>(),
      fontWeights: new Set<string>(),
      fontFamilies: new Set<string>(),
      borderRadius: new Set<number>(),
      spacing: new Set<number>(),
      shadows: new Set<string>(),
      opacity: new Set<number>(),
      buttons: [] as any[],
      inputs: [] as any[],
      headings: [] as any[],
      labels: [] as any[],
      cards: [] as any[],
      navigationItems: [] as any[]
    };

    const allNodes = figma.currentPage.findAll();

    allNodes.forEach((node: any) => {
      try {
        this.extractBasicTokens(node, values);
        this.extractSemanticComponents(node, values);
      } catch (error) {
        this.log.warn(MODULE_NAME, 'extractDesignValues', 'Skipped problematic node:', { 
          node: node.name, 
          error 
        });
      }
    });

    return values;
  }

  // Extract basic design tokens (from existing code.ts logic)
  private extractBasicTokens(node: any, values: any): void {
    try {
      // Extract colors from fills and strokes
      if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        node.fills.forEach((fill: any) => {
          try {
            if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
              const hex = this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
              if (fill.opacity === undefined || fill.opacity > 0.1) {
                values.colors.add(hex);
              }
            }
          } catch (fillError) {
            // Skip problematic fills
          }
        });
      }

      if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        node.strokes.forEach((stroke: any) => {
          try {
            if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
              const hex = this.rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
              values.colors.add(hex);
            }
          } catch (strokeError) {
            // Skip problematic strokes
          }
        });
      }

      // Extract typography with safe checks
      if (node.type === 'TEXT' && node.visible !== false) {
        try {
          if (typeof node.fontSize === 'number' && node.fontSize >= 8 && node.fontSize <= 72) {
            values.fontSizes.add(Math.round(node.fontSize));
          }
          
          // Safe check for fontName (avoiding mixed symbols)
          if (node.fontName && node.fontName !== figma.mixed && typeof node.fontName === 'object') {
            if (node.fontName.style && typeof node.fontName.style === 'string') {
              values.fontWeights.add(node.fontName.style);
            }
            if (node.fontName.family && typeof node.fontName.family === 'string') {
              values.fontFamilies.add(node.fontName.family);
            }
          }
        } catch (textError) {
          // Skip problematic text properties
        }
      }

      // Extract spacing with safe property access
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].forEach(prop => {
          try {
            if (prop in node && this.isValidNumber(node[prop]) && node[prop] >= 0 && node[prop] <= 200) {
              values.spacing.add(Math.round(node[prop]));
            }
          } catch (paddingError) {
            // Skip problematic padding
          }
        });
        
        try {
          if ('itemSpacing' in node && this.isValidNumber(node.itemSpacing) && node.itemSpacing >= 0 && node.itemSpacing <= 200) {
            values.spacing.add(Math.round(node.itemSpacing));
          }
        } catch (spacingError) {
          // Skip problematic spacing
        }
      }

      if (('cornerRadius' in node || 'topLeftRadius' in node) && 
          (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'COMPONENT')) {
        try {
          if ('cornerRadius' in node && this.isValidNumber(node.cornerRadius) && node.cornerRadius >= 0 && node.cornerRadius <= 100) {
            values.borderRadius.add(Math.round(node.cornerRadius));
          }
        } catch (radiusError) {
          // Skip problematic radius
        }
      }

      if ('opacity' in node && this.isValidNumber(node.opacity) && node.opacity < 1 && node.opacity > 0.1) {
        try {
          const rounded = Math.round(node.opacity * 100) / 100;
          values.opacity.add(rounded);
        } catch (opacityError) {
          // Skip problematic opacity
        }
      }

      if ('effects' in node && node.effects && Array.isArray(node.effects)) {
        node.effects.forEach((effect: any) => {
          try {
            if (effect.type === 'DROP_SHADOW' && effect.visible && effect.radius > 0) {
              const shadow = `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${this.rgbToHex(effect.color.r, effect.color.g, effect.color.b)}`;
              values.shadows.add(shadow);
            }
          } catch (effectError) {
            // Skip problematic effects
          }
        });
      }
    } catch (error) {
      this.log.warn(MODULE_NAME, 'extractBasicTokens', 'Skipped node:', { node: node.name });
    }
  }

  // Extract semantic components (simplified from existing logic)
  private extractSemanticComponents(node: any, values: any): void {
    const name = node.name.toLowerCase();
    
    if (this.isButton(node, name)) {
      const buttonData = this.extractButtonData(node);
      if (buttonData) {
        values.buttons.push(buttonData);
      }
    }
    
    if (this.isInputField(node, name)) {
      const inputData = this.extractInputData(node);
      if (inputData) {
        values.inputs.push(inputData);
      }
    }
    
    if (this.isHeading(node, name)) {
      const headingData = this.extractHeadingData(node);
      if (headingData) {
        values.headings.push(headingData);
      }
    }
  }

  // Component detection methods (from existing code.ts)
  private isButton(node: any, name: string): boolean {
    return (
      name.includes('button') || 
      name.includes('btn') || 
      name.includes('cta') ||
      name.includes('action') ||
      (node.type === 'COMPONENT' && this.hasButtonCharacteristics(node))
    );
  }

  private isInputField(node: any, name: string): boolean {
    return (
      name.includes('input') ||
      name.includes('field') ||
      name.includes('textbox') ||
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
        (typeof node.fontSize === 'number' && node.fontSize >= 24)
      )
    );
  }

  // Helper methods (from existing code.ts)
  private hasButtonCharacteristics(node: any): boolean {
    try {
      const width = this.safeGetNumber(node.width);
      const height = this.safeGetNumber(node.height);
      const cornerRadius = this.safeGetNumber(node.cornerRadius);
      
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
      const width = this.safeGetNumber(node.width);
      const height = this.safeGetNumber(node.height);
      
      return (
        width > 100 && height > 30 && height < 60 &&
        'strokes' in node && node.strokes && node.strokes.length > 0
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
        backgroundColor: this.getNodeBackgroundColor(node),
        width: Math.round(this.safeGetNumber(node.width)),
        height: Math.round(this.safeGetNumber(node.height)),
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
        width: Math.round(this.safeGetNumber(node.width)),
        height: Math.round(this.safeGetNumber(node.height)),
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
        fontSize: this.safeGetNumber(node.fontSize, 24),
        color: this.getNodeTextColor(node),
      };
    } catch (error) {
      return null;
    }
  }

  // Use existing theme generation logic from code.ts
  private generateTheme(values: any) {
    const basicTheme = this.generateBasicTokens(values);
    const componentTokens = this.generateComponentTokens(values);
    
    return {
      ...basicTheme,
      components: componentTokens
    };
  }

  // Generate basic tokens (from existing code.ts)
  private generateBasicTokens(values: any) {
    const colorsArray = Array.from(values.colors) as string[];
    const colors: any = { transparent: 'transparent' };
    
    // Better color organization
    const sortedColors = colorsArray.sort();
    let primaryAssigned = false;
    
    sortedColors.forEach((color: string, index: number) => {
      const semanticName = this.getSemanticColorName(color);
      if (semanticName) {
        colors[semanticName] = color;
        if (semanticName === 'primary' || semanticName === 'blue') {
          primaryAssigned = true;
        }
      } else {
        const rgb = color.toLowerCase();
        if (rgb === '#ffffff' || (rgb.startsWith('#f') && rgb.slice(1).split('').every(c => parseInt(c, 16) >= 12))) {
          colors[`gray${Object.keys(colors).filter(k => k.startsWith('gray')).length + 1}`] = color;
        } else if (rgb === '#000000' || (rgb.startsWith('#0') || rgb.startsWith('#1') || rgb.startsWith('#2'))) {
          colors[`gray${Object.keys(colors).filter(k => k.startsWith('gray')).length + 9}`] = color;
        } else if (!primaryAssigned && index === 0) {
          colors.primary = color;
          primaryAssigned = true;
        } else {
          colors[`accent${Object.keys(colors).filter(k => k.startsWith('accent')).length + 1}`] = color;
        }
      }
    });

    if (!colors.primary && !colors.blue) {
      colors.primary = colors.accent1 || '#007AFF';
    }

    return {
      colors,
      typography: this.generateTypographyTokens(values),
      spacing: this.generateSpacingTokens(values),
      borderRadius: this.generateBorderRadiusTokens(values),
      shadows: this.generateShadowTokens(values),
      opacity: this.generateOpacityTokens(values)
    };
  }

  private generateComponentTokens(values: any) {
    const componentTokens: any = {};
    
    if (values.buttons && values.buttons.length > 0) {
      componentTokens.button = { variants: {} };
    }
    
    return componentTokens;
  }

  // Generate theme file content (from existing code.ts)
  private generateThemeFileContent(theme: any): string {
    const cleanTheme = {
      colors: theme.colors || {},
      typography: theme.typography || {},
      spacing: theme.spacing || {},
      borderRadius: theme.borderRadius || {},
      shadows: theme.shadows || {},
      opacity: theme.opacity || {},
      components: theme.components || {}
    };

    return `// theme/index.ts - Generated Design System from Figma

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling
const scale = (size: number): number => (width / 375) * size;
const verticalScale = (size: number): number => (height / 812) * size;
const moderateScale = (size: number, factor: number = 0.5): number => 
  size + (scale(size) - size) * factor;

export const COLORS = ${this.safeStringify(cleanTheme.colors)};

export const TYPOGRAPHY = ${this.safeStringify(cleanTheme.typography)};

export const SPACING = ${this.safeStringify(cleanTheme.spacing)};

export const BORDER_RADIUS = ${this.safeStringify(cleanTheme.borderRadius)};

export const SHADOWS = ${this.safeStringify(cleanTheme.shadows)};

export const OPACITY = ${this.safeStringify(cleanTheme.opacity)};

// Responsive utilities
export const responsive = {
  font: (size: keyof typeof TYPOGRAPHY.fontSize) => moderateScale(TYPOGRAPHY.fontSize[size] || 14, 0.3),
  space: (size: keyof typeof SPACING) => scale(SPACING[size] || 0),
  radius: (size: keyof typeof BORDER_RADIUS) => scale(BORDER_RADIUS[size] || 0),
};

export default {
  COLORS,
  TYPOGRAPHY, 
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  OPACITY,
  responsive,
};`;
  }

  // Helper utility methods
  private generateTypographyTokens(values: any) {
    const fontSizesArray = (Array.from(values.fontSizes) as number[])
      .filter(size => size >= 10 && size <= 64)
      .sort((a, b) => a - b);
      
    const fontSize: any = {};
    fontSizesArray.forEach((size: number) => {
      if (size <= 12) fontSize.xs = size;
      else if (size <= 14) fontSize.sm = size;
      else if (size <= 16) fontSize.base = size;
      else if (size <= 18) fontSize.lg = size;
      else if (size <= 20) fontSize.xl = size;
      else if (size <= 24) fontSize['2xl'] = size;
      else fontSize['3xl'] = size;
    });

    if (!fontSize.xs) fontSize.xs = 12;
    if (!fontSize.sm) fontSize.sm = 14;
    if (!fontSize.base) fontSize.base = 16;
    if (!fontSize.lg) fontSize.lg = 18;

    return { 
      fontSize,
      fontWeight: {
        light: '300',
        normal: '400', 
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900'
      }
    };
  }

  private generateSpacingTokens(values: any) {
    const spacingArray = (Array.from(values.spacing) as number[])
      .filter(s => s >= 0 && s <= 128)
      .sort((a, b) => a - b);
      
    const spacing: any = { none: 0, px: 1 };
    spacingArray.forEach((space: number) => {
      if (space === 0) return;
      if (space <= 2) spacing.px = space;
      else if (space <= 4) spacing.xs = space;
      else if (space <= 8) spacing.sm = space;
      else if (space <= 12) spacing.md = space;
      else if (space <= 16) spacing.lg = space;
      else if (space <= 24) spacing.xl = space;
      else spacing['2xl'] = space;
    });

    if (!spacing.xs) spacing.xs = 4;
    if (!spacing.sm) spacing.sm = 8;
    if (!spacing.md) spacing.md = 16;
    if (!spacing.lg) spacing.lg = 24;

    return spacing;
  }

  private generateBorderRadiusTokens(values: any) {
    const borderRadiusArray = (Array.from(values.borderRadius) as number[])
      .filter(r => r >= 0 && r <= 50)
      .sort((a, b) => a - b);
      
    const borderRadius: any = { none: 0 };
    borderRadiusArray.forEach((radius: number) => {
      if (radius === 0) return;
      if (radius <= 2) borderRadius.sm = radius;
      else if (radius <= 4) borderRadius.md = radius;
      else if (radius <= 8) borderRadius.lg = radius;
      else if (radius <= 12) borderRadius.xl = radius;
      else borderRadius['2xl'] = radius;
    });

    if (!borderRadius.sm) borderRadius.sm = 2;
    if (!borderRadius.md) borderRadius.md = 4;
    if (!borderRadius.lg) borderRadius.lg = 8;

    return borderRadius;
  }

  private generateShadowTokens(values: any) {
    const shadowsArray = Array.from(values.shadows) as string[];
    const shadows: any = {};
    shadowsArray.forEach((shadow: string, index: number) => {
      if (index === 0) shadows.sm = shadow;
      else if (index === 1) shadows.md = shadow;
      else if (index === 2) shadows.lg = shadow;
      else shadows[`shadow${index + 1}`] = shadow;
    });

    if (Object.keys(shadows).length === 0) {
      shadows.sm = '0px 1px 2px rgba(0, 0, 0, 0.1)';
      shadows.md = '0px 2px 4px rgba(0, 0, 0, 0.1)';
      shadows.lg = '0px 4px 8px rgba(0, 0, 0, 0.1)';
    }

    return shadows;
  }

  private generateOpacityTokens(values: any) {
    const opacityArray = (Array.from(values.opacity) as number[]).sort((a, b) => a - b);
    const opacity: any = {};
    opacityArray.forEach((opacityValue: number) => {
      const percentage = Math.round(opacityValue * 100);
      if (percentage === 10) opacity.disabled = opacityValue;
      else if (percentage === 25) opacity.low = opacityValue;
      else if (percentage === 50) opacity.medium = opacityValue;
      else if (percentage === 75) opacity.high = opacityValue;
      else opacity[`opacity${percentage}`] = opacityValue;
    });

    if (Object.keys(opacity).length === 0) {
      opacity.disabled = 0.3;
      opacity.low = 0.5;
      opacity.medium = 0.7;
      opacity.high = 0.9;
    }

    return opacity;
  }

  // Utility methods
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number): string => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  private getSemanticColorName(hex: string): string | null {
    const colorMappings: { [key: string]: string } = {
      '#FFFFFF': 'white',
      '#000000': 'black',
      '#FF0000': 'red',
      '#00FF00': 'green',
      '#0000FF': 'blue',
      '#FFC107': 'warning',
      '#28A745': 'success',
      '#DC3545': 'danger',
      '#007BFF': 'primary',
      '#6C757D': 'secondary'
    };
    
    return colorMappings[hex.toUpperCase()] || null;
  }

  private getNodeBackgroundColor(node: any): string | null {
    if ('fills' in node && node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        return this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      }
    }
    return null;
  }

  private getNodeTextColor(node: any): string | null {
    if (node.type === 'TEXT' && 'fills' in node && node.fills && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        return this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      }
    }
    return null;
  }

  private safeGetNumber(value: any, defaultValue: number = 0): number {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    return defaultValue;
  }

  private isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  private safeStringify(obj: any, indent: number = 2): string {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'symbol') {
        return undefined;
      }
      if (typeof value === 'function') {
        return undefined;
      }
      if (value === undefined) {
        return undefined;
      }
      return value;
    }, indent);
  }
}