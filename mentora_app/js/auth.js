const Auth = (() => {
  function init() {
    const token = API.getToken();
    if (token) Chat.showChats();
    else showLogin();
  }

  function showLogin() {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;height:100%;background:#111827;color:#f9fafb;font-family:sans-serif;direction:rtl';
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px">
        <div style="width:100%;max-width:400px;background:#1f2937;border-radius:20px;padding:32px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;margin-bottom:12px">M</div>
            <h2 style="font-size:22px;margin-bottom:4px">تسجيل الدخول</h2>
            <p style="color:#9ca3af;font-size:14px">أهلاً بك في Mentora</p>
          </div>
          <div id="ilogin" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:#d1d5db">البريد الإلكتروني</label>
              <input id="ilemail" type="email" placeholder="أدخل بريدك الإلكتروني" style="background:#374151;border:1px solid #4b5563;border-radius:12px;padding:12px 14px;color:#f9fafb;font-size:15px;outline:none"/>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:#d1d5db">كلمة المرور</label>
              <input id="ilpass" type="password" placeholder="أدخل كلمة المرور" style="background:#374151;border:1px solid #4b5563;border-radius:12px;padding:12px 14px;color:#f9fafb;font-size:15px;outline:none"/>
            </div>
            <div id="ilogin-error" style="color:#ef4444;font-size:12px;text-align:center;min-height:18px"></div>
            <button id="ilogin-btn" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;background:#3b82f6;color:#fff;width:100%">تسجيل الدخول</button>
          </div>
          <p style="text-align:center;margin-top:16px;font-size:13px;color:#9ca3af">ليس لديك حساب؟ <a href="#" style="color:#3b82f6;text-decoration:none" onclick="Auth.showRegister();return false">إنشاء حساب</a></p>
        </div>
      </div>
    `;
    el('ilogin-btn').addEventListener('click', login);
    el('ilemail').addEventListener('keydown', e => { if (e.key === 'Enter') login(e); });
    el('ilpass').addEventListener('keydown', e => { if (e.key === 'Enter') login(e); });
  }

  function showRegister() {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;height:100%;background:#111827;color:#f9fafb;font-family:sans-serif;direction:rtl';
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px">
        <div style="width:100%;max-width:400px;background:#1f2937;border-radius:20px;padding:32px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;margin-bottom:12px">M</div>
            <h2 style="font-size:22px;margin-bottom:4px">إنشاء حساب</h2>
            <p style="color:#9ca3af;font-size:14px">انضم إلى Mentora</p>
          </div>
          <div id="ireg" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:#d1d5db">الاسم</label>
              <input id="irname" type="text" placeholder="الاسم الكامل" style="background:#374151;border:1px solid #4b5563;border-radius:12px;padding:12px 14px;color:#f9fafb;font-size:15px;outline:none"/>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:#d1d5db">البريد الإلكتروني</label>
              <input id="iremail" type="email" placeholder="أدخل بريدك الإلكتروني" style="background:#374151;border:1px solid #4b5563;border-radius:12px;padding:12px 14px;color:#f9fafb;font-size:15px;outline:none"/>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:#d1d5db">كلمة المرور</label>
              <input id="irpass" type="password" placeholder="أدخل كلمة المرور" style="background:#374151;border:1px solid #4b5563;border-radius:12px;padding:12px 14px;color:#f9fafb;font-size:15px;outline:none"/>
            </div>
            <div id="ireg-error" style="color:#ef4444;font-size:12px;text-align:center;min-height:18px"></div>
            <button id="ireg-btn" style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;background:#3b82f6;color:#fff;width:100%">إنشاء حساب</button>
          </div>
          <p style="text-align:center;margin-top:16px;font-size:13px;color:#9ca3af">لديك حساب؟ <a href="#" style="color:#3b82f6;text-decoration:none" onclick="Auth.showLogin();return false">تسجيل الدخول</a></p>
        </div>
      </div>
    `;
    el('ireg-btn').addEventListener('click', register);
    el('irname').addEventListener('keydown', e => { if (e.key === 'Enter') register(e); });
    el('iremail').addEventListener('keydown', e => { if (e.key === 'Enter') register(e); });
    el('irpass').addEventListener('keydown', e => { if (e.key === 'Enter') register(e); });
  }

  function el(id) { return document.getElementById(id); }

  async function login(ev) {
    console.log('▶ login called', ev.type);
    ev.preventDefault();
    const email = el('ilemail')?.value?.trim();
    const password = el('ilpass')?.value?.trim();
    const errEl = el('ilogin-error');
    const btn = el('ilogin-btn');
    if (!email || !password) { errEl.textContent = 'املأ جميع الحقول'; return; }
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'جاري التحميل...';
    try {
      const data = await API.post('/auth/login', { email, password });
      API.setToken(data.token); API.setUser(data.user);
      finishLogin();
    } catch (e) { console.log('✕ login error', e.message); errEl.textContent = e.message; btn.disabled = false; btn.textContent = 'تسجيل الدخول'; }
  }

  async function register(ev) {
    console.log('▶ register called', ev.type);
    ev.preventDefault();
    const name = el('irname')?.value?.trim();
    const email = el('iremail')?.value?.trim();
    const password = el('irpass')?.value?.trim();
    const errEl = el('ireg-error');
    const btn = el('ireg-btn');
    if (!name || !email || !password) { errEl.textContent = 'املأ جميع الحقول'; return; }
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'جاري التحميل...';
    try {
      const data = await API.post('/auth/register', { name, email, password });
      API.setToken(data.token); API.setUser(data.user);
      finishLogin();
    } catch (e) { console.log('✕ register error', e.message); errEl.textContent = e.message; btn.disabled = false; btn.textContent = 'إنشاء حساب'; }
  }

  function finishLogin() {
    try { PusherManager.connect(); } catch (e) { console.warn('Pusher:', e); }
    Chat.showChats();
  }

  function logout() {
    try { PusherManager.disconnect(); } catch(e) {}
    API.setToken(null); API.setUser(null);
    showLogin();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init, showLogin, showRegister, login, register, logout };
})();
