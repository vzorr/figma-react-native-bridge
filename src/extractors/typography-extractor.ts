// src/extractors/typography-extractor.ts
// Typography extraction with safe font property handling

import { logger, LogFunction } from '@core/logger';
import { safeGetNumber, isValidNumber } from '@utils/number-utils';
import { getNodeFontSize, getNodeFontWeight } from '@utils/figma-helpers';
import { DESIGN_TOKENS, FONT_WEIGHT_MAPPINGS } from '@core/constants';

const MODULE_NAME = 'TypographyExtractor';

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

export interface TextHierarchy {
  headings: Array<any>;
  body: Array<any>;
  captions: Array<any>;
  buttons: Array<any>;
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
          lineHeight,
          letterSpacing,
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

    const processNodes = (nodeList: any[]): void => {
      nodeList.forEach((node: any, index: number) => {
        try {
          if (node && node.visible !== false) {
            this.extractFromNode(node, typography);
            
            // Also check children for nested text
            if (node.children && Array.isArray(node.children)) {
              processNodes(node.children);
            }
          }
        } catch (nodeError) {
          logger.warn(MODULE_NAME, 'extractAllTypography', `Error processing node ${index}:`, { 
            error: nodeError,
            node: node?.name || 'unnamed'
          });
        }
      });
    };

    processNodes(nodes);

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
    const sizes = Array.from(fontSizes).sort((a, b) => a - b);
    const scale: Record<string, number> = {};

    // Map to semantic scale names
    sizes.forEach((size: number) => {
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
    // Handle Figma font weight names with proper type assertion
    const mapping = FONT_WEIGHT_MAPPINGS as Record<string, string>;
    return mapping[weight] || weight || '400';
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

  private extractLineHeight(node: any): number | undefined {
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
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private extractLetterSpacing(node: any): number | undefined {
    try {
      if (node.letterSpacing && typeof node.letterSpacing === 'object') {
        if (isValidNumber(node.letterSpacing.value)) {
          return safeGetNumber(node.letterSpacing.value);
        }
      }
      return undefined;
    } catch (error) {
      return undefined;
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
  analyzeTextHierarchy(textStyles: Array<any>): TextHierarchy {
    const hierarchy: TextHierarchy = {
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
      category.sort((a, b) => b.fontSize - a.fontSize);
    });

    logger.debug(MODULE_NAME, 'analyzeTextHierarchy', 'Text hierarchy analysis complete', {
      headings: hierarchy.headings.length,
      body: hierarchy.body.length,
      captions: hierarchy.captions.length,
      buttons: hierarchy.buttons.length
    });

    return hierarchy;
  }

  @LogFunction(MODULE_NAME)
  generateSemanticTypography(typography: TypographyData): {
    scale: Record<string, number>;
    weights: Record<string, string>;
    families: string[];
    hierarchy: TextHierarchy;
  } {
    const FUNC_NAME = 'generateSemanticTypography';
    
    try {
      const scale = this.generateTypographyScale(typography.fontSizes);
      const weights = this.optimizeFontWeights(typography.fontWeights);
      const families = Array.from(typography.fontFamilies);
      const hierarchy = this.analyzeTextHierarchy(typography.textStyles);

      const result = {
        scale,
        weights,
        families,
        hierarchy
      };

      logger.info(MODULE_NAME, FUNC_NAME, 'Generated semantic typography system', {
        scaleCount: Object.keys(scale).length,
        weightsCount: Object.keys(weights).length,
        familiesCount: families.length,
        stylesCount: typography.textStyles.length
      });

      return result;
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error generating semantic typography:', error as Error);
      return {
        scale: { base: 16 },
        weights: { normal: '400' },
        families: ['System'],
        hierarchy: {
          headings: [],
          body: [],
          captions: [],
          buttons: []
        }
      };
    }
  }

  @LogFunction(MODULE_NAME)
  validateTypographyConsistency(typography: TypographyData): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const FUNC_NAME = 'validateTypographyConsistency';
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // Check font size scale consistency
      const fontSizes = Array.from(typography.fontSizes).sort((a, b) => a - b);
      if (fontSizes.length > 8) {
        issues.push('Too many unique font sizes detected');
        recommendations.push('Consider consolidating to a modular type scale');
      }

      // Check for common modular scale ratios
      let scaleConsistent = true;
      for (let i = 1; i < fontSizes.length; i++) {
        const ratio = fontSizes[i] / fontSizes[i - 1];
        if (ratio < 1.1 || ratio > 1.6) {
          scaleConsistent = false;
          break;
        }
      }

      if (!scaleConsistent && fontSizes.length > 3) {
        issues.push('Font sizes do not follow a consistent modular scale');
        recommendations.push('Use a consistent type scale (1.125, 1.2, 1.25, 1.333, etc.)');
      }

      // Check font weight consistency
      const weights = Array.from(typography.fontWeights);
      if (weights.length > 6) {
        issues.push('Too many font weights in use');
        recommendations.push('Limit to 3-4 font weights maximum');
      }

      // Check font family consistency
      const families = Array.from(typography.fontFamilies);
      if (families.length > 3) {
        issues.push('Too many font families in use');
        recommendations.push('Limit to 1-2 font families for consistency');
      }

      // Calculate overall consistency score
      const maxIssues = 4;
      const score = Math.max(0, (maxIssues - issues.length) / maxIssues * 100);

      const result = {
        score: Math.round(score),
        issues,
        recommendations
      };

      logger.debug(MODULE_NAME, FUNC_NAME, 'Typography consistency analysis complete', result);
      return result;
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error validating typography consistency:', error as Error);
      return {
        score: 0,
        issues: ['Error analyzing typography consistency'],
        recommendations: ['Review typography usage manually']
      };
    }
  }
}

export default TypographyExtractor;