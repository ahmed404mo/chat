const API = (() => {
  const BASE = (typeof API_BASE !== 'undefined') ? API_BASE : 'https://chat-five-rho-38.vercel.app/api';

  function getToken() {
    return localStorage.getItem('mentora_token');
  }

  function setToken(t) {
    if (t) localStorage.setItem('mentora_token', t);
    else localStorage.removeItem('mentora_token');
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('mentora_user')); } catch { return null; }
  }

  function setUser(u) {
    if (u) localStorage.setItem('mentora_user', JSON.stringify(u));
    else localStorage.removeItem('mentora_user');
  }

  function isPublicEndpoint(path) {
    return path.startsWith('/auth/');
  }

  async function request(method, path, body, isFormData) {
    const opts = { method, headers: {} };
    const token = getToken();
    if (token && !isPublicEndpoint(path)) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) {
      if (isFormData) {
        opts.body = body;
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    let res;
    const url = `${BASE}${path}`;
    if (path === '/chat/conversations') console.log('→ sending token:', token?.substring(0,30)+'...');
    try {
      res = await fetch(url, opts);
    } catch (e) {
      throw new Error('تعذر الاتصال بالخادم');
    }
    let data;
    try {
      data = await res.json();
    } catch {
      if (res.ok) return {};
      throw new Error('خطأ في استجابة الخادم');
    }
    if (!res.ok) {
      if (res.status === 401 && !isPublicEndpoint(path)) {
        console.log('✕ 401:', path, 'token was:', token?.substring(0,30)+'...');
        setToken(null); setUser(null);
        if (typeof Chat !== 'undefined' && Chat.logout) Chat.logout();
        else if (typeof Auth !== 'undefined' && Auth.showLogin) Auth.showLogin();
        else window.location.hash = '#login';
        throw new Error('انتهت الجلسة');
      }
      const msg = data?.message || data?.error || `خطأ ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function get(path) { return request('GET', path); }
  function post(path, body) { return request('POST', path, body); }
  function patch(path, body) { return request('PATCH', path, body); }
  function del(path, body) { return request('DELETE', path, body); }
  function upload(path, formData) { return request('POST', path, formData, true); }

  return { BASE, getToken, setToken, getUser, setUser, get, post, patch, del, upload, request };
})();
