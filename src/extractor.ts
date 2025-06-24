// src/extractor.ts
// Design Token and Component Extractor

import { DesignTokens, ExtractedScreen, ComponentData } from './types';

export class DesignExtractor {

  // Extract design tokens from all pages
  extractDesignTokens(): DesignTokens {
    console.log('🎨 Extracting design tokens...');
    
    const tokens: DesignTokens = {
      colors: new Set(),
      fontSizes: new Set(),
      fontWeights: new Set(),
      spacing: new Set(),
      borderRadius: new Set(),
      shadows: new Set(),
      components: []
    };

    try {
      // Get all pages
      const pages = figma.root.children.filter((node: any) => node.type === 'PAGE');
      
      pages.forEach(page => {
        console.log(`📄 Processing page: ${page.name}`);
        const allNodes = page.findAll();
        
        allNodes.forEach(node => {
          this.extractTokensFromNode(node, tokens);
        });
      });

      console.log(`✅ Extracted ${tokens.colors.size} colors, ${tokens.fontSizes.size} font sizes, ${tokens.spacing.size} spacing values`);
      return tokens;
      
    } catch (error) {
      console.error('❌ Error extracting design tokens:', error);
      throw error;
    }
  }

  // Extract screens (frames) from all pages
  extractScreens(): ExtractedScreen[] {
    console.log('📱 Extracting screens...');
    
    const screens: ExtractedScreen[] = [];

    try {
      // Get all pages
      const pages = figma.root.children.filter((node: any) => node.type === 'PAGE');
      
      pages.forEach(page => {
        // Get frames from each page
        const frames = page.children.filter((node: any) => node.type === 'FRAME');
        
        frames.forEach(frame => {
          const screen = this.processFrame(frame, page.name);
          screens.push(screen);
          console.log(`📱 Processed screen: ${screen.name} (${screen.deviceType})`);
        });
      });

      console.log(`✅ Extracted ${screens.length} screens`);
      return screens;
      
    } catch (error) {
      console.error('❌ Error extracting screens:', error);
      throw error;
    }
  }

  // Extract tokens from individual node
  private extractTokensFromNode(node: any, tokens: DesignTokens) {
    try {
      // Extract colors from fills
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach((fill: any) => {
          if (fill.type === 'SOLID' && fill.color && fill.visible !== false) {
            const color = this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            tokens.colors.add(color);
          }
        });
      }

      // Extract colors from strokes
      if (node.strokes && Array.isArray(node.strokes)) {
        node.strokes.forEach((stroke: any) => {
          if (stroke.type === 'SOLID' && stroke.color && stroke.visible !== false) {
            const color = this.rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
            tokens.colors.add(color);
          }
        });
      }

      // Extract typography
      if (node.type === 'TEXT') {
        if (typeof node.fontSize === 'number' && node.fontSize >= 8 && node.fontSize <= 72) {
          tokens.fontSizes.add(Math.round(node.fontSize));
        }
        
        if (node.fontName && typeof node.fontName === 'object' && node.fontName.style) {
          tokens.fontWeights.add(node.fontName.style);
        }
      }

      // Extract spacing from layout properties
      if (node.paddingLeft && typeof node.paddingLeft === 'number' && node.paddingLeft > 0) {
        tokens.spacing.add(Math.round(node.paddingLeft));
      }
      if (node.paddingTop && typeof node.paddingTop === 'number' && node.paddingTop > 0) {
        tokens.spacing.add(Math.round(node.paddingTop));
      }
      if (node.itemSpacing && typeof node.itemSpacing === 'number' && node.itemSpacing > 0) {
        tokens.spacing.add(Math.round(node.itemSpacing));
      }

      // Extract border radius
      if (node.cornerRadius && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
        tokens.borderRadius.add(Math.round(node.cornerRadius));
      }

      // Extract shadows
      if (node.effects && Array.isArray(node.effects)) {
        node.effects.forEach((effect: any) => {
          if (effect.type === 'DROP_SHADOW' && effect.visible && effect.radius > 0) {
            const shadow = `${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px rgba(0,0,0,${effect.color.a || 0.25})`;
            tokens.shadows.add(shadow);
          }
        });
      }

    } catch (error) {
      // Skip problematic nodes silently
    }
  }

  // Process frame into screen data
  private processFrame(frame: any, pageName: string): ExtractedScreen {
    const deviceType = this.detectDeviceType(frame.width, frame.height);
    const components = this.extractComponents(frame);
    
    return {
      id: frame.id,
      name: frame.name,
      pageName,
      width: Math.round(frame.width),
      height: Math.round(frame.height),
      deviceType,
      backgroundColor: this.getBackgroundColor(frame),
      components
    };
  }

  // Extract components from frame
  private extractComponents(frame: any): ComponentData[] {
    const components: ComponentData[] = [];
    
    if (!frame.children) return components;

    frame.children.forEach((child: any) => {
      const component = this.processComponent(child);
      if (component) {
        components.push(component);
      }
    });
    
    return components;
  }

  // Process individual component
  private processComponent(node: any): ComponentData | null {
    try {
      const componentType = this.detectComponentType(node);
      
      return {
        id: node.id,
        name: node.name,
        type: componentType,
        x: Math.round(node.x || 0),
        y: Math.round(node.y || 0),
        width: Math.round(node.width || 0),
        height: Math.round(node.height || 0),
        text: node.characters || '',
        backgroundColor: this.getBackgroundColor(node),
        textColor: this.getTextColor(node),
        fontSize: typeof node.fontSize === 'number' ? Math.round(node.fontSize) : undefined,
        fontWeight: this.getFontWeight(node),
        borderRadius: typeof node.cornerRadius === 'number' ? Math.round(node.cornerRadius) : 0,
        padding: this.getPadding(node),
        children: node.children ? node.children.map((child: any) => this.processComponent(child)).filter(Boolean) : []
      };
    } catch (error) {
      console.warn(`Failed to process component: ${node.name}`, error);
      return null;
    }
  }

  // Detect component type based on name and properties
  private detectComponentType(node: any): string {
    const name = node.name.toLowerCase();
    
    // Button detection
    if (name.includes('button') || name.includes('btn') || name.includes('cta')) {
      return 'button';
    }
    
    // Input detection
    if (name.includes('input') || name.includes('textfield') || name.includes('textbox')) {
      return 'input';
    }
    
    // Image detection
    if (name.includes('image') || name.includes('img') || name.includes('photo') || name.includes('avatar')) {
      return 'image';
    }
    
    // Text detection
    if (node.type === 'TEXT') {
      const fontSize = typeof node.fontSize === 'number' ? node.fontSize : 16;
      if (fontSize >= 24) return 'heading';
      if (fontSize <= 12) return 'caption';
      return 'text';
    }
    
    // Container detection
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      if (name.includes('card')) return 'card';
      if (name.includes('header') || name.includes('navigation')) return 'header';
      return 'view';
    }
    
    return 'view';
  }

  // Detect device type based on dimensions
  private detectDeviceType(width: number, height: number): 'mobile' | 'tablet' | 'desktop' {
    const maxDimension = Math.max(width, height);
    
    if (maxDimension <= 480) return 'mobile';
    if (maxDimension <= 768) return 'tablet';
    return 'desktop';
  }

  // Helper methods for extracting properties
  private getBackgroundColor(node: any): string | undefined {
    try {
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          return this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        }
      }
    } catch (error) {
      // Return undefined if extraction fails
    }
    return undefined;
  }

  private getTextColor(node: any): string | undefined {
    try {
      if (node.type === 'TEXT' && node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
          return this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
        }
      }
    } catch (error) {
      // Return undefined if extraction fails
    }
    return undefined;
  }

  private getFontWeight(node: any): string | undefined {
    try {
      if (node.type === 'TEXT' && node.fontName && typeof node.fontName === 'object') {
        return node.fontName.style || undefined;
      }
    } catch (error) {
      // Return undefined if extraction fails
    }
    return undefined;
  }

  private getPadding(node: any): { top: number; right: number; bottom: number; left: number } {
    return {
      top: Math.round(node.paddingTop || 0),
      right: Math.round(node.paddingRight || 0),
      bottom: Math.round(node.paddingBottom || 0),
      left: Math.round(node.paddingLeft || 0)
    };
  }

  // Convert RGB to hex
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
}