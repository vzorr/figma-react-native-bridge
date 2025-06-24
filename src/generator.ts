// src/generator.ts
// React Native Code Generator with Responsive Design

import { DesignTokens, ExtractedScreen, ReactNativeTheme, ComponentData } from './types';

export class ReactNativeGenerator {

  // Generate responsive theme from design tokens
  generateTheme(tokens: DesignTokens): ReactNativeTheme {
    console.log('🎨 Generating responsive theme...');
    
    return {
      colors: this.generateColorTokens(tokens.colors),
      typography: this.generateTypographyTokens(tokens.fontSizes, tokens.fontWeights),
      spacing: this.generateSpacingTokens(tokens.spacing),
      borderRadius: this.generateRadiusTokens(tokens.borderRadius),
      shadows: this.generateShadowTokens(tokens.shadows)
    };
  }

  // Generate complete theme file code
  generateThemeFile(theme: ReactNativeTheme): string {
    return `// theme/index.ts
// Generated Responsive Design System from Figma

import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Base design dimensions (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Responsive scaling functions
const scale = (size: number): number => (screenWidth / BASE_WIDTH) * size;
const verticalScale = (size: number): number => (screenHeight / BASE_HEIGHT) * size;
const moderateScale = (size: number, factor: number = 0.5): number => 
  size + (scale(size) - size) * factor;

// Design Tokens
export const colors = ${JSON.stringify(theme.colors, null, 2)};

export const typography = ${JSON.stringify(theme.typography, null, 2)};

export const spacing = ${JSON.stringify(theme.spacing, null, 2)};

export const borderRadius = ${JSON.stringify(theme.borderRadius, null, 2)};

export const shadows = ${JSON.stringify(theme.shadows, null, 2)};

// Responsive utilities
export const responsive = {
  // Font scaling
  fontSize: (size: number): number => moderateScale(size, 0.3),
  
  // Dimension scaling
  width: (size: number): number => scale(size),
  height: (size: number): number => verticalScale(size),
  
  // Spacing scaling
  padding: (size: number): number => scale(size),
  margin: (size: number): number => scale(size),
  
  // Border radius scaling
  radius: (size: number): number => scale(size),
};

// Platform-specific styles
export const platformStyles = {
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
  }),
  
  text: Platform.select({
    ios: {},
    android: {
      includeFontPadding: false,
    },
  }),
};

// Device type detection
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (screenWidth <= 480) return 'mobile';
  if (screenWidth <= 768) return 'tablet';
  return 'desktop';
};

// Helper functions
export const getColor = (name: keyof typeof colors): string => colors[name] || colors.primary;
export const getSpacing = (name: keyof typeof spacing): number => responsive.padding(spacing[name]);
export const getFontSize = (name: keyof typeof typography.sizes): number => responsive.fontSize(typography.sizes[name]);
export const getRadius = (name: keyof typeof borderRadius): number => responsive.radius(borderRadius[name]);

// Main theme export
const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  responsive,
  platformStyles,
  getDeviceType,
  getColor,
  getSpacing,
  getFontSize,
  getRadius,
};

export default theme;`;
  }

  // Generate React Native screen component
  generateScreenComponent(screen: ExtractedScreen, theme: ReactNativeTheme): string {
    const componentName = this.sanitizeComponentName(screen.name);
    const imports = this.generateImports(screen.components);
    const componentJSX = this.generateComponentJSX(screen.components);
    const styles = this.generateStyles(screen, theme);

    return `// ${componentName}.tsx
// Generated from Figma - ${screen.name}
// Device: ${screen.deviceType} | Dimensions: ${screen.width}×${screen.height}

import React from 'react';
import {
${imports.join(',\n')}
} from 'react-native';
import theme from '../theme';

interface ${componentName}Props {
  navigation?: any;
}

const ${componentName}: React.FC<${componentName}Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
${componentJSX}
    </View>
  );
};

const styles = StyleSheet.create({
${styles}
});

export default ${componentName};

// Usage:
// import ${componentName} from './screens/${componentName}';
// <${componentName} navigation={navigation} />`;
  }

  // Generate color tokens
  private generateColorTokens(colors: Set<string>): Record<string, string> {
    const colorArray = Array.from(colors);
    const tokens: Record<string, string> = {};
    
    // Assign semantic names to common colors
    colorArray.forEach((color, index) => {
      const semantic = this.getSemanticColorName(color);
      if (semantic) {
        tokens[semantic] = color;
      } else {
        tokens[`color${index + 1}`] = color;
      }
    });
    
    // Ensure essential colors exist
    if (!tokens.primary) tokens.primary = colorArray[0] || '#007AFF';
    if (!tokens.white) tokens.white = '#FFFFFF';
    if (!tokens.black) tokens.black = '#000000';
    if (!tokens.gray) tokens.gray = '#8E8E93';
    
    return tokens;
  }

  // Generate typography tokens
  private generateTypographyTokens(fontSizes: Set<number>, fontWeights: Set<string>): any {
    const sizesArray = Array.from(fontSizes).sort((a, b) => a - b);
    const weightsArray = Array.from(fontWeights);
    
    const sizes: Record<string, number> = {};
    const weights: Record<string, string> = {};
    
    // Map font sizes to semantic names
    sizesArray.forEach(size => {
      if (size <= 12) sizes.xs = size;
      else if (size <= 14) sizes.sm = size;
      else if (size <= 16) sizes.base = size;
      else if (size <= 18) sizes.lg = size;
      else if (size <= 24) sizes.xl = size;
      else if (size <= 32) sizes['2xl'] = size;
      else sizes['3xl'] = size;
    });
    
    // Ensure base sizes exist
    if (!sizes.xs) sizes.xs = 12;
    if (!sizes.sm) sizes.sm = 14;
    if (!sizes.base) sizes.base = 16;
    if (!sizes.lg) sizes.lg = 18;
    
    // Map font weights
    weightsArray.forEach(weight => {
      const normalized = this.normalizeFontWeight(weight);
      if (normalized === '300') weights.light = normalized;
      else if (normalized === '400') weights.normal = normalized;
      else if (normalized === '500') weights.medium = normalized;
      else if (normalized === '600') weights.semibold = normalized;
      else if (normalized === '700') weights.bold = normalized;
    });
    
    if (!weights.normal) weights.normal = '400';
    if (!weights.bold) weights.bold = '700';
    
    return { sizes, weights };
  }

  // Generate spacing tokens
  private generateSpacingTokens(spacing: Set<number>): Record<string, number> {
    const spacingArray = Array.from(spacing).sort((a, b) => a - b);
    const tokens: Record<string, number> = {};
    
    spacingArray.forEach(space => {
      if (space <= 4) tokens.xs = space;
      else if (space <= 8) tokens.sm = space;
      else if (space <= 16) tokens.md = space;
      else if (space <= 24) tokens.lg = space;
      else if (space <= 32) tokens.xl = space;
      else tokens['2xl'] = space;
    });
    
    // Ensure base spacing exists
    if (!tokens.xs) tokens.xs = 4;
    if (!tokens.sm) tokens.sm = 8;
    if (!tokens.md) tokens.md = 16;
    if (!tokens.lg) tokens.lg = 24;
    
    return tokens;
  }

  // Generate border radius tokens
  private generateRadiusTokens(borderRadius: Set<number>): Record<string, number> {
    const radiusArray = Array.from(borderRadius).sort((a, b) => a - b);
    const tokens: Record<string, number> = {};
    
    radiusArray.forEach(radius => {
      if (radius <= 4) tokens.sm = radius;
      else if (radius <= 8) tokens.md = radius;
      else if (radius <= 12) tokens.lg = radius;
      else if (radius >= 50) tokens.full = radius;
      else tokens.xl = radius;
    });
    
    if (!tokens.sm) tokens.sm = 4;
    if (!tokens.md) tokens.md = 8;
    
    return tokens;
  }

  // Generate shadow tokens
  private generateShadowTokens(shadows: Set<string>): Record<string, string> {
    const shadowArray = Array.from(shadows);
    const tokens: Record<string, string> = {};
    
    shadowArray.forEach((shadow, index) => {
      tokens[`shadow${index + 1}`] = shadow;
    });
    
    // Ensure basic shadows exist
    if (!tokens.shadow1) {
      tokens.shadow1 = '0px 2px 4px rgba(0,0,0,0.1)';
      tokens.shadow2 = '0px 4px 8px rgba(0,0,0,0.15)';
      tokens.shadow3 = '0px 8px 16px rgba(0,0,0,0.2)';
    }
    
    return tokens;
  }

  // Generate component imports based on component types
  private generateImports(components: ComponentData[]): string[] {
    const imports = new Set(['View', 'StyleSheet']);
    
    const addImportsRecursive = (comps: ComponentData[]) => {
      comps.forEach(comp => {
        switch (comp.type) {
          case 'text':
          case 'heading':
          case 'caption':
            imports.add('Text');
            break;
          case 'button':
            imports.add('TouchableOpacity');
            imports.add('Text');
            break;
          case 'input':
            imports.add('TextInput');
            break;
          case 'image':
            imports.add('Image');
            break;
        }
        
        if (comp.children && comp.children.length > 0) {
          addImportsRecursive(comp.children);
        }
      });
    };
    
    addImportsRecursive(components);
    
    return Array.from(imports).map(imp => `  ${imp}`);
  }

  // Generate component JSX
  private generateComponentJSX(components: ComponentData[], depth: number = 3): string {
    const indent = '  '.repeat(depth);
    
    return components.map(comp => {
      const styleName = this.sanitizeStyleName(comp.name);
      
      switch (comp.type) {
        case 'text':
        case 'heading':
        case 'caption':
          return `${indent}<Text style={styles.${styleName}}>
${indent}  ${comp.text || 'Text content'}
${indent}</Text>`;
          
        case 'button':
          return `${indent}<TouchableOpacity style={styles.${styleName}} onPress={() => {}}>
${indent}  <Text style={styles.${styleName}Text}>
${indent}    ${comp.text || 'Button'}
${indent}  </Text>
${indent}</TouchableOpacity>`;
          
        case 'input':
          return `${indent}<TextInput
${indent}  style={styles.${styleName}}
${indent}  placeholder="${comp.text || 'Enter text...'}"
${indent}  placeholderTextColor={theme.getColor('gray')}
${indent}/>`;
          
        case 'image':
          return `${indent}<Image
${indent}  style={styles.${styleName}}
${indent}  source={{ uri: 'https://via.placeholder.com/${comp.width}x${comp.height}' }}
${indent}  resizeMode="cover"
${indent}/>`;
          
        default:
          const childrenJSX = comp.children && comp.children.length > 0 
            ? '\n' + this.generateComponentJSX(comp.children, depth + 1) + '\n' + indent
            : '';
          return `${indent}<View style={styles.${styleName}}>${childrenJSX}</View>`;
      }
    }).join('\n');
  }

  // Generate StyleSheet styles
  private generateStyles(screen: ExtractedScreen, theme: ReactNativeTheme): string {
    const styles: string[] = [];
    
    // Container style
    styles.push(`  container: {
    flex: 1,
    backgroundColor: '${screen.backgroundColor || theme.colors.white}',
    width: ${screen.width},
    height: ${screen.height},
    alignSelf: 'center',
  }`);
    
    // Generate styles for each component
    const generateComponentStyles = (components: ComponentData[]) => {
      components.forEach(comp => {
        const styleName = this.sanitizeStyleName(comp.name);
        const style = this.generateComponentStyle(comp, theme);
        styles.push(`  ${styleName}: ${style}`);
        
        // Generate text style for buttons
        if (comp.type === 'button') {
          styles.push(`  ${styleName}Text: {
    color: '${comp.textColor || theme.colors.white}',
    fontSize: theme.responsive.fontSize(${comp.fontSize || 16}),
    fontWeight: '${this.normalizeFontWeight(comp.fontWeight)}',
    textAlign: 'center',
  }`);
        }
        
        if (comp.children && comp.children.length > 0) {
          generateComponentStyles(comp.children);
        }
      });
    };
    
    generateComponentStyles(screen.components);
    
    return styles.join(',\n');
  }

  // Generate individual component style
  private generateComponentStyle(comp: ComponentData, theme: ReactNativeTheme): string {
    const baseStyle: any = {
      position: 'absolute',
      left: comp.x,
      top: comp.y,
      width: comp.width,
      height: comp.height,
    };
    
    if (comp.backgroundColor) {
      baseStyle.backgroundColor = `'${comp.backgroundColor}'`;
    }
    
    if (comp.borderRadius > 0) {
      baseStyle.borderRadius = `theme.responsive.radius(${comp.borderRadius})`;
    }
    
    if (comp.padding && (comp.padding.top > 0 || comp.padding.left > 0)) {
      baseStyle.paddingTop = `theme.responsive.padding(${comp.padding.top})`;
      baseStyle.paddingRight = `theme.responsive.padding(${comp.padding.right})`;
      baseStyle.paddingBottom = `theme.responsive.padding(${comp.padding.bottom})`;
      baseStyle.paddingLeft = `theme.responsive.padding(${comp.padding.left})`;
    }
    
    // Add text-specific styles
    if (comp.type === 'text' || comp.type === 'heading' || comp.type === 'caption') {
      if (comp.fontSize) {
        baseStyle.fontSize = `theme.responsive.fontSize(${comp.fontSize})`;
      }
      if (comp.textColor) {
        baseStyle.color = `'${comp.textColor}'`;
      }
      if (comp.fontWeight) {
        baseStyle.fontWeight = `'${this.normalizeFontWeight(comp.fontWeight)}'`;
      }
    }
    
    // Add button-specific styles
    if (comp.type === 'button') {
      baseStyle.justifyContent = "'center'";
      baseStyle.alignItems = "'center'";
    }
    
    // Convert to string format
    const styleString = Object.entries(baseStyle)
      .map(([key, value]) => `    ${key}: ${value}`)
      .join(',\n');
      
    return `{\n${styleString},\n  }`;
  }

  // Helper methods
  private getSemanticColorName(color: string): string | null {
    const colorMap: Record<string, string> = {
      '#FFFFFF': 'white',
      '#000000': 'black',
      '#007AFF': 'primary',
      '#FF3B30': 'red',
      '#34C759': 'green',
      '#FF9500': 'orange',
      '#8E8E93': 'gray',
    };
    return colorMap[color] || null;
  }

  private normalizeFontWeight(weight?: string): string {
    if (!weight) return '400';
    
    const weightMap: Record<string, string> = {
      'Thin': '100',
      'Light': '300',
      'Regular': '400',
      'Medium': '500',
      'Semibold': '600',
      'Bold': '700',
      'Heavy': '900',
    };
    
    return weightMap[weight] || '400';
  }

  private sanitizeComponentName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, 'Screen')
      .replace(/^./, str => str.toUpperCase()) + 'Screen';
  }

  private sanitizeStyleName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9]/g, '')
      .replace(/^[0-9]/, 'style')
      .toLowerCase();
  }
}