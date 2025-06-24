// src/handlers/extract-values-handler.ts
// Complete handler for design values extraction using modular architecture

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { MESSAGE_TYPES } from '@core/constants';
import { sendProgress } from '@utils/figma-helpers';
import { DesignValuesExtractor } from '@extractors/design-values-extractor';
import { ThemeGenerator } from '@generators/theme-generator';
import type { ExtractedValues, ThemeTokens } from '@core/types';

const MODULE_NAME = 'ExtractValuesHandler';

export class ExtractValuesHandler {
  private extractor: DesignValuesExtractor;
  private themeGenerator: ThemeGenerator;

  constructor() {
    this.extractor = new DesignValuesExtractor();
    this.themeGenerator = new ThemeGenerator();
    logger.info(MODULE_NAME, 'constructor', 'ExtractValuesHandler initialized');
  }

  @LogFunction(MODULE_NAME, true)
  async handle(options?: any): Promise<void> {
    const FUNC_NAME = 'handle';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting design values extraction workflow');
      sendProgress(10);
      
      // Step 1: Extract design values from all pages
      logger.info(MODULE_NAME, FUNC_NAME, 'Extracting design values...');
      const extractedValues = this.extractor.extractFromAllPages();
      sendProgress(50);
      
      // Step 2: Generate theme from extracted values
      logger.info(MODULE_NAME, FUNC_NAME, 'Generating theme...');
      const theme = this.themeGenerator.generateTheme(extractedValues);
      sendProgress(80);
      
      // Step 3: Generate theme file content
      logger.info(MODULE_NAME, FUNC_NAME, 'Generating theme file content...');
      const themeFileContent = this.themeGenerator.generateThemeFileContent(theme);
      sendProgress(100);
      
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
      figma.ui.postMessage({
        type: MESSAGE_TYPES.EXTRACTION_COMPLETE,
        data: result
      });
      
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'design values extraction workflow'
      });

      // Send error to UI
      figma.ui.postMessage({
        type: MESSAGE_TYPES.EXTRACTION_ERROR,
        error: 'Failed to extract design values. Please try again.'
      });
      
      throw error;
    }
  }

  @LogFunction(MODULE_NAME)
  private generateStatistics(extractedValues: ExtractedValues, theme: ThemeTokens): any {
    const FUNC_NAME = 'generateStatistics';
    
    try {
      const stats = {
        extraction: {
          totalColors: extractedValues.colors.size,
          totalFontSizes: extractedValues.fontSizes.size,
          totalSpacingValues: extractedValues.spacing.size,
          totalBorderRadiusValues: extractedValues.borderRadius.size,
          totalShadows: extractedValues.shadows.size,
          totalOpacityValues: extractedValues.opacity.size
        },
        components: {
          buttons: extractedValues.buttons.length,
          inputs: extractedValues.inputs.length,
          headings: extractedValues.headings.length,
          labels: extractedValues.labels.length,
          cards: extractedValues.cards.length,
          navigationItems: extractedValues.navigationItems.length,
          total: this.countTotalComponents(extractedValues)
        },
        theme: {
          colorTokens: Object.keys(theme.colors).length,
          fontSizeTokens: Object.keys(theme.typography.fontSize).length,
          spacingTokens: Object.keys(theme.spacing).length,
          componentTokens: theme.components ? Object.keys(theme.components).length : 0
        },
        quality: {
          colorConsistency: this.calculateColorConsistency(extractedValues.colors),
          spacingConsistency: this.calculateSpacingConsistency(extractedValues.spacing),
          typographyConsistency: this.calculateTypographyConsistency(extractedValues.fontSizes)
        }
      };

      logger.debug(MODULE_NAME, FUNC_NAME, 'Statistics generated', stats);
      return stats;
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error generating statistics:', error as Error);
      return {
        extraction: { totalColors: 0, totalFontSizes: 0 },
        components: { total: 0 },
        theme: { colorTokens: 0 },
        quality: { colorConsistency: 0 }
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

  private calculateColorConsistency(colors: Set<string>): number {
    // Simple consistency check - fewer unique colors = higher consistency
    const colorCount = colors.size;
    if (colorCount <= 10) return 100;
    if (colorCount <= 20) return 80;
    if (colorCount <= 30) return 60;
    return 40;
  }

  private calculateSpacingConsistency(spacing: Set<number>): number {
    // Check if spacing follows 8px grid or similar pattern
    const spacingArray = Array.from(spacing);
    const gridAligned = spacingArray.filter(s => s % 8 === 0 || s % 4 === 0);
    return spacingArray.length > 0 ? (gridAligned.length / spacingArray.length) * 100 : 0;
  }

  private calculateTypographyConsistency(fontSizes: Set<number>): number {
    // Check if font sizes follow a modular scale
    const sizesArray = Array.from(fontSizes).sort((a, b) => a - b);
    if (sizesArray.length < 2) return 100;
    
    let consistent = 0;
    for (let i = 1; i < sizesArray.length; i++) {
      const ratio = sizesArray[i] / sizesArray[i - 1];
      if (ratio >= 1.1 && ratio <= 1.6) { // Common modular scale ratios
        consistent++;
      }
    }
    
    return sizesArray.length > 1 ? (consistent / (sizesArray.length - 1)) * 100 : 100;
  }
}

export default ExtractValuesHandler;