// src/figma-globals.d.ts
// Complete Figma Plugin Environment (No Node.js)

declare global {
  // Figma Plugin API
  const figma: {
    currentPage: {
      findAll(): any[];
      children: any[];
      selection: any[];
      name: string;
    };
    showUI(html: string, options?: { width?: number; height?: number }): void;
    closePlugin(message?: string): void;
    ui: {
      postMessage(message: any): void;
      onmessage: ((message: any) => void) | null;
    };
    mixed: unique symbol;
  };

  // Figma plugin globals
  const __html__: string; // HTML content for plugin UI

  // Browser/JavaScript globals available in Figma plugins
  const console: {
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
  };

  // Timer functions
  function setTimeout(callback: () => void, delay: number): number;
  function clearTimeout(id: number): void;

  // JSON global
  const JSON: {
    parse(text: string): any;
    stringify(value: any): string;
  };

  // Math global
  const Math: {
    round(x: number): number;
    floor(x: number): number;
    ceil(x: number): number;
    abs(x: number): number;
    max(...values: number[]): number;
    min(...values: number[]): number;
  };

  // Number constructor
  const Number: {
    (value?: any): number;
    isNaN(value: any): boolean;
  };

  // Array constructor
  interface ArrayConstructor {
    isArray(arg: any): arg is any[];
  }
  const Array: ArrayConstructor;

  // Object constructor
  const Object: {
    keys(obj: any): string[];
    values(obj: any): any[];
    entries(obj: any): [string, any][];
  };
}

// Block Node.js globals completely
declare const process: never;
declare const global: never;
declare const Buffer: never;
declare const require: never;
declare const module: never;
declare const exports: never;
declare const __dirname: never;
declare const __filename: never;

export {};