/**
 * Auth Service - Another service extending BaseService
 */

const BaseService = require('./BaseService');

class AuthService extends BaseService {
  constructor() {
    super();
    this.sessions = new Map();
    this.tokens = new Map();
  }

  async execute(action, params) {
    switch (action) {
      case 'login':
        return this.login(params.username, params.password);
      case 'logout':
        return this.logout(params.token);
      case 'validate':
        return this.validateToken(params.token);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  login(username, password) {
    // Mock authentication
    if (password === 'secret') {
      const token = Math.random().toString(36).substring(7);
      const session = {
        username,
        token,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };

      this.sessions.set(token, session);
      this.tokens.set(username, token);
      this.log(`User logged in: ${username}`);

      return { success: true, token };
    }

    return { success: false, error: 'Invalid credentials' };
  }

  logout(token) {
    const session = this.sessions.get(token);
    if (session) {
      this.sessions.delete(token);
      this.tokens.delete(session.username);
      this.log(`User logged out: ${session.username}`);
      return true;
    }
    return false;
  }

  validateToken(token) {
    const session = this.sessions.get(token);
    if (!session) return false;

    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      this.tokens.delete(session.username);
      return false;
    }

    return true;
  }

  getActiveSessionCount() {
    return this.sessions.size;
  }
}

module.exports = AuthService;