// src/generators/theme-generator.ts
// Fixed theme generator - removed problematic imports

import { logger, LogFunction } from '@core/logger';

const MODULE_NAME = 'ThemeGenerator';

// Simple interfaces to avoid import issues
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

interface ThemeTokens {
  colors: Record<string, string>;
  typography: {
    fontSize: Record<string, number>;
    fontWeight: Record<string, string>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
  opacity: Record<string, number>;
  components?: any;
}

export class ThemeGenerator {

  @LogFunction(MODULE_NAME, true)
  generateTheme(values: ExtractedValues): ThemeTokens {
    try {
      logger.info(MODULE_NAME, 'generateTheme', 'Starting theme generation');
      
      // Generate basic tokens
      const basicTheme = this.generateBasicTokens(values);
      
      // Generate semantic component tokens
      const componentTokens = this.generateComponentTokens(values);
      
      const theme: ThemeTokens = {
        ...basicTheme,
        components: componentTokens
      };

      logger.info(MODULE_NAME, 'generateTheme', 'Theme generation complete', {
        colorCount: Object.keys(theme.colors).length,
        fontSizeCount: Object.keys(theme.typography.fontSize).length,
        spacingCount: Object.keys(theme.spacing).length
      });

      return theme;
    } catch (error) {
      logger.error(MODULE_NAME, 'generateTheme', 'Error generating theme:', error as Error);
      
      // Return minimal theme on error
      return this.createMinimalTheme();
    }
  }

  @LogFunction(MODULE_NAME)
  generateThemeFileContent(theme: ThemeTokens): string {
    try {
      // Clean the theme object to remove any problematic values
      const cleanTheme = this.cleanThemeObject(theme);

      const content = `// theme/index.ts - Generated Design System from Figma
// Complete Semantic Design System with Component Tokens

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling
const scale = (size: number): number => (width / 375) * size;
const verticalScale = (size: number): number => (height / 812) * size;
const moderateScale = (size: number, factor: number = 0.5): number => 
  size + (scale(size) - size) * factor;

// 🎨 SEMANTIC COLOR PALETTE
export const COLORS = ${this.formatObject(cleanTheme.colors)};

// 📝 TYPOGRAPHY SCALE  
export const TYPOGRAPHY = ${this.formatObject(cleanTheme.typography)};

// 📏 SPACING SCALE
export const SPACING = ${this.formatObject(cleanTheme.spacing)};

// 🔘 BORDER RADIUS SCALE
export const BORDER_RADIUS = ${this.formatObject(cleanTheme.borderRadius)};

// 🌊 SHADOW SYSTEM
export const SHADOWS = ${this.formatObject(cleanTheme.shadows)};

// 👻 OPACITY SCALE
export const OPACITY = ${this.formatObject(cleanTheme.opacity)};

${cleanTheme.components && Object.keys(cleanTheme.components).length > 0 ? 
`// 🧩 COMPONENT TOKENS
export const COMPONENTS = ${this.formatObject(cleanTheme.components)};` : ''}

// 📱 RESPONSIVE UTILITIES
export const responsive = {
  font: (size: number) => moderateScale(size, 0.3),
  space: (size: number) => scale(size),
  radius: (size: number) => scale(size),
  width: (size: number) => scale(size),
  height: (size: number) => verticalScale(size),
};

// 🎯 THEME HELPERS
export const theme = {
  color: (name: string) => COLORS[name as keyof typeof COLORS] || COLORS.primary || '#007AFF',
  fontSize: (size: string) => TYPOGRAPHY.fontSize[size as keyof typeof TYPOGRAPHY.fontSize] || 14,
  fontWeight: (weight: string) => TYPOGRAPHY.fontWeight[weight as keyof typeof TYPOGRAPHY.fontWeight] || '400',
  spacing: (size: string) => SPACING[size as keyof typeof SPACING] || 8,
  borderRadius: (size: string) => BORDER_RADIUS[size as keyof typeof BORDER_RADIUS] || 4,
  shadow: (size: string) => SHADOWS[size as keyof typeof SHADOWS] || '0px 2px 4px rgba(0,0,0,0.1)',
  opacity: (level: string) => OPACITY[level as keyof typeof OPACITY] || 1,
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  OPACITY,
  ${theme.components ? 'COMPONENTS,' : ''}
  responsive,
  theme,
};`;

      logger.debug(MODULE_NAME, 'generateThemeFileContent', 'Theme file content generated', {
        contentLength: content.length
      });

      return content;
    } catch (error) {
      logger.error(MODULE_NAME, 'generateThemeFileContent', 'Error generating theme file:', error as Error);
      
      return this.generateMinimalThemeFileContent();
    }
  }

  @LogFunction(MODULE_NAME)
  private generateBasicTokens(values: ExtractedValues): Omit<ThemeTokens, 'components'> {
    try {
      const colorsArray = Array.from(values.colors) as string[];
      const colors: Record<string, string> = { transparent: 'transparent' };
      
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
          if (this.isGrayColor(color)) {
            const grayIndex = Object.keys(colors).filter(k => k.startsWith('gray')).length + 1;
            colors[`gray${grayIndex}`] = color;
          } else if (!primaryAssigned && index === 0) {
            colors.primary = color;
            primaryAssigned = true;
          } else {
            const accentIndex = Object.keys(colors).filter(k => k.startsWith('accent')).length + 1;
            colors[`accent${accentIndex}`] = color;
          }
        }
      });

      if (!colors.primary) {
        colors.primary = '#007AFF';
      }

      // Enhanced typography scale
      const fontSizesArray = (Array.from(values.fontSizes) as number[])
        .filter(size => size >= 10 && size <= 64)
        .sort((a, b) => a - b);
        
      const fontSize: Record<string, number> = this.createFontSizeScale(fontSizesArray);

      // Enhanced spacing with 8px grid
      const spacingArray = (Array.from(values.spacing) as number[])
        .filter(s => s >= 0 && s <= 128)
        .sort((a, b) => a - b);
        
      const spacing: Record<string, number> = this.createSpacingScale(spacingArray);

      // Border radius tokens
      const borderRadiusArray = (Array.from(values.borderRadius) as number[])
        .filter(r => r >= 0 && r <= 50)
        .sort((a, b) => a - b);
        
      const borderRadius: Record<string, number> = this.createBorderRadiusScale(borderRadiusArray);

      // Shadow tokens
      const shadowsArray = Array.from(values.shadows) as string[];
      const shadows: Record<string, string> = this.createShadowScale(shadowsArray);

      // Opacity tokens
      const opacityArray = (Array.from(values.opacity) as number[]).sort((a, b) => a - b);
      const opacity: Record<string, number> = this.createOpacityScale(opacityArray);

      return {
        colors,
        typography: { 
          fontSize,
          fontWeight: {
            light: '300',
            normal: '400', 
            medium: '500',
            semibold: '600',
            bold: '700',
            black: '900'
          }
        },
        spacing,
        borderRadius,
        shadows,
        opacity
      };
    } catch (error) {
      logger.error(MODULE_NAME, 'generateBasicTokens', 'Error generating basic tokens:', error as Error);
      return this.createMinimalBasicTokens();
    }
  }

  private createFontSizeScale(fontSizes: number[]): Record<string, number> {
    const fontSize: Record<string, number> = {};
    
    fontSizes.forEach((size: number) => {
      if (size <= 12) fontSize.xs = size;
      else if (size <= 14) fontSize.sm = size;
      else if (size <= 16) fontSize.base = size;
      else if (size <= 18) fontSize.lg = size;
      else if (size <= 20) fontSize.xl = size;
      else if (size <= 24) fontSize['2xl'] = size;
      else if (size <= 30) fontSize['3xl'] = size;
      else if (size <= 36) fontSize['4xl'] = size;
      else fontSize['5xl'] = size;
    });

    // Ensure we have base sizes
    if (!fontSize.xs) fontSize.xs = 12;
    if (!fontSize.sm) fontSize.sm = 14;
    if (!fontSize.base) fontSize.base = 16;
    if (!fontSize.lg) fontSize.lg = 18;

    return fontSize;
  }

  private createSpacingScale(spacings: number[]): Record<string, number> {
    const spacing: Record<string, number> = { none: 0, px: 1 };
    
    spacings.forEach((space: number) => {
      if (space === 0) return;
      if (space <= 2) spacing.px = space;
      else if (space <= 4) spacing.xs = space;
      else if (space <= 8) spacing.sm = space;
      else if (space <= 12) spacing.md = space;
      else if (space <= 16) spacing.lg = space;
      else if (space <= 24) spacing.xl = space;
      else if (space <= 32) spacing['2xl'] = space;
      else if (space <= 48) spacing['3xl'] = space;
      else if (space <= 64) spacing['4xl'] = space;
      else spacing['5xl'] = space;
    });

    // Ensure we have base sizes
    if (!spacing.xs) spacing.xs = 4;
    if (!spacing.sm) spacing.sm = 8;
    if (!spacing.md) spacing.md = 16;
    if (!spacing.lg) spacing.lg = 24;

    return spacing;
  }

  private createBorderRadiusScale(radii: number[]): Record<string, number> {
    const borderRadius: Record<string, number> = { none: 0 };
    
    radii.forEach((radius: number) => {
      if (radius === 0) return;
      if (radius <= 2) borderRadius.sm = radius;
      else if (radius <= 4) borderRadius.md = radius;
      else if (radius <= 8) borderRadius.lg = radius;
      else if (radius <= 12) borderRadius.xl = radius;
      else if (radius <= 16) borderRadius['2xl'] = radius;
      else if (radius >= 25) borderRadius.full = radius;
      else borderRadius[`r${radius}`] = radius;
    });

    if (!borderRadius.sm) borderRadius.sm = 2;
    if (!borderRadius.md) borderRadius.md = 4;
    if (!borderRadius.lg) borderRadius.lg = 8;

    return borderRadius;
  }

  private createShadowScale(shadows: string[]): Record<string, string> {
    const shadowScale: Record<string, string> = {};
    
    shadows.forEach((shadow: string, index: number) => {
      if (index === 0) shadowScale.sm = shadow;
      else if (index === 1) shadowScale.md = shadow;
      else if (index === 2) shadowScale.lg = shadow;
      else shadowScale[`shadow${index + 1}`] = shadow;
    });

    if (Object.keys(shadowScale).length === 0) {
      shadowScale.sm = '0px 1px 2px rgba(0, 0, 0, 0.1)';
      shadowScale.md = '0px 2px 4px rgba(0, 0, 0, 0.1)';
      shadowScale.lg = '0px 4px 8px rgba(0, 0, 0, 0.1)';
    }

    return shadowScale;
  }

  private createOpacityScale(opacities: number[]): Record<string, number> {
    const opacity: Record<string, number> = {};
    
    opacities.forEach((opacityValue: number) => {
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

  @LogFunction(MODULE_NAME)
  private generateComponentTokens(values: ExtractedValues): any {
    try {
      const componentTokens: Record<string, any> = {};
      
      // Generate BUTTON tokens
      if (values.buttons && values.buttons.length > 0) {
        componentTokens.button = this.generateButtonTokens(values.buttons);
      }
      
      // Generate INPUT tokens
      if (values.inputs && values.inputs.length > 0) {
        componentTokens.input = this.generateInputTokens(values.inputs);
      }
      
      // Generate CARD tokens
      if (values.cards && values.cards.length > 0) {
        componentTokens.card = this.generateCardTokens(values.cards);
      }
      
      return componentTokens;
    } catch (error) {
      logger.error(MODULE_NAME, 'generateComponentTokens', 'Error generating component tokens:', error as Error);
      return {};
    }
  }

  private generateButtonTokens(buttons: any[]) {
    const variants: Record<string, any> = {};
    
    buttons.forEach((button: any) => {
      const variantName = button.variant || 'default';
      if (!variants[variantName]) {
        variants[variantName] = {
          backgroundColor: button.backgroundColor,
          textColor: button.textColor,
          borderRadius: button.borderRadius,
          paddingVertical: Math.max(button.padding?.top || 0, button.padding?.bottom || 0, 12),
          paddingHorizontal: Math.max(button.padding?.left || 0, button.padding?.right || 0, 24),
          fontSize: button.fontSize || 16,
          fontWeight: button.fontWeight || '600',
          minHeight: button.height || 44,
          minWidth: button.width
        };
      }
    });
    
    // Ensure we have a primary button variant
    if (!variants.primary && !variants.default) {
      variants.primary = {
        backgroundColor: '#007AFF',
        textColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        fontSize: 16,
        fontWeight: '600',
        minHeight: 44
      };
    }
    
    return { variants };
  }

  private generateInputTokens(inputs: any[]) {
    const variants: Record<string, any> = {};
    
    inputs.forEach((input: any, index: number) => {
      const variantName = `variant${index + 1}`;
      variants[variantName] = {
        backgroundColor: input.backgroundColor || '#FFFFFF',
        borderColor: input.borderColor || '#E1E5E9',
        borderRadius: input.borderRadius || 8,
        paddingVertical: Math.max(input.padding?.top || 0, input.padding?.bottom || 0, 12),
        paddingHorizontal: Math.max(input.padding?.left || 0, input.padding?.right || 0, 16),
        fontSize: input.fontSize || 16,
        height: input.height || 44
      };
    });
    
    // Create a default input style if none exist
    if (Object.keys(variants).length === 0) {
      variants.default = {
        backgroundColor: '#FFFFFF',
        borderColor: '#E1E5E9',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        height: 44
      };
    }
    
    return { variants };
  }

  private generateCardTokens(cards: any[]) {
    const variants: Record<string, any> = {};
    
    cards.forEach((card: any, index: number) => {
      const variantName = `variant${index + 1}`;
      variants[variantName] = {
        backgroundColor: card.backgroundColor || '#FFFFFF',
        borderRadius: card.borderRadius || 12,
        padding: Math.max(card.padding?.top || 0, card.padding?.left || 0, 16),
        shadow: card.shadow || '0px 2px 8px rgba(0, 0, 0, 0.1)'
      };
    });
    
    // Default card style
    if (Object.keys(variants).length === 0) {
      variants.default = {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadow: '0px 2px 8px rgba(0, 0, 0, 0.1)'
      };
    }
    
    return { variants };
  }

  // Helper methods
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

  private cleanThemeObject(theme: ThemeTokens): ThemeTokens {
    return {
      colors: theme.colors || {},
      typography: theme.typography || { fontSize: {}, fontWeight: {} },
      spacing: theme.spacing || {},
      borderRadius: theme.borderRadius || {},
      shadows: theme.shadows || {},
      opacity: theme.opacity || {},
      components: theme.components || {}
    };
  }

  private formatObject(obj: any, indent: number = 2): string {
    try {
      return JSON.stringify(obj, (key, value) => {
        // Handle problematic values
        if (typeof value === 'symbol') {
          return undefined;
        }
        if (typeof value === 'function') {
          return undefined;
        }
        return value;
      }, indent);
    } catch (error) {
      logger.error(MODULE_NAME, 'formatObject', 'Error formatting object:', error as Error);
      return '{}';
    }
  }

  private createMinimalTheme(): ThemeTokens {
    return {
      colors: { primary: '#007AFF', white: '#FFFFFF', black: '#000000' },
      typography: {
        fontSize: { base: 16, lg: 18, sm: 14 },
        fontWeight: { normal: '400', bold: '700' }
      },
      spacing: { sm: 8, md: 16, lg: 24 },
      borderRadius: { sm: 4, md: 8, lg: 12 },
      shadows: { md: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
      opacity: { medium: 0.7 },
      components: {}
    };
  }

  private createMinimalBasicTokens(): Omit<ThemeTokens, 'components'> {
    return {
      colors: { primary: '#007AFF', white: '#FFFFFF', black: '#000000' },
      typography: {
        fontSize: { base: 16 },
        fontWeight: { normal: '400' }
      },
      spacing: { md: 16 },
      borderRadius: { md: 8 },
      shadows: { md: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
      opacity: { medium: 0.7 }
    };
  }

  private generateMinimalThemeFileContent(): string {
    return `// theme/index.ts - Minimal Generated Theme (Error Recovery)

export const COLORS = {
  primary: '#007AFF',
  white: '#FFFFFF',
  black: '#000000'
};

export const TYPOGRAPHY = {
  fontSize: { base: 16 },
  fontWeight: { normal: '400' }
};

export const SPACING = { md: 16 };

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING
};`;
  }
}

export default ThemeGenerator;