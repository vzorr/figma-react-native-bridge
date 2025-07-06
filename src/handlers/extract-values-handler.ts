// src/handlers/extract-values-handler.ts
// Complete handler for design values extraction - Fixed imports

import { logger, LogFunction } from '@core/logger';

const MODULE_NAME = 'ExtractValuesHandler';

// Simple message sender
function sendMessage(type: string, data?: any) {
  try {
    figma.ui.postMessage({ type, data, timestamp: Date.now() });
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function sendProgress(progress: number, message?: string) {
  sendMessage('PROGRESS_UPDATE', { progress, message });
}

// Simple safe number utility
function safeGetNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
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

export class ExtractValuesHandler {

  constructor() {
    logger.info(MODULE_NAME, 'constructor', 'ExtractValuesHandler initialized');
  }

  @LogFunction(MODULE_NAME, true)
  async handle(options?: any): Promise<void> {
    const FUNC_NAME = 'handle';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting design values extraction workflow');
      sendProgress(10, 'Analyzing design elements...');
      
      // Step 1: Extract design values from all pages
      logger.info(MODULE_NAME, FUNC_NAME, 'Extracting design values...');
      const extractedValues = this.extractFromAllPages();
      sendProgress(50, 'Generating theme...');
      
      // Step 2: Generate theme from extracted values
      logger.info(MODULE_NAME, FUNC_NAME, 'Generating theme...');
      const theme = this.generateTheme(extractedValues);
      sendProgress(80, 'Creating theme file...');
      
      // Step 3: Generate theme file content
      logger.info(MODULE_NAME, FUNC_NAME, 'Generating theme file content...');
      const themeFileContent = this.generateThemeFileContent(theme);
      sendProgress(100, 'Extraction complete!');
      
      // Step 4: Prepare results for UI
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
        fileContent: themeFileContent,
        statistics: this.generateStatistics(extractedValues, theme)
      };
      
      logger.info(MODULE_NAME, FUNC_NAME, 'Design values extraction complete', {
        colorsExtracted: extractedValues.colors.size,
        fontSizesExtracted: extractedValues.fontSizes.size,
        componentsFound: this.countTotalComponents(extractedValues)
      });
      
      // Step 5: Send results to UI
      sendMessage('EXTRACTION_COMPLETE', result);
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error in extraction workflow:', error as Error);

      // Send error to UI
      sendMessage('ERROR', {
        message: 'Failed to extract design values. Please try again.'
      });
      
      throw error;
    }
  }

  @LogFunction(MODULE_NAME)
  private extractFromAllPages(): ExtractedValues {
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
  private extractBasicTokens(node: any, values: ExtractedValues): void {
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
      logger.debug(MODULE_NAME, 'extractBasicTokens', 'Error extracting basic tokens:', { 
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
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
            const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            values.colors.add(hex);
          }
        });
      }

      // Extract from strokes
      if (node.strokes && Array.isArray(node.strokes)) {
        node.strokes.forEach((stroke: any) => {
          if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
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
        if (typeof node.fontSize === 'number' && node.fontSize >= 8 && node.fontSize <= 72) {
          values.fontSizes.add(Math.round(node.fontSize));
        }

        // Font weight and family
        if (node.fontName && typeof node.fontName === 'object' && node.fontName !== figma?.mixed) {
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
          if (prop in node && typeof node[prop] === 'number' && node[prop] >= 0 && node[prop] <= 200) {
            values.spacing.add(Math.round(node[prop]));
          }
        });

        // Extract item spacing
        if ('itemSpacing' in node && typeof node.itemSpacing === 'number' && node.itemSpacing >= 0 && node.itemSpacing <= 200) {
          values.spacing.add(Math.round(node.itemSpacing));
        }
      }
    } catch (error) {
      // Skip problematic spacing extractions
    }
  }

  private extractBorderRadius(node: any, values: ExtractedValues): void {
    try {
      if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius >= 0 && node.cornerRadius <= 100) {
        values.borderRadius.add(Math.round(node.cornerRadius));
      }
    } catch (error) {
      // Skip problematic border radius extractions
    }
  }

  private extractShadows(node: any, values: ExtractedValues): void {
    try {
      if (node.effects && Array.isArray(node.effects)) {
        node.effects.forEach((effect: any) => {
          if (effect.type === 'DROP_SHADOW' && effect.visible && effect.radius > 0) {
            const x = safeGetNumber(effect.offset?.x, 0);
            const y = safeGetNumber(effect.offset?.y, 0);
            const radius = safeGetNumber(effect.radius, 0);
            
            if (effect.color) {
              const color = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
              const shadow = `${x}px ${y}px ${radius}px ${color}`;
              values.shadows.add(shadow);
            }
          }
        });
      }
    } catch (error) {
      // Skip problematic shadow extractions
    }
  }

  private extractOpacity(node: any, values: ExtractedValues): void {
    try {
      if ('opacity' in node && typeof node.opacity === 'number' && node.opacity < 1 && node.opacity > 0.1) {
        const rounded = Math.round(node.opacity * 100) / 100;
        values.opacity.add(rounded);
      }
    } catch (error) {
      // Skip problematic opacity extractions
    }
  }

  @LogFunction(MODULE_NAME)
  private extractSemanticComponents(node: any, values: ExtractedValues): void {
    try {
      const name = (node.name || '').toLowerCase();
      
      // Detect and extract different component types
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
      
    } catch (error) {
      // Skip problematic component extractions
    }
  }

  // Component detection methods
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

  private hasButtonCharacteristics(node: any): boolean {
    try {
      const width = safeGetNumber(node.width);
      const height = safeGetNumber(node.height);
      const cornerRadius = safeGetNumber(node.cornerRadius);
      
      return (
        cornerRadius > 0 &&
        node.fills && node.fills.length > 0 &&
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
        node.strokes && node.strokes.length > 0
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
        variant: 'primary',
        backgroundColor: this.getNodeBackgroundColor(node),
        width: Math.round(safeGetNumber(node.width)),
        height: Math.round(safeGetNumber(node.height)),
        borderRadius: safeGetNumber(node.cornerRadius)
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
        width: Math.round(safeGetNumber(node.width)),
        height: Math.round(safeGetNumber(node.height))
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
        fontSize: safeGetNumber(node.fontSize, 24),
        color: this.getNodeTextColor(node)
      };
    } catch (error) {
      return null;
    }
  }

  private getNodeBackgroundColor(node: any): string | null {
    try {
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private getNodeBorderColor(node: any): string | null {
    try {
      if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
        const stroke = node.strokes[0];
        if (stroke.type === 'SOLID' && stroke.color) {
          return rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private getNodeTextColor(node: any): string | null {
    try {
      if (node.type === 'TEXT' && node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  @LogFunction(MODULE_NAME)
  private generateTheme(extractedValues: ExtractedValues): any {
    try {
      const colorsArray = Array.from(extractedValues.colors);
      const colors: Record<string, string> = {};
      
      // Map colors to semantic names
      colorsArray.forEach((color: string, index: number) => {
        const semanticName = this.getSemanticColorName(color);
        if (semanticName) {
          colors[semanticName] = color;
        } else {
          colors[`color${index + 1}`] = color;
        }
      });

      // Ensure we have basic colors
      if (!colors.primary) colors.primary = '#007AFF';
      if (!colors.white) colors.white = '#FFFFFF';
      if (!colors.black) colors.black = '#000000';

      // Generate typography scale
      const fontSizesArray = Array.from(extractedValues.fontSizes).sort((a, b) => a - b);
      const fontSize: Record<string, number> = {};
      
      fontSizesArray.forEach((size: number, index: number) => {
        if (size <= 12) fontSize.xs = size;
        else if (size <= 14) fontSize.sm = size;
        else if (size <= 16) fontSize.base = size;
        else if (size <= 18) fontSize.lg = size;
        else if (size <= 24) fontSize.xl = size;
        else fontSize['2xl'] = size;
      });

      // Ensure base sizes
      if (!fontSize.xs) fontSize.xs = 12;
      if (!fontSize.sm) fontSize.sm = 14;
      if (!fontSize.base) fontSize.base = 16;

      // Generate spacing scale
      const spacingArray = Array.from(extractedValues.spacing).sort((a, b) => a - b);
      const spacing: Record<string, number> = {};
      
      spacingArray.forEach((space: number, index: number) => {
        if (space <= 4) spacing.xs = space;
        else if (space <= 8) spacing.sm = space;
        else if (space <= 16) spacing.md = space;
        else if (space <= 24) spacing.lg = space;
        else spacing.xl = space;
      });

      // Ensure base spacing
      if (!spacing.xs) spacing.xs = 4;
      if (!spacing.sm) spacing.sm = 8;
      if (!spacing.md) spacing.md = 16;

      return {
        colors,
        typography: {
          fontSize,
          fontWeight: {
            light: '300',
            normal: '400',
            medium: '500',
            bold: '700'
          }
        },
        spacing,
        borderRadius: {
          none: 0,
          sm: 4,
          md: 8,
          lg: 12
        }
      };
    } catch (error) {
      logger.error(MODULE_NAME, 'generateTheme', 'Error generating theme:', error as Error);
      return {
        colors: { primary: '#007AFF', white: '#FFFFFF', black: '#000000' },
        typography: { fontSize: { base: 16 }, fontWeight: { normal: '400' } },
        spacing: { md: 16 }
      };
    }
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
      '#6C757D': 'secondary'
    };
    
    return colorMappings[hex.toUpperCase()] || null;
  }

  private generateThemeFileContent(theme: any): string {
    return `// theme/index.ts - Generated Design System from Figma
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling
const scale = (size: number): number => (width / 375) * size;

// Design tokens extracted from Figma
export const COLORS = ${JSON.stringify(theme.colors, null, 2)};

export const TYPOGRAPHY = ${JSON.stringify(theme.typography, null, 2)};

export const SPACING = ${JSON.stringify(theme.spacing, null, 2)};

export const BORDER_RADIUS = ${JSON.stringify(theme.borderRadius, null, 2)};

// Helper functions
export const getColor = (name: string): string => COLORS[name] || COLORS.primary || '#007AFF';
export const getSpacing = (name: string): number => SPACING[name] || 8;
export const getFontSize = (name: string): number => TYPOGRAPHY.fontSize[name] || 16;

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  getColor,
  getSpacing,
  getFontSize,
};`;
  }

  @LogFunction(MODULE_NAME)
  private generateStatistics(extractedValues: ExtractedValues, theme: any): any {
    try {
      return {
        extraction: {
          totalColors: extractedValues.colors.size,
          totalFontSizes: extractedValues.fontSizes.size,
          totalSpacingValues: extractedValues.spacing.size,
          totalBorderRadiusValues: extractedValues.borderRadius.size
        },
        components: {
          buttons: extractedValues.buttons.length,
          inputs: extractedValues.inputs.length,
          headings: extractedValues.headings.length,
          total: this.countTotalComponents(extractedValues)
        },
        theme: {
          colorTokens: Object.keys(theme.colors).length,
          fontSizeTokens: Object.keys(theme.typography.fontSize).length,
          spacingTokens: Object.keys(theme.spacing).length
        }
      };
    } catch (error) {
      logger.error(MODULE_NAME, 'generateStatistics', 'Error generating statistics:', error as Error);
      return {
        extraction: { totalColors: 0, totalFontSizes: 0 },
        components: { total: 0 },
        theme: { colorTokens: 0 }
      };
    }
  }

  private countTotalComponents(extractedValues: ExtractedValues): number {
    return extractedValues.buttons.length +
           extractedValues.inputs.length +
           extractedValues.headings.length +
           extractedValues.labels.length +
           extractedValues.cards.length +
           extractedValues.navigationItems.length;
  }
}

export default ExtractValuesHandler;