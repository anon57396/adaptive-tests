class UserService {
  constructor() {
    this.sessions = new Map();
  }

  login(username, password) {
    if (!username || !password) {
      throw new Error('Missing credentials');
    }
    const token = `${username}-${Date.now()}`;
    this.sessions.set(token, username);
    return { success: true, token };
  }

  logout(token) {
    const existed = this.sessions.delete(token);
    return { success: existed };
  }
}

module.exports = UserService;
