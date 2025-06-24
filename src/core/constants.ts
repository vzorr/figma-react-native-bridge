// src/core/constants.ts
// Plugin constants and configuration

export const PLUGIN_CONFIG = {
  name: 'Figma React Native Bridge',
  version: '1.0.0',
  ui: {
    width: 400,
    height: 600,
    title: 'React Native Bridge'
  }
} as const;

export const EXTRACTION_LIMITS = {
  maxFrames: 1000,
  maxNodesPerFrame: 10000,
  maxLogEntries: 1000,
  maxErrorHistory: 100,
  timeoutMs: 30000
} as const;

export const DESIGN_TOKENS = {
  colors: {
    maxUnique: 50,
    excludeTransparent: true
  },
  fontSize: {
    min: 8,
    max: 72,
    defaultBase: 16
  },
  spacing: {
    min: 0,
    max: 200,
    defaultBase: 16
  },
  borderRadius: {
    min: 0,
    max: 100,
    defaultBase: 8
  },
  opacity: {
    min: 0.1,
    max: 1,
    defaultBase: 1
  }
} as const;

export const COMPONENT_DETECTION = {
  button: {
    minWidth: 60,
    minHeight: 30,
    maxHeight: 80,
    namePatterns: ['button', 'btn', 'cta', 'action', 'submit', 'primary', 'secondary']
  },
  input: {
    minWidth: 100,
    minHeight: 30,
    maxHeight: 60,
    namePatterns: ['input', 'field', 'textbox', 'text field', 'form', 'search', 'textarea']
  },
  heading: {
    minFontSize: 20,
    namePatterns: ['heading', 'title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'headline']
  },
  label: {
    maxFontSize: 14,
    namePatterns: ['label', 'caption', 'subtitle', 'description', 'hint', 'helper']
  },
  card: {
    minWidth: 200,
    minHeight: 100,
    minChildren: 2,
    namePatterns: ['card', 'item', 'tile', 'container', 'panel', 'widget']
  },
  navigation: {
    minWidth: 200,
    minHeight: 40,
    maxHeight: 100,
    namePatterns: ['nav', 'navigation', 'tab', 'menu', 'bar', 'header', 'footer', 'breadcrumb']
  }
} as const;

export const DEVICE_BREAKPOINTS = {
  mobile: { maxWidth: 480, aspectRatio: { min: 0.4, max: 0.8 } },
  tablet: { maxWidth: 768, aspectRatio: { min: 0.6, max: 1.4 } },
  desktop: { minWidth: 769, aspectRatio: { min: 1.2, max: 3.0 } }
} as const;

export const COLOR_MAPPINGS = {
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
} as const;

export const FONT_WEIGHT_MAPPINGS = {
  'Thin': '100',
  'Extra Light': '200',
  'Light': '300',
  'Normal': '400',
  'Regular': '400',
  'Medium': '500',
  'Semi Bold': '600',
  'SemiBold': '600',
  'Bold': '700',
  'Extra Bold': '800',
  'Black': '900',
  'Heavy': '900'
} as const;

export const REACT_NATIVE_COMPONENTS = {
  imports: {
    core: ['View', 'Text', 'StyleSheet', 'ScrollView', 'Dimensions'],
    interactive: ['TouchableOpacity', 'Pressable'],
    input: ['TextInput'],
    navigation: ['SafeAreaView'],
    image: ['Image', 'ImageBackground']
  },
  styleProperties: {
    layout: ['width', 'height', 'flex', 'flexDirection', 'alignItems', 'justifyContent'],
    positioning: ['position', 'top', 'left', 'right', 'bottom', 'zIndex'],
    spacing: ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 
              'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'],
    appearance: ['backgroundColor', 'borderRadius', 'borderWidth', 'borderColor', 'opacity'],
    text: ['fontSize', 'fontWeight', 'color', 'textAlign', 'lineHeight'],
    shadow: ['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'elevation']
  }
} as const;

export const MESSAGE_TYPES = {
  // From UI to Plugin (both formats)
  EXTRACT_VALUES: 'extract-values',
  EXTRACT_TOKENS: 'extract-tokens', // UI format
  EXTRACT_SCREENS: 'extract-screens',
  CLOSE: 'close',
  GET_LOGS: 'get-logs',
  CLEAR_LOGS: 'clear-logs',
  SET_LOG_LEVEL: 'set-log-level',
  
  // From Plugin to UI
  PLUGIN_READY: 'plugin-ready',
  PROGRESS_UPDATE: 'progress-update',
  PROGRESS: 'progress', // UI format
  EXTRACTION_COMPLETE: 'extraction-complete',
  TOKENS_EXTRACTED: 'tokens-extracted', // UI format
  SCREENS_EXTRACTED: 'screens-extracted',
  EXTRACTION_ERROR: 'extraction-error',
  ERROR: 'error',
  ERROR_LOG: 'error-log',
  ERROR_REPORT: 'error-report',
  LOGS_DATA: 'logs-data',
  LOGS_CLEARED: 'logs-cleared',
  LOG_LEVEL_CHANGED: 'log-level-changed',
  FINAL_LOGS: 'final-logs',
  RECOVERY_ACTION: 'recovery-action',
  CRITICAL_ERROR: 'critical-error'
} as const;

export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
} as const;

export const ERROR_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const BUILD_INFO = {
  // Will be replaced by webpack at build time
  VERSION: '__VERSION__',
  BUILD_TIME: '__BUILD_TIME__',
  NODE_ENV: '__NODE_ENV__'
} as const;

// Runtime environment detection (avoiding process.env)
export const ENVIRONMENT = {
  isDevelopment: (() => {
    try {
      // Check if we're in development by looking for webpack dev features
      // Use typeof check to avoid undefined variable errors
      return typeof module !== 'undefined' && 
             (module as any).hot !== undefined;
    } catch {
      return false;
    }
  })(),
  
  isProduction: (() => {
    try {
      // In production, hot module replacement is typically not available
      return typeof module === 'undefined' || 
             (module as any).hot === undefined;
    } catch {
      return true; // Default to production for safety
    }
  })(),
  
  isFigma: (() => {
    try {
      return typeof figma !== 'undefined';
    } catch {
      return false;
    }
  })()
} as const;

// UI Message mapping for backwards compatibility
export const UI_MESSAGE_MAP = {
  'extract-tokens': MESSAGE_TYPES.EXTRACT_VALUES,
  'extract-screens': MESSAGE_TYPES.EXTRACT_SCREENS,
  'close': MESSAGE_TYPES.CLOSE,
  'get-logs': MESSAGE_TYPES.GET_LOGS,
  'clear-logs': MESSAGE_TYPES.CLEAR_LOGS,
  'set-log-level': MESSAGE_TYPES.SET_LOG_LEVEL
} as const;

export default {
  PLUGIN_CONFIG,
  EXTRACTION_LIMITS,
  DESIGN_TOKENS,
  COMPONENT_DETECTION,
  DEVICE_BREAKPOINTS,
  COLOR_MAPPINGS,
  FONT_WEIGHT_MAPPINGS,
  REACT_NATIVE_COMPONENTS,
  MESSAGE_TYPES,
  UI_MESSAGE_MAP,
  LOG_LEVELS,
  ERROR_SEVERITIES,
  BUILD_INFO,
  ENVIRONMENT
};

// Flow detection patterns
export const FLOW_PATTERNS = {
  userRoles: {
    customer: ['customer', 'client', 'user', 'buyer', 'shopper', 'guest'],
    admin: ['admin', 'administrator', 'manager', 'super', 'root'],
    operator: ['operator', 'staff', 'employee', 'worker', 'agent'],
    guest: ['guest', 'visitor', 'anonymous', 'public', 'unauth'],
    moderator: ['moderator', 'mod', 'supervisor', 'reviewer']
  },
  
  flowTypes: {
    onboarding: ['onboarding', 'welcome', 'intro', 'getting_started', 'tutorial'],
    authentication: ['login', 'signup', 'register', 'auth', 'signin', 'password'],
    main_feature: ['dashboard', 'home', 'main', 'browse', 'search', 'explore'],
    settings: ['settings', 'preferences', 'config', 'profile', 'account'],
    checkout: ['checkout', 'cart', 'payment', 'billing', 'order', 'purchase'],
    unknown: []
  },
  
  navigationPatterns: {
    stack: ['flow', 'step', 'next', 'back', 'continue'],
    tab: ['tab', 'section', 'category', 'filter'],
    modal: ['modal', 'popup', 'overlay', 'dialog', 'alert'],
    drawer: ['menu', 'nav', 'drawer', 'sidebar']
  },
  
  sequenceIndicators: [
    /step[-_\s]*\d+/i,
    /page[-_\s]*\d+/i,
    /screen[-_\s]*\d+/i,
    /\d+[-_]of[-_]\d+/i,
    /v\d+/i,
    /[-_]\d+$/, // ends with number after separator
    /^\d+[-_]/, // starts with number and separator
  ]
} as const;

// Role-based design system preferences
export const ROLE_BASED_DESIGN = {
  customer: {
    primaryColors: ['#007AFF', '#34C759', '#FF9500'], // iOS system colors
    navigationStyle: 'bottom_tabs',
    informationDensity: 'comfortable',
    interactionComplexity: 'simple',
    visualHierarchy: 'clear_primary_actions'
  },
  
  admin: {
    primaryColors: ['#6C757D', '#343A40', '#007BFF'], // Professional grays and blue
    navigationStyle: 'sidebar',
    informationDensity: 'dense',
    interactionComplexity: 'complex',
    visualHierarchy: 'data_focused'
  },
  
  operator: {
    primaryColors: ['#28A745', '#FFC107', '#DC3545'], // Status colors
    navigationStyle: 'top_tabs',
    informationDensity: 'compact',
    interactionComplexity: 'efficient',
    visualHierarchy: 'action_oriented'
  },
  
  guest: {
    primaryColors: ['#667eea', '#764ba2', '#f093fb'], // Gradients and welcoming
    navigationStyle: 'simple_stack',
    informationDensity: 'spacious',
    interactionComplexity: 'minimal',
    visualHierarchy: 'conversion_focused'
  }
} as const;

// Flow detection confidence thresholds
export const DETECTION_THRESHOLDS = {
  role: {
    high_confidence: 0.8,
    medium_confidence: 0.6,
    low_confidence: 0.4,
    minimum_viable: 0.3
  },
  
  flow: {
    sequence_detection: 0.7,
    naming_pattern: 0.6,
    parent_context: 0.5,
    content_analysis: 0.4
  },
  
  navigation: {
    prototype_links: 0.9,
    naming_convention: 0.7,
    spatial_relationship: 0.5,
    content_similarity: 0.4
  }
} as const;

// Enhanced message types for flow functionality
export const FLOW_MESSAGE_TYPES = {
  // Flow detection
  DETECT_FLOWS: 'detect-flows',
  FLOWS_DETECTED: 'flows-detected',
  
  // Flow selection and navigation
  SELECT_FLOW: 'select-flow',
  FLOW_SELECTED: 'flow-selected',
  SELECT_SCREEN_IN_FLOW: 'select-screen-in-flow',
  
  // Role-based operations
  ANALYZE_USER_ROLES: 'analyze-user-roles',
  ROLES_ANALYZED: 'roles-analyzed',
  
  // Flow-aware generation
  GENERATE_FLOW_THEME: 'generate-flow-theme',
  GENERATE_FLOW_NAVIGATION: 'generate-flow-navigation',
  FLOW_CODE_GENERATED: 'flow-code-generated'
} as const;