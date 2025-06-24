// src/detectors/pattern-detector.ts
// Design pattern detection for UI components

import { logger, LogFunction } from '../core/logger';
import ComponentDetector from './component-detector';

const MODULE_NAME = 'PatternDetector';

export interface DesignPattern {
  name: string;
  confidence: number;
  components: string[];
  description: string;
  recommendations?: string[];
}

export interface PatternAnalysis {
  patterns: DesignPattern[];
  complexity: 'low' | 'medium' | 'high';
  consistency: number;
  recommendations: string[];
}

class PatternDetector {

  constructor() {
    logger.info(MODULE_NAME, 'constructor', 'PatternDetector initialized');
  }

  /**
   * Analyze design patterns in components
   */
  @LogFunction(MODULE_NAME)
  analyzePatterns(components: any[]): PatternAnalysis {
    logger.info(MODULE_NAME, 'analyzePatterns', 'Starting pattern analysis', { componentCount: components.length });

    try {
      const patterns = this.detectPatterns(components);
      const complexity = this.calculateComplexity(components, patterns);
      const consistency = this.calculateConsistency(components);
      const recommendations = this.generateRecommendations(patterns, complexity, consistency);

      const analysis: PatternAnalysis = {
        patterns,
        complexity,
        consistency,
        recommendations
      };

      logger.info(MODULE_NAME, 'analyzePatterns', 'Pattern analysis complete', {
        patternsFound: patterns.length,
        complexity,
        consistency: Math.round(consistency * 100)
      });

      return analysis;
    } catch (error) {
      logger.error(MODULE_NAME, 'analyzePatterns', 'Error in pattern analysis:', error as Error);
      return {
        patterns: [],
        complexity: 'low',
        consistency: 0,
        recommendations: ['Unable to analyze patterns due to errors']
      };
    }
  }

  /**
   * Detect common UI patterns
   */
  @LogFunction(MODULE_NAME)
  private detectPatterns(components: any[]): DesignPattern[] {
    logger.debug(MODULE_NAME, 'detectPatterns', 'Detecting UI patterns');

    const patterns: DesignPattern[] = [];
    const componentTypes = this.categorizeComponents(components);

    // Navigation Pattern
    if (this.hasNavigationPattern(componentTypes)) {
      patterns.push({
        name: 'Navigation Pattern',
        confidence: this.calculateNavigationConfidence(componentTypes),
        components: ['navigation', 'button', 'text'],
        description: 'Top-level navigation structure with interactive elements',
        recommendations: ['Ensure consistent navigation hierarchy', 'Add accessibility labels']
      });
    }

    // Form Pattern
    if (this.hasFormPattern(componentTypes)) {
      patterns.push({
        name: 'Form Pattern',
        confidence: this.calculateFormConfidence(componentTypes),
        components: ['input', 'button', 'label'],
        description: 'Data input pattern with fields and submission elements',
        recommendations: ['Add validation states', 'Implement proper focus management']
      });
    }

    // Card Layout Pattern
    if (this.hasCardPattern(componentTypes)) {
      patterns.push({
        name: 'Card Layout Pattern',
        confidence: this.calculateCardConfidence(componentTypes),
        components: ['card', 'heading', 'text', 'button'],
        description: 'Content organization using card-based layout',
        recommendations: ['Maintain consistent card spacing', 'Add hover/focus states']
      });
    }

    // List Pattern
    if (this.hasListPattern(components)) {
      patterns.push({
        name: 'List Pattern',
        confidence: this.calculateListConfidence(components),
        components: ['container', 'text', 'image'],
        description: 'Repeating list items with consistent structure',
        recommendations: ['Implement virtual scrolling for large lists', 'Add selection states']
      });
    }

    // Modal/Dialog Pattern
    if (this.hasModalPattern(componentTypes)) {
      patterns.push({
        name: 'Modal Pattern',
        confidence: this.calculateModalConfidence(componentTypes),
        components: ['overlay', 'card', 'button', 'heading'],
        description: 'Modal dialog for focused interactions',
        recommendations: ['Add escape key handling', 'Implement focus trapping']
      });
    }

    // Tab Pattern
    if (this.hasTabPattern(componentTypes)) {
      patterns.push({
        name: 'Tab Pattern',
        confidence: this.calculateTabConfidence(componentTypes),
        components: ['navigation', 'button', 'container'],
        description: 'Tabbed interface for content organization',
        recommendations: ['Add keyboard navigation', 'Implement active state indicators']
      });
    }

    // Data Display Pattern
    if (this.hasDataDisplayPattern(componentTypes)) {
      patterns.push({
        name: 'Data Display Pattern',
        confidence: this.calculateDataDisplayConfidence(componentTypes),
        components: ['text', 'heading', 'container'],
        description: 'Structured data presentation layout',
        recommendations: ['Add responsive breakpoints', 'Consider table alternatives']
      });
    }

    // Action Pattern
    if (this.hasActionPattern(componentTypes)) {
      patterns.push({
        name: 'Action Pattern',
        confidence: this.calculateActionConfidence(componentTypes),
        components: ['button', 'icon', 'text'],
        description: 'Interactive elements for user actions',
        recommendations: ['Provide visual feedback', 'Add loading states']
      });
    }

    // Media Pattern
    if (this.hasMediaPattern(componentTypes)) {
      patterns.push({
        name: 'Media Pattern',
        confidence: this.calculateMediaConfidence(componentTypes),
        components: ['image', 'video', 'button', 'container'],
        description: 'Rich media content with controls',
        recommendations: ['Optimize for different screen sizes', 'Add accessibility alternatives']
      });
    }

    // Search Pattern
    if (this.hasSearchPattern(componentTypes)) {
      patterns.push({
        name: 'Search Pattern',
        confidence: this.calculateSearchConfidence(componentTypes),
        components: ['input', 'button', 'icon', 'container'],
        description: 'Search interface with input and results',
        recommendations: ['Add autocomplete functionality', 'Implement search history']
      });
    }

    logger.debug(MODULE_NAME, 'detectPatterns', 'Pattern detection complete', { patternsDetected: patterns.length });
    return patterns;
  }

  /**
   * Categorize components by type
   */
  private categorizeComponents(components: any[]): { [key: string]: number } {
    const categories: { [key: string]: number } = {};

    const countRecursive = (comps: any[]) => {
      comps.forEach(comp => {
        const type = comp.semanticType || comp.type || 'unknown';
        categories[type] = (categories[type] || 0) + 1;

        if (comp.children && Array.isArray(comp.children)) {
          countRecursive(comp.children);
        }
      });
    };

    countRecursive(components);
    return categories;
  }

  // Pattern Detection Methods
  private hasNavigationPattern(types: { [key: string]: number }): boolean {
    return (types.navigation || 0) > 0 && (types.button || 0) > 1;
  }

  private hasFormPattern(types: { [key: string]: number }): boolean {
    return (types.input || 0) > 0 && (types.button || 0) > 0;
  }

  private hasCardPattern(types: { [key: string]: number }): boolean {
    return (types.card || 0) > 1 || ((types.container || 0) > 2 && (types.heading || 0) > 1);
  }

  private hasListPattern(components: any[]): boolean {
    // Detect repeating structures
    const structures = components.map(comp => this.getComponentStructure(comp));
    const similarStructures = this.findSimilarStructures(structures);
    return similarStructures.length > 2;
  }

  private hasModalPattern(types: { [key: string]: number }): boolean {
    return (types.overlay || 0) > 0 || 
           ((types.card || 0) > 0 && (types.button || 0) > 1 && (types.heading || 0) > 0);
  }

  private hasTabPattern(types: { [key: string]: number }): boolean {
    return (types.tab || 0) > 2 || 
           ((types.button || 0) > 3 && (types.navigation || 0) > 0);
  }

  private hasDataDisplayPattern(types: { [key: string]: number }): boolean {
    return (types.text || 0) > 5 && (types.heading || 0) > 2;
  }

  private hasActionPattern(types: { [key: string]: number }): boolean {
    return (types.button || 0) > 2;
  }

  private hasMediaPattern(types: { [key: string]: number }): boolean {
    return (types.image || 0) > 0 || (types.video || 0) > 0;
  }

  private hasSearchPattern(types: { [key: string]: number }): boolean {
    return (types.input || 0) > 0 && (types.search || 0) > 0;
  }

  // Confidence Calculation Methods
  private calculateNavigationConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.navigation) confidence += 40;
    if (types.button > 1) confidence += 30;
    if (types.text > 0) confidence += 20;
    if (types.icon > 0) confidence += 10;
    return Math.min(confidence, 100);
  }

  private calculateFormConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.input) confidence += 50;
    if (types.button) confidence += 30;
    if (types.label) confidence += 20;
    return Math.min(confidence, 100);
  }

  private calculateCardConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.card > 1) confidence += 60;
    if (types.heading) confidence += 20;
    if (types.text) confidence += 10;
    if (types.button) confidence += 10;
    return Math.min(confidence, 100);
  }

  private calculateListConfidence(components: any[]): number {
    const structures = components.map(comp => this.getComponentStructure(comp));
    const similarStructures = this.findSimilarStructures(structures);
    return Math.min((similarStructures.length / components.length) * 100, 100);
  }

  private calculateModalConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.overlay) confidence += 70;
    if (types.card && types.button) confidence += 30;
    return Math.min(confidence, 100);
  }

  private calculateTabConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.tab > 2) confidence += 80;
    if (types.button > 3) confidence += 20;
    return Math.min(confidence, 100);
  }

  private calculateDataDisplayConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.text > 5) confidence += 40;
    if (types.heading > 2) confidence += 30;
    if (types.container > 1) confidence += 30;
    return Math.min(confidence, 100);
  }

  private calculateActionConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.button > 2) confidence += 60;
    if (types.icon) confidence += 40;
    return Math.min(confidence, 100);
  }

  private calculateMediaConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.image) confidence += 70;
    if (types.video) confidence += 30;
    return Math.min(confidence, 100);
  }

  private calculateSearchConfidence(types: { [key: string]: number }): number {
    let confidence = 0;
    if (types.search) confidence += 80;
    if (types.input) confidence += 20;
    return Math.min(confidence, 100);
  }

  /**
   * Calculate overall design complexity
   */
  private calculateComplexity(components: any[], patterns: DesignPattern[]): 'low' | 'medium' | 'high' {
    const componentCount = this.countAllComponents(components);
    const patternCount = patterns.length;
    const uniqueTypes = new Set(components.map(c => c.semanticType || c.type)).size;

    if (componentCount < 10 && patternCount < 2) return 'low';
    if (componentCount < 30 && patternCount < 4 && uniqueTypes < 8) return 'medium';
    return 'high';
  }

  /**
   * Calculate design consistency score
   */
  private calculateConsistency(components: any[]): number {
    // Analyze spacing consistency
    const spacings = this.extractSpacings(components);
    const spacingConsistency = this.calculateSpacingConsistency(spacings);

    // Analyze color consistency
    const colors = this.extractColors(components);
    const colorConsistency = this.calculateColorConsistency(colors);

    // Analyze typography consistency
    const fontSizes = this.extractFontSizes(components);
    const typographyConsistency = this.calculateTypographyConsistency(fontSizes);

    // Weighted average
    return (spacingConsistency * 0.3 + colorConsistency * 0.4 + typographyConsistency * 0.3);
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    patterns: DesignPattern[], 
    complexity: string, 
    consistency: number
  ): string[] {
    const recommendations: string[] = [];

    // Complexity-based recommendations
    if (complexity === 'high') {
      recommendations.push('Consider breaking down complex screens into smaller components');
      recommendations.push('Implement a consistent component library');
    }

    // Consistency-based recommendations
    if (consistency < 0.7) {
      recommendations.push('Standardize spacing values across components');
      recommendations.push('Create a unified color palette');
      recommendations.push('Establish consistent typography scale');
    }

    // Pattern-specific recommendations
    if (patterns.length === 0) {
      recommendations.push('Consider implementing common UI patterns for better user experience');
    }

    if (patterns.length > 5) {
      recommendations.push('Review if all patterns are necessary - consider simplifying');
    }

    // Accessibility recommendations
    recommendations.push('Add proper accessibility labels and focus management');
    recommendations.push('Ensure sufficient color contrast ratios');

    // Performance recommendations
    if (complexity === 'high') {
      recommendations.push('Consider code splitting for better performance');
      recommendations.push('Implement lazy loading for heavy components');
    }

    return recommendations;
  }

  // Helper Methods
  private countAllComponents(components: any[]): number {
    let count = components.length;
    components.forEach(comp => {
      if (comp.children && Array.isArray(comp.children)) {
        count += this.countAllComponents(comp.children);
      }
    });
    return count;
  }

  private getComponentStructure(component: any): string {
    const type = component.semanticType || component.type || 'unknown';
    const childTypes = component.children 
      ? component.children.map((c: any) => c.semanticType || c.type).sort().join(',')
      : '';
    return `${type}:${childTypes}`;
  }

  private findSimilarStructures(structures: string[]): string[] {
    const structureCount: { [key: string]: number } = {};
    structures.forEach(structure => {
      structureCount[structure] = (structureCount[structure] || 0) + 1;
    });

    return Object.keys(structureCount).filter(structure => structureCount[structure] > 1);
  }

  private extractSpacings(components: any[]): number[] {
    const spacings: number[] = [];
    const extractRecursive = (comps: any[]) => {
      comps.forEach(comp => {
        if (comp.padding) {
          Object.values(comp.padding).forEach((value: any) => {
            if (typeof value === 'number') spacings.push(value);
          });
        }
        if (comp.margin) {
          Object.values(comp.margin).forEach((value: any) => {
            if (typeof value === 'number') spacings.push(value);
          });
        }
        if (comp.children) extractRecursive(comp.children);
      });
    };
    extractRecursive(components);
    return spacings;
  }

  private extractColors(components: any[]): string[] {
    const colors: string[] = [];
    const extractRecursive = (comps: any[]) => {
      comps.forEach(comp => {
        if (comp.backgroundColor) colors.push(comp.backgroundColor);
        if (comp.textColor) colors.push(comp.textColor);
        if (comp.borderColor) colors.push(comp.borderColor);
        if (comp.children) extractRecursive(comp.children);
      });
    };
    extractRecursive(components);
    return colors;
  }

  private extractFontSizes(components: any[]): number[] {
    const fontSizes: number[] = [];
    const extractRecursive = (comps: any[]) => {
      comps.forEach(comp => {
        if (comp.fontSize) fontSizes.push(comp.fontSize);
        if (comp.children) extractRecursive(comp.children);
      });
    };
    extractRecursive(components);
    return fontSizes;
  }

  private calculateSpacingConsistency(spacings: number[]): number {
    if (spacings.length === 0) return 1;
    
    const uniqueSpacings = new Set(spacings);
    const baseSpacing = 8; // Assume 8px grid
    const gridAligned = Array.from(uniqueSpacings).filter(s => s % baseSpacing === 0);
    
    return gridAligned.length / uniqueSpacings.size;
  }

  private calculateColorConsistency(colors: string[]): number {
    if (colors.length === 0) return 1;
    
    const uniqueColors = new Set(colors);
    // Penalize having too many unique colors
    const idealColorCount = 10;
    const colorCount = uniqueColors.size;
    
    if (colorCount <= idealColorCount) {
      return 1;
    } else {
      return Math.max(0.5, idealColorCount / colorCount);
    }
  }

  private calculateTypographyConsistency(fontSizes: number[]): number {
    if (fontSizes.length === 0) return 1;
    
    const uniqueSizes = new Set(fontSizes);
    // Check if font sizes follow a scale (e.g., 1.2x ratio)
    const sortedSizes = Array.from(uniqueSizes).sort((a, b) => a - b);
    let scaleConsistent = 0;
    
    for (let i = 1; i < sortedSizes.length; i++) {
      const ratio = sortedSizes[i] / sortedSizes[i - 1];
      if (ratio >= 1.1 && ratio <= 1.3) { // Common type scale ratios
        scaleConsistent++;
      }
    }
    
    return sortedSizes.length > 1 ? scaleConsistent / (sortedSizes.length - 1) : 1;
  }
}

export default PatternDetector;