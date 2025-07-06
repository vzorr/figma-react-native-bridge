// src/detectors/component-detector.ts
// Fixed to remove missing dependencies

import { logger, LogFunction } from '@core/logger';

const MODULE_NAME = 'ComponentDetector';

// Simple safe number utility (avoiding import)
function safeGetNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
}

function safeGetWidth(node: any): number {
  return safeGetNumber(node.width, 0);
}

function safeGetHeight(node: any): number {
  return safeGetNumber(node.height, 0);
}

function safeGetCornerRadius(node: any): number {
  return safeGetNumber(node.cornerRadius, 0);
}

export interface ComponentDetectionResult {
  isButton: boolean;
  isInput: boolean;
  isHeading: boolean;
  isLabel: boolean;
  isCard: boolean;
  isNavigation: boolean;
  confidence: number;
  reasons: string[];
}

export class ComponentDetector {
  
  @LogFunction(MODULE_NAME, true)
  detectComponentType(node: any): ComponentDetectionResult {
    const name = this.safeGetName(node);
    const result: ComponentDetectionResult = {
      isButton: false,
      isInput: false,
      isHeading: false,
      isLabel: false,
      isCard: false,
      isNavigation: false,
      confidence: 0,
      reasons: []
    };

    logger.debug(MODULE_NAME, 'detectComponentType', `Analyzing node: ${name}`, {
      type: node.type,
      width: safeGetWidth(node),
      height: safeGetHeight(node)
    });

    // Detect each component type
    result.isButton = this.isButton(node, name, result.reasons);
    result.isInput = this.isInput(node, name, result.reasons);
    result.isHeading = this.isHeading(node, name, result.reasons);
    result.isLabel = this.isLabel(node, name, result.reasons);
    result.isCard = this.isCard(node, name, result.reasons);
    result.isNavigation = this.isNavigation(node, name, result.reasons);

    // Calculate confidence based on detection results
    result.confidence = this.calculateConfidence(result);

    logger.debug(MODULE_NAME, 'detectComponentType', 'Detection complete', {
      node: name,
      results: result,
      totalReasons: result.reasons.length
    });

    return result;
  }

  @LogFunction(MODULE_NAME)
  isButton(node: any, name: string, reasons: string[]): boolean {
    try {
      const checks = {
        nameMatch: this.hasButtonName(name),
        hasCharacteristics: this.hasButtonCharacteristics(node),
        hasInteractiveElements: this.hasInteractiveElements(node),
        hasButtonStyling: this.hasButtonStyling(node)
      };

      if (checks.nameMatch) {
        reasons.push(`Button name pattern: ${name}`);
      }
      if (checks.hasCharacteristics) {
        reasons.push('Button characteristics: proper dimensions and styling');
      }
      if (checks.hasInteractiveElements) {
        reasons.push('Interactive elements detected');
      }
      if (checks.hasButtonStyling) {
        reasons.push('Button styling: background and border radius');
      }

      const isButton = checks.nameMatch || (checks.hasCharacteristics && checks.hasButtonStyling);
      
      logger.debug(MODULE_NAME, 'isButton', `Button detection result: ${isButton}`, {
        node: name,
        checks,
        reasons: reasons.filter(r => r.includes('Button'))
      });

      return isButton;
    } catch (error) {
      logger.error(MODULE_NAME, 'isButton', 'Button detection error:', error as Error, { node: name });
      return false;
    }
  }

  @LogFunction(MODULE_NAME)
  isInput(node: any, name: string, reasons: string[]): boolean {
    try {
      const checks = {
        nameMatch: this.hasInputName(name),
        hasCharacteristics: this.hasInputCharacteristics(node),
        hasTextContent: this.hasTextContent(node),
        hasInputStyling: this.hasInputStyling(node)
      };

      if (checks.nameMatch) {
        reasons.push(`Input name pattern: ${name}`);
      }
      if (checks.hasCharacteristics) {
        reasons.push('Input characteristics: appropriate dimensions');
      }
      if (checks.hasTextContent) {
        reasons.push('Text content suggesting input field');
      }
      if (checks.hasInputStyling) {
        reasons.push('Input styling: border and background');
      }

      const isInput = checks.nameMatch || (checks.hasCharacteristics && checks.hasInputStyling);

      logger.debug(MODULE_NAME, 'isInput', `Input detection result: ${isInput}`, {
        node: name,
        checks,
        reasons: reasons.filter(r => r.includes('Input'))
      });

      return isInput;
    } catch (error) {
      logger.error(MODULE_NAME, 'isInput', 'Input detection error:', error as Error, { node: name });
      return false;
    }
  }

  @LogFunction(MODULE_NAME)
  isHeading(node: any, name: string, reasons: string[]): boolean {
    try {
      const fontSize = safeGetNumber(node.fontSize, 16);
      
      const checks = {
        nameMatch: this.hasHeadingName(name),
        isTextNode: node.type === 'TEXT',
        largeFont: fontSize >= 20,
        headingLevel: this.getHeadingLevel(name, fontSize)
      };

      if (checks.nameMatch) {
        reasons.push(`Heading name pattern: ${name}`);
      }
      if (checks.isTextNode && checks.largeFont) {
        reasons.push(`Large text: ${fontSize}px font size`);
      }
      if (checks.headingLevel > 0) {
        reasons.push(`Heading level ${checks.headingLevel} detected`);
      }

      const isHeading = checks.isTextNode && (checks.nameMatch || checks.largeFont);

      logger.debug(MODULE_NAME, 'isHeading', `Heading detection result: ${isHeading}`, {
        node: name,
        fontSize,
        checks,
        reasons: reasons.filter(r => r.includes('Heading') || r.includes('text'))
      });

      return isHeading;
    } catch (error) {
      logger.error(MODULE_NAME, 'isHeading', 'Heading detection error:', error as Error, { node: name });
      return false;
    }
  }

  @LogFunction(MODULE_NAME)
  isLabel(node: any, name: string, reasons: string[]): boolean {
    try {
      const fontSize = safeGetNumber(node.fontSize, 16);
      
      const checks = {
        nameMatch: this.hasLabelName(name),
        isTextNode: node.type === 'TEXT',
        smallFont: fontSize <= 14,
        hasLabelCharacteristics: this.hasLabelCharacteristics(node)
      };

      if (checks.nameMatch) {
        reasons.push(`Label name pattern: ${name}`);
      }
      if (checks.isTextNode && checks.smallFont) {
        reasons.push(`Small text: ${fontSize}px font size`);
      }
      if (checks.hasLabelCharacteristics) {
        reasons.push('Label characteristics detected');
      }

      const isLabel = checks.isTextNode && (checks.nameMatch || (checks.smallFont && checks.hasLabelCharacteristics));

      logger.debug(MODULE_NAME, 'isLabel', `Label detection result: ${isLabel}`, {
        node: name,
        fontSize,
        checks
      });

      return isLabel;
    } catch (error) {
      logger.error(MODULE_NAME, 'isLabel', 'Label detection error:', error as Error, { node: name });
      return false;
    }
  }

  @LogFunction(MODULE_NAME)
  isCard(node: any, name: string, reasons: string[]): boolean {
    try {
      const checks = {
        nameMatch: this.hasCardName(name),
        hasCharacteristics: this.hasCardCharacteristics(node),
        hasChildren: this.hasMultipleChildren(node),
        hasCardStyling: this.hasCardStyling(node)
      };

      if (checks.nameMatch) {
        reasons.push(`Card name pattern: ${name}`);
      }
      if (checks.hasCharacteristics) {
        reasons.push('Card characteristics: large container with content');
      }
      if (checks.hasChildren) {
        reasons.push('Multiple child elements');
      }
      if (checks.hasCardStyling) {
        reasons.push('Card styling: background and border radius/shadow');
      }

      const isCard = checks.nameMatch || (checks.hasCharacteristics && checks.hasChildren && checks.hasCardStyling);

      logger.debug(MODULE_NAME, 'isCard', `Card detection result: ${isCard}`, {
        node: name,
        checks,
        childCount: node.children?.length || 0
      });

      return isCard;
    } catch (error) {
      logger.error(MODULE_NAME, 'isCard', 'Card detection error:', error as Error, { node: name });
      return false;
    }
  }

  @LogFunction(MODULE_NAME)
  isNavigation(node: any, name: string, reasons: string[]): boolean {
    try {
      const checks = {
        nameMatch: this.hasNavigationName(name),
        hasCharacteristics: this.hasNavigationCharacteristics(node),
        hasNavigationElements: this.hasNavigationElements(node),
        hasNavigationLayout: this.hasNavigationLayout(node)
      };

      if (checks.nameMatch) {
        reasons.push(`Navigation name pattern: ${name}`);
      }
      if (checks.hasCharacteristics) {
        reasons.push('Navigation characteristics: horizontal layout');
      }
      if (checks.hasNavigationElements) {
        reasons.push('Navigation elements detected');
      }
      if (checks.hasNavigationLayout) {
        reasons.push('Navigation layout pattern');
      }

      const isNavigation = checks.nameMatch || (checks.hasCharacteristics && checks.hasNavigationElements);

      logger.debug(MODULE_NAME, 'isNavigation', `Navigation detection result: ${isNavigation}`, {
        node: name,
        checks
      });

      return isNavigation;
    } catch (error) {
      logger.error(MODULE_NAME, 'isNavigation', 'Navigation detection error:', error as Error, { node: name });
      return false;
    }
  }

  // Helper methods for name pattern matching
  private hasButtonName(name: string): boolean {
    const patterns = ['button', 'btn', 'cta', 'action', 'submit', 'primary', 'secondary'];
    return patterns.some(pattern => name.includes(pattern));
  }

  private hasInputName(name: string): boolean {
    const patterns = ['input', 'field', 'textbox', 'text field', 'form', 'search', 'textarea'];
    return patterns.some(pattern => name.includes(pattern));
  }

  private hasHeadingName(name: string): boolean {
    const patterns = ['heading', 'title', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'headline'];
    return patterns.some(pattern => name.includes(pattern));
  }

  private hasLabelName(name: string): boolean {
    const patterns = ['label', 'caption', 'subtitle', 'description', 'hint', 'helper'];
    return patterns.some(pattern => name.includes(pattern));
  }

  private hasCardName(name: string): boolean {
    const patterns = ['card', 'item', 'tile', 'container', 'panel', 'widget'];
    return patterns.some(pattern => name.includes(pattern));
  }

  private hasNavigationName(name: string): boolean {
    const patterns = ['nav', 'navigation', 'tab', 'menu', 'bar', 'header', 'footer', 'breadcrumb'];
    return patterns.some(pattern => name.includes(pattern));
  }

  // Characteristic detection methods
  private hasButtonCharacteristics(node: any): boolean {
    try {
      const width = safeGetWidth(node);
      const height = safeGetHeight(node);
      const cornerRadius = safeGetCornerRadius(node);
      
      return width > 60 && height > 30 && height < 80 && cornerRadius >= 0;
    } catch (error) {
      logger.error(MODULE_NAME, 'hasButtonCharacteristics', 'Error checking button characteristics:', error as Error);
      return false;
    }
  }

  private hasInputCharacteristics(node: any): boolean {
    try {
      const width = safeGetWidth(node);
      const height = safeGetHeight(node);
      
      return width > 100 && height > 30 && height < 60;
    } catch (error) {
      logger.error(MODULE_NAME, 'hasInputCharacteristics', 'Error checking input characteristics:', error as Error);
      return false;
    }
  }

  private hasCardCharacteristics(node: any): boolean {
    try {
      const width = safeGetWidth(node);
      const height = safeGetHeight(node);
      
      return width > 200 && height > 100;
    } catch (error) {
      logger.error(MODULE_NAME, 'hasCardCharacteristics', 'Error checking card characteristics:', error as Error);
      return false;
    }
  }

  private hasNavigationCharacteristics(node: any): boolean {
    try {
      const width = safeGetWidth(node);
      const height = safeGetHeight(node);
      
      // Navigation is typically wide and not too tall
      return width > 200 && height > 40 && height < 100;
    } catch (error) {
      logger.error(MODULE_NAME, 'hasNavigationCharacteristics', 'Error checking navigation characteristics:', error as Error);
      return false;
    }
  }

  // Styling detection methods
  private hasButtonStyling(node: any): boolean {
    return this.hasFills(node) && safeGetCornerRadius(node) > 0;
  }

  private hasInputStyling(node: any): boolean {
    return this.hasStrokes(node) || this.hasFills(node);
  }

  private hasCardStyling(node: any): boolean {
    return this.hasFills(node) && (safeGetCornerRadius(node) > 0 || this.hasEffects(node));
  }

  private hasLabelCharacteristics(node: any): boolean {
    // Labels are typically small text with low opacity or muted colors
    const opacity = safeGetNumber(node.opacity, 1);
    return opacity < 1 || this.hasSubduedColor(node);
  }

  // Utility methods
  private safeGetName(node: any): string {
    try {
      return (node?.name || 'unnamed').toLowerCase();
    } catch (error) {
      logger.error(MODULE_NAME, 'safeGetName', 'Error getting node name:', error as Error);
      return 'unnamed';
    }
  }

  private hasFills(node: any): boolean {
    try {
      return 'fills' in node && node.fills && Array.isArray(node.fills) && node.fills.length > 0;
    } catch (error) {
      return false;
    }
  }

  private hasStrokes(node: any): boolean {
    try {
      return 'strokes' in node && node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0;
    } catch (error) {
      return false;
    }
  }

  private hasEffects(node: any): boolean {
    try {
      return 'effects' in node && node.effects && Array.isArray(node.effects) && node.effects.length > 0;
    } catch (error) {
      return false;
    }
  }

  private hasMultipleChildren(node: any): boolean {
    try {
      return 'children' in node && node.children && Array.isArray(node.children) && node.children.length > 1;
    } catch (error) {
      return false;
    }
  }

  private hasTextContent(node: any): boolean {
    try {
      return node.type === 'TEXT' || this.findTextInChildren(node);
    } catch (error) {
      return false;
    }
  }

  private findTextInChildren(node: any): boolean {
    try {
      if (!node.children || !Array.isArray(node.children)) return false;
      return node.children.some((child: any) => child.type === 'TEXT' || this.findTextInChildren(child));
    } catch (error) {
      return false;
    }
  }

  private hasInteractiveElements(node: any): boolean {
    // Check for properties that suggest interactivity
    try {
      return this.hasFills(node) && this.hasHoverEffects(node);
    } catch (error) {
      return false;
    }
  }

  private hasHoverEffects(node: any): boolean {
    // This is speculative - check for multiple variants or states
    try {
      return node.name && (node.name.includes('hover') || node.name.includes('active') || node.name.includes('pressed'));
    } catch (error) {
      return false;
    }
  }

  private hasNavigationElements(node: any): boolean {
    try {
      if (!node.children) return false;
      
      // Look for multiple clickable items
      const childCount = node.children.length;
      const hasMultipleItems = childCount >= 2;
      
      return hasMultipleItems;
    } catch (error) {
      return false;
    }
  }

  private hasNavigationLayout(node: any): boolean {
    try {
      // Check for horizontal layout mode
      return 'layoutMode' in node && node.layoutMode === 'HORIZONTAL';
    } catch (error) {
      return false;
    }
  }

  private hasSubduedColor(node: any): boolean {
    // This would require color analysis - placeholder for now
    return false;
  }

  private getHeadingLevel(name: string, fontSize: number): number {
    if (name.includes('h1') || name.includes('title')) return 1;
    if (name.includes('h2') || name.includes('subtitle')) return 2;
    if (name.includes('h3') || name.includes('heading')) return 3;
    
    if (fontSize >= 32) return 1;
    if (fontSize >= 24) return 2;
    if (fontSize >= 20) return 3;
    
    return 0;
  }

  private calculateConfidence(result: ComponentDetectionResult): number {
    const detected = [
      result.isButton,
      result.isInput,
      result.isHeading,
      result.isLabel,
      result.isCard,
      result.isNavigation
    ].filter(Boolean).length;

    // Higher confidence if only one type is detected
    if (detected === 1) return 0.8 + (result.reasons.length * 0.05);
    if (detected === 0) return 0;
    
    // Lower confidence for multiple detections
    return Math.max(0.3, 0.8 - (detected * 0.1));
  }
}

export default ComponentDetector;