/**
 * EventEmitter - A test fixture with a more complex class structure
 * Tests discovery of classes with internal state and methods
 */

class EventEmitter {
  constructor() {
    this.events = new Map();
    this.maxListeners = 10;
  }

  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener must be a function');
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event);
    if (listeners.length >= this.maxListeners) {
      console.warn(`Warning: ${event} has more than ${this.maxListeners} listeners`);
    }

    listeners.push(listener);
    return this;
  }

  off(event, listener) {
    if (!this.events.has(event)) return this;

    const listeners = this.events.get(event);
    const index = listeners.indexOf(listener);

    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.events.delete(event);
    }

    return this;
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return false;

    const listeners = this.events.get(event).slice();
    listeners.forEach(listener => {
      listener.apply(null, args);
    });

    return this;
  }

  once(event, listener) {
    const wrapper = (...args) => {
      listener.apply(null, args);
      this.off(event, wrapper);
    };

    this.on(event, wrapper);
    return this;
  }

  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }

  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

// Export as default
module.exports = EventEmitter;