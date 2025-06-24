// src/utils/generation.ts
// Code generation utilities (ES2017 compatible - no Object.fromEntries)

import { ExtractedValues, ComponentData, ScreenStructure } from '@core/types';
import { sanitizeName } from '@utils/figma-helpers';

// Helper functions for code generation
export function getSemanticColorName(color: string): string | null {
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
  
  return colorMappings[color.toUpperCase()] || null;
}

export function mapFigmaFontWeight(weight: string): string {
  const mappings: Record<string, string> = {
    'Thin': '100',
    'Extra Light': '200',
    'Light': '300',
    'Normal': '400',
    'Regular': '400',
    'Medium': '500',
    'Semi Bold': '600',
    'SemiBold': '600',
    'Bold': '700',
    'Extra Bold': '800',
    'Black': '900',
    'Heavy': '900'
  };
  
  return mappings[weight] || '400';
}

export function getReactNativeComponent(component: ComponentData): string {
  const type = component.type?.toLowerCase();
  
  switch (type) {
    case 'button':
      return 'TouchableOpacity';
    case 'input':
      return 'TextInput';
    case 'text':
    case 'heading':
    case 'label':
      return 'Text';
    case 'image':
      return 'Image';
    case 'scroll':
      return 'ScrollView';
    default:
      return 'View';
  }
}

export function generateComponentProps(component: ComponentData): string {
  const props: string[] = [];
  
  if (component.width && component.height) {
    props.push(`style={styles.${sanitizeName(component.name)}}`);
  }
  
  if (component.placeholder && component.type === 'input') {
    props.push(`placeholder="${component.placeholder}"`);
  }
  
  return props.length > 0 ? ` ${props.join(' ')}` : '';
}

export function generateUniqueId(baseName: string, existingIds: Set<string>): string {
  let id = sanitizeName(baseName);
  let counter = 1;
  
  while (existingIds.has(id)) {
    id = `${sanitizeName(baseName)}${counter}`;
    counter++;
  }
  
  existingIds.add(id);
  return id;
}

// Generated theme interface
export interface GeneratedTheme {
  colors: Record<string, string>;
  typography: {
    fontSize: Record<string, number>;
    fontWeight: Record<string, string>;
    fontFamily: Record<string, string>;
    [key: string]: any;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
  opacity: Record<string, number>;
}

/**
 * Generate colors object using ES2017-compatible reduce method
 */
function generateColorsObject(colors: Set<string>): Record<string, string> {
  const colorArray = Array.from(colors);
  return colorArray.reduce((acc: Record<string, string>, color: string, index: number) => {
    const colorName = getSemanticColorName(color) || `color${index + 1}`;
    acc[colorName] = color;
    return acc;
  }, {});
}

/**
 * Generate typography theme object using ES2017-compatible methods
 */
function generateTypographyObject(fontSizes: Set<number>, fontWeights: Set<string>, fontFamilies: Set<string>): GeneratedTheme['typography'] {
  // Convert font sizes
  const fontSizeArray = Array.from(fontSizes);
  const fontSizeObj = fontSizeArray.reduce((acc: Record<string, number>, size: number, index: number) => {
    acc[`size${index + 1}`] = size;
    return acc;
  }, {});

  // Convert font weights  
  const fontWeightArray = Array.from(fontWeights);
  const fontWeightObj = fontWeightArray.reduce((acc: Record<string, string>, weight: string) => {
    const mappedWeight = mapFigmaFontWeight(weight);
    const key = weight.toLowerCase().replace(/\s+/g, '');
    acc[key] = mappedWeight;
    return acc;
  }, {});

  // Convert font families
  const fontFamilyArray = Array.from(fontFamilies);
  const fontFamilyObj = fontFamilyArray.reduce((acc: Record<string, string>, family: string, index: number) => {
    acc[`font${index + 1}`] = family;
    return acc;
  }, {});

  return {
    ...fontSizeObj,
    fontSize: fontSizeObj,
    fontWeight: fontWeightObj,
    fontFamily: fontFamilyObj
  };
}

/**
 * Generate spacing object using ES2017-compatible reduce method
 */
function generateSpacingObject(spacing: Set<number>): Record<string, number> {
  const spacingArray = Array.from(spacing).sort((a, b) => a - b);
  return spacingArray.reduce((acc: Record<string, number>, space: number, index: number) => {
    acc[`space${index + 1}`] = space;
    return acc;
  }, {});
}

/**
 * Generate border radius object using ES2017-compatible reduce method
 */
function generateBorderRadiusObject(borderRadius: Set<number>): Record<string, number> {
  const radiusArray = Array.from(borderRadius).sort((a, b) => a - b);
  return radiusArray.reduce((acc: Record<string, number>, radius: number, index: number) => {
    acc[`radius${index + 1}`] = radius;
    return acc;
  }, {});
}

/**
 * Generate shadows object using ES2017-compatible reduce method
 */
function generateShadowsObject(shadows: Set<string>): Record<string, string> {
  const shadowArray = Array.from(shadows);
  return shadowArray.reduce((acc: Record<string, string>, shadow: string, index: number) => {
    acc[`shadow${index + 1}`] = shadow;
    return acc;
  }, {});
}

/**
 * Generate opacity object using ES2017-compatible reduce method
 */
function generateOpacityObject(opacity: Set<number>): Record<string, number> {
  const opacityArray = Array.from(opacity).sort((a, b) => a - b);
  return opacityArray.reduce((acc: Record<string, number>, opacityValue: number, index: number) => {
    acc[`opacity${index + 1}`] = opacityValue;
    return acc;
  }, {});
}

/**
 * Generate React Native theme from extracted values
 */
export function generateReactNativeTheme(values: ExtractedValues): GeneratedTheme {
  const theme: GeneratedTheme = {
    colors: generateColorsObject(values.colors),
    typography: generateTypographyObject(values.fontSizes, values.fontWeights, values.fontFamilies),
    spacing: generateSpacingObject(values.spacing),
    borderRadius: generateBorderRadiusObject(values.borderRadius),
    shadows: generateShadowsObject(values.shadows),
    opacity: generateOpacityObject(values.opacity)
  };

  return theme;
}

/**
 * Generate complete theme file content as TypeScript code
 */
export function generateThemeFileContent(theme: GeneratedTheme): string {
  return `// theme/index.ts - Generated from Figma Design Tokens
// React Native Responsive Design System

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base design dimensions (update based on your designs)
const DESIGN_WIDTH = 375;
const DESIGN_HEIGHT = 812;

// Responsive scaling utilities
const scale = (size: number): number => (width / DESIGN_WIDTH) * size;
const verticalScale = (size: number): number => (height / DESIGN_HEIGHT) * size;
const moderateScale = (size: number, factor: number = 0.5): number => 
  size + (scale(size) - size) * factor;

// Design tokens extracted from Figma
export const COLORS = ${JSON.stringify(theme.colors, null, 2)};

export const TYPOGRAPHY = ${JSON.stringify(theme.typography, null, 2)};

export const SPACING = ${JSON.stringify(theme.spacing, null, 2)};

export const BORDER_RADIUS = ${JSON.stringify(theme.borderRadius, null, 2)};

export const SHADOWS = ${JSON.stringify(theme.shadows, null, 2)};

export const OPACITY = ${JSON.stringify(theme.opacity, null, 2)};

// Responsive utilities for scaling
export const responsiveSize = {
  font: (size: number): number => moderateScale(size, 0.3),
  width: (size: number): number => scale(size),
  height: (size: number): number => verticalScale(size),
  padding: (size: number): number => scale(size),
  margin: (size: number): number => scale(size),
  borderRadius: (size: number): number => scale(size),
};

// Platform-specific adjustments
export const platformStyle = {
  shadow: Platform.select({
    ios: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
  }),
  fontSize: Platform.select({
    ios: (size: number): number => size,
    android: (size: number): number => Math.max(size - 1, 12), // Ensure minimum font size
  }),
};

// Helper functions for theme usage
export const getColor = (colorName: string): string => COLORS[colorName] || COLORS.color1 || '#000000';
export const getSpacing = (spaceName: string): number => SPACING[spaceName] || SPACING.space1 || 8;
export const getFontSize = (sizeName: string): number => TYPOGRAPHY.fontSize[sizeName] || 14;
export const getBorderRadius = (radiusName: string): number => BORDER_RADIUS[radiusName] || 4;

// Main theme export
export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  OPACITY,
  responsiveSize,
  platformStyle,
  getColor,
  getSpacing,
  getFontSize,
  getBorderRadius,
};`;
}

/**
 * Generate React Native screen component from structure
 */
export function generateReactNativeScreen(screenStructure: ScreenStructure, theme: GeneratedTheme): string {
  const componentName = sanitizeName(screenStructure.name);
  const existingIds = new Set<string>();

  function generateComponentJSX(component: ComponentData, depth: number = 0): string {
    const indent = '  '.repeat(depth + 1);
    const componentType = getReactNativeComponent(component);
    const props = generateComponentProps(component);
    const uniqueId = generateUniqueId(component.name, existingIds);
    
    let jsx = `${indent}<${componentType}${props}`;
    
    if (component.children && component.children.length > 0) {
      jsx += '>\n';
      jsx += component.children.map((child: ComponentData) => generateComponentJSX(child, depth + 1)).join('\n');
      jsx += `\n${indent}</${componentType}>`;
    } else if (component.text) {
      jsx += `>\n${indent}  {/* ${component.text} */}\n${indent}</${componentType}>`;
    } else {
      jsx += ' />';
    }
    
    return jsx;
  }

  const componentsJSX = screenStructure.components
    .map((component: ComponentData) => generateComponentJSX(component))
    .join('\n');

  return `// ${componentName}.tsx - Generated from Figma
// React Native Screen Component

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import theme from '../theme';

const { width, height } = Dimensions.get('window');

interface ${componentName}Props {
  // Add your props here
}

const ${componentName}: React.FC<${componentName}Props> = () => {
  return (
    <View style={styles.container}>
${componentsJSX}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: ${screenStructure.width},
    height: ${screenStructure.height},
    backgroundColor: theme.getColor('background') || '#FFFFFF',
  },
  // Add more styles based on your components
});

export default ${componentName};`;
}