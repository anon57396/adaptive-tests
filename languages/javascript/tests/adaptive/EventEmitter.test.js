/**
 * Adaptive test for EventEmitter
 * Tests a more complex class with state management
 */

const path = require('path');
const { getDiscoveryEngine } = require('../../src/discovery-engine');

const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));

describe('EventEmitter - Adaptive Discovery', () => {
  let EventEmitter;
  let emitter;

  beforeAll(async () => {
    // Discover EventEmitter by its method signature
    // The discovery engine will find it based on the unique combination of methods
    EventEmitter = await engine.discoverTarget({
      name: 'EventEmitter',
      type: 'class',
      methods: ['on', 'off', 'emit', 'once', 'listenerCount', 'removeAllListeners']
    });
  });

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  test('should discover EventEmitter class', () => {
    expect(EventEmitter).toBeDefined();
    expect(EventEmitter.name).toBe('EventEmitter');
  });

  describe('Event Management', () => {
    test('should register and trigger event listeners', () => {
      const mockCallback = jest.fn();

      emitter.on('test', mockCallback);
      emitter.emit('test', 'arg1', 'arg2');

      expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('should support multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on('multi', callback1);
      emitter.on('multi', callback2);
      emitter.emit('multi', 'data');

      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    test('should remove specific listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on('remove', callback1);
      emitter.on('remove', callback2);
      emitter.off('remove', callback1);
      emitter.emit('remove');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should handle once() for single execution', () => {
      const onceCallback = jest.fn();

      emitter.once('single', onceCallback);
      emitter.emit('single', 'first');
      emitter.emit('single', 'second');

      expect(onceCallback).toHaveBeenCalledTimes(1);
      expect(onceCallback).toHaveBeenCalledWith('first');
    });

    test('should count listeners correctly', () => {
      emitter.on('count', () => {});
      emitter.on('count', () => {});
      emitter.on('count', () => {});

      expect(emitter.listenerCount('count')).toBe(3);
      expect(emitter.listenerCount('nonexistent')).toBe(0);
    });

    test('should remove all listeners', () => {
      const callback = jest.fn();

      emitter.on('clear1', callback);
      emitter.on('clear2', callback);
      emitter.removeAllListeners();

      emitter.emit('clear1');
      emitter.emit('clear2');

      expect(callback).not.toHaveBeenCalled();
    });

    test('should remove listeners for specific event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      emitter.on('keep', callback1);
      emitter.on('remove', callback2);
      emitter.removeAllListeners('remove');

      emitter.emit('keep');
      emitter.emit('remove');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('should validate listener is a function', () => {
      expect(() => {
        emitter.on('invalid', 'not a function');
      }).toThrow(TypeError);
    });

    test('should warn about too many listeners', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      for (let i = 0; i <= 10; i++) {
        emitter.on('many', () => {});
      }

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('should return false when emitting non-existent event', () => {
      const result = emitter.emit('nonexistent');
      expect(result).toBe(false);
    });

    test('should return emitter when emitting existing event', () => {
      emitter.on('exists', () => {});
      const result = emitter.emit('exists');
      expect(result).toBe(emitter);
    });
  });

  describe('Method Chaining', () => {
    test('should support method chaining', () => {
      const callback = jest.fn();

      const result = emitter
        .on('chain', callback)
        .emit('chain', 'test')
        .off('chain', callback)
        .removeAllListeners();

      expect(result).toBe(emitter);
      expect(callback).toHaveBeenCalledWith('test');
    });
  });
});

/**
 * This test demonstrates:
 * - Discovery of complex classes with internal state
 * - Testing without knowing where EventEmitter.js lives
 * - Method signature-based discovery
 * - Tests that validate behavior, not implementation
 */