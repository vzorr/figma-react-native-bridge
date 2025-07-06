// src/handlers/layer-list-handler.ts
// Handler for listing all layers and extracting CSS from selected layers only

import { logger, LogFunction } from '@core/logger';
import { safeGetNumber } from '@utils/number-utils';

const MODULE_NAME = 'LayerListHandler';

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  depth: number;
  path: string[];
  parentId?: string;
  hasChildren: boolean;
  childCount: number;
  isVisible: boolean;
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styles: {
    hasBackground: boolean;
    hasBorder: boolean;
    hasText: boolean;
    hasShadow: boolean;
  };
}

export interface LayerTreeNode extends LayerInfo {
  children: LayerTreeNode[];
  isExpanded?: boolean;
  isSelected?: boolean;
}

export class LayerListHandler {

  @LogFunction(MODULE_NAME, true)
  async handleListAllLayers(): Promise<void> {
    const FUNC_NAME = 'handleListAllLayers';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, 'Starting layer listing');
      this.sendProgress(10, 'Scanning all layers...');
      
      // Get all layers from current page
      const layerTree = this.buildLayerTree();
      const flatLayerList = this.flattenLayerTree(layerTree);
      
      this.sendProgress(80, 'Organizing layer data...');
      
      // Send layer data to UI
      this.sendMessage('LAYERS_LISTED', {
        layerTree,
        flatLayers: flatLayerList,
        totalLayers: flatLayerList.length,
        summary: this.generateLayerSummary(flatLayerList)
      });
      
      this.sendProgress(100, 'Layer listing complete!');
      logger.info(MODULE_NAME, FUNC_NAME, `Listed ${flatLayerList.length} layers`);
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error listing layers:', error as Error);
      this.sendMessage('ERROR', {
        message: 'Failed to list layers. Please try again.'
      });
    }
  }

  @LogFunction(MODULE_NAME, true)
  async handleExtractSelectedLayers(selectedLayerIds: string[]): Promise<void> {
    const FUNC_NAME = 'handleExtractSelectedLayers';
    
    try {
      logger.info(MODULE_NAME, FUNC_NAME, `Extracting CSS for ${selectedLayerIds.length} selected layers`);
      this.sendProgress(10, 'Finding selected layers...');
      
      // Find the selected nodes
      const selectedNodes = this.findNodesByIds(selectedLayerIds);
      
      if (selectedNodes.length === 0) {
        throw new Error('Selected layers not found. They may have been deleted or moved.');
      }
      
      this.sendProgress(30, 'Extracting CSS from selected layers...');
      
      // Extract CSS from selected layers and their hierarchies
      const extractionResult = this.extractCSSFromSelectedLayers(selectedNodes);
      
      this.sendProgress(70, 'Generating additional formats...');
      
      // Generate different formats
      const files = this.generateFormattedOutputs(extractionResult);
      
      this.sendProgress(100, 'Extraction complete!');
      
      // Send results
      this.sendMessage('EXTRACTION_COMPLETE', {
        files,
        selectedLayers: selectedLayerIds,
        totalNodes: extractionResult.totalNodes,
        visualHierarchy: extractionResult.visualHierarchy,
        summary: {
          selectedLayers: selectedLayerIds.length,
          totalElements: extractionResult.totalNodes,
          generatedFiles: Object.keys(files).length
        }
      });
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error extracting selected layers:', error as Error);
      this.sendMessage('ERROR', {
        message: error instanceof Error ? error.message : 'Failed to extract selected layers'
      });
    }
  }

  @LogFunction(MODULE_NAME)
  private buildLayerTree(): LayerTreeNode[] {
    const FUNC_NAME = 'buildLayerTree';
    
    try {
      const rootNodes = figma.currentPage.children;
      const layerTree: LayerTreeNode[] = [];
      
      rootNodes.forEach(node => {
        const treeNode = this.processNodeToTree(node, [], 0);
        if (treeNode) {
          layerTree.push(treeNode);
        }
      });
      
      logger.debug(MODULE_NAME, FUNC_NAME, `Built tree with ${layerTree.length} root nodes`);
      return layerTree;
      
    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error building layer tree:', error as Error);
      return [];
    }
  }

  private processNodeToTree(node: any, path: string[], depth: number): LayerTreeNode | null {
    try {
      const layerInfo = this.extractLayerInfo(node, path, depth);
      const treeNode: LayerTreeNode = {
        ...layerInfo,
        children: [],
        isExpanded: depth < 2, // Auto-expand first 2 levels
        isSelected: false
      };
      
      // Process children if they exist
      if (this.nodeCanHaveChildren(node) && node.children && Array.isArray(node.children)) {
        const currentPath = [...path, node.name];
        node.children.forEach((child: any) => {
          const childNode = this.processNodeToTree(child, currentPath, depth + 1);
          if (childNode) {
            treeNode.children.push(childNode);
          }
        });
      }
      
      return treeNode;
      
    } catch (error) {
      logger.warn(MODULE_NAME, 'processNodeToTree', `Error processing node ${node?.name}:`, { error });
      return null;
    }
  }

  private extractLayerInfo(node: any, path: string[], depth: number): LayerInfo {
    const hasChildren = this.nodeCanHaveChildren(node) && node.children && node.children.length > 0;
    
    return {
      id: node.id,
      name: node.name || 'Unnamed Layer',
      type: node.type,
      depth,
      path: [...path, node.name],
      parentId: node.parent?.id,
      hasChildren,
      childCount: hasChildren ? node.children.length : 0,
      isVisible: node.visible !== false,
      dimensions: {
        x: safeGetNumber(node.x, 0),
        y: safeGetNumber(node.y, 0),
        width: safeGetNumber(node.width, 0),
        height: safeGetNumber(node.height, 0)
      },
      styles: {
        hasBackground: this.hasBackground(node),
        hasBorder: this.hasBorder(node),
        hasText: node.type === 'TEXT' || this.hasTextChildren(node),
        hasShadow: this.hasShadow(node)
      }
    };
  }

  private flattenLayerTree(tree: LayerTreeNode[]): LayerInfo[] {
    const flattened: LayerInfo[] = [];
    
    const traverse = (nodes: LayerTreeNode[]) => {
      nodes.forEach(node => {
        flattened.push({
          id: node.id,
          name: node.name,
          type: node.type,
          depth: node.depth,
          path: node.path,
          parentId: node.parentId,
          hasChildren: node.hasChildren,
          childCount: node.childCount,
          isVisible: node.isVisible,
          dimensions: node.dimensions,
          styles: node.styles
        });
        
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(tree);
    return flattened;
  }

  private findNodesByIds(ids: string[]): any[] {
    const nodes: any[] = [];
    const idsSet = new Set(ids);
    
    const searchInPage = (pageNode: any) => {
      const traverse = (node: any) => {
        if (idsSet.has(node.id)) {
          nodes.push(node);
        }
        
        if (this.nodeCanHaveChildren(node) && node.children) {
          node.children.forEach((child: any) => traverse(child));
        }
      };
      
      traverse(pageNode);
    };
    
    searchInPage(figma.currentPage);
    return nodes;
  }

  private extractCSSFromSelectedLayers(selectedNodes: any[]): any {
    let allCSS = `/* Generated CSS from Selected Figma Layers */\n/* Generated on: ${new Date().toISOString()} */\n/* Selected layers: ${selectedNodes.length} */\n\n`;
    let totalNodes = 0;
    const hierarchyMap: any[] = [];
    const visualHierarchy: string[] = [];
    
    selectedNodes.forEach((node, index) => {
      this.sendProgress(30 + (index / selectedNodes.length) * 40, `Processing ${node.name}...`);
      
      try {
        const result = this.processNodeHierarchy(node, 0);
        allCSS += result.css;
        totalNodes += result.count;
        hierarchyMap.push(result.hierarchy);
        visualHierarchy.push(this.generateVisualHierarchy(result.hierarchy, 0));
      } catch (nodeError) {
        logger.warn(MODULE_NAME, 'extractCSSFromSelectedLayers', `Error processing ${node.name}:`, { error: nodeError });
      }
    });
    
    return {
      cssText: allCSS,
      totalNodes,
      hierarchyMap,
      visualHierarchy: visualHierarchy.join('\n\n')
    };
  }

  private processNodeHierarchy(node: any, depth: number = 0): { css: string; hierarchy: any; count: number } {
    let css = this.extractNodeCSS(node, depth);
    let count = 1;
    
    const hierarchyNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      depth: depth,
      className: this.sanitizeClassName(node.name),
      children: [] as any[]
    };
    
    // Process children
    if (this.nodeCanHaveChildren(node) && node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => {
        try {
          const childResult = this.processNodeHierarchy(child, depth + 1);
          css += childResult.css;
          count += childResult.count;
          hierarchyNode.children.push(childResult.hierarchy);
        } catch (error) {
          logger.warn(MODULE_NAME, 'processNodeHierarchy', 'Error processing child:', { error });
        }
      });
    }
    
    return { css, hierarchy: hierarchyNode, count };
  }

  private extractNodeCSS(node: any, depth: number = 0): string {
    const className = this.sanitizeClassName(node.name);
    const uniqueClassName = `${className}-${depth}-${Date.now().toString(36)}`;
    
    let css = `/* ${node.name} (${node.type}) */\n.${uniqueClassName} {\n`;
    
    // Basic dimensions
    if (typeof node.width === 'number') {
      css += `  width: ${Math.round(node.width)}px;\n`;
    }
    if (typeof node.height === 'number') {
      css += `  height: ${Math.round(node.height)}px;\n`;
    }
    
    // Position
    if (typeof node.x === 'number' && typeof node.y === 'number') {
      css += `  position: absolute;\n`;
      css += `  left: ${Math.round(node.x)}px;\n`;
      css += `  top: ${Math.round(node.y)}px;\n`;
    }
    
    // Background color
    const bgColor = this.getNodeBackgroundColor(node);
    if (bgColor) {
      css += `  background-color: ${bgColor};\n`;
    }
    
    // Border radius
    if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
      css += `  border-radius: ${Math.round(node.cornerRadius)}px;\n`;
    }
    
    // Text properties for TEXT nodes
    if (node.type === 'TEXT') {
      if (typeof node.fontSize === 'number') {
        css += `  font-size: ${Math.round(node.fontSize)}px;\n`;
      }
      
      // Text color
      if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
        const textFill = node.fills[0];
        if (textFill.type === 'SOLID' && textFill.color) {
          const textColor = this.rgbToHex(textFill.color.r, textFill.color.g, textFill.color.b);
          css += `  color: ${textColor};\n`;
        }
      }
    }
    
    // Layout properties
    if (node.layoutMode) {
      css += `  display: flex;\n`;
      if (node.layoutMode === 'HORIZONTAL') {
        css += `  flex-direction: row;\n`;
      } else if (node.layoutMode === 'VERTICAL') {
        css += `  flex-direction: column;\n`;
      }
    }
    
    // Opacity
    if (typeof node.opacity === 'number' && node.opacity < 1) {
      css += `  opacity: ${node.opacity};\n`;
    }
    
    css += `}\n\n`;
    return css;
  }

  private generateFormattedOutputs(extractionResult: any): Record<string, string> {
    const files: Record<string, string> = {};
    
    // CSS file
    files['selected-layers.css'] = extractionResult.cssText;
    
    // SCSS version
    files['selected-layers.scss'] = extractionResult.cssText.replace(/\.([a-zA-Z0-9-_]+)/g, '.figma-$1');
    
    // React Native styles
    files['selected-layers.ts'] = this.generateReactNativeStyles(extractionResult);
    
    // Hierarchy JSON
    files['selected-hierarchy.json'] = JSON.stringify(extractionResult.hierarchyMap, null, 2);
    
    // README
    files['README.md'] = this.generateReadme(extractionResult);
    
    return files;
  }

  private generateReactNativeStyles(extractionResult: any): string {
    return `// Generated React Native Styles from Selected Layers
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Extracted from ${extractionResult.totalNodes} selected elements
});

export default styles;`;
  }

  private generateReadme(extractionResult: any): string {
    return `# Selected Layers CSS Extraction

Generated on: ${new Date().toISOString()}

## Summary
- **Total Elements**: ${extractionResult.totalNodes}
- **Extraction Method**: Selected layers with complete hierarchy

## Files Generated
- \`selected-layers.css\` - CSS for selected layers
- \`selected-layers.scss\` - SCSS version
- \`selected-layers.ts\` - React Native styles
- \`selected-hierarchy.json\` - Layer structure
- \`README.md\` - This documentation

## Hierarchy
${extractionResult.visualHierarchy}

Generated by Figma React Native Bridge Plugin`;
  }

  private generateLayerSummary(layers: LayerInfo[]): any {
    const typeCount: Record<string, number> = {};
    let visibleCount = 0;
    let withBackground = 0;
    let withText = 0;
    
    layers.forEach(layer => {
      typeCount[layer.type] = (typeCount[layer.type] || 0) + 1;
      if (layer.isVisible) visibleCount++;
      if (layer.styles.hasBackground) withBackground++;
      if (layer.styles.hasText) withText++;
    });
    
    return {
      total: layers.length,
      visible: visibleCount,
      withBackground,
      withText,
      typeDistribution: typeCount,
      maxDepth: Math.max(...layers.map(l => l.depth), 0)
    };
  }

  private generateVisualHierarchy(node: any, depth: number): string {
    const indent = '  '.repeat(depth);
    const icon = this.getNodeIcon(node.type);
    let result = `${indent}${icon} ${node.name} (${node.type})\n`;
    
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        result += this.generateVisualHierarchy(child, depth + 1);
      });
    }
    
    return result;
  }

  // Helper methods
  private nodeCanHaveChildren(node: any): boolean {
    const parentTypes = ['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET', 'BOOLEAN_OPERATION', 'SECTION'];
    return parentTypes.includes(node.type);
  }

  private hasBackground(node: any): boolean {
    return node.fills && Array.isArray(node.fills) && node.fills.length > 0;
  }

  private hasBorder(node: any): boolean {
    return node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0;
  }

  private hasTextChildren(node: any): boolean {
    if (!this.nodeCanHaveChildren(node) || !node.children) return false;
    return node.children.some((child: any) => child.type === 'TEXT' || this.hasTextChildren(child));
  }

  private hasShadow(node: any): boolean {
    return node.effects && Array.isArray(node.effects) && 
           node.effects.some((effect: any) => effect.type === 'DROP_SHADOW' && effect.visible);
  }

  private getNodeBackgroundColor(node: any): string | null {
    if (!this.hasBackground(node)) return null;
    
    const fill = node.fills[0];
    if (fill.type === 'SOLID' && fill.color) {
      return this.rgbToHex(fill.color.r, fill.color.g, fill.color.b);
    }
    return null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (c: number): string => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  private sanitizeClassName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase() || 'component';
  }

  private getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
      'FRAME': '🖼️',
      'GROUP': '📦',
      'TEXT': '📝',
      'RECTANGLE': '▭',
      'ELLIPSE': '⭕',
      'COMPONENT': '🧩',
      'INSTANCE': '📱',
      'IMAGE': '🖼️',
      'VECTOR': '✨'
    };
    return icons[type] || '📄';
  }

  private sendProgress(progress: number, message: string): void {
    try {
      figma.ui.postMessage({
        type: 'PROGRESS_UPDATE',
        progress: Math.min(100, Math.max(0, progress)),
        message
      });
    } catch (error) {
      console.error('Error sending progress:', error);
    }
  }

  private sendMessage(type: string, data: any): void {
    try {
      figma.ui.postMessage({ type, data, timestamp: Date.now() });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}

export default LayerListHandler;