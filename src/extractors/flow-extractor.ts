// src/extractors/flow-extractor.ts
// Complete Flow Extractor implementation extending existing functionality

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { FlowDetectionResult, FlowStructure, ScreenStructure, UserRole, FlowAwareExtractionResult } from '@core/types';
import { ScreenExtractor } from '@extractors/screen-extractor';
import { RoleDetector } from '@detectors/role-detector';
import FlowDetector from '@detectors/flow-detector';
import { getAllPages, getAllFrames } from '@utils/figma-helpers';

const MODULE_NAME = 'FlowExtractor';

export class FlowExtractor {
  private screenExtractor: ScreenExtractor;
  private roleDetector: RoleDetector;
  private flowDetector: FlowDetector;

  constructor() {
    this.screenExtractor = new ScreenExtractor();
    this.roleDetector = new RoleDetector();
    this.flowDetector = new FlowDetector();
    logger.info(MODULE_NAME, 'constructor', 'FlowExtractor initialized');
  }

  @LogFunction(MODULE_NAME, true)
  extractFlowsFromDesign(): FlowDetectionResult {
    const FUNC_NAME = 'extractFlowsFromDesign';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting comprehensive flow extraction');

      // Step 1: Extract all screens from the design
      const screens = this.screenExtractor.extractAllScreens();
      logger.info(MODULE_NAME, FUNC_NAME, `Extracted ${screens.length} screens`);

      if (screens.length === 0) {
        logger.warn(MODULE_NAME, FUNC_NAME, 'No screens found for flow detection');
        return this.createEmptyFlowResult();
      }

      // Step 2: Detect user roles from all nodes
      const allNodes = this.getAllNodesFromDesign();
      const userRoles = this.roleDetector.detectUserRoles(allNodes);
      logger.info(MODULE_NAME, FUNC_NAME, `Detected ${userRoles.length} user roles`);

      // Step 3: Advanced flow detection using multiple strategies
      const flowDetectionResult = this.flowDetector.detectFlowsAdvanced(screens, userRoles);
      logger.info(MODULE_NAME, FUNC_NAME, `Detected ${flowDetectionResult.flows.length} flows`);

      // Step 4: Enhance flows with additional metadata
      const enhancedFlows = this.enhanceFlowsWithMetadata(flowDetectionResult.flows);

      // Step 5: Generate final result
      const result: FlowDetectionResult = {
        ...flowDetectionResult,
        flows: enhancedFlows,
        recommendations: [
          ...flowDetectionResult.recommendations,
          ...this.generateFlowExtractorRecommendations(enhancedFlows, screens)
        ]
      };

      logger.info(MODULE_NAME, FUNC_NAME, 'Flow extraction complete', {
        totalFlows: result.flows.length,
        orphanedScreens: result.orphanedScreens.length,
        overallQuality: result.detectionQuality.roleDetectionAccuracy
      });

      return result;

    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'comprehensive flow extraction from design'
      });
      
      return this.createEmptyFlowResult();
    }
  }

  @LogFunction(MODULE_NAME)
  extractFlowsFromCurrentPage(): FlowDetectionResult {
    const FUNC_NAME = 'extractFlowsFromCurrentPage';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Extracting flows from current page only');

      // Get frames from current page only
      const currentPageFrames = figma.currentPage.children.filter((node: any) => node.type === 'FRAME');
      
      if (currentPageFrames.length === 0) {
        logger.warn(MODULE_NAME, FUNC_NAME, 'No frames found on current page');
        return this.createEmptyFlowResult();
      }

      // Convert frames to screen structures
      const screens = currentPageFrames.map((frame: any) => 
        this.screenExtractor.extractEnhancedScreenStructure(frame)
      );

      // Detect roles from current page nodes
      const currentPageNodes = figma.currentPage.findAll();
      const userRoles = this.roleDetector.detectUserRoles(currentPageNodes);

      // Run flow detection
      const flowDetectionResult = this.flowDetector.detectFlowsAdvanced(screens, userRoles);

      logger.info(MODULE_NAME, FUNC_NAME, 'Current page flow extraction complete', {
        screensProcessed: screens.length,
        flowsDetected: flowDetectionResult.flows.length
      });

      return flowDetectionResult;

    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'current page flow extraction'
      });
      
      return this.createEmptyFlowResult();
    }
  }

  @LogFunction(MODULE_NAME)
  extractSpecificFlow(flowId: string): FlowStructure | null {
    const FUNC_NAME = 'extractSpecificFlow';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, `Extracting specific flow: ${flowId}`);

      const allFlows = this.extractFlowsFromDesign();
      const targetFlow = allFlows.flows.find(flow => flow.id === flowId);

      if (!targetFlow) {
        logger.warn(MODULE_NAME, FUNC_NAME, `Flow ${flowId} not found`);
        return null;
      }

      // Enhance the specific flow with additional details
      const enhancedFlow = this.enhanceFlowWithDetailedAnalysis(targetFlow);

      logger.info(MODULE_NAME, FUNC_NAME, 'Specific flow extraction complete', {
        flowId: enhancedFlow.id,
        screenCount: enhancedFlow.screens.length
      });

      return enhancedFlow;

    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'specific flow extraction',
        additionalData: { flowId }
      });
      
      return null;
    }
  }

  @LogFunction(MODULE_NAME)
  extractFlowAwareResults(): FlowAwareExtractionResult {
    const FUNC_NAME = 'extractFlowAwareResults';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Creating comprehensive flow-aware extraction result');

      // Get base flow detection
      const flowDetection = this.extractFlowsFromDesign();
      
      // Extract design values from all screens
      const allScreens = [...flowDetection.flows.flatMap(f => f.screens), ...flowDetection.orphanedScreens];
      const designValues = this.extractDesignValuesFromScreens(allScreens);

      // Generate role-based design patterns
      const uniqueRoles = this.extractUniqueRoles(flowDetection.flows);
      const roleBasedPatterns = uniqueRoles.map(role => 
        this.roleDetector.getRoleBasedDesignPattern(role)
      );

      // Calculate cross-flow consistency
      const crossFlowConsistency = this.calculateCrossFlowConsistency(flowDetection.flows);

      const result: FlowAwareExtractionResult = {
        // Base extraction result properties
        screens: allScreens.map(screen => ({
          structure: screen,
          code: '', // Will be generated on demand
          componentCount: this.countComponents(screen),
          semanticComponents: this.analyzeSemanticComponents(screen),
          designPatterns: this.identifyScreenPatterns(screen)
        })),
        
        // Flow-specific properties
        flows: flowDetection.flows,
        userRoles: uniqueRoles,
        roleBasedPatterns,
        flowDetection,
        crossFlowConsistency
      };

      logger.info(MODULE_NAME, FUNC_NAME, 'Flow-aware extraction complete', {
        totalFlows: result.flows.length,
        totalRoles: result.userRoles.length,
        consistencyScore: result.crossFlowConsistency.overallScore
      });

      return result;

    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'flow-aware extraction results generation'
      });
      
      throw error;
    }
  }

  // Private helper methods

  private getAllNodesFromDesign(): any[] {
    try {
      const allPages = getAllPages();
      let allNodes: any[] = [];

      allPages.forEach(page => {
        try {
          const pageNodes = page.findAll();
          allNodes = allNodes.concat(pageNodes);
        } catch (pageError) {
          logger.warn(MODULE_NAME, 'getAllNodesFromDesign', `Error getting nodes from page ${page.name}:`, { error: pageError });
        }
      });

      return allNodes;
    } catch (error) {
      logger.error(MODULE_NAME, 'getAllNodesFromDesign', 'Error getting all nodes:', error as Error);
      return [];
    }
  }

  private enhanceFlowsWithMetadata(flows: FlowStructure[]): FlowStructure[] {
    return flows.map(flow => ({
      ...flow,
      estimatedDuration: this.calculateFlowDuration(flow),
      criticalPath: this.isFlowOnCriticalPath(flow),
      subFlows: this.identifySubFlows(flow),
      parentFlow: this.findParentFlow(flow, flows)
    }));
  }

  private enhanceFlowWithDetailedAnalysis(flow: FlowStructure): FlowStructure {
    return {
      ...flow,
      estimatedDuration: this.calculateFlowDuration(flow),
      criticalPath: this.isFlowOnCriticalPath(flow),
      // Add detailed navigation analysis
      screens: flow.screens.map((screen, index) => ({
        ...screen,
        sequenceInFlow: index + 1,
        navigationTo: this.getNavigationTargets(screen, flow),
        navigationFrom: this.getNavigationSources(screen, flow),
        flowStage: this.determineFlowStage(index, flow.screens.length),
        userIntent: this.inferUserIntent(screen, flow.flowType),
        criticalPath: this.isScreenOnCriticalPath(screen, flow)
      }))
    };
  }

  private calculateFlowDuration(flow: FlowStructure): number {
    // Estimate based on flow type and screen count
    const baseTime = {
      onboarding: 60, // 1 minute per screen
      authentication: 30, // 30 seconds per screen
      main_feature: 90, // 1.5 minutes per screen
      settings: 45, // 45 seconds per screen
      checkout: 120, // 2 minutes per screen
      unknown: 60
    };

    const timePerScreen = baseTime[flow.flowType] || 60;
    return flow.screens.length * timePerScreen;
  }

  private isFlowOnCriticalPath(flow: FlowStructure): boolean {
    // Critical flows are typically onboarding, authentication, and main features
    return ['onboarding', 'authentication', 'main_feature'].includes(flow.flowType);
  }

  private identifySubFlows(flow: FlowStructure): string[] {
    // Look for logical sub-groupings within the flow
    // This is a simplified implementation
    return [];
  }

  private findParentFlow(flow: FlowStructure, allFlows: FlowStructure[]): string | undefined {
    // Check if this flow is a sub-flow of another
    // This is a simplified implementation
    return undefined;
  }

  private extractUniqueRoles(flows: FlowStructure[]): UserRole[] {
    const roleMap = new Map<string, UserRole>();
    
    flows.forEach(flow => {
      if (flow.userRole && !roleMap.has(flow.userRole.type)) {
        roleMap.set(flow.userRole.type, flow.userRole);
      }
    });

    return Array.from(roleMap.values());
  }

  private calculateCrossFlowConsistency(flows: FlowStructure[]): any {
    // Analyze consistency across flows
    const allComponents = flows.flatMap(flow => 
      flow.screens.flatMap(screen => screen.components)
    );

    const componentTypes = new Set(allComponents.map(c => c.semanticType));
    const sharedComponents = Array.from(componentTypes).filter(type =>
      flows.filter(flow => 
        flow.screens.some(screen => 
          screen.components.some(c => c.semanticType === type)
        )
      ).length > 1
    );

    return {
      sharedComponents: sharedComponents.length,
      consistentStyling: this.calculateStylingConsistency(allComponents),
      navigationPatterns: this.calculateNavigationConsistency(flows),
      overallScore: Math.min(100, (sharedComponents.length / Math.max(componentTypes.size, 1)) * 100)
    };
  }

  private extractDesignValuesFromScreens(screens: ScreenStructure[]): any {
    // Extract design values from all screens
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

    screens.forEach(screen => {
      this.extractValuesFromComponents(screen.components, values);
    });

    return values;
  }

  private extractValuesFromComponents(components: any[], values: any): void {
    components.forEach(component => {
      // Extract basic values
      if (component.backgroundColor) values.colors.add(component.backgroundColor);
      if (component.textColor) values.colors.add(component.textColor);
      if (component.fontSize) values.fontSizes.add(component.fontSize);
      if (component.fontWeight) values.fontWeights.add(component.fontWeight);
      if (component.borderRadius) values.borderRadius.add(component.borderRadius);

      // Categorize components
      switch (component.semanticType) {
        case 'button':
          values.buttons.push(component);
          break;
        case 'input':
          values.inputs.push(component);
          break;
        case 'heading':
          values.headings.push(component);
          break;
        case 'label':
          values.labels.push(component);
          break;
        case 'card':
          values.cards.push(component);
          break;
        case 'navigation':
          values.navigationItems.push(component);
          break;
      }

      // Process children
      if (component.children) {
        this.extractValuesFromComponents(component.children, values);
      }
    });
  }

  private countComponents(screen: ScreenStructure): number {
    const countRecursive = (components: any[]): number => {
      let count = components.length;
      components.forEach(component => {
        if (component.children) {
          count += countRecursive(component.children);
        }
      });
      return count;
    };

    return countRecursive(screen.components);
  }

  private analyzeSemanticComponents(screen: ScreenStructure): Record<string, number> {
    const analysis: Record<string, number> = {};
    
    const analyzeRecursive = (components: any[]) => {
      components.forEach(component => {
        const type = component.semanticType || 'unknown';
        analysis[type] = (analysis[type] || 0) + 1;
        
        if (component.children) {
          analyzeRecursive(component.children);
        }
      });
    };

    analyzeRecursive(screen.components);
    return analysis;
  }

  private identifyScreenPatterns(screen: ScreenStructure): string[] {
    const patterns: string[] = [];
    const semanticTypes = new Set<string>();
    
    const collectTypes = (components: any[]) => {
      components.forEach(component => {
        if (component.semanticType) {
          semanticTypes.add(component.semanticType);
        }
        if (component.children) {
          collectTypes(component.children);
        }
      });
    };

    collectTypes(screen.components);

    // Identify patterns based on component combinations
    if (semanticTypes.has('navigation')) patterns.push('Navigation Pattern');
    if (semanticTypes.has('card')) patterns.push('Card Layout');
    if (semanticTypes.has('input') && semanticTypes.has('button')) patterns.push('Form Pattern');
    if (semanticTypes.has('heading') && semanticTypes.has('text')) patterns.push('Content Display');

    return patterns;
  }

  private createEmptyFlowResult(): FlowDetectionResult {
    return {
      flows: [],
      orphanedScreens: [],
      roleDistribution: {},
      flowTypeDistribution: {},
      detectionQuality: {
        totalScreens: 0,
        screensInFlows: 0,
        averageFlowLength: 0,
        roleDetectionAccuracy: 0
      },
      recommendations: [
        'No flows detected. Try using consistent naming conventions like "UserRole_FlowName_SequenceNumber"',
        'Organize related screens in folders or pages',
        'Use clear, descriptive names for your frames'
      ]
    };
  }

  private generateFlowExtractorRecommendations(flows: FlowStructure[], allScreens: ScreenStructure[]): string[] {
    const recommendations: string[] = [];

    if (flows.length === 0) {
      recommendations.push('Consider organizing your screens into logical user flows');
    }

    const orphanedCount = allScreens.length - flows.reduce((sum, flow) => sum + flow.screens.length, 0);
    if (orphanedCount > flows.length) {
      recommendations.push(`${orphanedCount} screens are not organized into flows - consider grouping them`);
    }

    const rolesWithoutFlows = flows.length > 0 ? 
      ['customer', 'admin', 'operator'].filter(role => 
        !flows.some(flow => flow.userRole.type === role)
      ) : [];
    
    if (rolesWithoutFlows.length > 0) {
      recommendations.push(`Consider creating flows for: ${rolesWithoutFlows.join(', ')}`);
    }

    return recommendations;
  }

  // Additional helper methods for detailed analysis
  private getNavigationTargets(screen: ScreenStructure, flow: FlowStructure): string[] {
    // Simplified - in a real implementation, this would analyze prototype connections
    const currentIndex = flow.screens.findIndex(s => s.name === screen.name);
    if (currentIndex < flow.screens.length - 1) {
      return [flow.screens[currentIndex + 1].name];
    }
    return [];
  }

  private getNavigationSources(screen: ScreenStructure, flow: FlowStructure): string[] {
    const currentIndex = flow.screens.findIndex(s => s.name === screen.name);
    if (currentIndex > 0) {
      return [flow.screens[currentIndex - 1].name];
    }
    return [];
  }

  private determineFlowStage(index: number, totalScreens: number): 'entry' | 'middle' | 'exit' | 'standalone' {
    if (totalScreens === 1) return 'standalone';
    if (index === 0) return 'entry';
    if (index === totalScreens - 1) return 'exit';
    return 'middle';
  }

  private inferUserIntent(screen: ScreenStructure, flowType: string): string {
    const intentMap: Record<string, string> = {
      onboarding: 'Learn and get started',
      authentication: 'Sign in or register',
      main_feature: 'Use primary functionality',
      settings: 'Configure preferences',
      checkout: 'Complete purchase',
      unknown: 'Complete task'
    };

    return intentMap[flowType] || 'Navigate and interact';
  }

  private isScreenOnCriticalPath(screen: ScreenStructure, flow: FlowStructure): boolean {
    // Screens on critical flows are generally on critical path
    return flow.criticalPath || false;
  }

  private calculateStylingConsistency(components: any[]): number {
    // Simplified consistency calculation
    const colors = new Set(components.map(c => c.backgroundColor).filter(Boolean));
    const fontSizes = new Set(components.map(c => c.fontSize).filter(Boolean));
    
    // Lower variation indicates higher consistency
    const colorConsistency = Math.max(0, 1 - (colors.size / Math.max(components.length, 1)));
    const fontConsistency = Math.max(0, 1 - (fontSizes.size / Math.max(components.length, 1)));
    
    return (colorConsistency + fontConsistency) / 2 * 100;
  }

  private calculateNavigationConsistency(flows: FlowStructure[]): number {
    // Check if flows use consistent navigation patterns
    const patterns = flows.map(flow => flow.navigationPattern);
    const uniquePatterns = new Set(patterns);
    
    return Math.max(0, 1 - (uniquePatterns.size / Math.max(flows.length, 1))) * 100;
  }
}

export default FlowExtractor;