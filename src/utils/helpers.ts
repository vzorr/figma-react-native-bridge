// src/utils/helpers.ts
// Helper functions for the plugin (Timer-free version)

import type { ColorMapping, FontWeightMapping, AlignmentMapping, ReactNativeComponent, ComponentData } from '../types/plugin.types';

/**
 * Convert RGB color to hex format
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Get semantic color name based on common color values
 */
export function getSemanticColorName(hex: string): string | null {
  const colorMappings: ColorMapping = {
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

/**
 * Map Figma font weight to React Native font weight
 */
export function mapFigmaFontWeight(weight: string): string {
  const weightMap: FontWeightMapping = {
    'Thin': '100',
    'Extra Light': '200',
    'Light': '300',
    'Regular': '400',
    'Normal': '400',
    'Medium': '500',
    'Semi Bold': '600',
    'SemiBold': '600',
    'Bold': '700',
    'Extra Bold': '800',
    'ExtraBold': '800',
    'Black': '900',
    'Heavy': '900'
  };
  
  return weightMap[weight] || '400';
}

/**
 * Map Figma alignment to React Native flexbox alignment
 */
export function mapFigmaAlignment(alignment: string): string {
  const alignmentMap: AlignmentMapping = {
    'MIN': 'flex-start',
    'CENTER': 'center',
    'MAX': 'flex-end',
    'SPACE_BETWEEN': 'space-between',
    'SPACE_AROUND': 'space-around',
    'SPACE_EVENLY': 'space-evenly'
  };
  
  return alignmentMap[alignment] || 'flex-start';
}

/**
 * Determine React Native component type based on Figma component
 */
export function getReactNativeComponent(component: ComponentData): ReactNativeComponent {
  const name = component.name.toLowerCase();
  
  // Enhanced pattern matching
  if (name.match(/button|btn|cta|action/)) return 'TouchableOpacity';
  if (name.match(/input|textfield|textbox|form/)) return 'TextInput';
  if (name.match(/image|img|photo|picture|avatar/)) return 'Image';
  if (name.match(/scroll|list|flatlist/)) return 'ScrollView';
  if (name.match(/header|navigation|navbar/)) return 'Header';
  if (name.match(/modal|popup|overlay/)) return 'Modal';
  if (name.match(/switch|toggle/)) return 'Switch';
  if (name.match(/custom.*button/)) return 'CustomButton';
  if (name.match(/custom.*input/)) return 'CustomInput';
  
  // Check if component has text content
  if (component.text) return 'Text';
  
  // Layout components based on auto layout
  if (component.layoutMode === 'HORIZONTAL' || component.layoutMode === 'VERTICAL') {
    return 'View';
  }
  
  // Default to View for containers
  return 'View';
}

/**
 * Sanitize component name for use as style identifier
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .replace(/^[0-9]/, '_') // Add underscore if starts with number
    .toLowerCase();
}

/**
 * Generate component props based on component type and data
 */
export function generateComponentProps(component: ComponentData): string {
  const props: string[] = [];
  const componentType = getReactNativeComponent(component);
  
  switch (componentType) {
    case 'TextInput':
      props.push('placeholder="Enter text"');
      if (component.text) {
        props.push(`value="${component.text}"`);
      }
      break;
      
    case 'TouchableOpacity':
    case 'CustomButton':
      props.push('onPress={() => {}}');
      if (component.text) {
        props.push(`title="${component.text}"`);
      }
      break;
      
    case 'Image':
      props.push('source={{ uri: "placeholder-image.jpg" }}');
      props.push('resizeMode="cover"');
      break;
      
    case 'ScrollView':
      props.push('showsVerticalScrollIndicator={false}');
      break;
      
    case 'Modal':
      props.push('visible={true}');
      props.push('transparent={true}');
      break;
      
    case 'Switch':
      props.push('value={false}');
      props.push('onValueChange={(value) => {}}');
      break;
  }
  
  return props.length > 0 ? ' ' + props.join(' ') : '';
}

/**
 * Check if a value is valid and not undefined/null
 */
export function isValidValue(value: any): boolean {
  return value !== undefined && value !== null && !Number.isNaN(value);
}

/**
 * Safe number conversion with fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
  const num = Number(value);
  return isValidValue(num) && !Number.isNaN(num) ? num : fallback;
}

/**
 * Generate unique identifier for components
 */
export function generateUniqueId(baseName: string, existingIds: Set<string>): string {
  let counter = 1;
  let id = sanitizeName(baseName);
  
  while (existingIds.has(id)) {
    id = `${sanitizeName(baseName)}${counter}`;
    counter++;
  }
  
  existingIds.add(id);
  return id;
}

/**
 * Format shadow effect for React Native code generation
 * This converts Figma shadow effects to CSS-style shadow strings
 * that will be used in the generated React Native StyleSheet
 */
export function formatShadow(effect: any): string {
  // Type guard to ensure it's a drop shadow effect
  if (effect.type === 'DROP_SHADOW' && effect.visible !== false) {
    const { offset, radius, color } = effect;
    const hexColor = rgbToHex(color.r, color.g, color.b);
    return `${offset.x}px ${offset.y}px ${radius}px ${hexColor}`;
  }
  
  // Fallback for other effect types
  return '0px 0px 0px #000000';
}

/**
 * Deep clone an object (for avoiding mutation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}