// src/utils/helpers.ts
// Simple helper functions for code generation

/**
 * Get semantic color name from hex value
 */
export function getSemanticColorName(hex: string): string | null {
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

/**
 * Map Figma font weight to CSS font weight
 */
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

/**
 * Get appropriate React Native component for design element
 */
export function getReactNativeComponent(component: any): string {
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

/**
 * Sanitize name for use in code
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'component';
  }
  
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[0-9]/, '_')
    .toLowerCase() || 'component';
}

/**
 * Generate component props string
 */
export function generateComponentProps(component: any): string {
  const props: string[] = [];
  
  if (component.width && component.height) {
    props.push(`style={styles.${sanitizeName(component.name)}}`);
  }
  
  if (component.placeholder && component.type === 'input') {
    props.push(`placeholder="${component.placeholder}"`);
  }
  
  return props.length > 0 ? ` ${props.join(' ')}` : '';
}

/**
 * Generate unique ID for component
 */
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

export default {
  getSemanticColorName,
  mapFigmaFontWeight,
  getReactNativeComponent,
  sanitizeName,
  generateComponentProps,
  generateUniqueId
};