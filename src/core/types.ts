// src/core/types.ts
// Core type definitions for the Figma React Native Bridge Plugin

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
  opacity?: number;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  children?: FigmaNode[];
  characters?: string;
  fontSize?: number;
  fontName?: any;
  cornerRadius?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  itemSpacing?: number;
  layoutMode?: string;
  textAlignHorizontal?: string;
  lineHeight?: any;
  parent?: FigmaNode;
}

export interface ExtractedValues {
  colors: Set<string>;
  fontSizes: Set<number>;
  fontWeights: Set<string>;
  fontFamilies: Set<string>;
  borderRadius: Set<number>;
  spacing: Set<number>;
  shadows: Set<string>;
  opacity: Set<number>;
  buttons: ComponentData[];
  inputs: ComponentData[];
  headings: ComponentData[];
  labels: ComponentData[];
  cards: ComponentData[];
  navigationItems: ComponentData[];
}

export interface ComponentData {
  type: string;
  name: string;
  variant?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  width?: number;
  height?: number;
  padding?: PaddingData;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  opacity?: number;
  shadow?: string;
  level?: number;
  lineHeight?: number;
  placeholder?: string;
  text?: string;
  children?: ComponentData[];
}

export interface PaddingData {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ThemeTokens {
  colors: Record<string, string>;
  typography: {
    fontSize: Record<string, number>;
    fontWeight: Record<string, string>;
  };
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, string>;
  opacity: Record<string, number>;
  components?: ComponentTokens;
}

export interface ComponentTokens {
  button?: {
    variants: Record<string, any>;
  };
  input?: {
    variants: Record<string, any>;
  };
  heading?: Record<string, any>;
  label?: Record<string, any>;
  card?: {
    variants: Record<string, any>;
  };
  navigation?: {
    variants: Record<string, any>;
  };
}

export interface ScreenStructure {
  name: string;
  width: number;
  height: number;
  x?: number;  // ADD THIS LINE
  y?: number;  // ADD THIS LINE
  page?: string;
  backgroundColor?: string;
  components: ComponentStructure[];
  layoutType?: string;
  deviceType?: string;
  designSystem?: DesignSystemAnalysis;
}

export interface ComponentStructure {
  id: string;
  name: string;
  type: string;
  semanticType?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  borderRadius?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  textColor?: string;
  textAlign?: string;
  children?: ComponentStructure[];
}

export interface DesignSystemAnalysis {
  uniqueColors: number;
  uniqueFontSizes: number;
  uniqueSpacings: number;
  componentTypes: string[];
  colorUsage?: Set<string>;
  fontSizeUsage?: Set<number>;
  spacingUsage?: Set<number>;
}

export interface ExtractedScreen {
  structure: ScreenStructure;
  code: string;
  componentCount: number;
  semanticComponents?: Record<string, number>;
  designPatterns?: string[];
}

export interface AnalysisReport {
  overview: {
    totalScreens: number;
    totalComponents: number;
    uniqueColors: number;
    uniqueFontSizes: number;
    buttonVariants: number;
    inputVariants: number;
    cardVariants: number;
  };
  recommendations: string[];
  consistency: {
    crossPlatformSupport: boolean;
    deviceTypes: string[];
    colorConsistency: number;
    spacingConsistency: number;
    componentReuse: number;
  };
}

export interface ExtractionResult {
  screens?: ExtractedScreen[];
  theme?: ThemeTokens;
  analysis?: AnalysisReport;
  totalFrames?: number;
  totalPages?: number;
  extracted?: {
    colors: string[];
    fontSizes: number[];
    fontWeights: string[];
    fontFamilies: string[];
    borderRadius: number[];
    spacing: number[];
    shadows: string[];
    opacity: number[];
  };
  fileContent?: string;
}

export interface ProgressUpdate {
  type: 'progress-update';
  progress: number;
}

export interface ErrorMessage {
  type: 'extraction-error' | 'error';
  error: string | {
    message: string;
    stack?: string;
    context?: string;
    module?: string;
    function?: string;
    timestamp?: number;
  };
}

export interface SuccessMessage {
  type: 'extraction-complete' | 'screens-extracted';
  data: ExtractionResult;
}

export type PluginMessage = ProgressUpdate | ErrorMessage | SuccessMessage;

// Utility types
export type SafeNumber = number;
export type SafeString = string;
export type NodeProperty<T> = T | symbol | undefined;

// User role detection from layer naming
export interface UserRole {
  id: string;
  name: string;
  type: 'customer' | 'admin' | 'operator' | 'guest' | 'moderator' | 'unknown';
  confidence: number;
  detectionSource: 'layer_name' | 'folder_structure' | 'content_analysis';
  permissions?: string[];
}

// Flow detection and organization
export interface FlowStructure {
  id: string;
  name: string;
  userRole: UserRole;
  screens: ScreenStructure[];
  flowType: 'onboarding' | 'main_feature' | 'settings' | 'authentication' | 'checkout' | 'unknown';
  navigationPattern: 'stack' | 'tab' | 'modal' | 'drawer' | 'mixed';
  deviceTargets: ('mobile' | 'tablet' | 'desktop')[];
  sequence: number;
  parentFlow?: string;
  subFlows?: string[];
  estimatedDuration?: number; // minutes to complete flow
  criticalPath?: boolean; // ADD THIS LINE
}

// Enhanced screen structure with flow context
export interface FlowAwareScreen extends ScreenStructure {
  flowId: string;
  userRole: UserRole;
  sequenceInFlow: number;
  navigationTo?: string[]; // IDs of screens this can navigate to
  navigationFrom?: string[]; // IDs of screens that can navigate here
  flowStage: 'entry' | 'middle' | 'exit' | 'standalone';
  userIntent: string; // what user is trying to accomplish
  criticalPath: boolean; // is this screen on the critical user path
}

// Layer analysis for role and flow detection
export interface LayerAnalysis {
  layerName: string;
  parentLayers: string[];
  depth: number;
  detectedRole?: UserRole;
  detectedFlow?: string;
  namingPatterns: {
    hasRolePrefix: boolean;
    hasFlowIndicator: boolean;
    hasSequenceNumber: boolean;
    hasDeviceIndicator: boolean;
  };
  confidence: number;
}

// Flow detection results
export interface FlowDetectionResult {
  flows: FlowStructure[];
  orphanedScreens: ScreenStructure[]; // screens that don't fit into any flow
  roleDistribution: Record<string, number>;
  flowTypeDistribution: Record<string, number>;
  detectionQuality: {
    totalScreens: number;
    screensInFlows: number;
    averageFlowLength: number;
    roleDetectionAccuracy: number;
  };
  recommendations: string[];
}

// Role-specific design patterns
export interface RoleBasedDesignPattern {
  role: UserRole;
  commonComponents: string[];
  colorPalette: string[];
  typographyStyle: 'formal' | 'friendly' | 'technical' | 'minimal';
  navigationComplexity: 'simple' | 'moderate' | 'complex';
  informationDensity: 'low' | 'medium' | 'high';
  interactionPatterns: string[];
}

// Enhanced extraction results with flow context
export interface FlowAwareExtractionResult extends ExtractionResult {
  flows: FlowStructure[];
  userRoles: UserRole[];
  roleBasedPatterns: RoleBasedDesignPattern[];
  flowDetection: FlowDetectionResult;
  crossFlowConsistency: {
    sharedComponents: number;
    consistentStyling: number;
    navigationPatterns: number;
    overallScore: number;
  };
}