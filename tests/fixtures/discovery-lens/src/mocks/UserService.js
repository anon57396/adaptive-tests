class UserServiceMock {
  login() {
    return { success: true };
  }

  logout() {
    return { success: true };
  }
}

module.exports = UserServiceMock;
