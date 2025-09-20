/**
 * Minimal in-memory API service. Pretends to serve REST endpoints but simply manages records.
 */

class ApiService {
  constructor() {
    this.users = new Map();
    this.nextId = 1000;
  }

  getHealth() {
    return { status: 'ok', uptime: 1 };
  }

  listUsers() {
    return Array.from(this.users.values());
  }

  createUser(payload) {
    if (!payload || !payload.name) {
      throw new Error('name is required');
    }
    const id = this.nextId++;
    const record = { id, name: payload.name, email: payload.email || null };
    this.users.set(id, record);
    return record;
  }

  getUser(id) {
    if (!this.users.has(id)) {
      throw new Error('user not found');
    }
    return this.users.get(id);
  }

  updateUser(id, updates) {
    if (!this.users.has(id)) {
      throw new Error('user not found');
    }
    const record = { ...this.users.get(id), ...updates };
    this.users.set(id, record);
    return record;
  }

  deleteUser(id) {
    const exists = this.users.delete(id);
    if (!exists) {
      throw new Error('user not found');
    }
    return true;
  }

  reset() {
    this.users.clear();
    this.nextId = 1000;
  }
}

module.exports = ApiService;
