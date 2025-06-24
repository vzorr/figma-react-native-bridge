function handleExtractScreens(): void {
  try {
    console.log('Starting comprehensive screens extraction...');
    sendProgress(10);
    
    // Find all frames in ALL pages, not just current page
    const allPages = figma.root.children.filter((node: any) => node.type === 'PAGE');
    let allFrames: any[] = [];
    
    allPages.forEach((page: any) => {
      const pageFrames = page.children.filter((node: any) => node.type === 'FRAME');
      allFrames = allFrames.concat(pageFrames);
    });
    
    if (allFrames.length === 0) {
      figma.ui.postMessage({
        type: 'extraction-error',
        error: 'No frames found across all pages. Please create some frames to extract as screens.'
      });
      return;
    }
    
    console.log(`Found ${allFrames.length} frames across ${allPages.length} pages`);
    sendProgress(20);
    
    // Extract design values from ALL content
    const extractedValues = extractDesignValuesFromAllPages();
    const theme = generateTheme(extractedValues);
    
    sendProgress(40);
    
    // Extract each frame as a screen with detailed analysis
    const screens = allFrames.map((frame: any, index: number) => {
      sendProgress(40 + (index / allFrames.length) * 50);
      
      console.log(`Extracting screen: ${frame.name} (${frame.width}x${frame.height})`);
      
      // Enhanced screen structure extraction
      const screenStructure = extractEnhancedScreenStructure(frame);
      const screenCode = generateEnhancedScreenCode(screenStructure, theme);
      
      return {
        structure: screenStructure,
        code: screenCode,
        componentCount: countComponentsRecursively(screenStructure.components),
        semanticComponents: analyzeSemanticComponents(screenStructure.components),
        designPatterns: identifyDesignPatterns(screenStructure.components)
      };
    });
    
    sendProgress(95);
    
    // Generate comprehensive analysis
    const analysisReport = generateDesignSystemAnalysis(extractedValues, screens);
    
    sendProgress(100);
    
    const result = {
      screens: screens,
      theme: theme,
      analysis: analysisReport,
      totalFrames: allFrames.length,
      totalPages: allPages.length
    };
    
    console.log(`Comprehensive extraction complete. Generated ${screens.length} screens with semantic analysis.`);
    
    figma.ui.postMessage({
      type: 'screens-extracted',
      data: result
    });
    
  } catch (error) {
    handleUnexpectedError(error, 'comprehensive screens extraction');
  }
}

function extractScreenStructure(frame: any) {
  return {
    name: frame.name,
    width: frame.width,
    height: frame.height,
    components: frame.children ? extractComponentHierarchy(frame.children) : []
  };
}

function extractComponentHierarchy(nodes: any[]) {
  return nodes
    .map((node: any) => extractComponentData(node))
    .filter((data: any) => data !== null);
}

function extractComponentData(node: any) {
  try {
    const baseData: any = {
      id: node.id,
      name: node.name,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    };

    if (node.type === 'TEXT') {
      baseData.text = node.characters;
      if (typeof node.fontSize === 'number') {
        baseData.fontSize = node.fontSize;
      }
    }

    if ('children' in node && node.children && node.children.length > 0) {
      baseData.children = extractComponentHierarchy(node.children);
    }

    return baseData;
  } catch (error) {
    console.warn(`Error extracting component data from ${node.name}:`, error);
    return null;
  }
}

// Helper function to safely stringify objects with Symbols
function safeStringify(obj: any, indent: number = 2): string {
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

function generateThemeFileContent(theme: any): string {
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

  return `// theme/index.ts - Generated Design System from Figma
// Complete Semantic Design System with Component Tokens

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive scaling
const scale = (size: number): number => (width / 375) * size;
const verticalScale = (size: number): number => (height / 812) * size;
const moderateScale = (size: number, factor: number = 0.5): number => 
  size + (scale(size) - size) * factor;

// 🎨 SEMANTIC COLOR PALETTE
export const COLORS = ${safeStringify(cleanTheme.colors)};

// 📝 TYPOGRAPHY SCALE  
export const TYPOGRAPHY = ${safeStringify(cleanTheme.typography)};

// 📏 SPACING SCALE
export const SPACING = ${safeStringify(cleanTheme.spacing)};

// 🔘 BORDER RADIUS SCALE
export const BORDER_RADIUS = ${safeStringify(cleanTheme.borderRadius)};

// 🌊 SHADOW SYSTEM
export const SHADOWS = ${safeStringify(cleanTheme.shadows)};

// 👻 OPACITY SCALE
export const OPACITY = ${safeStringify(cleanTheme.opacity)};

${cleanTheme.components && Object.keys(cleanTheme.components).length > 0 ? `// 🧩 COMPONENT TOKENS
export const COMPONENTS = ${safeStringify(cleanTheme.components)};` : ''}

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

${theme.components ? `// 🏗️ COMPONENT STYLE PRESETS
export const components = {
  ${theme.components.button ? `button: {
    ${Object.entries(theme.components.button.variants).map(([variant, styles]: [string, any]) => `
    ${variant}: {
      backgroundColor: '${styles.backgroundColor || 'transparent'}',
      ${styles.textColor ? `color: '${styles.textColor}',` : ''}
      paddingVertical: ${styles.paddingVertical || 12},
      paddingHorizontal: ${styles.paddingHorizontal || 24},
      borderRadius: ${styles.borderRadius || 8},
      fontSize: ${styles.fontSize || 16},
      fontWeight: '${styles.fontWeight || '600'}',
      ${styles.minHeight ? `minHeight: ${styles.minHeight},` : ''}
      ${styles.shadow ? `shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,` : ''}
    },`).join('')}
  },` : ''}
  
  ${theme.components.input ? `input: {
    ${Object.entries(theme.components.input.variants).map(([variant, styles]: [string, any]) => `
    ${variant}: {
      backgroundColor: '${styles.backgroundColor || '#FFFFFF'}',
      borderColor: '${styles.borderColor || '#E1E5E9'}',
      borderWidth: 1,
      borderRadius: ${styles.borderRadius || 8},
      paddingVertical: ${styles.paddingVertical || 12},
      paddingHorizontal: ${styles.paddingHorizontal || 16},
      fontSize: ${styles.fontSize || 16},
      ${styles.height ? `height: ${styles.height},` : ''}
    },`).join('')}
  },` : ''}
  
  ${theme.components.heading ? `text: {
    ${Object.entries(theme.components.heading).map(([level, styles]: [string, any]) => `
    ${level}: {
      fontSize: ${styles.fontSize || 16},
      fontWeight: '${styles.fontWeight || '600'}',
      color: '${styles.color || '#1A1A1A'}',
      ${styles.lineHeight ? `lineHeight: ${styles.lineHeight},` : ''}
    },`).join('')}
  },` : ''}
  
  ${theme.components.card ? `card: {
    ${Object.entries(theme.components.card.variants).map(([variant, styles]: [string, any]) => `
    ${variant}: {
      backgroundColor: '${styles.backgroundColor || '#FFFFFF'}',
      borderRadius: ${styles.borderRadius || 12},
      padding: ${styles.padding || 16},
      ${styles.shadow ? `shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,` : ''}
    },`).join('')}
  },` : ''}
};` : ''}

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

// Using inputs
<TextInput 
  style={components.input.default}
  placeholder="Enter text..."
/>

// Using cards
<View style={components.card.default}>
  <Text>Card content</Text>
</View>

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
  ${theme.components ? 'components,' : ''}
};`;
}

function generateScreenCode(screenStructure: any, theme: any): string {
  const componentName = sanitizeName(screenStructure.name).replace(/^./, (char) => char.toUpperCase());
  
  // Generate component JSX based on actual structure
  function generateComponentJSX(components: any[], depth: number = 1): string {
    const indent = '  '.repeat(depth);
    
    return components.map((component: any) => {
      let jsx = '';
      
      switch (component.type) {
        case 'TEXT':
          jsx = `${indent}<Text style={styles.text}>\n${indent}  {/* ${component.text || 'Text content'} */}\n${indent}  "${component.text || 'Text content'}"\n${indent}</Text>`;
          break;
          
        case 'RECTANGLE':
        case 'FRAME':
          jsx = `${indent}<View style={styles.container}>`;
          if (component.children && component.children.length > 0) {
            jsx += '\n' + generateComponentJSX(component.children, depth + 1);
          }
          jsx += `\n${indent}</View>`;
          break;
          
        case 'INSTANCE':
        case 'COMPONENT':
          jsx = `${indent}<View style={styles.component}>`;
          if (component.children && component.children.length > 0) {
            jsx += '\n' + generateComponentJSX(component.children, depth + 1);
          }
          jsx += `\n${indent}</View>`;
          break;
          
        default:
          jsx = `${indent}<View style={styles.element}>`;
          if (component.children && component.children.length > 0) {
            jsx += '\n' + generateComponentJSX(component.children, depth + 1);
          }
          jsx += `\n${indent}</View>`;
      }
      
      return jsx;
    }).join('\n');
  }
  
  const componentsJSX = screenStructure.components.length > 0 
    ? generateComponentJSX(screenStructure.components)
    : '      <Text style={styles.placeholder}>No components found in this frame</Text>';
  
  return `// ${componentName}.tsx - Generated from Figma
// Screen: ${screenStructure.name}
// Dimensions: ${screenStructure.width} × ${screenStructure.height}px

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import theme from '../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ${componentName}Props {
  // Add your props here
}

const ${componentName}: React.FC<${componentName}Props> = () => {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
${componentsJSX}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.color('white') || '#FFFFFF',
  },
  content: {
    width: ${screenStructure.width},
    minHeight: ${screenStructure.height},
    alignSelf: 'center',
  },
  container: {
    backgroundColor: 'transparent',
    marginVertical: theme.spacing('sm') || 8,
  },
  component: {
    backgroundColor: theme.color('light1') || '#F8F9FA',
    padding: theme.spacing('md') || 16,
    borderRadius: theme.borderRadius('md') || 8,
    marginVertical: theme.spacing('xs') || 4,
  },
  element: {
    backgroundColor: 'transparent',
    marginVertical: theme.spacing('xs') || 4,
  },
  text: {
    fontSize: theme.fontSize('base') || 16,
    fontWeight: theme.fontWeight('normal') || '400',
    color: theme.color('dark1') || '#333333',
    lineHeight: (theme.fontSize('base') || 16) * 1.4,
  },
  placeholder: {
    fontSize: theme.fontSize('lg') || 18,
    fontWeight: theme.fontWeight('medium') || '500',
    color: theme.color('secondary') || '#6C757D',
    textAlign: 'center',
    padding: theme.spacing('xl') || 32,
  },
});

export default ${componentName};

// Usage Example:
// import ${componentName} from './screens/${componentName}';
// 
// const App = () => (
//   <${componentName} />
// );`;
}

// Error handling
function handleUnexpectedError(error: any, context: string): void {
  console.error(`Unexpected error in ${context}:`, error);
  try {
    figma.ui.postMessage({
      type: 'extraction-error',
      error: 'An unexpected error occurred. Please try again.'
    });
  } catch (uiError) {
    console.error('Failed to send error message to UI:', uiError);
  }
}

function sendProgress(progress: number): void {
  figma.ui.postMessage({
    type: 'progress-update',
    progress: progress
  });
}

// Global type declarations
declare const figma: any;
declare const __html__: string;

// Main plugin logic
figma.showUI(__html__, { 
  width: 400, 
  height: 600 
});

figma.ui.onmessage = (msg: any) => {
  console.log('Received message:', msg.type);
  
  try {
    switch (msg.type) {
      case 'extract-values':
        handleExtractValues();
        break;
        
      case 'extract-screens':
        handleExtractScreens();
        break;
        
      case 'close':
        figma.closePlugin();
        break;
        
      default:
        console.warn('Unknown message type:', msg.type);
    }
  } catch (error) {
    handleUnexpectedError(error, 'message handling');
  }
};

function handleExtractValues(): void {
  try {
    console.log('Starting design values extraction...');
    sendProgress(10);
    
    const extractedValues = extractDesignValues();
    sendProgress(50);
    
    const theme = generateTheme(extractedValues);
    sendProgress(80);
    
    // Generate proper theme file content
    const themeFileContent = generateThemeFileContent(theme);
    
    sendProgress(100);
    
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
      fileContent: themeFileContent
    };
    
    console.log('Design values extraction complete.');
    
    figma.ui.postMessage({
      type: 'extraction-complete',
      data: result
    });
    
  } catch (error) {
    handleUnexpectedError(error, 'design values extraction');
  }
}

console.log('Figma to React Native Design Bridge plugin loaded successfully!');

function extractDesignValuesFromAllPages() {
  const values = {
    colors: new Set<string>(),
    fontSizes: new Set<number>(),
    fontWeights: new Set<string>(),
    fontFamilies: new Set<string>(),
    borderRadius: new Set<number>(),
    spacing: new Set<number>(),
    shadows: new Set<string>(),
    opacity: new Set<number>(),
    buttons: [] as any[],
    inputs: [] as any[],
    headings: [] as any[],
    labels: [] as any[],
    cards: [] as any[],
    navigationItems: [] as any[]
  };

  // Extract from all pages
  const allPages = figma.root.children.filter((node: any) => node.type === 'PAGE');
  
  allPages.forEach((page: any) => {
    const allNodes = page.findAll();
    allNodes.forEach((node: any) => {
      try {
        extractBasicTokens(node, values);
        extractSemanticComponents(node, values);
      } catch (error) {
        // Silently skip problematic nodes
      }
    });
  });

  return values;
}

function extractEnhancedScreenStructure(frame: any) {
  return {
    name: frame.name,
    width: frame.width,
    height: frame.height,
    page: frame.parent ? frame.parent.name : 'Unknown',
    backgroundColor: getNodeBackgroundColor(frame),
    components: frame.children ? extractComponentHierarchyWithSemantics(frame.children) : [],
    layoutType: determineLayoutType(frame),
    deviceType: determineDeviceType(frame.width, frame.height),
    designSystem: analyzeFrameDesignSystem(frame)
  };
}

function extractComponentHierarchyWithSemantics(nodes: any[]) {
  return nodes
    .map((node: any) => extractSemanticComponentData(node))
    .filter((data: any) => data !== null);
}

function extractSemanticComponentData(node: any) {
  try {
    const baseData: any = {
      id: node.id,
      name: node.name,
      type: node.type,
      semanticType: determineSemanticType(node),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      backgroundColor: getNodeBackgroundColor(node),
      borderRadius: node.cornerRadius || 0
    };

    if (node.type === 'TEXT') {
      baseData.text = node.characters;
      baseData.fontSize = node.fontSize;
      baseData.fontWeight = getNodeFontWeight(node);
      baseData.textColor = getNodeTextColor(node);
      baseData.textAlign = node.textAlignHorizontal;
    }

    if ('children' in node && node.children && node.children.length > 0) {
      baseData.children = extractComponentHierarchyWithSemantics(node.children);
    }

    return baseData;
  } catch (error) {
    return null;
  }
}

function determineSemanticType(node: any): string {
  const name = node.name.toLowerCase();
  
  if (isButton(node, name)) return 'button';
  if (isInputField(node, name)) return 'input';
  if (isHeading(node, name)) return 'heading';
  if (isLabel(node, name)) return 'label';
  if (isCard(node, name)) return 'card';
  if (isNavigationItem(node, name)) return 'navigation';
  if (node.type === 'TEXT') return 'text';
  if (node.type === 'FRAME') return 'container';
  if (node.type === 'RECTANGLE') return 'shape';
  if (node.type === 'COMPONENT') return 'component';
  if (node.type === 'INSTANCE') return 'instance';
  
  return 'element';
}

function determineLayoutType(frame: any): string {
  if ('layoutMode' in frame) {
    if (frame.layoutMode === 'VERTICAL') return 'column';
    if (frame.layoutMode === 'HORIZONTAL') return 'row';
  }
  return 'absolute';
}

function determineDeviceType(width: number, height: number): string {
  const aspectRatio = width / height;
  
  if (width <= 480) return 'mobile';
  if (width <= 768) return 'tablet';
  if (aspectRatio > 1.5) return 'desktop';
  return 'tablet';
}

function analyzeFrameDesignSystem(frame: any) {
  const analysis = {
    colorUsage: new Set<string>(),
    fontSizeUsage: new Set<number>(),
    spacingUsage: new Set<number>(),
    componentTypes: new Set<string>()
  };
  
  const allNodes = frame.findAll();
  allNodes.forEach((node: any) => {
    // Analyze color usage
    const bgColor = getNodeBackgroundColor(node);
    if (bgColor) analysis.colorUsage.add(bgColor);
    
    const textColor = getNodeTextColor(node);
    if (textColor) analysis.colorUsage.add(textColor);
    
    // Analyze typography
    if (node.type === 'TEXT' && typeof node.fontSize === 'number') {
      analysis.fontSizeUsage.add(node.fontSize);
    }
    
    // Analyze spacing
    if ('paddingLeft' in node && typeof node.paddingLeft === 'number') {
      analysis.spacingUsage.add(node.paddingLeft);
    }
    
    // Analyze component types
    analysis.componentTypes.add(determineSemanticType(node));
  });
  
  return {
    uniqueColors: analysis.colorUsage.size,
    uniqueFontSizes: analysis.fontSizeUsage.size,
    uniqueSpacings: analysis.spacingUsage.size,
    componentTypes: Array.from(analysis.componentTypes)
  };
}

function countComponentsRecursively(components: any[]): number {
  let count = components.length;
  components.forEach(component => {
    if (component.children) {
      count += countComponentsRecursively(component.children);
    }
  });
  return count;
}

function analyzeSemanticComponents(components: any[]) {
  const analysis: any = {};
  
  function analyzeRecursively(comps: any[]) {
    comps.forEach(comp => {
      if (!analysis[comp.semanticType]) {
        analysis[comp.semanticType] = 0;
      }
      analysis[comp.semanticType]++;
      
      if (comp.children) {
        analyzeRecursively(comp.children);
      }
    });
  }
  
  analyzeRecursively(components);
  return analysis;
}

function identifyDesignPatterns(components: any[]) {
  const patterns = [];
  
  // Identify common patterns
  const hasNavigation = components.some(c => c.semanticType === 'navigation');
  const hasCards = components.some(c => c.semanticType === 'card');
  const hasButtons = components.some(c => c.semanticType === 'button');
  const hasInputs = components.some(c => c.semanticType === 'input');
  
  if (hasNavigation) patterns.push('Navigation Pattern');
  if (hasCards) patterns.push('Card Layout Pattern');
  if (hasButtons && hasInputs) patterns.push('Form Pattern');
  if (hasButtons) patterns.push('Action Pattern');
  
  return patterns;
}

function generateDesignSystemAnalysis(extractedValues: any, screens: any[]) {
  return {
    overview: {
      totalScreens: screens.length,
      totalComponents: screens.reduce((sum, screen) => sum + screen.componentCount, 0),
      uniqueColors: extractedValues.colors.size,
      uniqueFontSizes: extractedValues.fontSizes.size,
      buttonVariants: extractedValues.buttons.length,
      inputVariants: extractedValues.inputs.length,
      cardVariants: extractedValues.cards.length
    },
    recommendations: generateDesignRecommendations(extractedValues, screens),
    consistency: analyzeDesignConsistency(extractedValues, screens)
  };
}

function generateDesignRecommendations(extractedValues: any, screens: any[]) {
  const recommendations = [];
  
  if (extractedValues.colors.size > 20) {
    recommendations.push('Consider reducing color palette - found ' + extractedValues.colors.size + ' unique colors');
  }
  
  if (extractedValues.fontSizes.size > 10) {
    recommendations.push('Simplify typography scale - found ' + extractedValues.fontSizes.size + ' unique font sizes');
  }
  
  if (extractedValues.buttons.length < 2) {
    recommendations.push('Define more button variants for consistency');
  }
  
  return recommendations;
}

function analyzeDesignConsistency(extractedValues: any, screens: any[]) {
  const deviceTypes = screens.map(s => s.structure.deviceType);
  const uniqueDeviceTypes = new Set(deviceTypes);
  
  return {
    crossPlatformSupport: uniqueDeviceTypes.size > 1,
    deviceTypes: Array.from(uniqueDeviceTypes),
    colorConsistency: calculateColorConsistency(screens),
    spacingConsistency: calculateSpacingConsistency(screens),
    componentReuse: calculateComponentReuse(screens)
  };
}

function calculateColorConsistency(screens: any[]): number {
  const allColors = new Set<string>();
  const screenColors = screens.map(screen => {
    const colors = new Set<string>();
    // Extract colors from screen analysis
    if (screen.structure.designSystem?.colorUsage) {
      screen.structure.designSystem.colorUsage.forEach((color: string) => {
        colors.add(color);
        allColors.add(color);
      });
    }
    return colors;
  });
  
  // Calculate overlap between screens
  const overlaps = screenColors.map(colors => 
    Array.from(colors).filter(color => 
      screenColors.filter(otherColors => otherColors.has(color)).length > 1
    ).length
  );
  
  return overlaps.length > 0 ? overlaps.reduce((a, b) => a + b, 0) / overlaps.length : 0;
}

function calculateSpacingConsistency(screens: any[]): number {
  // Similar logic for spacing consistency
  return 75; // Placeholder - implement similar to color consistency
}

function calculateComponentReuse(screens: any[]): number {
  const allComponentTypes = new Set<string>();
  screens.forEach(screen => {
    Object.keys(screen.semanticComponents || {}).forEach(type => {
      allComponentTypes.add(type);
    });
  });
  
  const reusedTypes = Array.from(allComponentTypes).filter(type =>
    screens.filter(screen => screen.semanticComponents?.[type] > 0).length > 1
  );
  
  return allComponentTypes.size > 0 ? (reusedTypes.length / allComponentTypes.size) * 100 : 0;
}

function generateEnhancedScreenCode(screenStructure: any, theme: any): string {
  const componentName = sanitizeName(screenStructure.name).replace(/^./, (char) => char.toUpperCase());
  
  // Generate imports based on components used
  const componentTypes = new Set<string>();
  function collectComponentTypes(components: any[]) {
    components.forEach(comp => {
      componentTypes.add(comp.semanticType);
      if (comp.children) collectComponentTypes(comp.children);
    });
  }
  collectComponentTypes(screenStructure.components);
  
  const imports = ['View', 'Text', 'StyleSheet', 'ScrollView'];
  if (componentTypes.has('button')) imports.push('TouchableOpacity');
  if (componentTypes.has('input')) imports.push('TextInput');
  if (componentTypes.has('navigation')) imports.push('SafeAreaView');
  
  // Generate component JSX with semantic understanding
  function generateSemanticJSX(components: any[], depth: number = 1): string {
    const indent = '  '.repeat(depth);
    
    return components.map((component: any) => {
      let jsx = '';
      
      switch (component.semanticType) {
        case 'button':
          jsx = `${indent}<TouchableOpacity style={[styles.button, styles.${component.name.toLowerCase().replace(/\s+/g, '')}]}>
${indent}  <Text style={styles.buttonText}>{/* ${component.name} */}Button</Text>
${indent}</TouchableOpacity>`;
          break;
          
        case 'input':
          jsx = `${indent}<TextInput
${indent}  style={[styles.input, styles.${component.name.toLowerCase().replace(/\s+/g, '')}]}
${indent}  placeholder="${component.text || 'Enter text...'}"
${indent}  placeholderTextColor={theme.color('gray6')}
${indent}/>`;
          break;
          
        case 'heading':
          jsx = `${indent}<Text style={[styles.heading, styles.h${getHeadingLevel({ name: component.name, fontSize: component.fontSize })}]}>
${indent}  {/* ${component.text || 'Heading'} */}
${indent}  ${component.text || 'Heading'}
${indent}</Text>`;
          break;
          
        case 'label':
        case 'text':
          jsx = `${indent}<Text style={[styles.text, styles.${component.semanticType}]}>
${indent}  {/* ${component.text || 'Text content'} */}
${indent}  ${component.text || 'Text content'}
${indent}</Text>`;
          break;
          
        case 'card':
          jsx = `${indent}<View style={[styles.card, styles.${component.name.toLowerCase().replace(/\s+/g, '')}]}>`;
          if (component.children && component.children.length > 0) {
            jsx += '\n' + generateSemanticJSX(component.children, depth + 1);
          }
          jsx += `\n${indent}</View>`;
          break;
          
        case 'navigation':
          jsx = `${indent}<View style={[styles.navigation, styles.${component.name.toLowerCase().replace(/\s+/g, '')}]}>`;
          if (component.children && component.children.length > 0) {
            jsx += '\n' + generateSemanticJSX(component.children, depth + 1);
          }
          jsx += `\n${indent}</View>`;
          break;
          
        case 'container':
        default:
          jsx = `${indent}<View style={[styles.container, styles.${component.name.toLowerCase().replace(/\s+/g, '')}]}>`;
          if (component.children && component.children.length > 0) {
            jsx += '\n' + generateSemanticJSX(component.children, depth + 1);
          }
          jsx += `\n${indent}</View>`;
      }
      
      return jsx;
    }).join('\n');
  }
  
  const componentsJSX = screenStructure.components.length > 0 
    ? generateSemanticJSX(screenStructure.components)
    : '      <Text style={styles.placeholder}>No components found in this frame</Text>';
  
  // Generate styles based on actual components
  function generateComponentStyles(components: any[]): string {
    const styles: string[] = [];
    
    function processComponents(comps: any[]) {
      comps.forEach(comp => {
        const styleName = comp.name.toLowerCase().replace(/\s+/g, '');
        
        switch (comp.semanticType) {
          case 'button':
            styles.push(`  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || theme.colors?.primary || '#007AFF'}',
    paddingVertical: ${Math.max(comp.height / 4, 8)},
    paddingHorizontal: ${Math.max(comp.width / 8, 16)},
    borderRadius: ${comp.borderRadius || 8},
    alignItems: 'center',
    justifyContent: 'center',
  },`);
            break;
            
          case 'input':
            styles.push(`  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || '#FFFFFF'}',
    borderWidth: 1,
    borderColor: '${theme.colors?.gray3 || '#E1E5E9'}',
    borderRadius: ${comp.borderRadius || 8},
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: ${comp.fontSize || 16},
    height: ${comp.height || 44},
  },`);
            break;
            
          case 'card':
            styles.push(`  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || '#FFFFFF'}',
    borderRadius: ${comp.borderRadius || 12},
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },`);
            break;
            
          case 'navigation':
            styles.push(`  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || '#FFFFFF'}',
    height: ${comp.height || 60},
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },`);
            break;
        }
        
        if (comp.children) processComponents(comp.children);
      });
    }
    
    processComponents(components);
    return styles.join('\n');
  }
  
  const componentStyles = generateComponentStyles(screenStructure.components);
  
  return `// ${componentName}.tsx - Generated from Figma
// Screen: ${screenStructure.name} (${screenStructure.page})
// Device: ${screenStructure.deviceType} • Layout: ${screenStructure.layoutType}
// Dimensions: ${screenStructure.width} × ${screenStructure.height}px
// Components: ${Object.keys(screenStructure.designSystem?.componentTypes || {}).join(', ')}

import React from 'react';
import {
  ${imports.join(',\n  ')},
  Dimensions,
} from 'react-native';
import theme from '../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ${componentName}Props {
  // Add your props here
  navigation?: any;
}

const ${componentName}: React.FC<${componentName}Props> = ({ navigation }) => {
  return (
    ${screenStructure.deviceType === 'mobile' ? '<SafeAreaView style={styles.safeArea}>' : '<View style={styles.container}>'}
      <ScrollView 
        style={styles.screen} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
${componentsJSX}
      </ScrollView>
    ${screenStructure.deviceType === 'mobile' ? '</SafeAreaView>' : '</View>'}
  );
};

const styles = StyleSheet.create({
  ${screenStructure.deviceType === 'mobile' ? `safeArea: {
    flex: 1,
    backgroundColor: '${screenStructure.backgroundColor || theme.colors?.white || '#FFFFFF'}',
  },` : ''}
  screen: {
    flex: 1,
    backgroundColor: '${screenStructure.backgroundColor || theme.colors?.white || '#FFFFFF'}',
  },
  content: {
    width: ${screenStructure.width},
    minHeight: ${screenStructure.height},
    alignSelf: 'center',
    paddingVertical: 16,
  },
  container: {
    backgroundColor: 'transparent',
    marginVertical: 8,
  },
  button: {
    backgroundColor: '${theme.colors?.primary || '#007AFF'}',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '${theme.colors?.gray3 || '#E1E5E9'}',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginVertical: 4,
  },
  heading: {
    fontWeight: '600',
    color: '${theme.colors?.dark1 || '#1A1A1A'}',
    marginVertical: 8,
  },
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '600' },
  h3: { fontSize: 20, fontWeight: '600' },
  text: {
    fontSize: 16,
    color: '${theme.colors?.dark2 || '#333333'}',
    lineHeight: 24,
    marginVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '${theme.colors?.dark3 || '#666666'}',
    marginVertical: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navigation: {
    backgroundColor: '#FFFFFF',
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '${theme.colors?.gray2 || '#F1F3F4'}',
  },
  placeholder: {
    fontSize: 18,
    fontWeight: '500',
    color: '${theme.colors?.secondary || '#6C757D'}',
    textAlign: 'center',
    padding: 32,
  },
${componentStyles}
});

export default ${componentName};

// Usage Example:
// import ${componentName} from './screens/${componentName}';
// 
// <${componentName} navigation={navigation} />

/*
Design System Analysis:
- Unique Colors: ${screenStructure.designSystem?.uniqueColors || 0}
- Font Sizes: ${screenStructure.designSystem?.uniqueFontSizes || 0}
- Component Types: ${screenStructure.designSystem?.componentTypes?.join(', ') || 'None'}
- Device Type: ${screenStructure.deviceType}
- Layout: ${screenStructure.layoutType}
*/`;
}

// Generation functions - Create semantic design system
function generateTheme(values: any) {
  // Generate basic tokens (existing logic but enhanced)
  const basicTheme = generateBasicTokens(values);
  
  // NEW: Generate semantic component tokens
  const componentTokens = generateComponentTokens(values);
  
  return {
    ...basicTheme,
    components: componentTokens
  };
}

function generateBasicTokens(values: any) {
  // Existing token generation logic (colors, typography, spacing, etc.)
  const colorsArray = Array.from(values.colors) as string[];
  const colors: any = { transparent: 'transparent' };
  
  // Better color organization
  const sortedColors = colorsArray.sort();
  let primaryAssigned = false;
  
  sortedColors.forEach((color: string, index: number) => {
    const semanticName = getSemanticColorName(color);
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

  // Rest of basic tokens (border radius, shadows, opacity)
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
}

function generateComponentTokens(values: any) {
  const componentTokens: any = {};
  
  // Generate BUTTON tokens
  if (values.buttons && values.buttons.length > 0) {
    componentTokens.button = generateButtonTokens(values.buttons);
  }
  
  // Generate INPUT tokens
  if (values.inputs && values.inputs.length > 0) {
    componentTokens.input = generateInputTokens(values.inputs);
  }
  
  // Generate HEADING tokens
  if (values.headings && values.headings.length > 0) {
    componentTokens.heading = generateHeadingTokens(values.headings);
  }
  
  // Generate LABEL tokens
  if (values.labels && values.labels.length > 0) {
    componentTokens.label = generateLabelTokens(values.labels);
  }
  
  // Generate CARD tokens
  if (values.cards && values.cards.length > 0) {
    componentTokens.card = generateCardTokens(values.cards);
  }
  
  // Generate NAVIGATION tokens
  if (values.navigationItems && values.navigationItems.length > 0) {
    componentTokens.navigation = generateNavigationTokens(values.navigationItems);
  }
  
  return componentTokens;
}

function generateButtonTokens(buttons: any[]) {
  const variants: any = {};
  
  buttons.forEach((button: any) => {
    const variantName = button.variant || 'default';
    if (!variants[variantName]) {
      variants[variantName] = {
        backgroundColor: button.backgroundColor,
        textColor: button.textColor,
        borderRadius: button.borderRadius,
        paddingVertical: Math.max(button.padding.top, button.padding.bottom),
        paddingHorizontal: Math.max(button.padding.left, button.padding.right),
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

function generateInputTokens(inputs: any[]) {
  const variants: any = {};
  
  inputs.forEach((input: any, index: number) => {
    const variantName = `input${index + 1}`;
    variants[variantName] = {
      backgroundColor: input.backgroundColor,
      borderColor: input.borderColor,
      borderRadius: input.borderRadius,
      paddingVertical: Math.max(input.padding.top, input.padding.bottom),
      paddingHorizontal: Math.max(input.padding.left, input.padding.right),
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

function generateHeadingTokens(headings: any[]) {
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

function generateLabelTokens(labels: any[]) {
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

function generateCardTokens(cards: any[]) {
  const variants: any = {};
  
  cards.forEach((card: any, index: number) => {
    const variantName = `card${index + 1}`;
    variants[variantName] = {
      backgroundColor: card.backgroundColor,
      borderRadius: card.borderRadius,
      padding: Math.max(card.padding.top, card.padding.left),
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

function generateNavigationTokens(navItems: any[]) {
  const variants: any = {};
  
  navItems.forEach((nav: any, index: number) => {
    const variantName = nav.name.toLowerCase().includes('header') ? 'header' : 
                       nav.name.toLowerCase().includes('footer') ? 'footer' : 
                       nav.name.toLowerCase().includes('tab') ? 'tabBar' : `nav${index + 1}`;
    
    variants[variantName] = {
      backgroundColor: nav.backgroundColor,
      height: nav.height,
      paddingHorizontal: Math.max(nav.padding.left, nav.padding.right),
      paddingVertical: Math.max(nav.padding.top, nav.padding.bottom)
    };
  });
  
  return { variants };
}

// Helper functions for extracting properties
function getNodeBackgroundColor(node: any): string | null {
  if ('fills' in node && node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
    }
  }
  return null;
}

function getNodeTextColor(node: any): string | null {
  if (node.type === 'TEXT' && 'fills' in node && node.fills && node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
    }
  }
  // Look for text children
  if ('children' in node && node.children) {
    for (const child of node.children) {
      if (child.type === 'TEXT') {
        return getNodeTextColor(child);
      }
    }
  }
  return null;
}

function getNodeBorderColor(node: any): string | null {
  if ('strokes' in node && node.strokes && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke.type === 'SOLID' && stroke.color) {
      return rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
    }
  }
  return null;
}

function getNodePadding(node: any): any {
  return {
    top: node.paddingTop || 0,
    right: node.paddingRight || 0,
    bottom: node.paddingBottom || 0,
    left: node.paddingLeft || 0
  };
}

function getNodeFontSize(node: any): number | null {
  if (node.type === 'TEXT' && typeof node.fontSize === 'number') {
    return node.fontSize;
  }
  if ('children' in node && node.children) {
    for (const child of node.children) {
      const fontSize = getNodeFontSize(child);
      if (fontSize) return fontSize;
    }
  }
  return null;
}

function getNodeFontWeight(node: any): string | null {
  try {
    if (node.type === 'TEXT' && node.fontName && node.fontName !== figma.mixed && typeof node.fontName === 'object') {
      if (node.fontName.style && typeof node.fontName.style === 'string') {
        return node.fontName.style;
      }
    }
    if ('children' in node && node.children) {
      for (const child of node.children) {
        const fontWeight = getNodeFontWeight(child);
        if (fontWeight) return fontWeight;
      }
    }
  } catch (error) {
    // Return null for problematic nodes
  }
  return null;
}

function getNodeShadow(node: any): string | null {
  if ('effects' in node && node.effects && node.effects.length > 0) {
    const shadow = node.effects.find((effect: any) => effect.type === 'DROP_SHADOW' && effect.visible);
    if (shadow) {
      return `${shadow.offset.x}px ${shadow.offset.y}px ${shadow.radius}px ${rgbToHex(shadow.color.r, shadow.color.g, shadow.color.b)}`;
    }
  }
  return null;
}

function getNodeLineHeight(node: any): number | null {
  if (node.type === 'TEXT' && typeof node.lineHeight === 'object' && node.lineHeight.value) {
    return node.lineHeight.value;
  }
  return null;
}

function getNodePlaceholder(node: any): string | null {
  if (node.type === 'TEXT' && node.characters) {
    return node.characters;
  }
  return null;
}

function getButtonVariant(node: any): string {
  const name = node.name.toLowerCase();
  if (name.includes('primary')) return 'primary';
  if (name.includes('secondary')) return 'secondary';
  if (name.includes('outline')) return 'outline';
  if (name.includes('ghost')) return 'ghost';
  return 'primary';
}

function getHeadingLevel(node: any): number {
  const name = node.name.toLowerCase();
  if (name.includes('h1') || name.includes('title')) return 1;
  if (name.includes('h2') || name.includes('subtitle')) return 2;
  if (name.includes('h3') || name.includes('heading')) return 3;
  
  const fontSize = node.fontSize || 16;
  if (fontSize >= 32) return 1;
  if (fontSize >= 24) return 2;
  if (fontSize >= 20) return 3;
  return 2;
}

// Helper functions
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number): string => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function getSemanticColorName(hex: string): string | null {
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

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[0-9]/, '_')
    .toLowerCase();
}

// Component detection functions  
function isButton(node: any, name: string): boolean {
  return (
    name.includes('button') || 
    name.includes('btn') || 
    name.includes('cta') ||
    name.includes('action') ||
    name.includes('submit') ||
    name.includes('primary') ||
    name.includes('secondary') ||
    (node.type === 'COMPONENT' && hasButtonCharacteristics(node))
  );
}

function isInputField(node: any, name: string): boolean {
  return (
    name.includes('input') ||
    name.includes('field') ||
    name.includes('textbox') ||
    name.includes('text field') ||
    name.includes('form') ||
    name.includes('search') ||
    (node.type === 'FRAME' && hasInputCharacteristics(node))
  );
}

function isHeading(node: any, name: string): boolean {
  return (
    node.type === 'TEXT' && (
      name.includes('heading') ||
      name.includes('title') ||
      name.includes('h1') ||
      name.includes('h2') ||
      name.includes('h3') ||
      name.includes('header') ||
      (typeof node.fontSize === 'number' && node.fontSize >= 24)
    )
  );
}

function isLabel(node: any, name: string): boolean {
  return (
    node.type === 'TEXT' && (
      name.includes('label') ||
      name.includes('caption') ||
      name.includes('subtitle') ||
      name.includes('description') ||
      (typeof node.fontSize === 'number' && node.fontSize <= 14)
    )
  );
}

function isCard(node: any, name: string): boolean {
  return (
    name.includes('card') ||
    name.includes('item') ||
    name.includes('tile') ||
    name.includes('container') ||
    (node.type === 'FRAME' && hasCardCharacteristics(node))
  );
}

function isNavigationItem(node: any, name: string): boolean {
  return (
    name.includes('nav') ||
    name.includes('tab') ||
    name.includes('menu') ||
    name.includes('bar') ||
    name.includes('header') ||
    name.includes('footer')
  );
}

// Safe helper function to get numeric values, avoiding Symbols
function safeGetNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  return defaultValue;
}

// Safe helper function to check if a value is a valid number (not Symbol/mixed)
function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// Characteristic detection helpers with safe Symbol handling
function hasButtonCharacteristics(node: any): boolean {
  try {
    const width = safeGetNumber(node.width);
    const height = safeGetNumber(node.height);
    const cornerRadius = safeGetNumber(node.cornerRadius);
    
    return (
      cornerRadius > 0 &&
      'fills' in node && node.fills && node.fills.length > 0 &&
      width > 60 && height > 30 && height < 80
    );
  } catch (error) {
    return false;
  }
}

function hasInputCharacteristics(node: any): boolean {
  try {
    const width = safeGetNumber(node.width);
    const height = safeGetNumber(node.height);
    
    return (
      width > 100 && height > 30 && height < 60 &&
      'strokes' in node && node.strokes && node.strokes.length > 0
    );
  } catch (error) {
    return false;
  }
}

function hasCardCharacteristics(node: any): boolean {
  try {
    const width = safeGetNumber(node.width);
    const height = safeGetNumber(node.height);
    const cornerRadius = safeGetNumber(node.cornerRadius);
    
    return (
      width > 200 && height > 100 &&
      'children' in node && node.children && node.children.length > 1 &&
      (cornerRadius > 0 || ('effects' in node && node.effects && node.effects.length > 0))
    );
  } catch (error) {
    return false;
  }
}

// Data extraction functions with safe property access
function extractButtonData(node: any): any {
  try {
    const backgroundColor = getNodeBackgroundColor(node);
    const textColor = getNodeTextColor(node);
    const borderRadius = safeGetNumber(node.cornerRadius);
    const width = Math.round(safeGetNumber(node.width));
    const height = Math.round(safeGetNumber(node.height));
    const padding = getNodePadding(node);
    
    return {
      type: 'button',
      name: node.name || 'Button',
      variant: getButtonVariant(node),
      backgroundColor,
      textColor,
      borderRadius,
      width,
      height,
      padding,
      fontSize: getNodeFontSize(node),
      fontWeight: getNodeFontWeight(node),
      shadow: getNodeShadow(node)
    };
  } catch (error) {
    return null;
  }
}

function extractInputData(node: any): any {
  try {
    const backgroundColor = getNodeBackgroundColor(node);
    const borderColor = getNodeBorderColor(node);
    const borderRadius = safeGetNumber(node.cornerRadius);
    const width = Math.round(safeGetNumber(node.width));
    const height = Math.round(safeGetNumber(node.height));
    const padding = getNodePadding(node);
    
    return {
      type: 'input',
      name: node.name || 'Input',
      backgroundColor,
      borderColor,
      borderRadius,
      width,
      height,
      padding,
      fontSize: getNodeFontSize(node),
      placeholder: getNodePlaceholder(node)
    };
  } catch (error) {
    return null;
  }
}

function extractHeadingData(node: any): any {
  try {
    return {
      type: 'heading',
      name: node.name || 'Heading',
      level: getHeadingLevel(node),
      fontSize: safeGetNumber(node.fontSize, 24),
      fontWeight: getNodeFontWeight(node),
      color: getNodeTextColor(node),
      lineHeight: getNodeLineHeight(node)
    };
  } catch (error) {
    return null;
  }
}

function extractLabelData(node: any): any {
  try {
    return {
      type: 'label',
      name: node.name || 'Label',
      fontSize: safeGetNumber(node.fontSize, 14),
      fontWeight: getNodeFontWeight(node),
      color: getNodeTextColor(node),
      opacity: safeGetNumber(node.opacity, 1)
    };
  } catch (error) {
    return null;
  }
}

function extractCardData(node: any): any {
  try {
    return {
      type: 'card',
      name: node.name || 'Card',
      backgroundColor: getNodeBackgroundColor(node),
      borderRadius: safeGetNumber(node.cornerRadius),
      padding: getNodePadding(node),
      shadow: getNodeShadow(node),
      width: Math.round(safeGetNumber(node.width)),
      height: Math.round(safeGetNumber(node.height))
    };
  } catch (error) {
    return null;
  }
}

function extractNavigationData(node: any): any {
  try {
    return {
      type: 'navigation',
      name: node.name || 'Navigation',
      backgroundColor: getNodeBackgroundColor(node),
      height: Math.round(safeGetNumber(node.height)),
      padding: getNodePadding(node)
    };
  } catch (error) {
    return null;
  }
}

// Enhanced data extraction with safe property access
function extractDesignValues() {
  const values = {
    colors: new Set<string>(),
    fontSizes: new Set<number>(),
    fontWeights: new Set<string>(),
    fontFamilies: new Set<string>(),
    borderRadius: new Set<number>(),
    spacing: new Set<number>(),
    shadows: new Set<string>(),
    opacity: new Set<number>(),
    // NEW: Semantic component patterns
    buttons: [] as any[],
    inputs: [] as any[],
    headings: [] as any[],
    labels: [] as any[],
    cards: [] as any[],
    navigationItems: [] as any[]
  };

  const allNodes = figma.currentPage.findAll();

  allNodes.forEach((node: any) => {
    try {
      // Extract basic design tokens
      extractBasicTokens(node, values);
      
      // NEW: Extract semantic components
      extractSemanticComponents(node, values);
      
    } catch (error) {
      // Silently skip problematic nodes
      console.warn('Skipped problematic node:', node.name, error);
    }
  });

  return values;
}

function extractBasicTokens(node: any, values: any): void {
  try {
    // Extract colors from fills and strokes
    if ('fills' in node && node.fills && Array.isArray(node.fills)) {
      node.fills.forEach((fill: any) => {
        try {
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
            const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            if (fill.opacity === undefined || fill.opacity > 0.1) {
              values.colors.add(hex);
            }
          }
        } catch (fillError) {
          // Skip problematic fills
        }
      });
    }

    if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
      node.strokes.forEach((stroke: any) => {
        try {
          if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
            const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
            values.colors.add(hex);
          }
        } catch (strokeError) {
          // Skip problematic strokes
        }
      });
    }

    // Extract typography with safe checks
    if (node.type === 'TEXT' && node.visible !== false) {
      try {
        if (typeof node.fontSize === 'number' && node.fontSize >= 8 && node.fontSize <= 72) {
          values.fontSizes.add(Math.round(node.fontSize));
        }
        
        // Safe check for fontName (avoiding mixed symbols)
        if (node.fontName && node.fontName !== figma.mixed && typeof node.fontName === 'object') {
          if (node.fontName.style && typeof node.fontName.style === 'string') {
            values.fontWeights.add(node.fontName.style);
          }
          if (node.fontName.family && typeof node.fontName.family === 'string') {
            values.fontFamilies.add(node.fontName.family);
          }
        }
      } catch (textError) {
        // Skip problematic text properties
      }
    }

    // Extract spacing with safe property access
    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
      ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].forEach(prop => {
        try {
          if (prop in node && isValidNumber(node[prop]) && node[prop] >= 0 && node[prop] <= 200) {
            values.spacing.add(Math.round(node[prop]));
          }
        } catch (paddingError) {
          // Skip problematic padding
        }
      });
      
      try {
        if ('itemSpacing' in node && isValidNumber(node.itemSpacing) && node.itemSpacing >= 0 && node.itemSpacing <= 200) {
          values.spacing.add(Math.round(node.itemSpacing));
        }
      } catch (spacingError) {
        // Skip problematic spacing
      }
    }

    if (('cornerRadius' in node || 'topLeftRadius' in node) && 
        (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'COMPONENT')) {
    try {
      if ('cornerRadius' in node && isValidNumber(node.cornerRadius) && node.cornerRadius >= 0 && node.cornerRadius <= 100) {
        values.borderRadius.add(Math.round(node.cornerRadius));
      }
    } catch (radiusError) {
      // Skip problematic radius
    }
  }

  if ('opacity' in node && isValidNumber(node.opacity) && node.opacity < 1 && node.opacity > 0.1) {
    try {
      const rounded = Math.round(node.opacity * 100) / 100;
      values.opacity.add(rounded);
    } catch (opacityError) {
      // Skip problematic opacity
    }
  }

    if ('effects' in node && node.effects && Array.isArray(node.effects)) {
      node.effects.forEach((effect: any) => {
        try {
          if (effect.type === 'DROP_SHADOW' && effect.visible && effect.radius > 0) {
            const shadow = `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${rgbToHex(effect.color.r, effect.color.g, effect.color.b)}`;
            values.shadows.add(shadow);
          }
        } catch (effectError) {
          // Skip problematic effects
        }
      });
    }
  } catch (error) {
    // Skip entire node if too problematic
    console.warn('Skipped node in extractBasicTokens:', node.name);
  }
}

function extractSemanticComponents(node: any, values: any): void {
  const name = node.name.toLowerCase();
  
  // Detect BUTTONS by name patterns and properties
  if (isButton(node, name)) {
    const buttonData = extractButtonData(node);
    if (buttonData) {
      values.buttons.push(buttonData);
    }
  }
  
  // Detect INPUT FIELDS
  if (isInputField(node, name)) {
    const inputData = extractInputData(node);
    if (inputData) {
      values.inputs.push(inputData);
    }
  }
  
  // Detect HEADINGS
  if (isHeading(node, name)) {
    const headingData = extractHeadingData(node);
    if (headingData) {
      values.headings.push(headingData);
    }
  }
  
  // Detect LABELS
  if (isLabel(node, name)) {
    const labelData = extractLabelData(node);
    if (labelData) {
      values.labels.push(labelData);
    }
  }
  
  // Detect CARDS
  if (isCard(node, name)) {
    const cardData = extractCardData(node);
    if (cardData) {
      values.cards.push(cardData);
    }
  }
  
  // Detect NAVIGATION ITEMS
  if (isNavigationItem(node, name)) {
    const navData = extractNavigationData(node);
    if (navData) {
      values.navigationItems.push(navData);
    }
  }
}