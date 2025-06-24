// src/generators/screen-generator.ts
// Complete implementation extracted from code.ts

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { ScreenStructure, ThemeTokens, ComponentStructure } from '@core/types';
import { sanitizeName } from '@utils/figma-helpers';

const MODULE_NAME = 'ScreenGenerator';

export class ScreenGenerator {

  @LogFunction(MODULE_NAME, true)
  generateScreenCode(screenStructure: ScreenStructure, theme: ThemeTokens): string {
    try {
      return this.generateEnhancedScreenCode(screenStructure, theme);
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
  generateEnhancedScreenCode(screenStructure: ScreenStructure, theme: ThemeTokens): string {
    try {
      const componentName = sanitizeName(screenStructure.name).replace(/^./, (char) => char.toUpperCase());
      
      // Generate imports based on components used
      const componentTypes = new Set<string>();
      this.collectComponentTypes(screenStructure.components, componentTypes);
      
      const imports = ['View', 'Text', 'StyleSheet', 'ScrollView'];
      if (componentTypes.has('button')) imports.push('TouchableOpacity');
      if (componentTypes.has('input')) imports.push('TextInput');
      if (componentTypes.has('navigation')) imports.push('SafeAreaView');
      
      // Generate component JSX with semantic understanding
      const componentsJSX = screenStructure.components.length > 0 
        ? this.generateSemanticJSX(screenStructure.components, theme)
        : '      <Text style={styles.placeholder}>No components found in this frame</Text>';
      
      // Generate styles based on actual components
      const componentStyles = this.generateComponentStyles(screenStructure.components, theme);
      
      const code = `// ${componentName}.tsx - Generated from Figma
// Screen: ${screenStructure.name}${screenStructure.page ? ` (${screenStructure.page})` : ''}
// Device: ${screenStructure.deviceType} • Layout: ${screenStructure.layoutType}
// Dimensions: ${screenStructure.width} × ${screenStructure.height}px
${screenStructure.designSystem ? `// Component Types: ${screenStructure.designSystem.componentTypes?.join(', ') || 'None'}` : ''}

import React from 'react';
import {
  ${imports.join(',\n  ')},
  Dimensions,
} from 'react-native';
import theme from '../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ${componentName}Props {
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
  generateSemanticJSX(components: ComponentStructure[], theme: ThemeTokens, depth: number = 1): string {
    const indent = '  '.repeat(depth);
    
    return components.map((component: ComponentStructure) => {
      let jsx = '';
      
      try {
        switch (component.semanticType) {
          case 'button':
            jsx = `${indent}<TouchableOpacity style={[styles.button, styles.${this.sanitizeStyleName(component.name)}]}>
${indent}  <Text style={styles.buttonText}>{/* ${component.name} */}Button</Text>
${indent}</TouchableOpacity>`;
            break;
            
          case 'input':
            jsx = `${indent}<TextInput
${indent}  style={[styles.input, styles.${this.sanitizeStyleName(component.name)}]}
${indent}  placeholder="${component.text || 'Enter text...'}"
${indent}  placeholderTextColor={theme.colors?.gray6 || '#999999'}
${indent}/>`;
            break;
            
          case 'heading':
            jsx = `${indent}<Text style={[styles.heading, styles.h${this.getHeadingLevel(component)}]}>
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
            jsx = `${indent}<View style={[styles.card, styles.${this.sanitizeStyleName(component.name)}]}>`;
            if (component.children && component.children.length > 0) {
              jsx += '\n' + this.generateSemanticJSX(component.children, theme, depth + 1);
            }
            jsx += `\n${indent}</View>`;
            break;
            
          case 'navigation':
            jsx = `${indent}<View style={[styles.navigation, styles.${this.sanitizeStyleName(component.name)}]}>`;
            if (component.children && component.children.length > 0) {
              jsx += '\n' + this.generateSemanticJSX(component.children, theme, depth + 1);
            }
            jsx += `\n${indent}</View>`;
            break;
            
          case 'container':
          default:
            jsx = `${indent}<View style={[styles.container, styles.${this.sanitizeStyleName(component.name)}]}>`;
            if (component.children && component.children.length > 0) {
              jsx += '\n' + this.generateSemanticJSX(component.children, theme, depth + 1);
            }
            jsx += `\n${indent}</View>`;
        }
        
        return jsx;
      } catch (componentError) {
        logger.warn(MODULE_NAME, 'generateSemanticJSX', 'Error generating JSX for component:', {
          component: component.name,
          error: componentError
        });
        
        // Fallback to simple view
        return `${indent}<View style={styles.container}>
${indent}  {/* Error rendering ${component.name} */}
${indent}</View>`;
      }
    }).join('\n');
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

  private getHeadingLevel(component: ComponentStructure): number {
    try {
      const name = component.name.toLowerCase();
      if (name.includes('h1') || name.includes('title')) return 1;
      if (name.includes('h2') || name.includes('subtitle')) return 2;
      if (name.includes('h3') || name.includes('heading')) return 3;
      
      const fontSize = component.fontSize || 16;
      if (fontSize >= 32) return 1;
      if (fontSize >= 24) return 2;
      if (fontSize >= 20) return 3;
      return 2;
    } catch (error) {
      return 2;
    }
  }

  private generateMinimalScreenCode(screenStructure: ScreenStructure): string {
    const componentName = sanitizeName(screenStructure.name).replace(/^./, (char) => char.toUpperCase()) || 'Screen';
    
    return `// ${componentName}.tsx - Minimal Generated Screen (Error Recovery)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ${componentName}Props {
  navigation?: any;
}

const ${componentName}: React.FC<${componentName}Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${screenStructure.name}</Text>
      <Text style={styles.subtitle}>
        ${screenStructure.width} × ${screenStructure.height}px
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
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
});

export default ${componentName};`;
  }
}

export default ScreenGenerator;