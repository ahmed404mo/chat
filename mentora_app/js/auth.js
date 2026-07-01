const Auth = (() => {
  function init() {
    const token = API.getToken();
    if (token) {
      PusherManager.connect();
      App.showScreen('chats-screen');
      Chat.loadConversations();
    } else {
      App.showScreen('login-screen');
    }
  }

  async function login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    try {
      const data = await API.post('/auth/login', { email, password });
      API.setToken(data.token);
      API.setUser(data.user);
      PusherManager.connect();
      App.showScreen('chats-screen');
      Chat.loadConversations();
    } catch (e) {
      errEl.textContent = e.message;
    }
  }

  async function register(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const errEl = document.getElementById('register-error');
    errEl.textContent = '';
    try {
      const data = await API.post('/auth/register', { name, email, password });
      API.setToken(data.token);
      API.setUser(data.user);
      PusherManager.connect();
      App.showScreen('chats-screen');
      Chat.loadConversations();
    } catch (e) {
      errEl.textContent = e.message;
    }
  }

  function logout() {
    PusherManager.disconnect();
    API.setToken(null);
    API.setUser(null);
    App.showScreen('login-screen');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', login);
    document.getElementById('register-form').addEventListener('submit', register);
  });

  return { init, login, register, logout };
})();
