// src/main.ts
// Figma React Native Bridge Plugin - Main Entry Point

import { DesignExtractor } from './extractor';
import { ReactNativeGenerator } from './generator';

declare const figma: any;
declare const __html__: string;

class FigmaReactNativeBridge {
  private extractor: DesignExtractor;
  private generator: ReactNativeGenerator;

  constructor() {
    this.extractor = new DesignExtractor();
    this.generator = new ReactNativeGenerator();
  }

  // Initialize plugin
  init() {
    console.log('🌉 Figma React Native Bridge Plugin loaded');
    
    // Show UI
    figma.showUI(__html__, { 
      width: 400, 
      height: 600,
      title: 'RN Design Bridge'
    });

    // Handle messages from UI
    figma.ui.onmessage = (msg: any) => {
      this.handleMessage(msg);
    };
  }

  // Handle UI messages
  private async handleMessage(msg: any) {
    try {
      switch (msg.type) {
        case 'extract-tokens':
          await this.handleExtractTokens();
          break;
          
        case 'extract-screens':
          await this.handleExtractScreens();
          break;
          
        case 'close':
          figma.closePlugin();
          break;
          
        default:
          console.warn('Unknown message type:', msg.type);
      }
    } catch (error) {
      this.sendError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // Extract design tokens and generate theme
  private async handleExtractTokens() {
    this.sendProgress(10, 'Analyzing Figma design...');
    
    try {
      // Extract design tokens from all pages
      const designTokens = this.extractor.extractDesignTokens();
      this.sendProgress(50, 'Generating responsive theme...');
      
      // Generate React Native theme
      const theme = this.generator.generateTheme(designTokens);
      const themeCode = this.generator.generateThemeFile(theme);
      
      this.sendProgress(90, 'Finalizing theme...');
      
      // Send results to UI
      this.sendSuccess('tokens-extracted', {
        tokens: {
          colors: Array.from(designTokens.colors),
          fontSizes: Array.from(designTokens.fontSizes),
          spacing: Array.from(designTokens.spacing),
          borderRadius: Array.from(designTokens.borderRadius)
        },
        theme,
        themeCode
      });
      
      this.sendProgress(100, 'Theme generation complete!');
      
    } catch (error) {
      this.sendError(`Token extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Extract screens and generate components
  private async handleExtractScreens() {
    this.sendProgress(10, 'Finding screens in Figma...');
    
    try {
      // Extract all frames as screens
      const screens = this.extractor.extractScreens();
      this.sendProgress(40, 'Analyzing components...');
      
      // Generate design tokens
      const designTokens = this.extractor.extractDesignTokens();
      const theme = this.generator.generateTheme(designTokens);
      
      this.sendProgress(70, 'Generating React Native code...');
      
      // Generate React Native components for each screen
      const generatedScreens = screens.map(screen => {
        const code = this.generator.generateScreenComponent(screen, theme);
        return {
          ...screen,
          code
        };
      });
      
      this.sendProgress(90, 'Finalizing components...');
      
      // Send results to UI
      this.sendSuccess('screens-extracted', {
        screens: generatedScreens,
        theme,
        themeCode: this.generator.generateThemeFile(theme),
        stats: {
          totalScreens: generatedScreens.length,
          totalComponents: generatedScreens.reduce((sum, screen) => sum + screen.components.length, 0)
        }
      });
      
      this.sendProgress(100, 'Screen generation complete!');
      
    } catch (error) {
      this.sendError(`Screen extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send progress update to UI
  private sendProgress(progress: number, message: string) {
    figma.ui.postMessage({
      type: 'progress',
      progress,
      message
    });
  }

  // Send success result to UI
  private sendSuccess(type: string, data: any) {
    figma.ui.postMessage({
      type,
      data
    });
  }

  // Send error to UI
  private sendError(message: string) {
    figma.ui.postMessage({
      type: 'error',
      message
    });
    console.error('Plugin Error:', message);
  }
}

// Initialize plugin
const plugin = new FigmaReactNativeBridge();
plugin.init();