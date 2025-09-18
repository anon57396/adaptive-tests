export type TargetType = 'class' | 'function' | 'module';

export interface DiscoverySignature {
  name?: string | RegExp;
  type?: TargetType;
  methods?: string[];
  exports?: string;
}

export interface DiscoveryOptions {
  extensions?: string[];
}

export class DiscoveryEngine {
  constructor(rootPath?: string, options?: DiscoveryOptions);
  discoverTarget<T = any>(signature: DiscoverySignature): Promise<T>;
  clearCache(): void;
}

export class TypeScriptDiscoveryEngine extends DiscoveryEngine {
  constructor(rootPath?: string, options?: DiscoveryOptions);
}

export function getDiscoveryEngine(rootPath?: string): DiscoveryEngine;
export function getTypeScriptDiscoveryEngine(rootPath?: string): TypeScriptDiscoveryEngine;

export function discover<T = any>(signature: DiscoverySignature, rootPath?: string): Promise<T>;

export abstract class AdaptiveTest {
  protected discoveryEngine: DiscoveryEngine;
  protected target: any;

  constructor();
  protected getTargetSignature(): DiscoverySignature;
  protected runTests(target: any): Promise<void> | void;
  execute(): Promise<void>;
  protected getExport<T = any>(module: any, name: string): T;
}

export function adaptiveTest<T extends AdaptiveTest>(TestClass: new () => T): void;
