// src/handlers/extract-flows-handler.ts
// New handler specifically for flow-based extraction

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { MESSAGE_TYPES, FLOW_MESSAGE_TYPES } from '@core/constants';
import { FlowExtractor } from '@extractors/flow-extractor';
import { ThemeGenerator } from '@generators/theme-generator';
import { sendProgress } from '@utils/figma-helpers';
import { safePostMessage } from '@utils/symbol-safe-utils';

const MODULE_NAME = 'ExtractFlowsHandler';

export class ExtractFlowsHandler {
  private flowExtractor: FlowExtractor;
  private themeGenerator: ThemeGenerator;

  constructor() {
    this.flowExtractor = new FlowExtractor();
    this.themeGenerator = new ThemeGenerator();
    logger.info(MODULE_NAME, 'constructor', 'ExtractFlowsHandler initialized');
  }

  @LogFunction(MODULE_NAME, true)
  async handleFlowDetection(options?: any): Promise<void> {
    const FUNC_NAME = 'handleFlowDetection';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting flow-based extraction');
      sendProgress(10);
      
      // Step 1: Detect flows and user roles
      logger.info(MODULE_NAME, FUNC_NAME, 'Analyzing flows and user roles...');
      const flowDetectionResult = this.flowExtractor.extractFlowsFromDesign();
      sendProgress(40);
      
      // Step 2: Generate comprehensive theme based on flows
      logger.info(MODULE_NAME, FUNC_NAME, 'Generating flow-aware theme...');
      const designValues = this.extractDesignValuesFromFlows(flowDetectionResult);
      const theme = this.themeGenerator.generateTheme(designValues);
      const themeFileContent = this.themeGenerator.generateThemeFileContent(theme);
      sendProgress(70);
      
      // Step 3: Generate analysis and recommendations
      logger.info(MODULE_NAME, FUNC_NAME, 'Creating flow analysis...');
      const analysisReport = this.generateFlowAnalysisReport(flowDetectionResult, theme);
      sendProgress(90);
      
      // Step 4: Prepare comprehensive results
      const result = {
        flows: flowDetectionResult.flows,
        orphanedScreens: flowDetectionResult.orphanedScreens,
        userRoles: this.extractUniqueRoles(flowDetectionResult.flows),
        theme: theme,
        themeFileContent: themeFileContent,
        analysis: analysisReport,
        detectionQuality: flowDetectionResult.detectionQuality,
        recommendations: flowDetectionResult.recommendations
      };
      
      sendProgress(100);
      
      logger.info(MODULE_NAME, FUNC_NAME, 'Flow-based extraction complete', {
        flowsDetected: flowDetectionResult.flows.length,
        rolesDetected: this.extractUniqueRoles(flowDetectionResult.flows).length,
        orphanedScreens: flowDetectionResult.orphanedScreens.length
      });
      
      // Send results to UI with safe serialization
      safePostMessage(FLOW_MESSAGE_TYPES.FLOWS_DETECTED, result);
      
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'flow-based extraction'
      });

      // Send error to UI
      safePostMessage(MESSAGE_TYPES.ERROR, {
        message: 'Failed to detect flows and extract design system. Please check your layer structure and naming conventions.',
        details: (error as Error).message
      });
      
      throw error;
    }
  }

  @LogFunction(MODULE_NAME)
  async handleFlowSelection(flowId: string): Promise<void> {
    const FUNC_NAME = 'handleFlowSelection';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, `Handling flow selection: ${flowId}`);
      
      // Get the specific flow details
      const flowDetectionResult = this.flowExtractor.extractFlowsFromDesign();
      const selectedFlow = flowDetectionResult.flows.find(flow => flow.id === flowId);
      
      if (!selectedFlow) {
        throw new Error(`Flow with ID ${flowId} not found`);
      }
      
      // Generate detailed flow information
      const flowDetails = {
        flow: selectedFlow,
        screenCount: selectedFlow.screens.length,
        estimatedDuration: selectedFlow.estimatedDuration || 0,
        navigationMap: this.generateNavigationMap(selectedFlow),
        deviceOptimization: this.analyzeDeviceOptimization(selectedFlow),
        userJourney: this.generateUserJourney(selectedFlow),
        designConsistency: this.analyzeFlowDesignConsistency(selectedFlow)
      };
      
      logger.info(MODULE_NAME, FUNC_NAME, 'Flow selection processed', {
        flowId,
        screenCount: selectedFlow.screens.length,
        userRole: selectedFlow.userRole.type
      });
      
      safePostMessage(FLOW_MESSAGE_TYPES.FLOW_SELECTED, flowDetails);
      
    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'flow selection',
        additionalData: { flowId }
      });
      
      safePostMessage(MESSAGE_TYPES.ERROR, {
        message: `Failed to load flow details for ${flowId}`,
        details: (error as Error).message
      });
    }
  }

  @LogFunction(MODULE_NAME)
  private extractDesignValuesFromFlows(flowResult: any): any {
    const FUNC_NAME = 'extractDesignValuesFromFlows';
    
    try {
      // Aggregate design values from all screens in all flows
      const values = {
        colors: new Set<string>(),
        fontSizes: new Set<number>(),
        fontWeights: new Set<string>(),
        fontFamilies: new Set<string>(),
        borderRadius: new Set<number>(),
        spacing: new Set<number>(),
        shadows: new Set<string>(),
        opacity: new Set<number>(),
        buttons: [] as any[],
        inputs: [] as any[],
        headings: [] as any[],
        labels: [] as any[],
        cards: [] as any[],
        navigationItems: [] as any[]
      };
      
      // Process all screens from flows
      flowResult.flows.forEach((flow: any) => {
        flow.screens.forEach((screen: any) => {
          if (screen.designSystem) {
            // Add colors
            if (screen.designSystem.colorUsage) {
              screen.designSystem.colorUsage.forEach((color: string) => values.colors.add(color));
            }
            
            // Add font sizes
            if (screen.designSystem.fontSizeUsage) {
              screen.designSystem.fontSizeUsage.forEach((size: number) => values.fontSizes.add(size));
            }
          }
          
          // Extract from components
          this.extractFromComponents(screen.components, values);
        });
      });
      
      // Also process orphaned screens
      flowResult.orphanedScreens.forEach((screen: any) => {
        this.extractFromComponents(screen.components, values);
      });
      
      logger.debug(MODULE_NAME, FUNC_NAME, 'Design values extracted from flows', {
        colors: values.colors.size,
        fontSizes: values.fontSizes.size,
        totalComponents: values.buttons.length + values.inputs.length + values.cards.length
      });
      
      return values;
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error extracting design values from flows:', error as Error);
      // Return minimal values structure
      return {
        colors: new Set(['#000000', '#FFFFFF']),
        fontSizes: new Set([14, 16, 18]),
        fontWeights: new Set(['400', '600']),
        fontFamilies: new Set(['System']),
        borderRadius: new Set([4, 8]),
        spacing: new Set([8, 16, 24]),
        shadows: new Set(['0px 2px 4px rgba(0,0,0,0.1)']),
        opacity: new Set([1]),
        buttons: [],
        inputs: [],
        headings: [],
        labels: [],
        cards: [],
        navigationItems: []
      };
    }
  }

  private extractFromComponents(components: any[], values: any): void {
    if (!components || !Array.isArray(components)) return;
    
    components.forEach(component => {
      try {
        // Extract colors
        if (component.backgroundColor) values.colors.add(component.backgroundColor);
        if (component.textColor) values.colors.add(component.textColor);
        
        // Extract typography
        if (component.fontSize) values.fontSizes.add(component.fontSize);
        if (component.fontWeight) values.fontWeights.add(component.fontWeight);
        
        // Extract spacing
        if (component.borderRadius) values.borderRadius.add(component.borderRadius);
        
        // Categorize components
        if (component.semanticType === 'button') {
          values.buttons.push(component);
        } else if (component.semanticType === 'input') {
          values.inputs.push(component);
        } else if (component.semanticType === 'heading') {
          values.headings.push(component);
        } else if (component.semanticType === 'label') {
          values.labels.push(component);
        } else if (component.semanticType === 'card') {
          values.cards.push(component);
        } else if (component.semanticType === 'navigation') {
          values.navigationItems.push(component);
        }
        
        // Process children recursively
        if (component.children) {
          this.extractFromComponents(component.children, values);
        }
        
      } catch (componentError) {
        logger.debug(MODULE_NAME, 'extractFromComponents', 'Skipped problematic component', {
          component: component?.name,
          error: componentError
        });
      }
    });
  }

  private generateFlowAnalysisReport(flowResult: any, theme: any): any {
    return {
      overview: {
        totalFlows: flowResult.flows.length,
        totalScreens: flowResult.flows.reduce((sum: number, flow: any) => sum + flow.screens.length, 0),
        orphanedScreens: flowResult.orphanedScreens.length,
        userRoles: Object.keys(flowResult.roleDistribution).length,
        deviceCoverage: this.calculateDeviceCoverage(flowResult.flows)
      },
      flowBreakdown: flowResult.flows.map((flow: any) => ({
        name: flow.name,
        userRole: flow.userRole.type,
        screenCount: flow.screens.length,
        complexity: this.calculateFlowComplexity(flow),
        estimatedDuration: flow.estimatedDuration || 0
      })),
      designSystemMetrics: {
        colorTokens: Object.keys(theme.colors).length,
        typographyTokens: Object.keys(theme.typography.fontSize).length,
        componentVariants: this.countComponentVariants(theme),
        consistencyScore: this.calculateOverallConsistency(flowResult)
      },
      recommendations: [
        ...flowResult.recommendations,
        ...this.generateFlowSpecificRecommendations(flowResult.flows)
      ]
    };
  }

  private extractUniqueRoles(flows: any[]): any[] {
    const uniqueRoles = new Map();
    
    flows.forEach(flow => {
      if (flow.userRole && !uniqueRoles.has(flow.userRole.type)) {
        uniqueRoles.set(flow.userRole.type, flow.userRole);
      }
    });
    
    return Array.from(uniqueRoles.values());
  }

  private generateNavigationMap(flow: any): any {
    return {
      pattern: flow.navigationPattern,
      screenSequence: flow.screens.map((screen: any, index: number) => ({
        id: screen.name,
        sequence: index + 1,
        canNavigateBack: index > 0,
        canNavigateForward: index < flow.screens.length - 1,
        isEntry: index === 0,
        isExit: index === flow.screens.length - 1
      }))
    };
  }

  private analyzeDeviceOptimization(flow: any): any {
    const deviceBreakdown = new Map();
    
    flow.screens.forEach((screen: any) => {
      const device = screen.deviceType || 'unknown';
      deviceBreakdown.set(device, (deviceBreakdown.get(device) || 0) + 1);
    });
    
    return {
      primaryDevice: Array.from(deviceBreakdown.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mobile',
      deviceBreakdown: Object.fromEntries(deviceBreakdown),
      isResponsive: deviceBreakdown.size > 1,
      recommendedOptimizations: this.generateDeviceOptimizationRecommendations(deviceBreakdown)
    };
  }

  private generateUserJourney(flow: any): any {
    return {
      name: flow.name,
      userRole: flow.userRole.type,
      steps: flow.screens.map((screen: any, index: number) => ({
        stepNumber: index + 1,
        screenName: screen.name,
        userIntent: this.inferUserIntent(screen, flow.flowType),
        primaryActions: this.extractPrimaryActions(screen),
        duration: this.estimateScreenDuration(screen, flow.flowType)
      })),
      totalEstimatedDuration: flow.estimatedDuration || 0,
      criticalPath: flow.criticalPath || false
    };
  }

  private analyzeFlowDesignConsistency(flow: any): any {
    const colors = new Set();
    const fontSizes = new Set();
    let componentCount = 0;
    
    flow.screens.forEach((screen: any) => {
      this.collectDesignElements(screen.components, colors, fontSizes);
      componentCount += this.countComponents(screen.components);
    });
    
    return {
      uniqueColors: colors.size,
      uniqueFontSizes: fontSizes.size,
      totalComponents: componentCount,
      consistencyScore: this.calculateFlowConsistencyScore(flow),
      recommendations: this.generateConsistencyRecommendations(colors.size, fontSizes.size)
    };
  }

  // Additional helper methods...
  private calculateDeviceCoverage(flows: any[]): any {
    const allDevices = new Set();
    flows.forEach(flow => {
      flow.deviceTargets.forEach((device: string) => allDevices.add(device));
    });
    return {
      devices: Array.from(allDevices),
      coverage: allDevices.size >= 2 ? 'good' : 'limited'
    };
  }

  private calculateFlowComplexity(flow: any): 'simple' | 'moderate' | 'complex' {
    const screenCount = flow.screens.length;
    if (screenCount <= 3) return 'simple';
    if (screenCount <= 6) return 'moderate';
    return 'complex';
  }

  private countComponentVariants(theme: any): number {
    let count = 0;
    if (theme.components) {
      Object.values(theme.components).forEach((component: any) => {
        if (component.variants) {
          count += Object.keys(component.variants).length;
        }
      });
    }
    return count;
  }

  private calculateOverallConsistency(flowResult: any): number {
    // Simplified consistency calculation
    const totalScreens = flowResult.flows.reduce((sum: number, flow: any) => sum + flow.screens.length, 0);
    const screensInFlows = totalScreens;
    const orphanedRatio = flowResult.orphanedScreens.length / (totalScreens + flowResult.orphanedScreens.length);
    
    return Math.max(0, 1 - orphanedRatio);
  }

  private generateFlowSpecificRecommendations(flows: any[]): string[] {
    const recommendations: string[] = [];
    
    const complexFlows = flows.filter(flow => this.calculateFlowComplexity(flow) === 'complex');
    if (complexFlows.length > 0) {
      recommendations.push(`${complexFlows.length} flows are complex. Consider breaking them into shorter user journeys.`);
    }
    
    const singleDeviceFlows = flows.filter(flow => flow.deviceTargets.length === 1);
    if (singleDeviceFlows.length === flows.length) {
      recommendations.push('All flows target single devices. Consider responsive design for better user experience.');
    }
    
    return recommendations;
  }

  private generateDeviceOptimizationRecommendations(deviceBreakdown: Map<string, number>): string[] {
    const recommendations: string[] = [];
    
    if (deviceBreakdown.size === 1) {
      recommendations.push('Consider designing for multiple device types');
    }
    
    if (deviceBreakdown.has('mobile') && !deviceBreakdown.has('tablet')) {
      recommendations.push('Add tablet layouts for better large screen experience');
    }
    
    return recommendations;
  }

  private inferUserIntent(screen: any, flowType: string): string {
    // Simplified intent inference
    const intentMap: Record<string, string> = {
      onboarding: 'Learn and setup',
      authentication: 'Sign in or register',
      main_feature: 'Use primary functionality',
      settings: 'Configure preferences',
      checkout: 'Complete purchase',
      unknown: 'Complete task'
    };
    
    return intentMap[flowType] || 'Navigate and interact';
  }

  private extractPrimaryActions(screen: any): string[] {
    const actions: string[] = [];
    
    const collectActions = (components: any[]) => {
      if (!components) return;
      
      components.forEach(component => {
        if (component.semanticType === 'button') {
          actions.push(component.name || 'Action');
        }
        if (component.children) {
          collectActions(component.children);
        }
      });
    };
    
    collectActions(screen.components);
    return actions;
  }

  private estimateScreenDuration(screen: any, flowType: string): number {
    // Simplified duration estimation in seconds
    const baseDuration: Record<string, number> = {
      onboarding: 30,
      authentication: 15,
      main_feature: 45,
      settings: 60,
      checkout: 90,
      unknown: 30
    };
    
    return baseDuration[flowType] || 30;
  }

  private collectDesignElements(components: any[], colors: Set<string>, fontSizes: Set<number>): void {
    if (!components) return;
    
    components.forEach(component => {
      if (component.backgroundColor) colors.add(component.backgroundColor);
      if (component.textColor) colors.add(component.textColor);
      if (component.fontSize) fontSizes.add(component.fontSize);
      
      if (component.children) {
        this.collectDesignElements(component.children, colors, fontSizes);
      }
    });
  }

  private countComponents(components: any[]): number {
    if (!components) return 0;
    
    let count = components.length;
    components.forEach(component => {
      if (component.children) {
        count += this.countComponents(component.children);
      }
    });
    
    return count;
  }

  private calculateFlowConsistencyScore(flow: any): number {
    // Simplified consistency scoring
    return 0.75; // Placeholder
  }

  private generateConsistencyRecommendations(colorCount: number, fontSizeCount: number): string[] {
    const recommendations: string[] = [];
    
    if (colorCount > 10) {
      recommendations.push('Too many unique colors in this flow. Consider using a more consistent color palette.');
    }
    
    if (fontSizeCount > 6) {
      recommendations.push('Many different font sizes detected. Consider using a more systematic typography scale.');
    }
    
    return recommendations;
  }
}

export default ExtractFlowsHandler;