// src/core/constants.ts
// Complete constants for the Figma React Native Bridge Plugin
// Updated with missing message types from main.ts

// ============================================================================
// MESSAGE TYPES - Plugin to UI Communication
// ============================================================================

export const MESSAGE_TYPES = {
  // Core extraction types (EXISTING - validated from main.ts)
  EXTRACT_VALUES: 'extract-values',
  EXTRACT_SCREENS: 'extract-screens',
  EXTRACTION_COMPLETE: 'extraction-complete',
  EXTRACTION_ERROR: 'extraction-error',
  
  // Flow detection types (EXISTING - validated from main.ts, extract-flows-handler.ts)
  DETECT_FLOWS: 'detect-flows',
  FLOWS_DETECTED: 'flows-detected',
  FLOW_SELECTED: 'flow-selected',
  SCREEN_IN_FLOW_SELECTED: 'screen-in-flow-selected',
  
  // Code generation types (EXISTING - validated from main.ts)
  GENERATE_FLOW_CODE: 'generate-flow-code',
  GENERATE_SCREEN_CODE: 'generate-screen-code',
  EXPORT_FLOW_THEME: 'export-flow-theme',
  FLOW_CODE_GENERATED: 'flow-code-generated',
  SCREEN_CODE_GENERATED: 'screen-code-generated',
  FLOW_THEME_EXPORTED: 'flow-theme-exported',
  
  // Project structure generation (ADDED - used in main.ts)
  GENERATE_PROJECT_STRUCTURE: 'generate-project-structure',
  
  // System messages (EXISTING - validated from main.ts)
  PROGRESS_UPDATE: 'progress-update',
  ERROR: 'error',
  SUCCESS: 'success',
  CLOSE: 'close',
  CRITICAL_ERROR: 'critical-error',
  
  // User interaction messages (ADDED - used in main.ts)
  REFRESH_SELECTION: 'refresh-selection',
  CANCEL_OPERATION: 'cancel-operation',
  CLOSE_PLUGIN: 'close-plugin',
  
  // Logging system (EXISTING - validated from main.ts)
  GET_LOGS: 'get-logs',
  CLEAR_LOGS: 'clear-logs',
  SET_LOG_LEVEL: 'set-log-level',
  LOGS_DATA: 'logs-data',
  LOGS_CLEARED: 'logs-cleared',
  LOG_LEVEL_CHANGED: 'log-level-changed',
  FINAL_LOGS: 'final-logs',
  
  // Plugin lifecycle (EXISTING - validated from main.ts)
  PLUGIN_READY: 'plugin-ready',
  PLUGIN_ERROR: 'plugin-error',
  
  // Additional system messages
  SELECTION_CHANGED: 'selection-changed',
  FILE_CHANGED: 'file-changed',
  PAGE_CHANGED: 'page-changed'
} as const;

// ============================================================================
// FLOW MESSAGE TYPES - Flow-specific Communication
// ============================================================================

export const FLOW_MESSAGE_TYPES = {
  // Core flow operations (EXISTING - validated from extract-flows-handler.ts)
  FLOWS_DETECTED: 'flows-detected',
  FLOW_SELECTED: 'flow-selected',
  SCREEN_IN_FLOW_SELECTED: 'screen-in-flow-selected',
  
  // Flow code generation (EXISTING - validated from extract-flows-handler.ts)
  FLOW_CODE_GENERATED: 'flow-code-generated',
  SCREEN_CODE_GENERATED: 'screen-code-generated',
  FLOW_THEME_EXPORTED: 'flow-theme-exported',
  
  // Flow analysis
  FLOW_ANALYSIS_COMPLETE: 'flow-analysis-complete',
  ROLE_DETECTION_COMPLETE: 'role-detection-complete',
  FLOW_OPTIMIZATION_COMPLETE: 'flow-optimization-complete',
  
  // Flow navigation
  FLOW_NAVIGATION_UPDATED: 'flow-navigation-updated',
  SCREEN_SEQUENCE_CHANGED: 'screen-sequence-changed'
} as const;

// ============================================================================
// UI MESSAGE TYPES - UI to Plugin Communication (kebab-case for HTML)
// ============================================================================

export const UI_MESSAGE_TYPES = {
  // Core actions (EXISTING - validated from ui.html)
  EXTRACT_TOKENS: 'extract-tokens',
  EXTRACT_SCREENS: 'extract-screens',
  DETECT_FLOWS: 'detect-flows',
  
  // Flow actions (EXISTING - validated from ui.html)
  FLOW_SELECTED: 'flow-selected',
  SCREEN_IN_FLOW_SELECTED: 'screen-in-flow-selected',
  GENERATE_FLOW_CODE: 'generate-flow-code',
  GENERATE_SCREEN_CODE: 'generate-screen-code',
  EXPORT_FLOW_THEME: 'export-flow-theme',
  
  // Project structure generation (ADDED - used in main.ts)
  GENERATE_PROJECT_STRUCTURE: 'generate-project-structure',
  
  // User interaction actions (ADDED - used in main.ts)
  REFRESH_SELECTION: 'refresh-selection',
  CANCEL_OPERATION: 'cancel-operation',
  CLOSE_PLUGIN: 'close-plugin',
  
  // Responses (EXISTING - validated from ui.html)
  FLOWS_DETECTED: 'flows-detected',
  TOKENS_EXTRACTED: 'tokens-extracted',
  EXTRACTION_COMPLETE: 'extraction-complete',
  FLOW_CODE_GENERATED: 'flow-code-generated',
  SCREEN_CODE_GENERATED: 'screen-code-generated',
  FLOW_THEME_EXPORTED: 'flow-theme-exported',
  
  // System (EXISTING - validated from ui.html)
  PROGRESS: 'progress',
  ERROR: 'error',
  
  // Additional UI actions
  CLOSE: 'close',
  REFRESH: 'refresh',
  RESET: 'reset',
  COPY_CODE: 'copy-code',
  DOWNLOAD_FILE: 'download-file'
} as const;

// ============================================================================
// FLOW PATTERNS - User Role & Flow Detection
// ============================================================================

export const FLOW_PATTERNS = {
  // User role patterns (EXISTING - validated from detectors usage)
  userRoles: {
    customer: ['customer', 'client', 'user', 'buyer', 'shopper', 'consumer'],
    admin: ['admin', 'administrator', 'manager', 'super', 'root', 'owner'],
    operator: ['operator', 'staff', 'employee', 'worker', 'agent', 'team'],
    guest: ['guest', 'visitor', 'anonymous', 'public', 'unauth', 'temp'],
    moderator: ['moderator', 'mod', 'supervisor', 'reviewer', 'monitor']
  },
  
  // Flow type patterns (EXISTING - validated from detectors usage)
  flowTypes: {
    onboarding: ['onboarding', 'welcome', 'intro', 'tutorial', 'getting-started', 'first-time'],
    authentication: ['login', 'signup', 'auth', 'signin', 'register', 'verification', 'password'],
    main_feature: ['dashboard', 'home', 'main', 'primary', 'core', 'feed', 'overview'],
    settings: ['settings', 'preferences', 'config', 'options', 'profile', 'account'],
    checkout: ['checkout', 'payment', 'cart', 'purchase', 'billing', 'order'],
    unknown: []
  },
  
  // Sequence indicators (EXISTING - validated from detectors usage)
  sequenceIndicators: [
    /[-_](\d+)$/, // ends with number: "screen_1"
    /step[-_]?(\d+)/i, // step patterns: "step-1", "step1"
    /page[-_]?(\d+)/i, // page patterns: "page-1", "page1"  
    /screen[-_]?(\d+)/i, // screen patterns: "screen-1", "screen1"
    /(\d+)[-_]of[-_]\d+/i, // progress patterns: "1_of_5"
    /^(\d+)[-_]/, // starts with number: "1_welcome"
    /v(\d+)$/i, // version numbers: "loginv2"
    /[-_](\d+)[-_]/, // number with separators: "login_1_mobile"
  ]
};

// ============================================================================
// DETECTION THRESHOLDS - Confidence Levels
// ============================================================================

export const DETECTION_THRESHOLDS = {
  // Role detection confidence (EXISTING - validated from detectors usage)
  role: {
    high_confidence: 0.8,
    medium_confidence: 0.6,
    low_confidence: 0.4,
    minimum_threshold: 0.3
  },
  
  // Flow detection confidence (EXISTING - validated from detectors usage)
  flow: {
    naming_pattern: 0.8,
    page_structure: 0.7,
    spatial_proximity: 0.6,
    content_analysis: 0.5,
    prototype_links: 0.9,
    minimum_flow_confidence: 0.4
  },
  
  // Component detection (EXISTING - validated from detectors usage)
  component: {
    semantic_detection: 0.7,
    pattern_matching: 0.6,
    characteristic_matching: 0.5,
    minimum_component_confidence: 0.4
  },
  
  // Design system consistency
  design_system: {
    color_consistency: 0.7,
    typography_consistency: 0.6,
    spacing_consistency: 0.6,
    component_reuse: 0.5
  }
};

// ============================================================================
// DESIGN TOKENS - Extraction Constraints
// ============================================================================

export const DESIGN_TOKENS = {
  // Typography constraints (EXISTING - validated from extractors usage)
  fontSize: {
    min: 8,
    max: 72,
    common: [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48]
  },
  
  // Spacing constraints (EXISTING - validated from extractors usage) 
  spacing: {
    min: 0,
    max: 200,
    grid_base: 8, // 8px grid system
    common: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
  },
  
  // Border radius constraints (EXISTING - validated from extractors usage)
  borderRadius: {
    min: 0,
    max: 100,
    common: [2, 4, 6, 8, 12, 16, 20, 24, 50, 9999]
  },
  
  // Opacity constraints (EXISTING - validated from extractors usage)
  opacity: {
    min: 0.1,
    max: 1.0,
    common: [0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  },
  
  // Color constraints
  color: {
    max_unique_colors: 50,
    max_semantic_colors: 20,
    max_accent_colors: 10
  }
};

// ============================================================================
// DEVICE BREAKPOINTS - Responsive Design
// ============================================================================

export const DEVICE_BREAKPOINTS = {
  // Mobile devices (EXISTING - validated from detectors usage)
  mobile: {
    maxWidth: 480,
    aspectRatio: { min: 0.4, max: 0.8 },
    common_resolutions: [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 375, height: 812, name: 'iPhone X' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 360, height: 640, name: 'Android' }
    ]
  },
  
  // Tablet devices (EXISTING - validated from detectors usage)
  tablet: {
    maxWidth: 1024,
    aspectRatio: { min: 0.6, max: 1.4 },
    common_resolutions: [
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 820, height: 1180, name: 'iPad Air' }
    ]
  },
  
  // Desktop devices (EXISTING - validated from detectors usage)
  desktop: {
    minWidth: 1024,
    aspectRatio: { min: 1.2, max: 3.0 },
    common_resolutions: [
      { width: 1920, height: 1080, name: 'Full HD' },
      { width: 1440, height: 900, name: 'MacBook' },
      { width: 1366, height: 768, name: 'Laptop' }
    ]
  }
};

// ============================================================================
// FONT WEIGHT MAPPINGS - Figma to CSS
// ============================================================================

export const FONT_WEIGHT_MAPPINGS = {
  // Standard mappings (EXISTING - validated from extractors usage)
  'Thin': '100',
  'Extra Light': '200',
  'ExtraLight': '200',
  'Light': '300',
  'Normal': '400',
  'Regular': '400',
  'Medium': '500',
  'Semi Bold': '600',
  'SemiBold': '600',
  'DemiBold': '600',
  'Bold': '700',
  'Extra Bold': '800',
  'ExtraBold': '800',
  'Black': '900',
  'Heavy': '900',
  'Ultra': '900',
  
  // Numeric fallbacks
  '100': '100',
  '200': '200', 
  '300': '300',
  '400': '400',
  '500': '500',
  '600': '600',
  '700': '700',
  '800': '800',
  '900': '900'
} as const;

// ============================================================================
// COMPONENT PATTERNS - Detection & Generation
// ============================================================================

export const COMPONENT_PATTERNS = {
  // Button patterns (EXISTING - validated from detectors usage)
  button: {
    names: ['button', 'btn', 'cta', 'action', 'submit', 'primary', 'secondary', 'confirm', 'cancel'],
    characteristics: {
      minWidth: 60,
      minHeight: 30,
      maxHeight: 80,
      requiresCornerRadius: true,
      requiresFills: true,
      interactive: true
    },
    variants: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success']
  },
  
  // Input patterns (EXISTING - validated from detectors usage)
  input: {
    names: ['input', 'field', 'textbox', 'text field', 'form', 'search', 'textarea', 'textinput'],
    characteristics: {
      minWidth: 100,
      minHeight: 30,
      maxHeight: 60,
      requiresStrokes: true,
      hasPlaceholder: true
    },
    types: ['text', 'email', 'password', 'search', 'number', 'tel', 'url']
  },
  
  // Card patterns (EXISTING - validated from detectors usage)
  card: {
    names: ['card', 'item', 'tile', 'container', 'panel', 'widget', 'box'],
    characteristics: {
      minWidth: 200,
      minHeight: 100,
      requiresChildren: true,
      requiresBackground: true,
      hasShadow: true
    },
    variants: ['default', 'elevated', 'outlined', 'filled']
  },
  
  // Navigation patterns
  navigation: {
    names: ['nav', 'navigation', 'tab', 'menu', 'bar', 'header', 'footer', 'breadcrumb'],
    characteristics: {
      horizontal: true,
      hasMultipleItems: true,
      sticky: true
    },
    types: ['header', 'footer', 'sidebar', 'tabs', 'breadcrumb', 'pagination']
  },
  
  // Text patterns
  text: {
    heading: {
      names: ['heading', 'title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'headline'],
      minFontSize: 18,
      fontWeight: ['600', '700', '800', '900']
    },
    label: {
      names: ['label', 'caption', 'subtitle', 'description', 'hint', 'helper'],
      maxFontSize: 14,
      opacity: [0.6, 0.7, 0.8]
    },
    body: {
      names: ['text', 'body', 'content', 'paragraph', 'copy'],
      fontSize: [14, 16, 18],
      lineHeight: [1.4, 1.5, 1.6]
    }
  }
};

// ============================================================================
// COLOR MAPPINGS - Semantic Color Names
// ============================================================================

export const COLOR_MAPPINGS = {
  // Basic colors
  '#FFFFFF': 'white',
  '#000000': 'black',
  '#FF0000': 'red',
  '#00FF00': 'green', 
  '#0000FF': 'blue',
  
  // Semantic colors
  '#FFC107': 'warning',
  '#28A745': 'success',
  '#DC3545': 'danger',
  '#007BFF': 'primary',
  '#6C757D': 'secondary',
  
  // Extended semantic palette
  '#17A2B8': 'info',
  '#6F42C1': 'purple',
  '#FD7E14': 'orange',
  '#20C997': 'teal',
  '#E83E8C': 'pink',
  '#6610F2': 'indigo',
  
  // Gray scale (using unique hex values)
  '#F8F9FA': 'neutral100',  // lightest
  '#E9ECEF': 'neutral200',  
  '#DEE2E6': 'neutral300',  
  '#CED4DA': 'neutral400',  
  '#ADB5BD': 'neutral500',  
  '#868E96': 'neutral600',  
  '#495057': 'neutral700',  
  '#343A40': 'neutral800',  // now only used for neutral800
  '#212529': 'neutral900'   // darkest
} as const;

// ============================================================================
// PLUGIN CONFIGURATION
// ============================================================================

export const PLUGIN_CONFIG = {
  // Basic info
  name: 'Figma React Native Bridge',
  version: '1.0.0',
  
  // UI configuration
  ui: {
    width: 400,
    height: 600,
    title: 'React Native Flow Bridge',
    minWidth: 320,
    maxWidth: 800,
    minHeight: 400,
    maxHeight: 1000
  },
  
  // Performance limits (EXISTING - used throughout extractors)
  extraction: {
    maxNodes: 10000,
    maxDepth: 20,
    timeout: 30000, // 30 seconds
    maxFrames: 100,
    maxPages: 50,
    batchSize: 50
  },
  
  // Flow detection limits
  flow_detection: {
    maxFlows: 20,
    maxScreensPerFlow: 15,
    maxOrphanedScreens: 30,
    analysisTimeout: 45000 // 45 seconds
  },
  
  // Code generation
  code_generation: {
    maxFileSize: 50000, // 50KB per file
    indentSize: 2,
    maxLineLength: 120,
    includeComments: true
  }
};

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

export const VALIDATION_PATTERNS = {
  // Node name validation
  nodeNames: {
    validChars: /^[a-zA-Z0-9\s\-_]+$/,
    minLength: 1,
    maxLength: 100
  },
  
  // Component naming
  componentNaming: {
    sanitize: /[^a-zA-Z0-9]/g,
    startWithLetter: /^[a-zA-Z]/,
    camelCase: /^[a-z][a-zA-Z0-9]*$/,
    pascalCase: /^[A-Z][a-zA-Z0-9]*$/
  },
  
  // Color validation
  colors: {
    hex: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    rgb: /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/,
    rgba: /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/
  },
  
  // File validation
  files: {
    imageExtensions: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
    codeExtensions: ['.tsx', '.ts', '.js', '.jsx'],
    maxFilename: 255
  }
};

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // System errors
  PLUGIN_INIT_FAILED: 'PLUGIN_INIT_FAILED',
  UI_COMMUNICATION_FAILED: 'UI_COMMUNICATION_FAILED',
  FIGMA_API_ERROR: 'FIGMA_API_ERROR',
  
  // Extraction errors
  NO_SELECTION: 'NO_SELECTION',
  NO_FRAMES_FOUND: 'NO_FRAMES_FOUND',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  SYMBOL_CONVERSION_ERROR: 'SYMBOL_CONVERSION_ERROR',
  
  // Flow detection errors
  FLOW_DETECTION_FAILED: 'FLOW_DETECTION_FAILED',
  ROLE_DETECTION_FAILED: 'ROLE_DETECTION_FAILED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  
  // Code generation errors
  CODE_GENERATION_FAILED: 'CODE_GENERATION_FAILED',
  THEME_GENERATION_FAILED: 'THEME_GENERATION_FAILED',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  VALIDATION_FAILED: 'VALIDATION_FAILED'
};

// ============================================================================
// EXPORTS - Default Export with All Constants
// ============================================================================

export default {
  MESSAGE_TYPES,
  FLOW_MESSAGE_TYPES,
  UI_MESSAGE_TYPES,
  FLOW_PATTERNS,
  DETECTION_THRESHOLDS,
  DESIGN_TOKENS,
  DEVICE_BREAKPOINTS,
  FONT_WEIGHT_MAPPINGS,
  COMPONENT_PATTERNS,
  COLOR_MAPPINGS,
  PLUGIN_CONFIG,
  VALIDATION_PATTERNS,
  ERROR_CODES
} as const;

// ============================================================================
// TYPE EXPORTS - For TypeScript usage
// ============================================================================

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];
export type FlowMessageType = typeof FLOW_MESSAGE_TYPES[keyof typeof FLOW_MESSAGE_TYPES];
export type UIMessageType = typeof UI_MESSAGE_TYPES[keyof typeof UI_MESSAGE_TYPES];
export type UserRoleType = keyof typeof FLOW_PATTERNS.userRoles;
export type FlowType = keyof typeof FLOW_PATTERNS.flowTypes;
export type DeviceType = keyof typeof DEVICE_BREAKPOINTS;
export type ComponentType = keyof typeof COMPONENT_PATTERNS;
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];