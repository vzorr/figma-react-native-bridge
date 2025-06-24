// src/global.d.ts
// Updated global types with proper Figma API

// Force TypeScript to forget about Node.js completely
declare namespace NodeJS {
  // Empty namespace to override any Node.js types
}

// Override process completely
declare const process: undefined;

// Figma Plugin Environment - Complete API
declare const figma: {
  // Core properties
  root: {
    children: any[];
    findAll(): any[];
    findOne(callback: (node: any) => boolean): any | null;
    name: string;
    type: 'DOCUMENT';
  };
  currentPage: {
    findAll(): any[];
    children: any[];
    selection: any[];
    name: string;
    parent: any;
    type: 'PAGE';
  };
  
  // UI methods
  showUI(html: string, options?: { width?: number; height?: number; title?: string }): void;
  closePlugin(message?: string): void;
  
  // UI messaging
  ui: {
    postMessage(message: any): void;
    onmessage: ((message: any) => void) | null;
    resize(width: number, height: number): void;
  };
  
  // Special values
  mixed: unique symbol;
  
  // Utility methods
  loadFontAsync(fontName: { family: string; style: string }): Promise<void>;
  createRectangle(): any;
  createText(): any;
  createFrame(): any;
  createComponent(): any;
  
  // Viewport methods
  viewport: {
    center: { x: number; y: number };
    zoom: number;
    scrollAndZoomIntoView(nodes: any[]): void;
  };
  
  // History methods
  history: {
    undo(): void;
    redo(): void;
  };
  
  // Preferences
  payments?: any;
  clientStorage: {
    getAsync(key: string): Promise<any>;
    setAsync(key: string, value: any): Promise<void>;
    deleteAsync(key: string): Promise<void>;
  };
};

// Plugin UI HTML
declare const __html__: string;

// Browser globals
declare const console: {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  trace(...args: any[]): void;
  group(label?: string): void;
  groupEnd(): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
};

declare const setTimeout: (callback: () => void, delay: number) => number;
declare const clearTimeout: (id: number) => void;
declare const setInterval: (callback: () => void, delay: number) => number;
declare const clearInterval: (id: number) => void;

declare const JSON: {
  parse(text: string): any;
  stringify(value: any, replacer?: any, space?: any): string;
};

declare const Math: {
  round(x: number): number;
  floor(x: number): number;
  ceil(x: number): number;
  abs(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  pow(base: number, exponent: number): number;
  sqrt(x: number): number;
  random(): number;
  PI: number;
  E: number;
};

declare const Number: {
  (value?: any): number;
  isNaN(value: any): boolean;
  isFinite(value: any): boolean;
  parseInt(string: string, radix?: number): number;
  parseFloat(string: string): number;
  MAX_VALUE: number;
  MIN_VALUE: number;
  POSITIVE_INFINITY: number;
  NEGATIVE_INFINITY: number;
  NaN: number;
};

declare const String: {
  (value?: any): string;
  fromCharCode(...codes: number[]): string;
};

declare const Object: {
  keys(obj: any): string[];
  values(obj: any): any[];
  entries(obj: any): [string, any][];
  assign(target: any, ...sources: any[]): any;
  create(proto: any): any;
  defineProperty(obj: any, prop: string, descriptor: PropertyDescriptor): any;
  freeze<T>(obj: T): T;
  seal<T>(obj: T): T;
};

declare const Date: {
  new(): Date;
  new(value: number | string): Date;
  new(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
  now(): number;
  parse(s: string): number;
  UTC(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
  prototype: Date;
};

interface Date {
  toString(): string;
  toDateString(): string;
  toTimeString(): string;
  toISOString(): string;
  toUTCString(): string;
  getTime(): number;
  getFullYear(): number;
  getUTCFullYear(): number;
  getMonth(): number;
  getUTCMonth(): number;
  getDate(): number;
  getUTCDate(): number;
  getDay(): number;
  getUTCDay(): number;
  getHours(): number;
  getUTCHours(): number;
  getMinutes(): number;
  getUTCMinutes(): number;
  getSeconds(): number;
  getUTCSeconds(): number;
  getMilliseconds(): number;
  getUTCMilliseconds(): number;
  valueOf(): number;
  setTime(time: number): number;
  setMilliseconds(ms: number): number;
  setUTCMilliseconds(ms: number): number;
  setSeconds(sec: number, ms?: number): number;
  setUTCSeconds(sec: number, ms?: number): number;
  setMinutes(min: number, sec?: number, ms?: number): number;
  setUTCMinutes(min: number, sec?: number, ms?: number): number;
  setHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setUTCHours(hours: number, min?: number, sec?: number, ms?: number): number;
  setDate(date: number): number;
  setUTCDate(date: number): number;
  setMonth(month: number, date?: number): number;
  setUTCMonth(month: number, date?: number): number;
  setFullYear(year: number, month?: number, date?: number): number;
  setUTCFullYear(year: number, month?: number, date?: number): number;
}

interface ArrayConstructor {
  new<T = any>(arrayLength?: number): T[];
  new<T = any>(...items: T[]): T[];
  isArray(arg: any): arg is any[];
  from<T>(iterable: Iterable<T>): T[];
  from<T, U>(iterable: Iterable<T>, mapfn: (v: T, k: number) => U): U[];
}

declare const Array: ArrayConstructor;

interface Array<T> {
  length: number;
  push(...items: T[]): number;
  pop(): T | undefined;
  shift(): T | undefined;
  unshift(...items: T[]): number;
  slice(start?: number, end?: number): T[];
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  indexOf(searchElement: T, fromIndex?: number): number;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
  filter(callbackfn: (value: T, index: number, array: T[]) => boolean): T[];
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  some(callbackfn: (value: T, index: number, array: T[]) => boolean): boolean;
  every(callbackfn: (value: T, index: number, array: T[]) => boolean): boolean;
  find(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => boolean): number;
  includes(searchElement: T, fromIndex?: number): boolean;
  join(separator?: string): string;
  reverse(): T[];
  sort(compareFn?: (a: T, b: T) => number): T[];
  concat(...items: (T | T[])[]): T[];
  [index: number]: T;
}

// Set and Map
interface Set<T> {
  add(value: T): this;
  clear(): void;
  delete(value: T): boolean;
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void): void;
  has(value: T): boolean;
  readonly size: number;
  values(): IterableIterator<T>;
  keys(): IterableIterator<T>;
  entries(): IterableIterator<[T, T]>;
  [Symbol.iterator](): IterableIterator<T>;
}

interface SetConstructor {
  new<T = any>(values?: readonly T[] | null): Set<T>;
  readonly prototype: Set<any>;
}

declare const Set: SetConstructor;

interface Map<K, V> {
  clear(): void;
  delete(key: K): boolean;
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
  readonly size: number;
  values(): IterableIterator<V>;
  keys(): IterableIterator<K>;
  entries(): IterableIterator<[K, V]>;
  [Symbol.iterator](): IterableIterator<[K, V]>;
}

interface MapConstructor {
  new<K = any, V = any>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
  readonly prototype: Map<any, any>;
}

declare const Map: MapConstructor;

// Symbol support
declare const Symbol: {
  iterator: symbol;
  for(key: string): symbol;
  keyFor(sym: symbol): string | undefined;
};

// Error types
interface Error {
  name: string;
  message: string;
  stack?: string;
}

interface ErrorConstructor {
  new(message?: string): Error;
  (message?: string): Error;
  readonly prototype: Error;
}

declare const Error: ErrorConstructor;

interface TypeError extends Error {}
interface ReferenceError extends Error {}
interface SyntaxError extends Error {}

interface TypeErrorConstructor {
  new(message?: string): TypeError;
  (message?: string): TypeError;
  readonly prototype: TypeError;
}

interface ReferenceErrorConstructor {
  new(message?: string): ReferenceError;
  (message?: string): ReferenceError;
  readonly prototype: ReferenceError;
}

interface SyntaxErrorConstructor {
  new(message?: string): SyntaxError;
  (message?: string): SyntaxError;
  readonly prototype: SyntaxError;
}

declare const TypeError: TypeErrorConstructor;
declare const ReferenceError: ReferenceErrorConstructor;
declare const SyntaxError: SyntaxErrorConstructor;

// Promise (minimal)
interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<T | TResult>;
}

interface PromiseConstructor {
  new<T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  resolve<T>(value: T | PromiseLike<T>): Promise<T>;
  resolve(): Promise<void>;
  reject<T = never>(reason?: any): Promise<T>;
  all<T>(values: readonly (T | PromiseLike<T>)[]): Promise<T[]>;
}

declare const Promise: PromiseConstructor;