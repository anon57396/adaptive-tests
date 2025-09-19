class UserService {
  constructor(repository) {
    this.repository = repository;
  }

  async login(username, password) {
    return this.repository.authenticate(username, password);
  }

  async logout(token) {
    return this.repository.invalidate(token);
  }

  resetPassword(userId) {
    return this.repository.reset(userId);
  }
}

module.exports = { UserService };
