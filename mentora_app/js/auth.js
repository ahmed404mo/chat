const Auth = (() => {
  function init() {
    const token = API.getToken();
    if (token) {
      try { PusherManager.connect(); } catch (e) { console.warn('Pusher:', e); }
      Chat.showChats();
      registerNativePush(token);
    } else showLogin();
    if (pendingNav) {
      Chat.openConv(pendingNav);
      pendingNav = null;
    }
  }

  function showLogin() {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;min-height:100vh;background:#f8f9ff;color:#0b1c30;font-family:Inter,sans-serif;direction:rtl;-webkit-font-smoothing:antialiased';
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;background:#f8f9ff;background-image:radial-gradient(#d3e4fe 1px,transparent 1px);background-size:32px 32px">
        <div style="width:100%;max-width:400px;background:#ffffff;border-radius:16px;border:1px solid #c3c6d7;padding:32px;box-shadow:0 8px 24px rgba(15,23,42,0.08);position:relative;z-index:1">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:64px;height:64px;border-radius:50%;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 4px 12px rgba(15,23,42,0.04)">
              <span style="font-family:'Material Symbols Outlined';font-size:32px;color:#fff;font-variation-settings:'FILL' 1">business_center</span>
            </div>
            <h2 style="font-size:24px;font-weight:600;line-height:32px;letter-spacing:-0.01em;margin-bottom:4px;color:#0b1c30">تسجيل الدخول</h2>
            <p style="font-size:14px;line-height:20px;color:#434655">أهلاً بك في Mentora</p>
          </div>
          <div id="ilogin" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;flex-direction:column;gap:8px">
              <label style="font-size:12px;line-height:16px;letter-spacing:0.05em;font-weight:500;color:#434655">البريد الإلكتروني</label>
              <div style="position:relative;display:flex;align-items:center">
                <span style="font-family:'Material Symbols Outlined';position:absolute;right:12px;font-size:20px;color:#737686;pointer-events:none">mail</span>
                <input id="ilemail" type="email" placeholder="name@company.com" style="width:100%;background:#f8f9ff;border:1px solid #c3c6d7;border-radius:12px;padding:12px 42px 12px 14px;color:#0b1c30;font-size:14px;font-family:Inter;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,.2)'" onblur="this.style.borderColor='#c3c6d7';this.style.boxShadow='none'"/>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <label style="font-size:12px;line-height:16px;letter-spacing:0.05em;font-weight:500;color:#434655">كلمة المرور</label>
              </div>
              <div style="position:relative;display:flex;align-items:center">
                <span style="font-family:'Material Symbols Outlined';position:absolute;right:12px;font-size:20px;color:#737686;pointer-events:none">lock</span>
                <input id="ilpass" type="password" placeholder="••••••••" style="width:100%;background:#f8f9ff;border:1px solid #c3c6d7;border-radius:12px;padding:12px 42px 12px 14px;color:#0b1c30;font-size:14px;font-family:Inter;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,.2)'" onblur="this.style.borderColor='#c3c6d7';this.style.boxShadow='none'"/>
                <span style="position:absolute;left:12px;cursor:pointer;display:flex;color:#737686;font-family:'Material Symbols Outlined';font-size:20px" onclick="var i=document.getElementById('ilpass');if(i.type==='password'){i.type='text';this.textContent='visibility'}else{i.type='password';this.textContent='visibility_off'}">visibility_off</span>
              </div>
            </div>
            <div id="ilogin-error" style="color:#ba1a1a;font-size:12px;text-align:center;min-height:18px"></div>
            <button id="ilogin-btn" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff;width:100%;min-height:44px;transition:all .2s;font-family:Inter">تسجيل الدخول</button>
          </div>
          <p style="text-align:center;margin-top:16px;font-size:14px;line-height:20px;color:#434655">ليس لديك حساب؟ <a href="#" style="color:#004ac6;font-weight:500;text-decoration:none" onclick="Auth.showRegister();return false">إنشاء حساب</a></p>
        </div>
      </div>
    `;
    el('ilogin-btn').addEventListener('click', login);
    el('ilemail').addEventListener('keydown', e => { if (e.key === 'Enter') login(e); });
    el('ilpass').addEventListener('keydown', e => { if (e.key === 'Enter') login(e); });
  }

  function showRegister() {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;min-height:100vh;background:#f8f9ff;color:#0b1c30;font-family:Inter,sans-serif;direction:rtl;-webkit-font-smoothing:antialiased';
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;background:#f8f9ff;background-image:radial-gradient(#d3e4fe 1px,transparent 1px);background-size:32px 32px">
        <div style="width:100%;max-width:400px;background:#ffffff;border-radius:16px;border:1px solid #c3c6d7;padding:32px;box-shadow:0 8px 24px rgba(15,23,42,0.08);position:relative;z-index:1">
          <div style="text-align:center;margin-bottom:24px">
            <div style="width:64px;height:64px;border-radius:50%;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 4px 12px rgba(15,23,42,0.04)">
              <span style="font-family:'Material Symbols Outlined';font-size:32px;color:#fff;font-variation-settings:'FILL' 1">corporate_fare</span>
            </div>
            <h2 style="font-size:24px;font-weight:600;line-height:32px;letter-spacing:-0.01em;margin-bottom:4px;color:#0b1c30">إنشاء حساب</h2>
            <p style="font-size:14px;line-height:20px;color:#434655">انضم إلى Mentora</p>
          </div>
          <div id="ireg" style="display:flex;flex-direction:column;gap:16px">
            <div style="display:flex;flex-direction:column;gap:8px">
              <label style="font-size:12px;line-height:16px;letter-spacing:0.05em;font-weight:500;color:#434655">الاسم</label>
              <div style="position:relative;display:flex;align-items:center">
                <span style="font-family:'Material Symbols Outlined';position:absolute;right:12px;font-size:20px;color:#737686;pointer-events:none">person</span>
                <input id="irname" type="text" placeholder="الاسم الكامل" style="width:100%;background:#f8f9ff;border:1px solid #c3c6d7;border-radius:12px;padding:12px 42px 12px 14px;color:#0b1c30;font-size:14px;font-family:Inter;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,.2)'" onblur="this.style.borderColor='#c3c6d7';this.style.boxShadow='none'"/>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <label style="font-size:12px;line-height:16px;letter-spacing:0.05em;font-weight:500;color:#434655">البريد الإلكتروني</label>
              <div style="position:relative;display:flex;align-items:center">
                <span style="font-family:'Material Symbols Outlined';position:absolute;right:12px;font-size:20px;color:#737686;pointer-events:none">mail</span>
                <input id="iremail" type="email" placeholder="name@company.com" style="width:100%;background:#f8f9ff;border:1px solid #c3c6d7;border-radius:12px;padding:12px 42px 12px 14px;color:#0b1c30;font-size:14px;font-family:Inter;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,.2)'" onblur="this.style.borderColor='#c3c6d7';this.style.boxShadow='none'"/>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <label style="font-size:12px;line-height:16px;letter-spacing:0.05em;font-weight:500;color:#434655">كلمة المرور</label>
              <div style="position:relative;display:flex;align-items:center">
                <span style="font-family:'Material Symbols Outlined';position:absolute;right:12px;font-size:20px;color:#737686;pointer-events:none">lock</span>
                <input id="irpass" type="password" placeholder="••••••••" style="width:100%;background:#f8f9ff;border:1px solid #c3c6d7;border-radius:12px;padding:12px 42px 12px 14px;color:#0b1c30;font-size:14px;font-family:Inter;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='#2563eb';this.style.boxShadow='0 0 0 2px rgba(37,99,235,.2)'" onblur="this.style.borderColor='#c3c6d7';this.style.boxShadow='none'"/>
                <span style="position:absolute;left:12px;cursor:pointer;display:flex;color:#737686;font-family:'Material Symbols Outlined';font-size:20px" onclick="var i=document.getElementById('irpass');if(i.type==='password'){i.type='text';this.textContent='visibility'}else{i.type='password';this.textContent='visibility_off'}">visibility_off</span>
              </div>
            </div>
            <div id="ireg-error" style="color:#ba1a1a;font-size:12px;text-align:center;min-height:18px"></div>
            <button id="ireg-btn" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:#2563eb;color:#fff;width:100%;min-height:44px;transition:all .2s;font-family:Inter">إنشاء حساب</button>
          </div>
          <p style="text-align:center;margin-top:16px;font-size:14px;line-height:20px;color:#434655">لديك حساب؟ <a href="#" style="color:#004ac6;font-weight:500;text-decoration:none" onclick="Auth.showLogin();return false">تسجيل الدخول</a></p>
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
      console.log('✓ login token:', data.token?.substring(0,30)+'...');
      console.log('✓ login user:', data.user?.email);
      API.setToken(data.token); API.setUser(data.user);
      console.log('✓ token saved:', API.getToken()?.substring(0,30)+'...');
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
    registerNativePush(API.getToken());
    if (pendingNav) {
      Chat.openConv(pendingNav);
      pendingNav = null;
    }
  }

  async function registerNativePush(token) {
    try {
      const cap = window.Capacitor;
      if (!cap || !cap.isNative || !cap.Plugins?.PushNotifications) return;
      const PN = cap.Plugins.PushNotifications;
      const permResult = await PN.requestPermissions();
      if (permResult.receive !== 'granted') return;
      PN.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data;
        if (data?.conversationId) {
          const event = new CustomEvent('navigate-conversation', {
            detail: { conversationId: data.conversationId },
          });
          window.dispatchEvent(event);
        }
      });
      PN.addListener('registration', (pushToken) => {
        fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ token: pushToken.value, platform: 'android' }),
        }).catch(() => {});
      });
      try {
        await PN.createChannel({
          id: 'mentora-messages',
          name: 'Messages',
          description: 'New message notifications',
          importance: 4,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
        });
      } catch (e) {}
      await PN.register();
    } catch (e) {}
  }

  function logout() {
    try { PusherManager.disconnect(); } catch(e) {}
    API.setToken(null); API.setUser(null);
    showLogin();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init, showLogin, showRegister, login, register, logout };
})();
