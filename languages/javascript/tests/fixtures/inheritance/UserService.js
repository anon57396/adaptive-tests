/**
 * User Service - Extends BaseService for testing inheritance detection
 */

const BaseService = require('./BaseService');

class UserService extends BaseService {
  constructor() {
    super();
    this.users = new Map();
  }

  async execute(action, params) {
    switch (action) {
      case 'create':
        return this.createUser(params);
      case 'find':
        return this.findUser(params.id);
      case 'update':
        return this.updateUser(params.id, params.data);
      case 'delete':
        return this.deleteUser(params.id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  createUser(userData) {
    const id = Date.now().toString();
    const user = { id, ...userData, createdAt: new Date() };
    this.users.set(id, user);
    this.log(`Created user: ${id}`);
    return user;
  }

  findUser(id) {
    return this.users.get(id) || null;
  }

  updateUser(id, updates) {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    this.log(`Updated user: ${id}`);
    return updated;
  }

  deleteUser(id) {
    const existed = this.users.has(id);
    this.users.delete(id);
    this.log(`Deleted user: ${id}`);
    return existed;
  }

  getUserCount() {
    return this.users.size;
  }
}

module.exports = UserService;