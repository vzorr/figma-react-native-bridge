// src/types.ts
// Essential Types for Figma React Native Bridge

// Design tokens extracted from Figma
export interface DesignTokens {
  colors: Set<string>;
  fontSizes: Set<number>;
  fontWeights: Set<string>;
  spacing: Set<number>;
  borderRadius: Set<number>;
  shadows: Set<string>;
  components: ComponentData[];
}

// Individual component data
export interface ComponentData {
  id: string;
  name: string;
  type: 'button' | 'input' | 'text' | 'heading' | 'caption' | 'image' | 'view' | 'card' | 'header';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
  borderRadius: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  children?: ComponentData[];
}

// Extracted screen/frame data
export interface ExtractedScreen {
  id: string;
  name: string;
  pageName: string;
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  backgroundColor?: string;
  components: ComponentData[];
}

// Generated React Native theme
export interface ReactNativeTheme {
  colors: Record<string, string>;
  typography: {
    sizes: Record<string, number>;
    weights: Record<string, string>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
}

// Message types for UI communication
export type MessageType = 
  | 'extract-tokens'
  | 'extract-screens'
  | 'close'
  | 'progress'
  | 'tokens-extracted'
  | 'screens-extracted'
  | 'error';

export interface ProgressMessage {
  type: 'progress';
  progress: number;
  message: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface TokensExtractedMessage {
  type: 'tokens-extracted';
  data: {
    tokens: {
      colors: string[];
      fontSizes: number[];
      spacing: number[];
      borderRadius: number[];
    };
    theme: ReactNativeTheme;
    themeCode: string;
  };
}

export interface ScreensExtractedMessage {
  type: 'screens-extracted';
  data: {
    screens: (ExtractedScreen & { code: string })[];
    theme: ReactNativeTheme;
    themeCode: string;
    stats: {
      totalScreens: number;
      totalComponents: number;
    };
  };
}

// Global Figma API types
declare global {
  const figma: {
    root: {
      children: any[];
    };
    showUI: (html: string, options?: { width?: number; height?: number; title?: string }) => void;
    closePlugin: () => void;
    ui: {
      postMessage: (message: any) => void;
      onmessage: ((message: any) => void) | null;
    };
  };
  
  const __html__: string;
}