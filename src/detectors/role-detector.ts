// src/detectors/role-detector.ts
// New file - follows same pattern as your existing component-detector.ts

import { logger, LogFunction } from '@core/logger';
import { UserRole, LayerAnalysis } from '@core/types';

const MODULE_NAME = 'RoleDetector';

export class RoleDetector {

  @LogFunction(MODULE_NAME, true)
  detectUserRoles(nodes: any[]): UserRole[] {
    const FUNC_NAME = 'detectUserRoles';
    
    try {
      const detectedRoles = new Map<string, UserRole>();
      const layerAnalyses: LayerAnalysis[] = [];

      // Analyze all layers for role indicators
      nodes.forEach((node: any) => {
        try {
          const analysis = this.analyzeLayerForRole(node);
          if (analysis) {
            layerAnalyses.push(analysis);
            
            if (analysis.detectedRole && analysis.confidence > 0.6) {
              const existingRole = detectedRoles.get(analysis.detectedRole.type);
              if (!existingRole || existingRole.confidence < analysis.detectedRole.confidence) {
                detectedRoles.set(analysis.detectedRole.type, analysis.detectedRole);
              }
            }
          }
        } catch (nodeError) {
          logger.warn(MODULE_NAME, FUNC_NAME, 'Error analyzing node for role:', { 
            error: nodeError, 
            node: node?.name 
          });
        }
      });

      const roles = Array.from(detectedRoles.values());
      logger.info(MODULE_NAME, FUNC_NAME, `Detected ${roles.length} user roles`, {
        roles: roles.map(r => r.type),
        totalAnalyzed: layerAnalyses.length
      });

      return roles;
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error detecting user roles:', error as Error);
      return [];
    }
  }

  @LogFunction(MODULE_NAME)
  private analyzeLayerForRole(node: any): LayerAnalysis | null {
    const FUNC_NAME = 'analyzeLayerForRole';
    
    try {
      const layerName = (node.name || '').toLowerCase();
      const parentLayers = this.getParentLayers(node);
      
      const analysis: LayerAnalysis = {
        layerName: node.name || 'unnamed',
        parentLayers,
        depth: parentLayers.length,
        namingPatterns: {
          hasRolePrefix: false,
          hasFlowIndicator: false,
          hasSequenceNumber: false,
          hasDeviceIndicator: false
        },
        confidence: 0
      };

      // Role detection patterns
      const roleDetection = this.detectRoleFromName(layerName);
      if (roleDetection) {
        analysis.detectedRole = roleDetection;
        analysis.namingPatterns.hasRolePrefix = true;
        analysis.confidence += 0.4;
      }

      // Flow indicator detection
      if (this.hasFlowIndicators(layerName)) {
        analysis.namingPatterns.hasFlowIndicator = true;
        analysis.confidence += 0.2;
      }

      // Sequence number detection
      if (this.hasSequenceNumber(layerName)) {
        analysis.namingPatterns.hasSequenceNumber = true;
        analysis.confidence += 0.2;
      }

      // Device indicator detection
      if (this.hasDeviceIndicator(layerName)) {
        analysis.namingPatterns.hasDeviceIndicator = true;
        analysis.confidence += 0.1;
      }

      // Parent context analysis
      const parentRoleContext = this.analyzeParentContext(parentLayers);
      if (parentRoleContext) {
        analysis.confidence += 0.1;
        if (!analysis.detectedRole) {
          analysis.detectedRole = parentRoleContext;
        }
      }

      logger.debug(MODULE_NAME, FUNC_NAME, 'Layer analysis complete', {
        layer: analysis.layerName,
        confidence: analysis.confidence,
        role: analysis.detectedRole?.type
      });

      return analysis.confidence > 0.3 ? analysis : null;
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error analyzing layer:', error as Error, { node: node?.name });
      return null;
    }
  }

  @LogFunction(MODULE_NAME)
  private detectRoleFromName(layerName: string): UserRole | null {
    const rolePatterns = [
      // Customer patterns
      { patterns: ['customer', 'client', 'user', 'buyer', 'shopper'], type: 'customer' as const },
      
      // Admin patterns  
      { patterns: ['admin', 'administrator', 'manager', 'super', 'root'], type: 'admin' as const },
      
      // Operator patterns
      { patterns: ['operator', 'staff', 'employee', 'worker', 'agent'], type: 'operator' as const },
      
      // Guest patterns
      { patterns: ['guest', 'visitor', 'anonymous', 'public', 'unauth'], type: 'guest' as const },
      
      // Moderator patterns
      { patterns: ['moderator', 'mod', 'supervisor', 'reviewer'], type: 'moderator' as const }
    ];

    for (const rolePattern of rolePatterns) {
      for (const pattern of rolePattern.patterns) {
        if (layerName.includes(pattern)) {
          return {
            id: `role_${rolePattern.type}_${Date.now()}`,
            name: rolePattern.type.charAt(0).toUpperCase() + rolePattern.type.slice(1),
            type: rolePattern.type,
            confidence: 0.8,
            detectionSource: 'layer_name'
          };
        }
      }
    }

    return null;
  }

  private hasFlowIndicators(layerName: string): boolean {
    const flowIndicators = [
      'onboarding', 'signup', 'login', 'checkout', 'cart', 'payment',
      'settings', 'profile', 'dashboard', 'home', 'search', 'browse',
      'details', 'confirmation', 'success', 'error', 'welcome'
    ];
    
    return flowIndicators.some(indicator => layerName.includes(indicator));
  }

  private hasSequenceNumber(layerName: string): boolean {
    // Patterns like "screen_1", "step-2", "page3", "01_", "_v2"
    const sequencePatterns = [
      /\d+$/, // ends with number
      /[-_]\d+[-_]/, // number with separators
      /step\s*\d+/i,
      /page\s*\d+/i,
      /screen\s*\d+/i,
      /v\d+/i // version numbers
    ];
    
    return sequencePatterns.some(pattern => pattern.test(layerName));
  }

  private hasDeviceIndicator(layerName: string): boolean {
    const deviceIndicators = ['mobile', 'tablet', 'desktop', 'phone', 'ipad', 'web'];
    return deviceIndicators.some(device => layerName.includes(device));
  }

  private getParentLayers(node: any): string[] {
    const parents: string[] = [];
    let current = node.parent;
    
    while (current && current.name && current.type !== 'DOCUMENT') {
      parents.unshift(current.name);
      current = current.parent;
    }
    
    return parents;
  }

  private analyzeParentContext(parentLayers: string[]): UserRole | null {
    // Check if any parent layers contain role indicators
    const combinedParentNames = parentLayers.join(' ').toLowerCase();
    return this.detectRoleFromName(combinedParentNames);
  }

  @LogFunction(MODULE_NAME)
  getRoleBasedDesignPattern(role: UserRole): any {
    const patterns = {
      customer: {
        commonComponents: ['product_card', 'rating', 'review', 'cart_button', 'wishlist'],
        colorPalette: ['warm', 'inviting', 'brand_focused'],
        typographyStyle: 'friendly',
        navigationComplexity: 'simple',
        informationDensity: 'medium',
        interactionPatterns: ['browse', 'search', 'purchase', 'review']
      },
      admin: {
        commonComponents: ['data_table', 'form', 'chart', 'sidebar', 'toolbar'],
        colorPalette: ['neutral', 'professional', 'status_colors'],
        typographyStyle: 'technical',
        navigationComplexity: 'complex',
        informationDensity: 'high',
        interactionPatterns: ['manage', 'configure', 'monitor', 'analyze']
      },
      operator: {
        commonComponents: ['task_list', 'status_indicator', 'quick_actions', 'notification'],
        colorPalette: ['functional', 'high_contrast', 'status_clear'],
        typographyStyle: 'minimal',
        navigationComplexity: 'moderate',
        informationDensity: 'medium',
        interactionPatterns: ['process', 'update', 'assign', 'complete']
      },
      guest: {
        commonComponents: ['hero_banner', 'feature_list', 'signup_prompt', 'demo'],
        colorPalette: ['welcoming', 'brand_showcase', 'clear_cta'],
        typographyStyle: 'friendly',
        navigationComplexity: 'simple',
        informationDensity: 'low',
        interactionPatterns: ['explore', 'learn', 'signup', 'contact']
      }
    };

    return patterns[role.type] || patterns.customer;
  }
}

export default RoleDetector;