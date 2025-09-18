import {
  DiscoveryEngine,
  getDiscoveryEngine,
  AdaptiveTest,
  adaptiveTest,
  discover,
  ConfigLoader,
  ScoringEngine,
  DEFAULT_CONFIG,
  TypeScriptDiscoveryEngine,
  getTypeScriptDiscoveryEngine,
} from './adaptive';

export {
  DiscoveryEngine,
  getDiscoveryEngine,
  AdaptiveTest,
  adaptiveTest,
  discover,
  ConfigLoader,
  ScoringEngine,
  DEFAULT_CONFIG,
  TypeScriptDiscoveryEngine,
  getTypeScriptDiscoveryEngine,
};

export type LegacyDiscoveryEngine = DiscoveryEngine;
export const getLegacyEngine: typeof getDiscoveryEngine;
