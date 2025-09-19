import adaptiveExports from './index.js';

const {
  DiscoveryEngine,
  AdaptiveTest,
  TypeScriptDiscoveryEngine,
  getDiscoveryEngine,
  getTypeScriptDiscoveryEngine,
  adaptiveTest,
  discover,
  ConfigLoader,
  ScoringEngine,
  DEFAULT_CONFIG,
  ...rest
} = adaptiveExports;

export {
  DiscoveryEngine,
  AdaptiveTest,
  TypeScriptDiscoveryEngine,
  getDiscoveryEngine,
  getTypeScriptDiscoveryEngine,
  adaptiveTest,
  discover,
  ConfigLoader,
  ScoringEngine,
  DEFAULT_CONFIG
};

export default {
  DiscoveryEngine,
  AdaptiveTest,
  TypeScriptDiscoveryEngine,
  getDiscoveryEngine,
  getTypeScriptDiscoveryEngine,
  adaptiveTest,
  discover,
  ConfigLoader,
  ScoringEngine,
  DEFAULT_CONFIG,
  ...rest
};
