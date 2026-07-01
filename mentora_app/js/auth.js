const Auth = (() => {
  function init() {
    const token = API.getToken();
    if (token) {
      connectAndLoad();
    } else {
      App.showScreen('login-screen');
    }
  }

  function connectAndLoad() {
    try { PusherManager.connect(); } catch (e) {}
    App.showScreen('chats-screen');
    Chat.loadConversations();
  }

  async function login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    try {
      const data = await API.post('/auth/login', { email, password });
      API.setToken(data.token);
      API.setUser(data.user);
      connectAndLoad();
    } catch (e) {
      errEl.textContent = e.message;
    } finally {
      setLoading(btn, false);
    }
  }

  async function register(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const errEl = document.getElementById('register-error');
    errEl.textContent = '';
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    try {
      const data = await API.post('/auth/register', { name, email, password });
      API.setToken(data.token);
      API.setUser(data.user);
      connectAndLoad();
    } catch (e) {
      errEl.textContent = e.message;
    } finally {
      setLoading(btn, false);
    }
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.text = btn.textContent;
      btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0 auto"></div>';
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.text || 'تسجيل الدخول';
    }
  }

  function logout() {
    try { PusherManager.disconnect(); } catch (e) {}
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
