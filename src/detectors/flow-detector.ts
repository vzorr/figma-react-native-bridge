// src/detectors/flow-detector.ts
// Complete Flow Detector implementation with TypeScript fixes

import { logger, LogFunction } from '@core/logger';
import { ErrorHandler } from '@core/error-handler';
import { FlowStructure, ScreenStructure, UserRole, FlowDetectionResult } from '@core/types';
import { FLOW_PATTERNS, DETECTION_THRESHOLDS } from '@core/constants';
import { getAllPages } from '@utils/figma-helpers';

const MODULE_NAME = 'FlowDetector';

// Type definitions for flow detection
type FlowType = 'unknown' | 'onboarding' | 'authentication' | 'main_feature' | 'settings' | 'checkout';
type NavigationPattern = 'stack' | 'tab' | 'modal' | 'drawer' | 'mixed';

export interface FlowDetectionStrategy {
  name: string;
  detect(screens: ScreenStructure[]): FlowGroup[];
  confidence: number;
}

export interface FlowGroup {
  id: string;
  screens: ScreenStructure[];
  confidence: number;
  detectionMethod: string;
  metadata: {
    role?: UserRole;
    flowType?: string;
    navigationPattern?: string;
    sequenceEvidence?: string[];
  };
}

export class FlowDetector {

  @LogFunction(MODULE_NAME, true)
  detectFlowsAdvanced(screens: ScreenStructure[], detectedRoles: UserRole[]): FlowDetectionResult {
    const FUNC_NAME = 'detectFlowsAdvanced';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting advanced flow detection', {
        totalScreens: screens.length,
        detectedRoles: detectedRoles.length
      });

      // Apply multiple detection strategies
      const strategies: FlowDetectionStrategy[] = [
        this.createNamingPatternStrategy(),
        this.createPageStructureStrategy(),
        this.createPrototypeLinkStrategy(),
        this.createSpatialProximityStrategy(),
        this.createContentSimilarityStrategy()
      ];

      const allFlowGroups: FlowGroup[] = [];
      
      // Run each strategy
      for (const strategy of strategies) {
        try {
          const groups = strategy.detect(screens);
          logger.debug(MODULE_NAME, FUNC_NAME, `Strategy ${strategy.name} found ${groups.length} groups`);
          allFlowGroups.push(...groups);
        } catch (strategyError) {
          logger.warn(MODULE_NAME, FUNC_NAME, `Strategy ${strategy.name} failed:`, { error: strategyError });
        }
      }

      // Merge and optimize flow groups
      const optimizedFlows = this.optimizeFlowGroups(allFlowGroups, detectedRoles);
      
      // Convert to final FlowStructure format
      const flows = this.convertToFlowStructures(optimizedFlows);
      
      // Identify orphaned screens
      const flowScreenIds = new Set(flows.flatMap(flow => flow.screens.map(s => s.name)));
      const orphanedScreens = screens.filter(screen => !flowScreenIds.has(screen.name));
      
      const result: FlowDetectionResult = {
        flows,
        orphanedScreens,
        roleDistribution: this.calculateRoleDistribution(detectedRoles),
        flowTypeDistribution: this.calculateFlowTypeDistribution(flows),
        detectionQuality: this.calculateDetectionQuality(screens, flows),
        recommendations: this.generateAdvancedRecommendations(flows, orphanedScreens, allFlowGroups)
      };

      logger.info(MODULE_NAME, FUNC_NAME, 'Advanced flow detection complete', {
        flowsDetected: flows.length,
        orphanedScreens: orphanedScreens.length,
        averageConfidence: this.calculateAverageConfidence(optimizedFlows)
      });

      return result;

    } catch (error) {
      ErrorHandler.handle(error as Error, {
        module: MODULE_NAME,
        function: FUNC_NAME,
        operation: 'advanced flow detection'
      });
      throw error;
    }
  }

  @LogFunction(MODULE_NAME)
  private createNamingPatternStrategy(): FlowDetectionStrategy {
    return {
      name: 'NamingPattern',
      confidence: 0.8,
      detect: (screens: ScreenStructure[]): FlowGroup[] => {
        const groups = new Map<string, ScreenStructure[]>();
        
        screens.forEach(screen => {
          const groupKey = this.extractAdvancedGroupKey(screen.name);
          if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
          }
          groups.get(groupKey)!.push(screen);
        });

        return Array.from(groups.entries())
          .filter(([_, screenGroup]) => screenGroup.length > 1) // Only groups with multiple screens
          .map(([groupKey, screenGroup]) => ({
            id: `naming_${groupKey}`,
            screens: this.sortScreensBySequence(screenGroup),
            confidence: this.calculateNamingConfidence(groupKey, screenGroup),
            detectionMethod: 'naming_pattern',
            metadata: {
              sequenceEvidence: this.extractSequenceEvidence(screenGroup)
            }
          }));
      }
    };
  }

  @LogFunction(MODULE_NAME)
  private createPageStructureStrategy(): FlowDetectionStrategy {
    return {
      name: 'PageStructure',
      confidence: 0.7,
      detect: (screens: ScreenStructure[]): FlowGroup[] => {
        const pageGroups = new Map<string, ScreenStructure[]>();
        
        screens.forEach(screen => {
          const pageName = screen.page || 'Unknown Page';
          if (!pageGroups.has(pageName)) {
            pageGroups.set(pageName, []);
          }
          pageGroups.get(pageName)!.push(screen);
        });

        return Array.from(pageGroups.entries())
          .filter(([_, screenGroup]) => screenGroup.length >= 2)
          .map(([pageName, screenGroup]) => ({
            id: `page_${pageName.replace(/\s+/g, '_').toLowerCase()}`,
            screens: screenGroup,
            confidence: this.calculatePageConfidence(pageName, screenGroup),
            detectionMethod: 'page_structure',
            metadata: {
              flowType: this.inferFlowTypeFromPageName(pageName)
            }
          }));
      }
    };
  }

  @LogFunction(MODULE_NAME)
  private createPrototypeLinkStrategy(): FlowDetectionStrategy {
    return {
      name: 'PrototypeLinks',
      confidence: 0.9,
      detect: (screens: ScreenStructure[]): FlowGroup[] => {
        const connectedGroups: FlowGroup[] = [];
        
        try {
          // Attempt to analyze prototype connections through spatial relationships
          const spatiallyConnected = this.analyzePrototypeHints(screens);
          
          spatiallyConnected.forEach((group, index) => {
            if (group.length > 1) {
              connectedGroups.push({
                id: `prototype_${index}`,
                screens: group,
                confidence: 0.85,
                detectionMethod: 'prototype_analysis',
                metadata: {
                  navigationPattern: this.inferNavigationFromLayout(group)
                }
              });
            }
          });
          
        } catch (error) {
          logger.debug(MODULE_NAME, 'createPrototypeLinkStrategy', 'Prototype analysis not available');
        }
        
        return connectedGroups;
      }
    };
  }

  @LogFunction(MODULE_NAME)
  private createSpatialProximityStrategy(): FlowDetectionStrategy {
    return {
      name: 'SpatialProximity',
      confidence: 0.6,
      detect: (screens: ScreenStructure[]): FlowGroup[] => {
        const proximityGroups: FlowGroup[] = [];
        const processed = new Set<string>();
        
        screens.forEach(screen => {
          if (processed.has(screen.name)) return;
          
          const nearbyScreens = this.findNearbyScreens(screen, screens, 200); // 200px proximity
          if (nearbyScreens.length > 1) {
            proximityGroups.push({
              id: `spatial_${screen.name}`,
              screens: nearbyScreens,
              confidence: this.calculateSpatialConfidence(nearbyScreens),
              detectionMethod: 'spatial_proximity',
              metadata: {
                navigationPattern: this.inferNavigationFromSpatialLayout(nearbyScreens)
              }
            });
            
            nearbyScreens.forEach(s => processed.add(s.name));
          }
        });
        
        return proximityGroups;
      }
    };
  }

  @LogFunction(MODULE_NAME)
  private createContentSimilarityStrategy(): FlowDetectionStrategy {
    return {
      name: 'ContentSimilarity',
      confidence: 0.5,
      detect: (screens: ScreenStructure[]): FlowGroup[] => {
        const similarityGroups: FlowGroup[] = [];
        const processed = new Set<string>();
        
        screens.forEach(screen => {
          if (processed.has(screen.name)) return;
          
          const similarScreens = this.findSimilarContentScreens(screen, screens);
          if (similarScreens.length > 1) {
            similarityGroups.push({
              id: `content_${screen.name}`,
              screens: similarScreens,
              confidence: this.calculateContentSimilarityConfidence(similarScreens),
              detectionMethod: 'content_similarity',
              metadata: {
                flowType: this.inferFlowTypeFromContent(similarScreens)
              }
            });
            
            similarScreens.forEach(s => processed.add(s.name));
          }
        });
        
        return similarityGroups;
      }
    };
  }

  @LogFunction(MODULE_NAME)
  private optimizeFlowGroups(allGroups: FlowGroup[], detectedRoles: UserRole[]): FlowGroup[] {
    const FUNC_NAME = 'optimizeFlowGroups';
    
    try {
      // Step 1: Remove duplicates and merge overlapping groups
      const mergedGroups = this.mergeOverlappingGroups(allGroups);
      
      // Step 2: Filter by confidence threshold
      const highConfidenceGroups = mergedGroups.filter(
        group => group.confidence >= DETECTION_THRESHOLDS.flow.content_analysis
      );
      
      // Step 3: Assign roles to groups
      const roleAssignedGroups = this.assignRolesToGroups(highConfidenceGroups, detectedRoles);
      
      // Step 4: Sort by confidence and relevance
      const sortedGroups = roleAssignedGroups.sort((a, b) => b.confidence - a.confidence);
      
      logger.debug(MODULE_NAME, FUNC_NAME, 'Flow group optimization complete', {
        originalGroups: allGroups.length,
        mergedGroups: mergedGroups.length,
        highConfidenceGroups: highConfidenceGroups.length,
        finalGroups: sortedGroups.length
      });
      
      return sortedGroups;
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error optimizing flow groups:', error as Error);
      return allGroups.filter(group => group.confidence >= 0.5);
    }
  }

  // FIXED: Type-safe flow type detection methods
  @LogFunction(MODULE_NAME)
  private determineFlowTypeFromName(flowName: string): FlowType {
    const lowerName = flowName.toLowerCase();
    
    // Check for onboarding patterns
    if (lowerName.includes('onboard') || 
        lowerName.includes('welcome') || 
        lowerName.includes('intro') ||
        lowerName.includes('getting started') ||
        lowerName.includes('tutorial')) {
      return 'onboarding';
    }
    
    // Check for authentication patterns
    if (lowerName.includes('auth') || 
        lowerName.includes('login') || 
        lowerName.includes('signin') ||
        lowerName.includes('signup') ||
        lowerName.includes('register') ||
        lowerName.includes('password')) {
      return 'authentication';
    }
    
    // Check for checkout/payment patterns
    if (lowerName.includes('checkout') || 
        lowerName.includes('payment') || 
        lowerName.includes('billing') ||
        lowerName.includes('purchase') ||
        lowerName.includes('cart') ||
        lowerName.includes('order')) {
      return 'checkout';
    }
    
    // Check for settings patterns
    if (lowerName.includes('setting') || 
        lowerName.includes('config') || 
        lowerName.includes('preference') ||
        lowerName.includes('profile') ||
        lowerName.includes('account')) {
      return 'settings';
    }
    
    // Check for main feature patterns
    if (lowerName.includes('main') || 
        lowerName.includes('home') || 
        lowerName.includes('dashboard') ||
        lowerName.includes('feed') ||
        lowerName.includes('browse') ||
        lowerName.includes('search')) {
      return 'main_feature';
    }
    
    // Default to unknown
    return 'unknown';
  }

  private isValidFlowType(value: string): value is FlowType {
    const validFlowTypes: FlowType[] = ['unknown', 'onboarding', 'authentication', 'main_feature', 'settings', 'checkout'];
    return validFlowTypes.includes(value as FlowType);
  }

  private isValidNavigationPattern(value: string): value is NavigationPattern {
    const validPatterns: NavigationPattern[] = ['stack', 'tab', 'modal', 'drawer', 'mixed'];
    return validPatterns.includes(value as NavigationPattern);
  }

  private determineFlowType(group: FlowGroup): FlowStructure['flowType'] {
    if (group.metadata.flowType && this.isValidFlowType(group.metadata.flowType)) {
      return group.metadata.flowType as FlowStructure['flowType'];
    }
    return this.inferFlowTypeFromScreens(group.screens);
  }

  private determineNavigationPattern(group: FlowGroup): FlowStructure['navigationPattern'] {
    if (group.metadata.navigationPattern && this.isValidNavigationPattern(group.metadata.navigationPattern)) {
      return group.metadata.navigationPattern as FlowStructure['navigationPattern'];
    }
    
    const screenCount = group.screens.length;
    if (screenCount <= 2) return 'modal';
    if (screenCount <= 5) return 'tab';
    return 'stack';
  }

  private inferFlowTypeFromPageName(pageName: string): string {
    const flowType = this.determineFlowTypeFromName(pageName);
    return flowType;
  }

  private inferFlowTypeFromContent(screens: ScreenStructure[]): string {
    // Analyze screen content to infer flow type
    const combinedNames = screens.map(s => s.name.toLowerCase()).join(' ');
    return this.determineFlowTypeFromName(combinedNames);
  }

  private inferFlowTypeFromScreens(screens: ScreenStructure[]): FlowStructure['flowType'] {
    const combinedNames = screens.map(s => s.name.toLowerCase()).join(' ');
    const detectedType = this.determineFlowTypeFromName(combinedNames);
    
    // Map our internal FlowType to FlowStructure['flowType']
    switch (detectedType) {
      case 'onboarding':
        return 'onboarding';
      case 'authentication':
        return 'authentication';
      case 'main_feature':
        return 'main_feature';
      case 'settings':
        return 'settings';
      case 'checkout':
        return 'checkout';
      default:
        return 'unknown';
    }
  }

  private extractAdvancedGroupKey(screenName: string): string {
    const name = screenName.toLowerCase();
    
    // Advanced pattern matching with multiple strategies
    
    // Strategy 1: Role_Flow_Sequence (e.g., "Customer_Onboarding_01")
    const roleFlowMatch = name.match(/^(customer|admin|operator|guest|user)[-_]([a-z]+)[-_]/);
    if (roleFlowMatch) {
      return `${roleFlowMatch[1]}_${roleFlowMatch[2]}`;
    }
    
    // Strategy 2: Flow_Sequence (e.g., "Login_01", "Checkout_Step_1")
    const flowMatch = name.match(/^([a-z]+)[-_](?:step[-_]?)?\d+/);
    if (flowMatch) {
      return flowMatch[1];
    }
    
    // Strategy 3: Common prefix before separator (e.g., "Profile-Settings-1")
    const prefixMatch = name.match(/^([a-z]+)[-_]/);
    if (prefixMatch) {
      return prefixMatch[1];
    }
    
    // Strategy 4: Content-based grouping
    for (const [flowType, patterns] of Object.entries(FLOW_PATTERNS.flowTypes)) {
      if (patterns.some(pattern => name.includes(pattern))) {
        return flowType;
      }
    }
    
    return 'misc';
  }

  private sortScreensBySequence(screens: ScreenStructure[]): ScreenStructure[] {
    return screens.sort((a, b) => {
      const aSequence = this.extractSequenceNumber(a.name);
      const bSequence = this.extractSequenceNumber(b.name);
      return aSequence - bSequence;
    });
  }

  private extractSequenceNumber(screenName: string): number {
    const name = screenName.toLowerCase();
    
    // Try different sequence patterns
    const patterns = [
      /[-_](\d+)$/, // ends with number
      /step[-_]?(\d+)/,
      /page[-_]?(\d+)/,
      /screen[-_]?(\d+)/,
      /(\d+)[-_]of[-_]\d+/,
      /^(\d+)[-_]/ // starts with number
    ];
    
    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return 0; // Default sequence
  }

  private extractSequenceEvidence(screens: ScreenStructure[]): string[] {
    const evidence: string[] = [];
    
    screens.forEach(screen => {
      const name = screen.name.toLowerCase();
      FLOW_PATTERNS.sequenceIndicators.forEach(pattern => {
        const match = name.match(pattern);
        if (match) {
          evidence.push(`${screen.name}: ${match[0]}`);
        }
      });
    });
    
    return evidence;
  }

  private calculateNamingConfidence(groupKey: string, screens: ScreenStructure[]): number {
    let confidence = 0.5; // Base confidence
    
    // Boost for sequence indicators
    const hasSequence = screens.some(screen => 
      FLOW_PATTERNS.sequenceIndicators.some(pattern => pattern.test(screen.name))
    );
    if (hasSequence) confidence += 0.2;
    
    // Boost for role indicators
    const hasRole = Object.values(FLOW_PATTERNS.userRoles).some(patterns =>
      patterns.some(pattern => groupKey.includes(pattern))
    );
    if (hasRole) confidence += 0.2;
    
    // Boost for flow type indicators
    const hasFlowType = Object.values(FLOW_PATTERNS.flowTypes).some(patterns =>
      patterns.some(pattern => groupKey.includes(pattern))
    );
    if (hasFlowType) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private calculatePageConfidence(pageName: string, screens: ScreenStructure[]): number {
    const name = pageName.toLowerCase();
    let confidence = 0.4; // Base for page grouping
    
    // Higher confidence for meaningful page names
    if (Object.values(FLOW_PATTERNS.flowTypes).some(patterns =>
      patterns.some(pattern => name.includes(pattern))
    )) {
      confidence += 0.3;
    }
    
    // Boost for consistent screen count
    if (screens.length >= 3 && screens.length <= 8) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0);
  }

  private findNearbyScreens(targetScreen: ScreenStructure, allScreens: ScreenStructure[], threshold: number): ScreenStructure[] {
    const nearby = [targetScreen];
    
    allScreens.forEach(screen => {
      if (screen.name === targetScreen.name) return;
      
      const distance = Math.sqrt(
        Math.pow(screen.x - targetScreen.x, 2) + 
        Math.pow(screen.y - targetScreen.y, 2)
      );
      
      if (distance <= threshold) {
        nearby.push(screen);
      }
    });
    
    return nearby;
  }

  private calculateSpatialConfidence(screens: ScreenStructure[]): number {
    if (screens.length < 2) return 0;
    
    // Higher confidence for aligned screens (same Y or X coordinate)
    const yCoords = screens.map(s => s.y);
    const xCoords = screens.map(s => s.x);
    
    const alignedY = yCoords.every(y => Math.abs(y - yCoords[0]) < 50);
    const alignedX = xCoords.every(x => Math.abs(x - xCoords[0]) < 50);
    
    let confidence = 0.3;
    if (alignedY || alignedX) confidence += 0.3;
    
    return confidence;
  }

  private findSimilarContentScreens(targetScreen: ScreenStructure, allScreens: ScreenStructure[]): ScreenStructure[] {
    const similar = [targetScreen];
    const targetComponents = this.getComponentSignature(targetScreen);
    
    allScreens.forEach(screen => {
      if (screen.name === targetScreen.name) return;
      
      const screenComponents = this.getComponentSignature(screen);
      const similarity = this.calculateComponentSimilarity(targetComponents, screenComponents);
      
      if (similarity > 0.6) {
        similar.push(screen);
      }
    });
    
    return similar;
  }

  private getComponentSignature(screen: ScreenStructure): string[] {
    const signature: string[] = [];
    
    const collectComponents = (components: any[]) => {
      components.forEach(comp => {
        if (comp.semanticType) {
          signature.push(comp.semanticType);
        }
        if (comp.children) {
          collectComponents(comp.children);
        }
      });
    };
    
    collectComponents(screen.components);
    return signature;
  }

  private calculateComponentSimilarity(sig1: string[], sig2: string[]): number {
    const set1 = new Set(sig1);
    const set2 = new Set(sig2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateContentSimilarityConfidence(screens: ScreenStructure[]): number {
    if (screens.length < 2) return 0;
    
    // Calculate average similarity between all pairs
    let totalSimilarity = 0;
    let pairCount = 0;
    
    for (let i = 0; i < screens.length; i++) {
      for (let j = i + 1; j < screens.length; j++) {
        const sig1 = this.getComponentSignature(screens[i]);
        const sig2 = this.getComponentSignature(screens[j]);
        totalSimilarity += this.calculateComponentSimilarity(sig1, sig2);
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  private mergeOverlappingGroups(groups: FlowGroup[]): FlowGroup[] {
    const merged: FlowGroup[] = [];
    const processed = new Set<string>();
    
    groups.forEach(group => {
      if (processed.has(group.id)) return;
      
      const overlapping = groups.filter(otherGroup => 
        otherGroup.id !== group.id && this.hasOverlappingScreens(group, otherGroup)
      );
      
      if (overlapping.length > 0) {
        // Merge groups
        const allScreens = [group, ...overlapping].flatMap(g => g.screens);
        const uniqueScreens = this.deduplicateScreens(allScreens);
        const maxConfidence = Math.max(group.confidence, ...overlapping.map(g => g.confidence));
        
        merged.push({
          id: `merged_${group.id}`,
          screens: uniqueScreens,
          confidence: maxConfidence,
          detectionMethod: 'merged',
          metadata: group.metadata
        });
        
        overlapping.forEach(g => processed.add(g.id));
      } else {
        merged.push(group);
      }
      
      processed.add(group.id);
    });
    
    return merged;
  }

  private hasOverlappingScreens(group1: FlowGroup, group2: FlowGroup): boolean {
    const names1 = new Set(group1.screens.map(s => s.name));
    const names2 = new Set(group2.screens.map(s => s.name));
    
    for (const name of names1) {
      if (names2.has(name)) return true;
    }
    return false;
  }

  private deduplicateScreens(screens: ScreenStructure[]): ScreenStructure[] {
    const seen = new Set<string>();
    return screens.filter(screen => {
      if (seen.has(screen.name)) return false;
      seen.add(screen.name);
      return true;
    });
  }

  private assignRolesToGroups(groups: FlowGroup[], detectedRoles: UserRole[]): FlowGroup[] {
    return groups.map(group => {
      if (group.metadata.role) return group;
      
      // Try to match group with detected roles
      const screenNames = group.screens.map(s => s.name.toLowerCase()).join(' ');
      
      for (const role of detectedRoles) {
        const rolePatterns = FLOW_PATTERNS.userRoles[role.type] || [];
        if (rolePatterns.some(pattern => screenNames.includes(pattern))) {
          group.metadata.role = role;
          break;
        }
      }
      
      return group;
    });
  }

  private convertToFlowStructures(groups: FlowGroup[]): FlowStructure[] {
    return groups.map((group, index) => ({
      id: group.id,
      name: this.generateFlowName(group),
      userRole: group.metadata.role || this.createDefaultRole(),
      screens: group.screens,
      flowType: this.determineFlowType(group),
      navigationPattern: this.determineNavigationPattern(group),
      deviceTargets: this.determineDeviceTargets(group.screens),
      sequence: index + 1
    }));
  }

  private generateFlowName(group: FlowGroup): string {
    const role = group.metadata.role?.name || 'User';
    const flowType = group.metadata.flowType || this.inferFlowTypeFromScreens(group.screens);
    return `${role} ${flowType}`;
  }

  private createDefaultRole(): UserRole {
    return {
      id: 'default_customer',
      name: 'Customer',
      type: 'customer',
      confidence: 0.5,
      detectionSource: 'content_analysis'
    };
  }

  private determineDeviceTargets(screens: ScreenStructure[]): ('mobile' | 'tablet' | 'desktop')[] {
    const targets = new Set<'mobile' | 'tablet' | 'desktop'>();
    screens.forEach(screen => {
      if (screen.deviceType) {
        targets.add(screen.deviceType as 'mobile' | 'tablet' | 'desktop');
      }
    });
    return Array.from(targets);
  }

  // Additional helper methods...
  private analyzePrototypeHints(screens: ScreenStructure[]): ScreenStructure[][] {
    // Placeholder for prototype connection analysis
    return [];
  }

  private inferNavigationFromLayout(screens: ScreenStructure[]): string {
    return 'stack'; // Simplified for now
  }

  private inferNavigationFromSpatialLayout(screens: ScreenStructure[]): string {
    return 'spatial'; // Simplified for now
  }

  private calculateRoleDistribution(roles: UserRole[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    roles.forEach(role => {
      distribution[role.type] = (distribution[role.type] || 0) + 1;
    });
    return distribution;
  }

  private calculateFlowTypeDistribution(flows: FlowStructure[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    flows.forEach(flow => {
      distribution[flow.flowType] = (distribution[flow.flowType] || 0) + 1;
    });
    return distribution;
  }

  private calculateDetectionQuality(allScreens: ScreenStructure[], flows: FlowStructure[]): FlowDetectionResult['detectionQuality'] {
    const screensInFlows = flows.reduce((sum, flow) => sum + flow.screens.length, 0);
    const averageFlowLength = flows.length > 0 ? screensInFlows / flows.length : 0;
    const roleDetectionAccuracy = flows.filter(flow => flow.userRole.confidence > DETECTION_THRESHOLDS.role.medium_confidence).length / Math.max(flows.length, 1);
    
    return {
      totalScreens: allScreens.length,
      screensInFlows,
      averageFlowLength: Math.round(averageFlowLength * 10) / 10,
      roleDetectionAccuracy: Math.round(roleDetectionAccuracy * 100) / 100
    };
  }

  private generateAdvancedRecommendations(flows: FlowStructure[], orphanedScreens: ScreenStructure[], allGroups: FlowGroup[]): string[] {
    const recommendations: string[] = [];
    
    // Analysis of detection strategies
    const strategyResults = new Map<string, number>();
    allGroups.forEach(group => {
      strategyResults.set(group.detectionMethod, (strategyResults.get(group.detectionMethod) || 0) + 1);
    });
    
    if (strategyResults.get('naming_pattern') === 0) {
      recommendations.push('No naming patterns detected. Use consistent naming like "UserType_FlowName_SequenceNumber" for better flow detection.');
    }
    
    if (orphanedScreens.length > flows.length) {
      recommendations.push(`${orphanedScreens.length} screens are not grouped into flows. Consider organizing them into clear user journeys.`);
    }
    
    const avgFlowLength = flows.reduce((sum, flow) => sum + flow.screens.length, 0) / flows.length;
    if (avgFlowLength < 2) {
      recommendations.push('Most flows have very few screens. Consider grouping related screens into longer user journeys.');
    }
    
    if (avgFlowLength > 8) {
      recommendations.push('Some flows are very long. Consider breaking them into sub-flows for better user experience.');
    }
    
    return recommendations;
  }

  private calculateAverageConfidence(groups: FlowGroup[]): number {
    if (groups.length === 0) return 0;
    return groups.reduce((sum, group) => sum + group.confidence, 0) / groups.length;
  }
}

export default FlowDetector;