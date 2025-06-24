// src/generators/screen-generator.ts
// Enhanced Screen Generator with Flow-Aware Code Generation

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { ScreenStructure, ThemeTokens, ComponentStructure } from '@core/types';
import { sanitizeName } from '@utils/figma-helpers';
import { safeGetNumber } from '@utils/number-utils';

const MODULE_NAME = 'ScreenGenerator';

export class ScreenGenerator {

  @LogFunction(MODULE_NAME, true)
  generateScreenCode(screenStructure: ScreenStructure, theme: ThemeTokens, flowContext?: any): string {
    try {
      return this.generateEnhancedScreenCode(screenStructure, theme, flowContext);
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'generateScreenCode',
        operation: 'screen code generation',
        additionalData: { screenName: screenStructure.name }
      });
      
      return this.generateMinimalScreenCode(screenStructure);
    }
  }

  @LogFunction(MODULE_NAME, true)
  generateEnhancedScreenCode(screenStructure: ScreenStructure, theme: ThemeTokens, flowContext?: any): string {
    try {
      const componentName = this.sanitizeComponentName(screenStructure.name);
      
      // Generate imports based on components used
      const componentTypes = new Set<string>();
      this.collectComponentTypes(screenStructure.components, componentTypes);
      
      const imports = this.generateImports(componentTypes, screenStructure.deviceType);
      
      // Generate component JSX with semantic understanding
      const componentsJSX = screenStructure.components.length > 0 
        ? this.generateSemanticJSX(screenStructure.components, theme, flowContext)
        : '        <Text style={styles.placeholder}>No components found in this frame</Text>';
      
      // Generate styles based on actual components
      const componentStyles = this.generateComponentStyles(screenStructure.components, theme);
      
      // Generate props interface based on flow context
      const propsInterface = this.generatePropsInterface(componentName, flowContext);
      
      // Generate navigation integration
      const navigationIntegration = this.generateNavigationIntegration(flowContext);
      
      const code = `${this.generateFileHeader(screenStructure, flowContext)}

${imports}

${propsInterface}

const ${componentName}: React.FC<${componentName}Props> = ({ navigation, route }) => {
${navigationIntegration}

  return (
    ${this.generateContainerWrapper(screenStructure)}
      ${this.generateScrollWrapper(screenStructure)}
${componentsJSX}
      ${this.generateScrollWrapperClose(screenStructure)}
    ${this.generateContainerWrapperClose(screenStructure)}
  );
};

${this.generateStyles(screenStructure, theme, componentStyles)}

export default ${componentName};

${this.generateUsageExample(componentName, screenStructure, flowContext)}

${this.generateAnalysisComment(screenStructure, flowContext)}`;

      logger.info(MODULE_NAME, 'generateEnhancedScreenCode', 'Screen code generated', {
        componentName,
        codeLength: code.length,
        componentCount: screenStructure.components.length
      });

      return code;
    } catch (error) {
      logger.error(MODULE_NAME, 'generateEnhancedScreenCode', 'Error generating enhanced screen code:', error as Error);
      return this.generateMinimalScreenCode(screenStructure);
    }
  }

  @LogFunction(MODULE_NAME)
  private generateFileHeader(screenStructure: ScreenStructure, flowContext?: any): string {
    const componentName = this.sanitizeComponentName(screenStructure.name);
    
    return `// ${componentName}.tsx - Generated from Figma
// Screen: ${screenStructure.name}${screenStructure.page ? ` (${screenStructure.page})` : ''}
// Device: ${screenStructure.deviceType} • Layout: ${screenStructure.layoutType}
// Dimensions: ${screenStructure.width} × ${screenStructure.height}px
${flowContext ? `// Flow: ${flowContext.name} • Role: ${flowContext.userRole?.type || 'Unknown'}` : ''}
${screenStructure.designSystem ? `// Component Types: ${screenStructure.designSystem.componentTypes?.join(', ') || 'None'}` : ''}`;
  }

  @LogFunction(MODULE_NAME)
  private generateImports(componentTypes: Set<string>, deviceType?: string): string {
    const baseImports = ['View', 'Text', 'StyleSheet', 'Dimensions'];
    const conditionalImports: string[] = [];

    // Add imports based on detected components
    if (componentTypes.has('button')) conditionalImports.push('TouchableOpacity');
    if (componentTypes.has('input')) conditionalImports.push('TextInput');
    if (componentTypes.has('scroll') || componentTypes.size > 5) conditionalImports.push('ScrollView');
    if (deviceType === 'mobile') conditionalImports.push('SafeAreaView');
    if (componentTypes.has('image')) conditionalImports.push('Image');
    if (componentTypes.has('modal')) conditionalImports.push('Modal');

    const allImports = [...baseImports, ...conditionalImports];

    return `import React, { useEffect, useState, useCallback } from 'react';
import {
  ${allImports.join(',\n  ')},
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');`;
  }

  @LogFunction(MODULE_NAME)
  private generatePropsInterface(componentName: string, flowContext?: any): string {
    let propsInterface = `interface ${componentName}Props {
  navigation?: any;
  route?: any;`;

    if (flowContext) {
      propsInterface += `
  // Flow-specific props
  flowId?: string;
  onFlowComplete?: () => void;
  onFlowBack?: () => void;`;
    }

    propsInterface += `
  // Custom props
  testID?: string;
  style?: any;
}`;

    return propsInterface;
  }

  @LogFunction(MODULE_NAME)
  private generateNavigationIntegration(flowContext?: any): string {
    if (!flowContext) {
      return `  // Screen state management
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Screen focus logic here
      return () => {
        // Screen cleanup logic here
      };
    }, [])
  );`;
    }

    return `  // Flow-aware state management
  const [isLoading, setIsLoading] = useState(false);
  const [flowProgress, setFlowProgress] = useState(0);

  useFocusEffect(
    useCallback(() => {
      // Flow navigation tracking
      if (navigation && route) {
        // Track flow progress
        const currentIndex = ${flowContext.screens?.findIndex((s: any) => s.name === flowContext.currentScreen) || 0};
        const totalScreens = ${flowContext.screens?.length || 1};
        setFlowProgress((currentIndex + 1) / totalScreens);
      }
      
      return () => {
        // Flow cleanup logic
      };
    }, [navigation, route])
  );

  // Flow navigation helpers
  const navigateNext = useCallback(() => {
    // Navigate to next screen in flow
    if (navigation) {
      // Implementation depends on flow structure
    }
  }, [navigation]);

  const navigateBack = useCallback(() => {
    if (navigation) {
      navigation.goBack();
    }
  }, [navigation]);`;
  }

  @LogFunction(MODULE_NAME)
  private generateContainerWrapper(screenStructure: ScreenStructure): string {
    if (screenStructure.deviceType === 'mobile') {
      return `<SafeAreaView style={styles.safeArea}>`;
    }
    return `<View style={styles.container}>`;
  }

  @LogFunction(MODULE_NAME)
  private generateContainerWrapperClose(screenStructure: ScreenStructure): string {
    if (screenStructure.deviceType === 'mobile') {
      return `</SafeAreaView>`;
    }
    return `</View>`;
  }

  @LogFunction(MODULE_NAME)
  private generateScrollWrapper(screenStructure: ScreenStructure): string {
    const needsScroll = screenStructure.components.length > 5 || 
                      screenStructure.height > 800 ||
                      screenStructure.layoutType === 'column';

    if (needsScroll) {
      return `<ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >`;
    }
    return `<View style={styles.content}>`;
  }

  @LogFunction(MODULE_NAME)
  private generateScrollWrapperClose(screenStructure: ScreenStructure): string {
    const needsScroll = screenStructure.components.length > 5 || 
                      screenStructure.height > 800 ||
                      screenStructure.layoutType === 'column';

    if (needsScroll) {
      return `</ScrollView>`;
    }
    return `</View>`;
  }

  @LogFunction(MODULE_NAME)
  generateSemanticJSX(components: ComponentStructure[], theme: ThemeTokens, flowContext?: any, depth: number = 2): string {
    const indent = '  '.repeat(depth);
    
    return components.map((component: ComponentStructure) => {
      let jsx = '';
      
      try {
        switch (component.semanticType) {
          case 'button':
            jsx = this.generateButtonJSX(component, theme, indent, flowContext);
            break;
            
          case 'input':
            jsx = this.generateInputJSX(component, theme, indent);
            break;
            
          case 'heading':
            jsx = this.generateHeadingJSX(component, theme, indent);
            break;
            
          case 'label':
          case 'text':
            jsx = this.generateTextJSX(component, theme, indent);
            break;
            
          case 'card':
            jsx = this.generateCardJSX(component, theme, indent, flowContext, depth);
            break;
            
          case 'navigation':
            jsx = this.generateNavigationJSX(component, theme, indent, flowContext, depth);
            break;
            
          case 'image':
            jsx = this.generateImageJSX(component, theme, indent);
            break;
            
          case 'container':
          default:
            jsx = this.generateContainerJSX(component, theme, indent, flowContext, depth);
        }
        
        return jsx;
      } catch (componentError) {
        logger.warn(MODULE_NAME, 'generateSemanticJSX', 'Error generating JSX for component:', {
          component: component.name,
          error: componentError
        });
        
        return this.generateFallbackJSX(component, indent);
      }
    }).join('\n');
  }

  private generateButtonJSX(component: ComponentStructure, theme: ThemeTokens, indent: string, flowContext?: any): string {
    const styleName = this.sanitizeStyleName(component.name);
    const buttonText = component.text || component.name || 'Button';
    
    // Add flow-aware navigation if in flow context
    const onPressHandler = flowContext ? 
      `onPress={navigateNext}` : 
      `onPress={() => console.log('${buttonText} pressed')}`;

    return `${indent}<TouchableOpacity 
${indent}  style={[styles.button, styles.${styleName}]}
${indent}  ${onPressHandler}
${indent}  activeOpacity={0.7}
${indent}  testID="${styleName}-button"
${indent}>
${indent}  <Text style={styles.buttonText}>
${indent}    {/* ${buttonText} */}
${indent}    ${buttonText}
${indent}  </Text>
${indent}</TouchableOpacity>`;
  }

  private generateInputJSX(component: ComponentStructure, theme: ThemeTokens, indent: string): string {
    const styleName = this.sanitizeStyleName(component.name);
    const placeholder = component.text || 'Enter text...';
    
    return `${indent}<TextInput
${indent}  style={[styles.input, styles.${styleName}]}
${indent}  placeholder="${placeholder}"
${indent}  placeholderTextColor={theme.colors?.gray || '#999999'}
${indent}  testID="${styleName}-input"
${indent}  autoCapitalize="none"
${indent}  autoCorrect={false}
${indent}/>`;
  }

  private generateHeadingJSX(component: ComponentStructure, theme: ThemeTokens, indent: string): string {
    const level = this.getHeadingLevel(component);
    const text = component.text || 'Heading';
    
    return `${indent}<Text style={[styles.heading, styles.h${level}, styles.${this.sanitizeStyleName(component.name)}]}>
${indent}  {/* ${text} */}
${indent}  ${text}
${indent}</Text>`;
  }

  private generateTextJSX(component: ComponentStructure, theme: ThemeTokens, indent: string): string {
    const text = component.text || 'Text content';
    const styleName = this.sanitizeStyleName(component.name);
    
    return `${indent}<Text style={[styles.text, styles.${component.semanticType || 'text'}, styles.${styleName}]}>
${indent}  {/* ${text} */}
${indent}  ${text}
${indent}</Text>`;
  }

  private generateCardJSX(component: ComponentStructure, theme: ThemeTokens, indent: string, flowContext?: any, depth: number): string {
    const styleName = this.sanitizeStyleName(component.name);
    let jsx = `${indent}<View style={[styles.card, styles.${styleName}]}>`;
    
    if (component.children && component.children.length > 0) {
      jsx += '\n' + this.generateSemanticJSX(component.children, theme, flowContext, depth + 1);
    } else {
      jsx += `\n${indent}  <Text style={styles.cardPlaceholder}>Card Content</Text>`;
    }
    
    jsx += `\n${indent}</View>`;
    return jsx;
  }

  private generateNavigationJSX(component: ComponentStructure, theme: ThemeTokens, indent: string, flowContext?: any, depth: number): string {
    const styleName = this.sanitizeStyleName(component.name);
    let jsx = `${indent}<View style={[styles.navigation, styles.${styleName}]}>`;
    
    if (component.children && component.children.length > 0) {
      jsx += '\n' + this.generateSemanticJSX(component.children, theme, flowContext, depth + 1);
    } else {
      jsx += `\n${indent}  <Text style={styles.navTitle}>${component.name || 'Navigation'}</Text>`;
    }
    
    jsx += `\n${indent}</View>`;
    return jsx;
  }

  private generateImageJSX(component: ComponentStructure, theme: ThemeTokens, indent: string): string {
    const styleName = this.sanitizeStyleName(component.name);
    
    return `${indent}<Image
${indent}  style={[styles.image, styles.${styleName}]}
${indent}  source={{ uri: 'https://via.placeholder.com/${component.width}x${component.height}' }}
${indent}  resizeMode="cover"
${indent}  testID="${styleName}-image"
${indent}/>`;
  }

  private generateContainerJSX(component: ComponentStructure, theme: ThemeTokens, indent: string, flowContext?: any, depth: number): string {
    const styleName = this.sanitizeStyleName(component.name);
    let jsx = `${indent}<View style={[styles.container, styles.${styleName}]}>`;
    
    if (component.children && component.children.length > 0) {
      jsx += '\n' + this.generateSemanticJSX(component.children, theme, flowContext, depth + 1);
    }
    
    jsx += `\n${indent}</View>`;
    return jsx;
  }

  private generateFallbackJSX(component: ComponentStructure, indent: string): string {
    return `${indent}<View style={styles.fallbackContainer}>
${indent}  <Text style={styles.fallbackText}>
${indent}    {/* Error rendering ${component.name} */}
${indent}    Component: ${component.name}
${indent}  </Text>
${indent}</View>`;
  }

  @LogFunction(MODULE_NAME)
  private generateStyles(screenStructure: ScreenStructure, theme: ThemeTokens, componentStyles: string): string {
    const safeAreaStyle = screenStructure.deviceType === 'mobile' ? `
  safeArea: {
    flex: 1,
    backgroundColor: '${screenStructure.backgroundColor || theme.colors?.background || '#FFFFFF'}',
  },` : '';

    const scrollStyles = this.needsScrollView(screenStructure) ? `
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },` : '';

    return `const styles = StyleSheet.create({${safeAreaStyle}
  container: {
    flex: 1,
    backgroundColor: '${screenStructure.backgroundColor || theme.colors?.background || '#FFFFFF'}',
  },
  content: {
    flex: 1,
    padding: 16,
  },${scrollStyles}
  
  // Component styles
  button: {
    backgroundColor: '${theme.colors?.primary || '#007AFF'}',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    minHeight: 44,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '${theme.colors?.border || '#E1E5E9'}',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginVertical: 8,
    minHeight: 44,
  },
  heading: {
    fontWeight: '600',
    color: '${theme.colors?.text || '#1A1A1A'}',
    marginVertical: 8,
  },
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  text: {
    fontSize: 16,
    color: '${theme.colors?.text || '#333333'}',
    lineHeight: 24,
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '${theme.colors?.textSecondary || '#666666'}',
    marginVertical: 4,
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
  cardPlaceholder: {
    fontSize: 14,
    color: '${theme.colors?.textSecondary || '#666666'}',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  navigation: {
    backgroundColor: '#FFFFFF',
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '${theme.colors?.border || '#F1F3F4'}',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '${theme.colors?.text || '#1A1A1A'}',
  },
  image: {
    borderRadius: 8,
    marginVertical: 8,
  },
  placeholder: {
    fontSize: 18,
    fontWeight: '500',
    color: '${theme.colors?.textSecondary || '#6C757D'}',
    textAlign: 'center',
    padding: 32,
    fontStyle: 'italic',
  },
  fallbackContainer: {
    padding: 16,
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#FBC02D',
  },
  fallbackText: {
    fontSize: 12,
    color: '#F57F17',
    textAlign: 'center',
  },
${componentStyles}
});`;
  }

  @LogFunction(MODULE_NAME)
  generateComponentStyles(components: ComponentStructure[], theme: ThemeTokens): string {
    const styles: string[] = [];
    
    try {
      this.processComponentsForStyles(components, styles, theme);
      return styles.join('\n');
    } catch (error) {
      logger.error(MODULE_NAME, 'generateComponentStyles', 'Error generating component styles:', error as Error);
      return '  // Error generating component styles';
    }
  }

  private processComponentsForStyles(components: ComponentStructure[], styles: string[], theme: ThemeTokens): void {
    components.forEach(comp => {
      try {
        const styleName = this.sanitizeStyleName(comp.name);
        
        // Generate specific styles based on component type and properties
        switch (comp.semanticType) {
          case 'button':
            styles.push(this.generateButtonStyle(comp, styleName, theme));
            break;
            
          case 'input':
            styles.push(this.generateInputStyle(comp, styleName, theme));
            break;
            
          case 'card':
            styles.push(this.generateCardStyle(comp, styleName, theme));
            break;
            
          case 'navigation':
            styles.push(this.generateNavigationStyle(comp, styleName, theme));
            break;

          case 'image':
            styles.push(this.generateImageStyle(comp, styleName));
            break;
            
          default:
            if (comp.backgroundColor || comp.borderRadius || comp.width || comp.height) {
              styles.push(this.generateGenericStyle(comp, styleName));
            }
        }
        
        if (comp.children) {
          this.processComponentsForStyles(comp.children, styles, theme);
        }
      } catch (compError) {
        logger.warn(MODULE_NAME, 'processComponentsForStyles', 'Error processing component style:', {
          component: comp.name,
          error: compError
        });
      }
    });
  }

  private generateButtonStyle(comp: ComponentStructure, styleName: string, theme: ThemeTokens): string {
    return `  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || theme.colors?.primary || '#007AFF'}',
    paddingVertical: ${Math.max(safeGetNumber(comp.height) / 4, 8)},
    paddingHorizontal: ${Math.max(safeGetNumber(comp.width) / 8, 16)},
    borderRadius: ${safeGetNumber(comp.borderRadius, 8)},
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ${Math.max(safeGetNumber(comp.height), 44)},
    ${comp.width ? `width: ${safeGetNumber(comp.width)},` : ''}
  },`;
  }

  private generateInputStyle(comp: ComponentStructure, styleName: string, theme: ThemeTokens): string {
    return `  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || '#FFFFFF'}',
    borderWidth: 1,
    borderColor: '${theme.colors?.border || '#E1E5E9'}',
    borderRadius: ${safeGetNumber(comp.borderRadius, 8)},
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: ${safeGetNumber(comp.fontSize, 16)},
    height: ${Math.max(safeGetNumber(comp.height), 44)},
    ${comp.width ? `width: ${safeGetNumber(comp.width)},` : ''}
  },`;
  }

  private generateCardStyle(comp: ComponentStructure, styleName: string, theme: ThemeTokens): string {
    return `  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || '#FFFFFF'}',
    borderRadius: ${safeGetNumber(comp.borderRadius, 12)},
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ${comp.width ? `width: ${safeGetNumber(comp.width)},` : ''}
    ${comp.height ? `height: ${safeGetNumber(comp.height)},` : ''}
  },`;
  }

  private generateNavigationStyle(comp: ComponentStructure, styleName: string, theme: ThemeTokens): string {
    return `  ${styleName}: {
    backgroundColor: '${comp.backgroundColor || '#FFFFFF'}',
    height: ${Math.max(safeGetNumber(comp.height), 60)},
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '${theme.colors?.border || '#F1F3F4'}',
  },`;
  }

  private generateImageStyle(comp: ComponentStructure, styleName: string): string {
    return `  ${styleName}: {
    width: ${safeGetNumber(comp.width, 100)},
    height: ${safeGetNumber(comp.height, 100)},
    borderRadius: ${safeGetNumber(comp.borderRadius, 8)},
    marginVertical: 8,
  },`;
  }

  private generateGenericStyle(comp: ComponentStructure, styleName: string): string {
    const styles: string[] = [];
    
    if (comp.backgroundColor) styles.push(`backgroundColor: '${comp.backgroundColor}'`);
    if (comp.borderRadius) styles.push(`borderRadius: ${safeGetNumber(comp.borderRadius)}`);
    if (comp.width) styles.push(`width: ${safeGetNumber(comp.width)}`);
    if (comp.height) styles.push(`height: ${safeGetNumber(comp.height)}`);
    
    return `  ${styleName}: {
    ${styles.join(',\n    ')},
  },`;
  }

  private generateUsageExample(componentName: string, screenStructure: ScreenStructure, flowContext?: any): string {
    if (flowContext) {
      return `
// Usage Example (Flow Context):
// import ${componentName} from './screens/${componentName}';
// 
// <${componentName} 
//   navigation={navigation} 
//   route={route}
//   flowId="${flowContext.id || 'flow-id'}"
//   onFlowComplete={() => console.log('Flow completed')}
// />`;
    }

    return `
// Usage Example:
// import ${componentName} from './screens/${componentName}';
// 
// <${componentName} navigation={navigation} route={route} />`;
  }

  private generateAnalysisComment(screenStructure: ScreenStructure, flowContext?: any): string {
    let analysis = `
/*
Design System Analysis:
- Unique Colors: ${screenStructure.designSystem?.uniqueColors || 0}
- Font Sizes: ${screenStructure.designSystem?.uniqueFontSizes || 0}
- Component Types: ${screenStructure.designSystem?.componentTypes?.join(', ') || 'None'}
- Device Type: ${screenStructure.deviceType}
- Layout: ${screenStructure.layoutType}`;

    if (flowContext) {
      analysis += `
- Flow Context: ${flowContext.name}
- User Role: ${flowContext.userRole?.type || 'Unknown'}
- Navigation Pattern: ${flowContext.navigationPattern || 'Unknown'}`;
    }

    analysis += `
*/`;

    return analysis;
  }

  // Helper methods
  private collectComponentTypes(components: ComponentStructure[], componentTypes: Set<string>): void {
    components.forEach(comp => {
      if (comp.semanticType) {
        componentTypes.add(comp.semanticType);
      }
      if (comp.children) {
        this.collectComponentTypes(comp.children, componentTypes);
      }
    });
  }

  private sanitizeStyleName(name: string): string {
    try {
      return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') || 'component';
    } catch (error) {
      return 'component';
    }
  }

  private sanitizeComponentName(name: string): string {
    try {
      return sanitizeName(name).replace(/^./, (char) => char.toUpperCase()) || 'Screen';
    } catch (error) {
      return 'Screen';
    }
  }

  private getHeadingLevel(component: ComponentStructure): number {
    try {
      const name = component.name.toLowerCase();
      if (name.includes('h1') || name.includes('title')) return 1;
      if (name.includes('h2') || name.includes('subtitle')) return 2;
      if (name.includes('h3') || name.includes('heading')) return 3;
      
      const fontSize = safeGetNumber(component.fontSize, 16);
      if (fontSize >= 32) return 1;
      if (fontSize >= 24) return 2;
      if (fontSize >= 20) return 3;
      return 2;
    } catch (error) {
      return 2;
    }
  }

  private needsScrollView(screenStructure: ScreenStructure): boolean {
    return screenStructure.components.length > 5 || 
           screenStructure.height > 800 ||
           screenStructure.layoutType === 'column';
  }

  private generateMinimalScreenCode(screenStructure: ScreenStructure): string {
    const componentName = sanitizeName(screenStructure.name).replace(/^./, (char) => char.toUpperCase()) || 'Screen';
    
    return `// ${componentName}.tsx - Minimal Generated Screen (Error Recovery)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ${componentName}Props {
  navigation?: any;
  route?: any;
}

const ${componentName}: React.FC<${componentName}Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${screenStructure.name}</Text>
      <Text style={styles.subtitle}>
        ${screenStructure.width} × ${screenStructure.height}px
      </Text>
      <Text style={styles.info}>
        Device: ${screenStructure.deviceType} • Layout: ${screenStructure.layoutType}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  info: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});

export default ${componentName};`;
  }
}

export default ScreenGenerator;