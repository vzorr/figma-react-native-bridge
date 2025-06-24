// src/extractors/screen-extractor.ts
// Complete implementation extracted from code.ts

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { ScreenStructure, ComponentStructure } from '@core/types';
import { safeGetNumber } from '@utils/number-utils';
import { getAllPages, getAllFrames, getNodeBackgroundColor } from '@utils/figma-helpers';

const MODULE_NAME = 'ScreenExtractor';

export class ScreenExtractor {

  @LogFunction(MODULE_NAME, true)
  extractAllScreens(): ScreenStructure[] {
    try {
      logger.info(MODULE_NAME, 'extractAllScreens', 'Starting comprehensive screens extraction');
      
      // Find all frames in ALL pages, not just current page
      const allFrames = getAllFrames();
      
      if (allFrames.length === 0) {
        logger.warn(MODULE_NAME, 'extractAllScreens', 'No frames found across all pages');
        return [];
      }
      
      logger.info(MODULE_NAME, 'extractAllScreens', `Found ${allFrames.length} frames`);
      
      // Extract each frame as a screen with detailed analysis
      const screens = allFrames.map((frame: any, index: number) => {
        logger.debug(MODULE_NAME, 'extractAllScreens', `Extracting screen: ${frame.name} (${frame.width}x${frame.height})`);
        
        return this.extractEnhancedScreenStructure(frame);
      });
      
      logger.info(MODULE_NAME, 'extractAllScreens', `Comprehensive extraction complete. Generated ${screens.length} screens`);
      return screens;
      
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: 'extractAllScreens',
        operation: 'comprehensive screens extraction'
      });
      return [];
    }
  }

  @LogFunction(MODULE_NAME)
 
  // In src/extractors/screen-extractor.ts - Update extractEnhancedScreenStructure method

@LogFunction(MODULE_NAME)
extractEnhancedScreenStructure(frame: any): ScreenStructure {
  try {
    const structure: ScreenStructure = {
      name: frame.name,
      width: safeGetNumber(frame.width),
      height: safeGetNumber(frame.height),
      x: safeGetNumber(frame.x), // ADD THIS LINE
      y: safeGetNumber(frame.y), // ADD THIS LINE
      page: frame.parent ? frame.parent.name : undefined,
      backgroundColor: getNodeBackgroundColor(frame) || undefined,
      components: frame.children ? this.extractComponentHierarchyWithSemantics(frame.children) : [],
      layoutType: this.determineLayoutType(frame),
      deviceType: this.determineDeviceType(safeGetNumber(frame.width), safeGetNumber(frame.height)),
      designSystem: this.analyzeFrameDesignSystem(frame)
    };

    logger.debug(MODULE_NAME, 'extractEnhancedScreenStructure', 'Screen structure extracted', {
      name: structure.name,
      components: structure.components.length,
      deviceType: structure.deviceType
    });

    return structure;
  } catch (error) {
    ErrorHandler.handle(error as Error, {
      module: MODULE_NAME,
      function: 'extractEnhancedScreenStructure',
      operation: 'screen structure extraction',
      nodeInfo: { name: frame.name, type: frame.type }
    });

    // Return minimal structure on error
    return {
      name: frame.name || 'Unknown',
      width: safeGetNumber(frame.width, 375),
      height: safeGetNumber(frame.height, 667),
      x: safeGetNumber(frame.x, 0), // ADD THIS LINE
      y: safeGetNumber(frame.y, 0), // ADD THIS LINE
      components: [],
      layoutType: 'absolute',
      deviceType: 'mobile'
    };
  }
}

  @LogFunction(MODULE_NAME)
  extractComponentHierarchyWithSemantics(nodes: any[]): ComponentStructure[] {
    try {
      return nodes
        .map((node: any) => this.extractSemanticComponentData(node))
        .filter((data: ComponentStructure | null) => data !== null) as ComponentStructure[];
    } catch (error) {
      logger.error(MODULE_NAME, 'extractComponentHierarchyWithSemantics', 'Error extracting component hierarchy:', error as Error);
      return [];
    }
  }

  @LogFunction(MODULE_NAME)
  extractSemanticComponentData(node: any): ComponentStructure | null {
    try {
      const baseData: ComponentStructure = {
        id: node.id,
        name: node.name,
        type: node.type,
        semanticType: this.determineSemanticType(node),
        x: safeGetNumber(node.x),
        y: safeGetNumber(node.y),
        width: safeGetNumber(node.width),
        height: safeGetNumber(node.height),
        backgroundColor: getNodeBackgroundColor(node) || undefined,
        borderRadius: safeGetNumber(node.cornerRadius, 0)
      };

      if (node.type === 'TEXT') {
        baseData.text = node.characters;
        baseData.fontSize = safeGetNumber(node.fontSize);
        baseData.fontWeight = this.getNodeFontWeight(node) || undefined;
        baseData.textColor = this.getNodeTextColor(node) || undefined;
        baseData.textAlign = node.textAlignHorizontal;
      }

      if ('children' in node && node.children && node.children.length > 0) {
        baseData.children = this.extractComponentHierarchyWithSemantics(node.children);
      }

      return baseData;
    } catch (error) {
      logger.warn(MODULE_NAME, 'extractSemanticComponentData', 'Error extracting component data:', { 
        error, 
        node: node?.name 
      });
      return null;
    }
  }

  @LogFunction(MODULE_NAME)
  private determineSemanticType(node: any): string {
    try {
      const name = node.name.toLowerCase();
      
      if (this.isButton(node, name)) return 'button';
      if (this.isInputField(node, name)) return 'input';
      if (this.isHeading(node, name)) return 'heading';
      if (this.isLabel(node, name)) return 'label';
      if (this.isCard(node, name)) return 'card';
      if (this.isNavigationItem(node, name)) return 'navigation';
      if (node.type === 'TEXT') return 'text';
      if (node.type === 'FRAME') return 'container';
      if (node.type === 'RECTANGLE') return 'shape';
      if (node.type === 'COMPONENT') return 'component';
      if (node.type === 'INSTANCE') return 'instance';
      
      return 'element';
    } catch (error) {
      return 'element';
    }
  }

  @LogFunction(MODULE_NAME)
  private determineLayoutType(frame: any): string {
    try {
      if ('layoutMode' in frame) {
        if (frame.layoutMode === 'VERTICAL') return 'column';
        if (frame.layoutMode === 'HORIZONTAL') return 'row';
      }
      return 'absolute';
    } catch (error) {
      return 'absolute';
    }
  }

  @LogFunction(MODULE_NAME)
  private determineDeviceType(width: number, height: number): string {
    try {
      const aspectRatio = width / height;
      
      if (width <= 480) return 'mobile';
      if (width <= 768) return 'tablet';
      if (aspectRatio > 1.5) return 'desktop';
      return 'tablet';
    } catch (error) {
      return 'mobile';
    }
  }

  @LogFunction(MODULE_NAME)
  private analyzeFrameDesignSystem(frame: any): any {
    try {
      const analysis = {
        colorUsage: new Set<string>(),
        fontSizeUsage: new Set<number>(),
        spacingUsage: new Set<number>(),
        componentTypes: new Set<string>()
      };
      
      const allNodes = frame.findAll();
      allNodes.forEach((node: any) => {
        try {
          // Analyze color usage
          const bgColor = getNodeBackgroundColor(node);
          if (bgColor) analysis.colorUsage.add(bgColor);
          
          const textColor = this.getNodeTextColor(node);
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
          analysis.componentTypes.add(this.determineSemanticType(node));
        } catch (nodeError) {
          // Skip problematic nodes
        }
      });
      
      return {
        uniqueColors: analysis.colorUsage.size,
        uniqueFontSizes: analysis.fontSizeUsage.size,
        uniqueSpacings: analysis.spacingUsage.size,
        componentTypes: Array.from(analysis.componentTypes)
      };
    } catch (error) {
      logger.error(MODULE_NAME, 'analyzeFrameDesignSystem', 'Error analyzing design system:', error as Error);
      return {
        uniqueColors: 0,
        uniqueFontSizes: 0,
        uniqueSpacings: 0,
        componentTypes: []
      };
    }
  }

  // Component detection methods (simplified versions)
  private isButton(node: any, name: string): boolean {
    return (
      name.includes('button') || 
      name.includes('btn') || 
      name.includes('cta') ||
      name.includes('action') ||
      (node.type === 'COMPONENT' && this.hasButtonCharacteristics(node))
    );
  }

  private isInputField(node: any, name: string): boolean {
    return (
      name.includes('input') ||
      name.includes('field') ||
      name.includes('textbox') ||
      (node.type === 'FRAME' && this.hasInputCharacteristics(node))
    );
  }

  private isHeading(node: any, name: string): boolean {
    return (
      node.type === 'TEXT' && (
        name.includes('heading') ||
        name.includes('title') ||
        name.includes('h1') ||
        name.includes('h2') ||
        (typeof node.fontSize === 'number' && node.fontSize >= 24)
      )
    );
  }

  private isLabel(node: any, name: string): boolean {
    return (
      node.type === 'TEXT' && (
        name.includes('label') ||
        name.includes('caption') ||
        name.includes('subtitle') ||
        (typeof node.fontSize === 'number' && node.fontSize <= 14)
      )
    );
  }

  private isCard(node: any, name: string): boolean {
    return (
      name.includes('card') ||
      name.includes('item') ||
      name.includes('tile') ||
      (node.type === 'FRAME' && this.hasCardCharacteristics(node))
    );
  }

  private isNavigationItem(node: any, name: string): boolean {
    return (
      name.includes('nav') ||
      name.includes('tab') ||
      name.includes('menu') ||
      name.includes('bar')
    );
  }

  // Characteristic detection helpers
  private hasButtonCharacteristics(node: any): boolean {
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

  private hasInputCharacteristics(node: any): boolean {
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

  private hasCardCharacteristics(node: any): boolean {
    try {
      const width = safeGetNumber(node.width);
      const height = safeGetNumber(node.height);
      
      return (
        width > 200 && height > 100 &&
        'children' in node && node.children && node.children.length > 1
      );
    } catch (error) {
      return false;
    }
  }

  // Helper methods for text processing
  private getNodeTextColor(node: any): string | null {
    try {
      if (node.type === 'TEXT' && 'fills' in node && node.fills && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          return this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private getNodeFontWeight(node: any): string | null {
    try {
      if (node.type === 'TEXT' && node.fontName && node.fontName !== figma.mixed && typeof node.fontName === 'object') {
        if (node.fontName.style && typeof node.fontName.style === 'string') {
          return node.fontName.style;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number): string => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
}