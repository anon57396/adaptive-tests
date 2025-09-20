/**
 * Example service to demonstrate jest-adaptive
 */

class UserService {
  constructor() {
    this.users = new Map();
    this.nextId = 1;
  }

  create(userData) {
    const user = {
      id: this.nextId++,
      ...userData,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  update(id, updates) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    const updated = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  delete(id) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User ${id} not found`);
    }
    this.users.delete(id);
    return { success: true, deleted: user };
  }

  findById(id) {
    return this.users.get(id) || null;
  }

  findAll() {
    return Array.from(this.users.values());
  }

  count() {
    return this.users.size;
  }
}

module.exports = UserService;