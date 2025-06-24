// src/global.d.ts
// Nuclear option: Override ALL global types

// Force TypeScript to forget about Node.js completely
declare namespace NodeJS {
  // Empty namespace to override any Node.js types
}

// Override process completely
declare const process: undefined;

// Figma Plugin Environment
declare const figma: {
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

// Plugin UI HTML
declare const __html__: string;

// Browser globals
declare const console: {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
};

declare const setTimeout: (callback: () => void, delay: number) => number;
declare const clearTimeout: (id: number) => void;

declare const JSON: {
  parse(text: string): any;
  stringify(value: any): string;
};

declare const Math: {
  round(x: number): number;
  floor(x: number): number;
  ceil(x: number): number;
  abs(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
};

declare const Number: {
  (value?: any): number;
  isNaN(value: any): boolean;
};

declare const Object: {
  keys(obj: any): string[];
  values(obj: any): any[];
  entries(obj: any): [string, any][];
};

interface ArrayConstructor {
  isArray(arg: any): arg is any[];
}
declare const Array: ArrayConstructor;