// src/extractors/screen-extractor.ts
// Updated ScreenExtractor to use existing DeviceDetector and ComponentDetector

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { 
  ScreenStructure, 
  ComponentStructure, 
  DesignSystemAnalysis,
  DeviceType,
  ComponentDetectionResult 
} from '@core/types';
import { safeGetNumber, safeGetWidth, safeGetHeight } from '@utils/number-utils';
import { getNodeBackgroundColor } from '@utils/figma-helpers';

// Import the existing detectors
import DeviceDetector from '@detectors/device-detector';
import ComponentDetector from '@detectors/component-detector';

const MODULE_NAME = 'ScreenExtractor';

export class ScreenExtractor {
  // Use existing detectors for consistency
  private deviceDetector = new DeviceDetector();
  private componentDetector = new ComponentDetector();

  @LogFunction(MODULE_NAME, true)
  extractScreenStructure(frame: any): ScreenStructure {
    const FUNC_NAME = 'extractScreenStructure';
    
    try {
      logger.debug(MODULE_NAME, FUNC_NAME, 'Extracting screen structure', {
        frameName: frame.name,
        frameType: frame.type,
        width: safeGetWidth(frame),
        height: safeGetHeight(frame)
      });

      // Use existing DeviceDetector for device type detection
      const deviceDetectionResult = this.deviceDetector.detectDevice(
        safeGetNumber(frame.width), 
        safeGetNumber(frame.height)
      );

      const screenStructure: ScreenStructure = {
        name: frame.name || 'Unnamed Screen',
        width: safeGetWidth(frame),
        height: safeGetHeight(frame),
        x: safeGetNumber(frame.x, 0),
        y: safeGetNumber(frame.y, 0),
        page: frame.parent ? frame.parent.name : undefined,
        backgroundColor: getNodeBackgroundColor(frame) || undefined,
        components: frame.children ? this.extractComponentHierarchyWithSemantics(frame.children) : [],
        layoutType: this.determineLayoutType(frame),
        deviceType: deviceDetectionResult.deviceType, // Using DeviceDetector result
        designSystem: this.analyzeFrameDesignSystem(frame),
        
        // Enhanced with semantic analysis using ComponentDetector
        semanticAnalysis: this.getScreenSemanticAnalysis(frame)
      };

      logger.debug(MODULE_NAME, FUNC_NAME, 'Screen structure extracted successfully', {
        screenName: screenStructure.name,
        componentCount: screenStructure.components.length,
        deviceType: screenStructure.deviceType,
        hasDesignSystem: !!screenStructure.designSystem
      });

      return screenStructure;

    } catch (error) {
      const errorInfo = ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'screen structure extraction'
      });
      logger.error(MODULE_NAME, FUNC_NAME, `Error extracting screen structure: ${errorInfo}`);
      
      // Return fallback structure
      return this.createFallbackScreenStructure(frame);
    }
  }

  @LogFunction(MODULE_NAME)
  private getScreenSemanticAnalysis(frame: any): ComponentDetectionResult {
    const FUNC_NAME = 'getScreenSemanticAnalysis';
    
    try {
      // Use existing ComponentDetector for semantic analysis
      return this.componentDetector.detectComponentType(frame);
    } catch (error) {
      logger.warn(MODULE_NAME, FUNC_NAME, 'Error in semantic analysis, using fallback');
      return this.createFallbackSemanticAnalysis();
    }
  }

  @LogFunction(MODULE_NAME)
  private extractComponentHierarchyWithSemantics(children: any[]): ComponentStructure[] {
    const FUNC_NAME = 'extractComponentHierarchyWithSemantics';
    
    try {
      if (!Array.isArray(children)) {
        logger.warn(MODULE_NAME, FUNC_NAME, 'Children is not an array');
        return [];
      }

      return children.map(child => this.extractSingleComponent(child)).filter(Boolean);
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, `Error extracting component hierarchy: ${error}`);
      return [];
    }
  }

  @LogFunction(MODULE_NAME)
  private extractSingleComponent(node: any): ComponentStructure {
    const FUNC_NAME = 'extractSingleComponent';
    
    try {
      // Use ComponentDetector for semantic type detection
      const semanticAnalysis = this.componentDetector.detectComponentType(node);
      const semanticType = this.determineSemanticType(semanticAnalysis);

      const component: ComponentStructure = {
        id: node.id || `component_${Date.now()}_${Math.random()}`,
        name: node.name || 'Unnamed Component',
        type: node.type || 'UNKNOWN',
        semanticType: semanticType,
        x: safeGetNumber(node.x, 0),
        y: safeGetNumber(node.y, 0),
        width: safeGetWidth(node),
        height: safeGetHeight(node),
        backgroundColor: getNodeBackgroundColor(node),
        borderRadius: safeGetNumber(node.cornerRadius, 0),
        text: this.extractTextContent(node),
        fontSize: safeGetNumber(node.fontSize),
        fontWeight: this.extractFontWeight(node),
        textColor: this.extractTextColor(node),
        textAlign: node.textAlignHorizontal || undefined,
        children: node.children ? this.extractComponentHierarchyWithSemantics(node.children) : undefined
      };

      logger.debug(MODULE_NAME, FUNC_NAME, 'Component extracted', {
        name: component.name,
        type: component.type,
        semanticType: component.semanticType,
        hasChildren: !!component.children?.length
      });

      return component;

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, `Error extracting component: ${error}`);
      return this.createFallbackComponent(node);
    }
  }

  @LogFunction(MODULE_NAME)
  private determineSemanticType(analysis: ComponentDetectionResult): string | undefined {
    // Convert ComponentDetectionResult to semantic type string
    if (analysis.isButton && analysis.confidence > 0.6) return 'button';
    if (analysis.isInput && analysis.confidence > 0.6) return 'input';
    if (analysis.isHeading && analysis.confidence > 0.6) return 'heading';
    if (analysis.isLabel && analysis.confidence > 0.6) return 'label';
    if (analysis.isCard && analysis.confidence > 0.6) return 'card';
    if (analysis.isNavigation && analysis.confidence > 0.6) return 'navigation';
    
    return undefined;
  }

  @LogFunction(MODULE_NAME)
  private determineLayoutType(frame: any): string {
    const FUNC_NAME = 'determineLayoutType';
    
    try {
      // Check Figma's auto layout properties
      if (frame.layoutMode) {
        switch (frame.layoutMode) {
          case 'HORIZONTAL':
            return 'horizontal';
          case 'VERTICAL':
            return 'vertical';
          default:
            return 'auto';
        }
      }

      // Fallback analysis based on children positioning
      if (frame.children && frame.children.length > 1) {
        return this.inferLayoutFromChildren(frame.children);
      }

      return 'none';

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, `Error determining layout type: ${error}`);
      return 'unknown';
    }
  }

  @LogFunction(MODULE_NAME)
  private inferLayoutFromChildren(children: any[]): string {
    const FUNC_NAME = 'inferLayoutFromChildren';
    
    try {
      if (children.length < 2) return 'none';

      const positions = children.map(child => ({
        x: safeGetNumber(child.x, 0),
        y: safeGetNumber(child.y, 0)
      }));

      // Check if children are arranged horizontally
      const yVariance = this.calculateVariance(positions.map(p => p.y));
      const xVariance = this.calculateVariance(positions.map(p => p.x));

      if (yVariance < 50 && xVariance > 50) {
        return 'horizontal';
      } else if (xVariance < 50 && yVariance > 50) {
        return 'vertical';
      } else if (yVariance < 50 && xVariance < 50) {
        return 'grid';
      }

      return 'mixed';

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, `Error inferring layout: ${error}`);
      return 'unknown';
    }
  }

  @LogFunction(MODULE_NAME)
  private analyzeFrameDesignSystem(frame: any): DesignSystemAnalysis {
    const FUNC_NAME = 'analyzeFrameDesignSystem';
    
    try {
      const colorUsage = new Set<string>();
      const fontSizeUsage = new Set<number>();
      const spacingUsage = new Set<number>();
      const componentTypes: string[] = [];

      this.collectDesignTokens(frame, colorUsage, fontSizeUsage, spacingUsage, componentTypes);

      const analysis: DesignSystemAnalysis = {
        uniqueColors: colorUsage.size,
        uniqueFontSizes: fontSizeUsage.size,
        uniqueSpacings: spacingUsage.size,
        componentTypes: [...new Set(componentTypes)],
        colorUsage,
        fontSizeUsage,
        spacingUsage
      };

      logger.debug(MODULE_NAME, FUNC_NAME, 'Design system analysis complete', {
        uniqueColors: analysis.uniqueColors,
        uniqueFontSizes: analysis.uniqueFontSizes,
        componentTypes: analysis.componentTypes.length
      });

      return analysis;

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, `Error analyzing design system: ${error}`);
      return this.createFallbackDesignSystem();
    }
  }

  @LogFunction(MODULE_NAME)
  private collectDesignTokens(
    node: any, 
    colors: Set<string>, 
    fontSizes: Set<number>, 
    spacings: Set<number>, 
    componentTypes: string[]
  ): void {
    try {
      // Collect background colors
      const bgColor = getNodeBackgroundColor(node);
      if (bgColor) colors.add(bgColor);

      // Collect font sizes
      if (node.fontSize) fontSizes.add(safeGetNumber(node.fontSize));

      // Collect spacing (padding, margins)
      if (node.paddingTop) spacings.add(safeGetNumber(node.paddingTop));
      if (node.paddingRight) spacings.add(safeGetNumber(node.paddingRight));
      if (node.paddingBottom) spacings.add(safeGetNumber(node.paddingBottom));
      if (node.paddingLeft) spacings.add(safeGetNumber(node.paddingLeft));
      if (node.itemSpacing) spacings.add(safeGetNumber(node.itemSpacing));

      // Collect component types using ComponentDetector
      const semanticAnalysis = this.componentDetector.detectComponentType(node);
      const semanticType = this.determineSemanticType(semanticAnalysis);
      if (semanticType) componentTypes.push(semanticType);

      // Recursively collect from children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
          this.collectDesignTokens(child, colors, fontSizes, spacings, componentTypes);
        });
      }
    } catch (error) {
      // Silent fail for individual token collection
    }
  }

  // Helper methods
  private extractTextContent(node: any): string | undefined {
    try {
      if (node.type === 'TEXT' && node.characters) {
        return node.characters;
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private extractFontWeight(node: any): string | undefined {
    try {
      if (node.fontName && node.fontName.style) {
        return node.fontName.style;
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private extractTextColor(node: any): string | undefined {
    try {
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const textFill = node.fills[0];
        if (textFill.type === 'SOLID' && textFill.color) {
          const { r, g, b } = textFill.color;
          return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
        }
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  }

  // Fallback methods
  private createFallbackScreenStructure(frame: any): ScreenStructure {
    return {
      name: frame?.name || 'Error Screen',
      width: safeGetWidth(frame),
      height: safeGetHeight(frame),
      x: 0,
      y: 0,
      components: [],
      deviceType: 'unknown' as DeviceType,
      semanticAnalysis: this.createFallbackSemanticAnalysis()
    };
  }

  private createFallbackComponent(node: any): ComponentStructure {
    return {
      id: `fallback_${Date.now()}`,
      name: node?.name || 'Error Component',
      type: node?.type || 'UNKNOWN',
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
  }

  private createFallbackSemanticAnalysis(): ComponentDetectionResult {
    return {
      isButton: false,
      isInput: false,
      isHeading: false,
      isLabel: false,
      isCard: false,
      isNavigation: false,
      confidence: 0,
      reasons: ['Fallback analysis due to error']
    };
  }

  private createFallbackDesignSystem(): DesignSystemAnalysis {
    return {
      uniqueColors: 0,
      uniqueFontSizes: 0,
      uniqueSpacings: 0,
      componentTypes: [],
      colorUsage: new Set(),
      fontSizeUsage: new Set(),
      spacingUsage: new Set()
    };
  }
}

export default ScreenExtractor;