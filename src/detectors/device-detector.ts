// src/detectors/device-detector.ts
// Device type detection based on dimensions and aspect ratios

import { logger, LogFunction } from '@core/logger';
import { safeGetNumber } from '@utils/number-utils';
import { DEVICE_BREAKPOINTS } from '@core/constants';

const MODULE_NAME = 'DeviceDetector';

export interface DeviceDetectionResult {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  orientation: 'portrait' | 'landscape' | 'square';
  confidence: number;
  characteristics: {
    width: number;
    height: number;
    aspectRatio: number;
    pixelDensity?: string;
  };
}

export class DeviceDetector {

  @LogFunction(MODULE_NAME)
  detectDevice(width: any, height: any): DeviceDetectionResult {
    const FUNC_NAME = 'detectDevice';
    
    try {
      const safeWidth = safeGetNumber(width, 375);
      const safeHeight = safeGetNumber(height, 667);
      const aspectRatio = safeWidth / safeHeight;
      
      logger.debug(MODULE_NAME, FUNC_NAME, 'Analyzing dimensions', {
        width: safeWidth,
        height: safeHeight,
        aspectRatio: aspectRatio.toFixed(2)
      });

      const deviceType = this.determineDeviceType(safeWidth, safeHeight, aspectRatio);
      const orientation = this.determineOrientation(aspectRatio);
      const confidence = this.calculateConfidence(safeWidth, safeHeight, deviceType);

      const result: DeviceDetectionResult = {
        deviceType,
        orientation,
        confidence,
        characteristics: {
          width: safeWidth,
          height: safeHeight,
          aspectRatio: Math.round(aspectRatio * 100) / 100,
          pixelDensity: this.estimatePixelDensity(safeWidth, safeHeight, deviceType)
        }
      };

      logger.debug(MODULE_NAME, FUNC_NAME, 'Device detection complete', result);
      return result;

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error detecting device:', error as Error);
      return {
        deviceType: 'unknown',
        orientation: 'portrait',
        confidence: 0,
        characteristics: {
          width: 375,
          height: 667,
          aspectRatio: 0.56
        }
      };
    }
  }

  @LogFunction(MODULE_NAME)
  private determineDeviceType(width: number, height: number, aspectRatio: number): 'mobile' | 'tablet' | 'desktop' | 'unknown' {
    const FUNC_NAME = 'determineDeviceType';
    
    try {
      // Use the larger dimension for classification
      const largerDimension = Math.max(width, height);
      
      // Mobile devices
      if (largerDimension <= DEVICE_BREAKPOINTS.mobile.maxWidth) {
        logger.debug(MODULE_NAME, FUNC_NAME, 'Classified as mobile', { largerDimension });
        return 'mobile';
      }
      
      // Tablet devices
      if (largerDimension <= DEVICE_BREAKPOINTS.tablet.maxWidth) {
        // Check aspect ratio to distinguish from desktop
        if (aspectRatio >= DEVICE_BREAKPOINTS.tablet.aspectRatio.min && 
            aspectRatio <= DEVICE_BREAKPOINTS.tablet.aspectRatio.max) {
          logger.debug(MODULE_NAME, FUNC_NAME, 'Classified as tablet', { largerDimension, aspectRatio });
          return 'tablet';
        }
      }
      
      // Desktop devices
      if (largerDimension >= DEVICE_BREAKPOINTS.desktop.minWidth) {
        if (aspectRatio >= DEVICE_BREAKPOINTS.desktop.aspectRatio.min) {
          logger.debug(MODULE_NAME, FUNC_NAME, 'Classified as desktop', { largerDimension, aspectRatio });
          return 'desktop';
        }
      }
      
      // Fallback based on width primarily
      if (width <= 480) return 'mobile';
      if (width <= 768) return 'tablet';
      return 'desktop';

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error determining device type:', error as Error);
      return 'unknown';
    }
  }

  @LogFunction(MODULE_NAME)
  private determineOrientation(aspectRatio: number): 'portrait' | 'landscape' | 'square' {
    try {
      if (Math.abs(aspectRatio - 1) < 0.1) {
        return 'square';
      }
      return aspectRatio < 1 ? 'portrait' : 'landscape';
    } catch (error) {
      return 'portrait';
    }
  }

  @LogFunction(MODULE_NAME)
  private calculateConfidence(width: number, height: number, deviceType: string): number {
    try {
      // Higher confidence for standard resolutions
      const standardResolutions = [
        // Mobile
        { w: 375, h: 667, type: 'mobile' }, // iPhone 6/7/8
        { w: 414, h: 896, type: 'mobile' }, // iPhone 11
        { w: 360, h: 640, type: 'mobile' }, // Android common
        // Tablet
        { w: 768, h: 1024, type: 'tablet' }, // iPad
        { w: 1024, h: 768, type: 'tablet' }, // iPad landscape
        // Desktop
        { w: 1920, h: 1080, type: 'desktop' }, // Full HD
        { w: 1440, h: 900, type: 'desktop' },  // MacBook
      ];

      let bestMatch = 0;
      for (const res of standardResolutions) {
        if (res.type === deviceType) {
          const widthDiff = Math.abs(width - res.w) / res.w;
          const heightDiff = Math.abs(height - res.h) / res.h;
          const similarity = 1 - ((widthDiff + heightDiff) / 2);
          bestMatch = Math.max(bestMatch, similarity);
        }
      }

      // Base confidence on how well it matches standard resolutions
      return Math.min(0.9, Math.max(0.3, bestMatch));

    } catch (error) {
      return 0.5;
    }
  }

  @LogFunction(MODULE_NAME)
  private estimatePixelDensity(width: number, height: number, deviceType: string): string {
    try {
      // Estimate based on common device patterns
      switch (deviceType) {
        case 'mobile':
          if (width >= 400 || height >= 800) return '@3x';
          if (width >= 350 || height >= 600) return '@2x';
          return '@1x';
        
        case 'tablet':
          if (width >= 1000 || height >= 1200) return '@2x';
          return '@1x';
        
        case 'desktop':
          if (width >= 2000 || height >= 1200) return '@2x';
          return '@1x';
        
        default:
          return '@1x';
      }
    } catch (error) {
      return '@1x';
    }
  }

  @LogFunction(MODULE_NAME)
  getDeviceInfo(width: any, height: any): {
    deviceType: string;
    orientation: string;
    category: string;
    recommendations: string[];
  } {
    const FUNC_NAME = 'getDeviceInfo';
    
    try {
      const detection = this.detectDevice(width, height);
      const category = this.categorizeDevice(detection);
      const recommendations = this.generateRecommendations(detection);

      const info = {
        deviceType: detection.deviceType,
        orientation: detection.orientation,
        category,
        recommendations
      };

      logger.debug(MODULE_NAME, FUNC_NAME, 'Device info generated', info);
      return info;

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error getting device info:', error as Error);
      return {
        deviceType: 'unknown',
        orientation: 'portrait',
        category: 'unknown',
        recommendations: []
      };
    }
  }

  private categorizeDevice(detection: DeviceDetectionResult): string {
    const { deviceType, characteristics } = detection;
    
    switch (deviceType) {
      case 'mobile':
        if (characteristics.height > 800) return 'Large Phone';
        if (characteristics.height < 600) return 'Compact Phone';
        return 'Standard Phone';
      
      case 'tablet':
        if (characteristics.width > 1000) return 'Large Tablet';
        if (characteristics.width < 800) return 'Small Tablet';
        return 'Standard Tablet';
      
      case 'desktop':
        if (characteristics.width > 1800) return 'Large Desktop';
        if (characteristics.width < 1200) return 'Small Desktop';
        return 'Standard Desktop';
      
      default:
        return 'Unknown Device';
    }
  }

  private generateRecommendations(detection: DeviceDetectionResult): string[] {
    const recommendations: string[] = [];
    const { deviceType, orientation, characteristics } = detection;

    try {
      // Device-specific recommendations
      switch (deviceType) {
        case 'mobile':
          recommendations.push('Use flexible layouts with proper touch targets');
          recommendations.push('Consider thumb-friendly navigation patterns');
          if (orientation === 'landscape') {
            recommendations.push('Optimize for horizontal scrolling');
          }
          break;

        case 'tablet':
          recommendations.push('Utilize larger screen space with multi-column layouts');
          recommendations.push('Consider adaptive UI that works in both orientations');
          break;

        case 'desktop':
          recommendations.push('Take advantage of larger viewport for complex layouts');
          recommendations.push('Consider hover states and keyboard navigation');
          break;
      }

      // Aspect ratio recommendations
      if (characteristics.aspectRatio > 2) {
        recommendations.push('Very wide aspect ratio - consider side navigation');
      } else if (characteristics.aspectRatio < 0.5) {
        recommendations.push('Very tall aspect ratio - consider vertical navigation');
      }

      // Size-specific recommendations
      if (characteristics.width < 350) {
        recommendations.push('Small width - prioritize essential content');
      }
      if (characteristics.height < 500) {
        recommendations.push('Limited height - use collapsible sections');
      }

      return recommendations;

    } catch (error) {
      return ['Error generating recommendations'];
    }
  }

  @LogFunction(MODULE_NAME)
  isResponsiveDesign(devices: DeviceDetectionResult[]): {
    isResponsive: boolean;
    coverageScore: number;
    missingDeviceTypes: string[];
    recommendations: string[];
  } {
    const FUNC_NAME = 'isResponsiveDesign';
    
    try {
      const deviceTypes = new Set(devices.map(d => d.deviceType));
      const orientations = new Set(devices.map(d => d.orientation));
      
      const hasMultipleTypes = deviceTypes.size > 1;
      const hasMultipleOrientations = orientations.size > 1;
      
      const expectedTypes = ['mobile', 'tablet', 'desktop'];
      const missingTypes = expectedTypes.filter(type => !deviceTypes.has(type));
      
      const coverageScore = (deviceTypes.size / expectedTypes.length) * 100;
      const isResponsive = hasMultipleTypes && missingTypes.length <= 1;

      const recommendations: string[] = [];
      if (missingTypes.length > 0) {
        recommendations.push(`Consider adding ${missingTypes.join(' and ')} layouts`);
      }
      if (!hasMultipleOrientations) {
        recommendations.push('Consider both portrait and landscape orientations');
      }

      const result = {
        isResponsive,
        coverageScore: Math.round(coverageScore),
        missingDeviceTypes: missingTypes,
        recommendations
      };

      logger.info(MODULE_NAME, FUNC_NAME, 'Responsive design analysis', result);
      return result;

    } catch (error) {
      logger.error(MODULE_NAME, FUNC_NAME, 'Error analyzing responsive design:', error as Error);
      return {
        isResponsive: false,
        coverageScore: 0,
        missingDeviceTypes: ['mobile', 'tablet', 'desktop'],
        recommendations: ['Error analyzing design responsiveness']
      };
    }
  }
}

export default DeviceDetector;