// src/extractors/typography-extractor.ts
// Typography extraction with safe font property handling - Fixed imports

import { logger, LogFunction } from '@core/logger';

const MODULE_NAME = 'TypographyExtractor';

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

// Simple font weight mappings
const FONT_WEIGHT_MAPPINGS: Record<string, string> = {
  'Thin': '100',
  'Extra Light': '200',
  'ExtraLight': '200',
  'Light': '300',
  'Normal': '400',
  'Regular': '400',
  'Medium': '500',
  'Semi Bold': '600',
  'SemiBold': '600',
  'DemiBold': '600',
  'Bold': '700',
  'Extra Bold': '800',
  'ExtraBold': '800',
  'Black': '900',
  'Heavy': '900',
  'Ultra': '900',
  // Numeric fallbacks
  '100': '100',
  '200': '200', 
  '300': '300',
  '400': '400',
  '500': '500',
  '600': '600',
  '700': '700',
  '800': '800',
  '900': '900'
};

// Simple font size constraints
const DESIGN_TOKENS = {
  fontSize: {
    min: 8,
    max: 72,
    common: [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]
  }
};

export interface TypographyData {
  fontSizes: Set<number>;
  fontWeights: Set<string>;
  fontFamilies: Set<string>;
  textStyles: Array<{
    fontSize: number;
    fontWeight: string;
    fontFamily: string;
    lineHeight?: number;
    letterSpacing?: number;
    usage: string;
  }>;
}

// Simple helper functions
function getNodeFontSize(node: any): number | null {
  if (node.type === 'TEXT' && isValidNumber(node.fontSize)) {
    return safeGetNumber(node.fontSize);
  }
  return null;
}

function getNodeFontWeight(node: any): string | null {
  try {
    if (node.type === 'TEXT' && node.fontName && typeof node.fontName === 'object' && node.fontName !== figma?.mixed) {
      if (node.fontName.style && typeof node.fontName.style === 'string') {
        return node.fontName.style;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export class TypographyExtractor {

  @LogFunction(MODULE_NAME)
  extractFromNode(node: any, typography: TypographyData): void {
    if (node.type !== 'TEXT' || node.visible === false) {
      return;
    }

    try {
      this.extractFontSize(node, typography);
      this.extractFontWeight(node, typography);
      this.extractFontFamily(node, typography);
      this.extractTextStyle(node, typography);
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractFromNode', 'Error extracting typography:', { 
        error, 
        node: node.name 
      });
    }
  }

  @LogFunction(MODULE_NAME)
  private extractFontSize(node: any, typography: TypographyData): void {
    try {
      if (isValidNumber(node.fontSize)) {
        const fontSize = safeGetNumber(node.fontSize);
        
        if (fontSize >= DESIGN_TOKENS.fontSize.min && fontSize <= DESIGN_TOKENS.fontSize.max) {
          const rounded = Math.round(fontSize);
          typography.fontSizes.add(rounded);
          
          logger.debug(MODULE_NAME, 'extractFontSize', `Added font size: ${rounded}px`, { 
            node: node.name,
            original: fontSize 
          });
        }
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractFontSize', 'Error extracting font size:', { 
        error, 
        node: node.name 
      });
    }
  }

  @LogFunction(MODULE_NAME)
  private extractFontWeight(node: any, typography: TypographyData): void {
    try {
      // Handle figma.mixed safely
      if (node.fontName && node.fontName !== figma?.mixed && typeof node.fontName === 'object') {
        if (node.fontName.style && typeof node.fontName.style === 'string') {
          const normalizedWeight = this.normalizeFontWeight(node.fontName.style);
          typography.fontWeights.add(normalizedWeight);
          
          logger.debug(MODULE_NAME, 'extractFontWeight', `Added font weight: ${normalizedWeight}`, { 
            node: node.name,
            original: node.fontName.style 
          });
        }
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractFontWeight', 'Error extracting font weight:', { 
        error, 
        node: node.name 
      });
    }
  }

  @LogFunction(MODULE_NAME)
  private extractFontFamily(node: any, typography: TypographyData): void {
    try {
      if (node.fontName && node.fontName !== figma?.mixed && typeof node.fontName === 'object') {
        if (node.fontName.family && typeof node.fontName.family === 'string') {
          typography.fontFamilies.add(node.fontName.family);
          
          logger.debug(MODULE_NAME, 'extractFontFamily', `Added font family: ${node.fontName.family}`, { 
            node: node.name 
          });
        }
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractFontFamily', 'Error extracting font family:', { 
        error, 
        node: node.name 
      });
    }
  }

  @LogFunction(MODULE_NAME)
  private extractTextStyle(node: any, typography: TypographyData): void {
    try {
      const fontSize = getNodeFontSize(node);
      const fontWeight = getNodeFontWeight(node);
      
      if (fontSize && fontWeight) {
        const fontFamily = this.extractFontFamilyFromNode(node);
        const lineHeight = this.extractLineHeight(node);
        const letterSpacing = this.extractLetterSpacing(node);
        const usage = this.determineTextUsage(node, fontSize);

        typography.textStyles.push({
          fontSize,
          fontWeight: this.normalizeFontWeight(fontWeight),
          fontFamily: fontFamily || 'System',
          lineHeight: lineHeight || undefined,
          letterSpacing: letterSpacing || undefined,
          usage
        });

        logger.debug(MODULE_NAME, 'extractTextStyle', 'Added text style', { 
          node: node.name,
          fontSize,
          fontWeight,
          usage 
        });
      }
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractTextStyle', 'Error extracting text style:', { 
        error, 
        node: node.name 
      });
    }
  }

  @LogFunction(MODULE_NAME)
  extractAllTypography(nodes: any[]): TypographyData {
    const typography: TypographyData = {
      fontSizes: new Set(),
      fontWeights: new Set(),
      fontFamilies: new Set(),
      textStyles: []
    };

    logger.info(MODULE_NAME, 'extractAllTypography', `Processing ${nodes.length} nodes for typography`);

    const processNode = (node: any) => {
      try {
        if (node && node.visible !== false) {
          this.extractFromNode(node, typography);
          
          // Also check children for nested text
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach((child: any) => processNode(child));
          }
        }
      } catch (nodeError) {
        logger.warn(MODULE_NAME, 'extractAllTypography', `Error processing node:`, { 
          error: nodeError,
          node: node?.name || 'unnamed'
        });
      }
    };

    nodes.forEach((node: any) => processNode(node));

    logger.info(MODULE_NAME, 'extractAllTypography', 'Typography extraction complete', {
      fontSizes: typography.fontSizes.size,
      fontWeights: typography.fontWeights.size,
      fontFamilies: typography.fontFamilies.size,
      textStyles: typography.textStyles.length
    });

    return typography;
  }

  @LogFunction(MODULE_NAME)
  generateTypographyScale(fontSizes: Set<number>): Record<string, number> {
    const sizes = Array.from(fontSizes).sort((a: number, b: number) => a - b);
    const scale: Record<string, number> = {};

    // Map to semantic scale names
    sizes.forEach((size: number, index: number) => {
      if (size <= 12) scale.xs = size;
      else if (size <= 14) scale.sm = size;
      else if (size <= 16) scale.base = size;
      else if (size <= 18) scale.lg = size;
      else if (size <= 20) scale.xl = size;
      else if (size <= 24) scale['2xl'] = size;
      else if (size <= 30) scale['3xl'] = size;
      else if (size <= 36) scale['4xl'] = size;
      else scale['5xl'] = size;
    });

    // Ensure we have base sizes
    if (!scale.xs) scale.xs = 12;
    if (!scale.sm) scale.sm = 14;
    if (!scale.base) scale.base = 16;
    if (!scale.lg) scale.lg = 18;

    logger.debug(MODULE_NAME, 'generateTypographyScale', 'Generated typography scale', { scale });
    return scale;
  }

  @LogFunction(MODULE_NAME)
  optimizeFontWeights(fontWeights: Set<string>): Record<string, string> {
    const weights: Record<string, string> = {};
    const normalizedWeights = Array.from(fontWeights).map(w => this.normalizeFontWeight(w));
    
    // Standard weights in order
    const standardWeights = ['300', '400', '500', '600', '700'];
    
    normalizedWeights.forEach(weight => {
      if (weight === '300') weights.light = weight;
      else if (weight === '400') weights.normal = weight;
      else if (weight === '500') weights.medium = weight;
      else if (weight === '600') weights.semibold = weight;
      else if (weight === '700') weights.bold = weight;
      else if (weight === '900') weights.black = weight;
    });

    // Ensure we have at least normal weight
    if (!weights.normal) weights.normal = '400';

    logger.debug(MODULE_NAME, 'optimizeFontWeights', 'Optimized font weights', { weights });
    return weights;
  }

  private normalizeFontWeight(weight: string): string {
    // Handle Figma font weight names
    return FONT_WEIGHT_MAPPINGS[weight] || weight || '400';
  }

  private extractFontFamilyFromNode(node: any): string | null {
    try {
      if (node.fontName && node.fontName !== figma?.mixed && typeof node.fontName === 'object') {
        return node.fontName.family || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractLineHeight(node: any): number | null {
    try {
      if (node.lineHeight && typeof node.lineHeight === 'object') {
        if (node.lineHeight.unit === 'PIXELS' && isValidNumber(node.lineHeight.value)) {
          return safeGetNumber(node.lineHeight.value);
        }
        if (node.lineHeight.unit === 'PERCENT' && isValidNumber(node.lineHeight.value)) {
          const fontSize = getNodeFontSize(node) || 16;
          return Math.round(fontSize * (node.lineHeight.value / 100));
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractLetterSpacing(node: any): number | null {
    try {
      if (node.letterSpacing && typeof node.letterSpacing === 'object') {
        if (isValidNumber(node.letterSpacing.value)) {
          return safeGetNumber(node.letterSpacing.value);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private determineTextUsage(node: any, fontSize: number): string {
    const name = (node.name || '').toLowerCase();
    
    if (name.includes('heading') || name.includes('title') || name.includes('h1') || name.includes('h2')) {
      return 'heading';
    }
    
    if (name.includes('label') || name.includes('caption')) {
      return 'label';
    }
    
    if (name.includes('button') || name.includes('cta')) {
      return 'button';
    }
    
    if (fontSize >= 24) return 'heading';
    if (fontSize <= 12) return 'caption';
    return 'body';
  }

  @LogFunction(MODULE_NAME)
  analyzeTextHierarchy(textStyles: Array<any>): {
    headings: Array<any>;
    body: Array<any>;
    captions: Array<any>;
    buttons: Array<any>;
  } {
    const hierarchy = {
      headings: [] as Array<any>,
      body: [] as Array<any>,
      captions: [] as Array<any>,
      buttons: [] as Array<any>
    };

    textStyles.forEach(style => {
      switch (style.usage) {
        case 'heading':
          hierarchy.headings.push(style);
          break;
        case 'label':
        case 'caption':
          hierarchy.captions.push(style);
          break;
        case 'button':
          hierarchy.buttons.push(style);
          break;
        default:
          hierarchy.body.push(style);
      }
    });

    // Sort by font size within each category
    Object.values(hierarchy).forEach(category => {
      category.sort((a: any, b: any) => b.fontSize - a.fontSize);
    });

    logger.debug(MODULE_NAME, 'analyzeTextHierarchy', 'Text hierarchy analysis complete', {
      headings: hierarchy.headings.length,
      body: hierarchy.body.length,
      captions: hierarchy.captions.length,
      buttons: hierarchy.buttons.length
    });

    return hierarchy;
  }
}

export default TypographyExtractor;