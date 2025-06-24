// src/generators/theme-generator.ts
// Complete implementation extracted from code.ts

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { ExtractedValues, ThemeTokens } from '@core/types';

const MODULE_NAME = 'ThemeGenerator';

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
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'generateTheme',
        operation: 'theme generation'
      });
      
      // Return minimal theme on error
      return this.createMinimalTheme();
    }
  }

  @LogFunction(MODULE_NAME)
  generateThemeFileContent(theme: ThemeTokens): string {
    try {
      // Clean the theme object to remove any problematic values
      const cleanTheme = {
        colors: theme.colors || {},
        typography: theme.typography || {},
        spacing: theme.spacing || {},
        borderRadius: theme.borderRadius || {},
        shadows: theme.shadows || {},
        opacity: theme.opacity || {},
        components: theme.components || {}
      };

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
export const COLORS = ${this.safeStringify(cleanTheme.colors)};

// 📝 TYPOGRAPHY SCALE  
export const TYPOGRAPHY = ${this.safeStringify(cleanTheme.typography)};

// 📏 SPACING SCALE
export const SPACING = ${this.safeStringify(cleanTheme.spacing)};

// 🔘 BORDER RADIUS SCALE
export const BORDER_RADIUS = ${this.safeStringify(cleanTheme.borderRadius)};

// 🌊 SHADOW SYSTEM
export const SHADOWS = ${this.safeStringify(cleanTheme.shadows)};

// 👻 OPACITY SCALE
export const OPACITY = ${this.safeStringify(cleanTheme.opacity)};

${cleanTheme.components && Object.keys(cleanTheme.components).length > 0 ? `// 🧩 COMPONENT TOKENS
export const COMPONENTS = ${this.safeStringify(cleanTheme.components)};` : ''}

// 📱 RESPONSIVE UTILITIES
export const responsive = {
  font: (size: keyof typeof TYPOGRAPHY.fontSize) => moderateScale(TYPOGRAPHY.fontSize[size] || 14, 0.3),
  space: (size: keyof typeof SPACING) => scale(SPACING[size] || 0),
  radius: (size: keyof typeof BORDER_RADIUS) => scale(BORDER_RADIUS[size] || 0),
};

// 🎯 THEME HELPERS
export const theme = {
  color: (name: keyof typeof COLORS) => COLORS[name] || COLORS.primary || '#007AFF',
  fontSize: (size: keyof typeof TYPOGRAPHY.fontSize) => TYPOGRAPHY.fontSize[size] || 14,
  fontWeight: (weight: keyof typeof TYPOGRAPHY.fontWeight) => TYPOGRAPHY.fontWeight[weight] || '400',
  spacing: (size: keyof typeof SPACING) => SPACING[size] || 8,
  borderRadius: (size: keyof typeof BORDER_RADIUS) => BORDER_RADIUS[size] || 4,
  shadow: (size: keyof typeof SHADOWS) => SHADOWS[size] || SHADOWS.md,
  opacity: (level: keyof typeof OPACITY) => OPACITY[level] || 1,
};

// 🎨 DESIGN SYSTEM USAGE EXAMPLES
/*
// Using colors
<View style={{ backgroundColor: theme.color('primary') }} />

// Using typography
<Text style={[components.text.h1, { color: theme.color('dark1') }]}>
  Heading
</Text>

// Using buttons
<TouchableOpacity style={components.button.primary}>
  <Text style={{ color: 'white' }}>Primary Button</Text>
</TouchableOpacity>

// Using responsive spacing
<View style={{ 
  padding: responsive.space('lg'),
  borderRadius: responsive.radius('md') 
}} />
*/

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
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'generateThemeFileContent',
        operation: 'theme file content generation'
      });
      
      return this.generateMinimalThemeFileContent();
    }
  }

  @LogFunction(MODULE_NAME)
  private generateBasicTokens(values: ExtractedValues): Omit<ThemeTokens, 'components'> {
    try {
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

      // Enhanced typography scale
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
        else if (size <= 30) fontSize['3xl'] = size;
        else if (size <= 36) fontSize['4xl'] = size;
        else fontSize['5xl'] = size;
      });

      if (!fontSize.xs) fontSize.xs = 12;
      if (!fontSize.sm) fontSize.sm = 14;
      if (!fontSize.base) fontSize.base = 16;
      if (!fontSize.lg) fontSize.lg = 18;

      // Enhanced spacing with 8px grid
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
        else if (space <= 32) spacing['2xl'] = space;
        else if (space <= 48) spacing['3xl'] = space;
        else if (space <= 64) spacing['4xl'] = space;
        else spacing['5xl'] = space;
      });

      if (!spacing.xs) spacing.xs = 4;
      if (!spacing.sm) spacing.sm = 8;
      if (!spacing.md) spacing.md = 16;
      if (!spacing.lg) spacing.lg = 24;

      // Border radius tokens
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
        else if (radius <= 16) borderRadius['2xl'] = radius;
        else if (radius >= 25) borderRadius.full = radius;
        else borderRadius[`r${radius}`] = radius;
      });

      if (!borderRadius.sm) borderRadius.sm = 2;
      if (!borderRadius.md) borderRadius.md = 4;
      if (!borderRadius.lg) borderRadius.lg = 8;

      // Shadow tokens
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

      // Opacity tokens
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

  @LogFunction(MODULE_NAME)
  private generateComponentTokens(values: ExtractedValues): any {
    try {
      const componentTokens: any = {};
      
      // Generate BUTTON tokens
      if (values.buttons && values.buttons.length > 0) {
        componentTokens.button = this.generateButtonTokens(values.buttons);
      }
      
      // Generate INPUT tokens
      if (values.inputs && values.inputs.length > 0) {
        componentTokens.input = this.generateInputTokens(values.inputs);
      }
      
      // Generate HEADING tokens
      if (values.headings && values.headings.length > 0) {
        componentTokens.heading = this.generateHeadingTokens(values.headings);
      }
      
      // Generate LABEL tokens
      if (values.labels && values.labels.length > 0) {
        componentTokens.label = this.generateLabelTokens(values.labels);
      }
      
      // Generate CARD tokens
      if (values.cards && values.cards.length > 0) {
        componentTokens.card = this.generateCardTokens(values.cards);
      }
      
      // Generate NAVIGATION tokens
      if (values.navigationItems && values.navigationItems.length > 0) {
        componentTokens.navigation = this.generateNavigationTokens(values.navigationItems);
      }
      
      return componentTokens;
    } catch (error) {
      logger.error(MODULE_NAME, 'generateComponentTokens', 'Error generating component tokens:', error as Error);
      return {};
    }
  }

  private generateButtonTokens(buttons: any[]) {
    const variants: any = {};
    
    buttons.forEach((button: any) => {
      const variantName = button.variant || 'default';
      if (!variants[variantName]) {
        variants[variantName] = {
          backgroundColor: button.backgroundColor,
          textColor: button.textColor,
          borderRadius: button.borderRadius,
          paddingVertical: Math.max(button.padding?.top || 0, button.padding?.bottom || 0),
          paddingHorizontal: Math.max(button.padding?.left || 0, button.padding?.right || 0),
          fontSize: button.fontSize,
          fontWeight: button.fontWeight,
          minHeight: button.height,
          minWidth: button.width,
          shadow: button.shadow
        };
      }
    });
    
    // Ensure we have standard button variants
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
    const variants: any = {};
    
    inputs.forEach((input: any, index: number) => {
      const variantName = `input${index + 1}`;
      variants[variantName] = {
        backgroundColor: input.backgroundColor,
        borderColor: input.borderColor,
        borderRadius: input.borderRadius,
        paddingVertical: Math.max(input.padding?.top || 0, input.padding?.bottom || 0),
        paddingHorizontal: Math.max(input.padding?.left || 0, input.padding?.right || 0),
        fontSize: input.fontSize,
        height: input.height,
        width: input.width
      };
    });
    
    // Create a default input style
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

  private generateHeadingTokens(headings: any[]) {
    const levels: any = {};
    
    headings.forEach((heading: any) => {
      const level = `h${heading.level}`;
      if (!levels[level] || heading.fontSize > (levels[level].fontSize || 0)) {
        levels[level] = {
          fontSize: heading.fontSize,
          fontWeight: heading.fontWeight,
          color: heading.color,
          lineHeight: heading.lineHeight || heading.fontSize * 1.2
        };
      }
    });
    
    // Ensure we have standard heading levels
    if (!levels.h1) levels.h1 = { fontSize: 32, fontWeight: '700', color: '#1A1A1A' };
    if (!levels.h2) levels.h2 = { fontSize: 24, fontWeight: '600', color: '#1A1A1A' };
    if (!levels.h3) levels.h3 = { fontSize: 20, fontWeight: '600', color: '#1A1A1A' };
    
    return levels;
  }

  private generateLabelTokens(labels: any[]) {
    const variants: any = {};
    
    labels.forEach((label: any, index: number) => {
      const variantName = label.fontSize <= 12 ? 'caption' : 'body';
      if (!variants[variantName]) {
        variants[variantName] = {
          fontSize: label.fontSize,
          fontWeight: label.fontWeight,
          color: label.color,
          opacity: label.opacity
        };
      }
    });
    
    // Default label styles
    if (!variants.body) variants.body = { fontSize: 14, fontWeight: '400', color: '#333333' };
    if (!variants.caption) variants.caption = { fontSize: 12, fontWeight: '400', color: '#666666' };
    
    return variants;
  }

  private generateCardTokens(cards: any[]) {
    const variants: any = {};
    
    cards.forEach((card: any, index: number) => {
      const variantName = `card${index + 1}`;
      variants[variantName] = {
        backgroundColor: card.backgroundColor,
        borderRadius: card.borderRadius,
        padding: Math.max(card.padding?.top || 0, card.padding?.left || 0),
        shadow: card.shadow,
        minWidth: card.width,
        minHeight: card.height
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

  private generateNavigationTokens(navItems: any[]) {
    const variants: any = {};
    
    navItems.forEach((nav: any, index: number) => {
      const variantName = nav.name.toLowerCase().includes('header') ? 'header' : 
                         nav.name.toLowerCase().includes('footer') ? 'footer' : 
                         nav.name.toLowerCase().includes('tab') ? 'tabBar' : `nav${index + 1}`;
      
      variants[variantName] = {
        backgroundColor: nav.backgroundColor,
        height: nav.height,
        paddingHorizontal: Math.max(nav.padding?.left || 0, nav.padding?.right || 0),
        paddingVertical: Math.max(nav.padding?.top || 0, nav.padding?.bottom || 0)
      };
    });
    
    return { variants };
  }

  // Helper methods
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
      '#6C757D': 'secondary',
      '#F8F9FA': 'light',
      '#343A40': 'dark'
    };
    
    return colorMappings[hex.toUpperCase()] || null;
  }

  private safeStringify(obj: any, indent: number = 2): string {
    return JSON.stringify(obj, (key, value) => {
      // Handle Figma mixed values and other Symbols
      if (typeof value === 'symbol') {
        return undefined; // Remove symbol values
      }
      // Handle functions
      if (typeof value === 'function') {
        return undefined;
      }
      // Handle undefined
      if (value === undefined) {
        return undefined;
      }
      return value;
    }, indent);
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