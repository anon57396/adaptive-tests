const path = require('path');
const { CandidateEvaluator } = require('../../languages/javascript/src/candidate-evaluator');

const fixturesDir = path.join(__dirname, '..', 'fixtures', 'candidate-evaluator');
const samplePath = path.join(fixturesDir, 'SampleService.js');

function createEvaluator(overrides = {}) {
  const scoringEngine = overrides.scoringEngine || {
    calculateScore: jest.fn(() => 40),
    scoreTargetName: jest.fn(() => 12)
  };

  const analyzeModuleExports = overrides.analyzeModuleExports || jest.fn(() => ({
    exports: [
      {
        access: { type: 'named', name: 'SampleService' },
        info: {
          kind: 'class',
          name: 'SampleService',
          methods: ['execute'],
          properties: ['cache']
        }
      }
    ]
  }));

  return new CandidateEvaluator({
    rootPath: fixturesDir,
    config: overrides.config || { discovery: { scoring: { minCandidateScore: 0 } } },
    scoringEngine,
    tsconfigResolver: null,
    allowLooseNameMatch: overrides.allowLooseNameMatch ?? true,
    looseNamePenalty: overrides.looseNamePenalty ?? -25,
    analyzeModuleExports,
    calculateRecencyBonus: overrides.calculateRecencyBonus || jest.fn(() => 5),
    experimentalFeatures: overrides.experimentalFeatures || {}
  });
}

describe('CandidateEvaluator', () => {
  test('evaluateCandidate applies scoring bonuses from recency and pattern learning', async () => {
    const feedbackCollector = {
      getPatternScore: jest.fn(() => 7)
    };

    const evaluator = createEvaluator({
      experimentalFeatures: { feedbackCollector }
    });

    const signature = { name: 'SampleService', type: 'class' };
    const candidate = await evaluator.evaluateCandidate(samplePath, signature);

    expect(candidate).not.toBeNull();
    expect(candidate.score).toBe(52);
    expect(candidate.scoreBreakdown.recency).toBe(5);
    expect(candidate.scoreBreakdown.pattern).toBe(7);
  });

  test('isCandidateSafe rejects files containing blocked tokens', () => {
    const evaluator = createEvaluator();
    const unsafe = {
      content: 'module.exports = () => process.exit(1);'
    };
    expect(evaluator.isCandidateSafe(unsafe)).toBe(false);
  });

  test('selectExportFromMetadata respects signature requirements', () => {
    const evaluator = createEvaluator();

    const candidate = {
      metadata: {
        exports: [
          {
            access: { type: 'named', name: 'OtherService' },
            info: {
              kind: 'class',
              name: 'OtherService',
              methods: ['execute'],
              properties: ['cache']
            }
          },
          {
            access: { type: 'named', name: 'SampleService' },
            info: {
              kind: 'class',
              name: 'SampleService',
              methods: ['execute'],
              properties: ['cache']
            }
          }
        ]
      }
    };

    const signature = {
      name: 'SampleService',
      type: 'class',
      methods: ['execute'],
      properties: ['cache']
    };

    const match = evaluator.selectExportFromMetadata(candidate, signature);
    expect(match).not.toBeNull();
    expect(match.access.name).toBe('SampleService');
  });
});
