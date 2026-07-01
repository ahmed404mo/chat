const Chat = (() => {
  let currentConv = null;
  let messages = [];
  let replyingTo = null;
  let editingId = null;
  let selectedFile = null;
  let recording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let recTimer = null;
  let recBlobUrl = null;
  let users = [];
  let conversations = [];

  const C = {
    bg: '#111827', surface: '#1f2937', card: '#374151', border: '#4b5563',
    primary: '#3b82f6', accent: '#8b5cf6', text: '#f9fafb', muted: '#9ca3af',
    error: '#ef4444', success: '#22c55e',
  };
  const uid = () => (API.getUser()||{}).id || '';

  function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function fmt(d) {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    if (Math.abs(now - date) < 86400000 && date.getDate() === now.getDate() && date.getMonth() === now.getMonth())
      return date.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
    return date.toLocaleDateString('ar-SA', { day:'numeric', month:'short' });
  }

  function fmtDur(s) {
    if (!s) return '0:00';
    const m = Math.floor(s/60); const sec = Math.floor(s%60);
    return m + ':' + sec.toString().padStart(2, '0');
  }

  function el(id) { return document.getElementById(id); }

  function render(html) {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;height:100%;background:' + C.bg + ';color:' + C.text + ';font-family:sans-serif;direction:rtl;overflow:hidden';
    document.body.innerHTML = html;
    if (!el('ispin')) {
      const s = document.createElement('style');
      s.id = 'ispin';
      s.textContent = '@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes recwave{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}';
      document.head.appendChild(s);
    }
  }

  function spinner() {
    return '<div style="display:flex;align-items:center;justify-content:center;padding:24px"><div style="width:28px;height:28px;border:3px solid ' + C.border + ';border-top-color:' + C.primary + ';border-radius:50%;animation:spin .7s linear infinite"></div></div>';
  }

  function sx(styles) {
    return Object.entries(styles).map(([k,v]) => k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + ':' + v).join(';');
  }

  function showConfirm(msg) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:60;display:flex;align-items:center;justify-content:center';
      ov.onclick = (e) => { if (e.target === ov) { ov.remove(); resolve(false); } };
      ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:20px;width:85%;max-width:340px;padding:24px;text-align:center;animation:fadeIn .2s" onclick="event.stopPropagation()">' +
        '<div style="font-size:15px;margin-bottom:20px;line-height:1.5">' + msg + '</div>' +
        '<div style="display:flex;gap:12px;justify-content:center">' +
          '<button id="cno" style="flex:1;padding:10px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.card + ';color:' + C.text + '">إلغاء</button>' +
          '<button id="cyes" style="flex:1;padding:10px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.error + ';color:#fff">تأكيد</button>' +
        '</div></div>';
      document.body.appendChild(ov);
      el('cyes').onclick = () => { ov.remove(); resolve(true); };
      el('cno').onclick = () => { ov.remove(); resolve(false); };
    });
  }

  function icon(path, size) {
    const s = size || 18;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="' + path + '"/></svg>';
  }
  const I = {
    edit: icon('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'),
    reply: icon('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
    trash: icon('M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
    info: icon('M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 16v-4M12 8h.01'),
    plus: icon('M12 5v14M5 12h14'),
    leave: icon('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
    close: icon('M18 6L6 18M6 6l12 12'),
    send: icon('M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z'),
    attach: icon('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'),
    mic: icon('M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3'),
    back: icon('M19 12H5M12 19l-7-7 7-7'),
    user: icon('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'),
    camera: icon('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'),
    play: icon('M11 5l8 7-8 7V5z'),
    pause: icon('M6 4h4v16H6zM14 4h4v16h-4z'),
    stop: icon('M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'),

    enter: icon('M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3'),
    link: icon('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
  };

  function toast(msg) {
    let t = el('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' + C.surface + ';color:' + C.text + ';padding:12px 20px;border-radius:12px;font-size:13px;z-index:100;opacity:1;border:1px solid ' + C.border + ';transition:opacity .3s;pointer-events:none;white-space:nowrap';
    t.textContent = msg;
    clearTimeout(t._t);
    t._t = setTimeout(() => t.style.opacity = '0', 2500);
  }

  // ── Network Status ──
  function showNetBar(msg, color) {
    let b = el('netbar');
    if (!b) {
      b = document.createElement('div'); b.id = 'netbar';
      if (document.body) document.body.appendChild(b);
      else { document.addEventListener('DOMContentLoaded', () => document.body.appendChild(b)); }
    }
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:' + color + ';color:#fff;text-align:center;padding:4px;font-size:12px;z-index:200;display:block;opacity:1;transition:opacity .3s';
    b.textContent = msg;
    return b;
  }
  function hideNetBar() {
    const b = el('netbar');
    if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 300); }
  }
  (function initNet() {
    window.addEventListener('online', () => { showNetBar('متصل', C.success); setTimeout(hideNetBar, 2000); });
    window.addEventListener('offline', () => showNetBar('لا يوجد اتصال بالإنترنت', C.error));
  })();

  // ── Conversations ──
  function showChats() {
    if (currentConv) try { PusherManager.unsubscribe(currentConv.id); } catch(e) {}
    currentConv = null;
    if (!navigator.onLine) showNetBar('لا يوجد اتصال بالإنترنت', C.error);
    const user = API.getUser()||{};
    const isAdmin = user.role === 'admin' || user.role === 'HR';
    render(`
      <div id="iapp" style="height:100vh;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;padding:12px 16px;background:${C.surface};border-bottom:1px solid ${C.border};min-height:56px">
          <div style="flex:1;font-size:20px;font-weight:700">Mentora</div>
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%" onclick="Chat.showJoinModal()" title="انضم برمز">${I.enter}</button>
          ${isAdmin ? '<button style="background:none;border:none;color:' + C.muted + ';padding:8px;cursor:pointer;border-radius:50%" onclick="Chat.showCreateGroup()" title="مجموعة جديدة">' + I.plus + '</button>' : ''}
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%" onclick="Chat.showProfile()" title="الملف الشخصي">${I.user}</button>
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%" onclick="Chat.logout()" title="تسجيل الخروج">${I.leave}</button>
        </div>
        <div id="clist" style="flex:1;overflow-y:auto;padding:4px 0">${spinner()}</div>
      </div>
    `);
    loadConvs();
  }

  async function loadConvs() {
    const list = el('clist'); if (!list) return;
    list.innerHTML = spinner();
    try {
      const data = await API.get('/chat/conversations');
      conversations = data.conversations || [];
      if (!conversations.length) { list.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:24px;color:' + C.muted + '">لا توجد محادثات</div>'; return; }
      const u = uid();
      list.innerHTML = conversations.map(c => {
        const part = (c.participants||[]).find(p => p.user?.id !== u);
        const title = c.isGroup ? c.title : part?.user?.name || c.title;
        const last = c.messages?.[0];
        let previewHtml = '';
        if (last) {
          if (last.attachments?.length) {
            const a = last.attachments[0];
            const icon = a.mimeType?.startsWith('audio/') ? I.mic : a.mimeType?.startsWith('image/') ? I.camera : I.attach;
            const label = a.mimeType?.startsWith('audio/') ? 'رسالة صوتية' : a.mimeType?.startsWith('image/') ? 'صورة' : 'ملف';
            previewHtml = '<span style="display:inline-flex;align-items:center;gap:4px">' + icon + ' ' + esc(label) + '</span>';
          } else previewHtml = esc(last.content || '');
        }
        const time = last ? fmt(last.createdAt) : '';
        return '<div style="display:flex;align-items:center;padding:12px 16px;gap:12px;cursor:pointer;border-bottom:1px solid ' + C.surface + '" onclick="Chat.openConv(\'' + c.id + '\')">' +
          '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,' + C.primary + ',' + C.accent + ');display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0">' + (title||'G')[0].toUpperCase() + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:15px;font-weight:600;margin-bottom:2px">' + esc(title||'غير معروف') + '</div>' +
            '<div style="font-size:13px;color:' + C.muted + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + previewHtml + '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">' +
            '<div style="font-size:11px;color:' + C.muted + '">' + time + '</div>' +
            ((c.unreadCount||0) > 0 ? '<div style="background:' + C.primary + ';color:#fff;font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600">' + c.unreadCount + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    } catch (e) {
      list.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:24px;color:' + C.error + '">' + e.message + '</div>';
    }
  }

  // ── Chat Room ──
  async function openConv(id) {
    currentConv = conversations.find(c => c.id === id) || { id };
    const u = uid();
    const part = (currentConv.participants||[]).find(p => p.user?.id !== u);
    const title = currentConv.isGroup ? currentConv.title : part?.user?.name || currentConv.title;
    render(`
      <div id="iapp" style="height:100vh;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;padding:12px 16px;background:${C.surface};border-bottom:1px solid ${C.border};min-height:56px;gap:8px">
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%" onclick="Chat.showChats()">${I.back}</button>
          <div style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer" onclick="Chat.showGroupInfo()">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,${C.primary},${C.accent});display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0">${(title||'G')[0].toUpperCase()}</div>
            <div>
              <div id="ctitle" style="font-size:15px;font-weight:600">${esc(title||'')}</div>
              <div id="ctyping" style="font-size:11px;color:${C.muted}"></div>
            </div>
          </div>
        </div>
        <div style="flex:1;overflow:hidden;position:relative">
          <div id="msgs" style="position:absolute;inset:0;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:4px">${spinner()}</div>
        </div>
        <div id="rply" style="display:none;align-items:center;gap:10px;padding:8px 16px;background:${C.card};border-bottom:1px solid ${C.border}">
          <div style="flex:1;min-width:0">
            <div id="rlabel" style="font-size:11px;color:#60a5fa;font-weight:600"></div>
            <div id="rtext" style="font-size:12px;color:${C.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
          </div>
          <button style="background:none;border:none;color:${C.muted};padding:4px;cursor:pointer" onclick="Chat.cancelReply()">✕</button>
        </div>
        <div id="fprev" style="display:none;align-items:center;gap:10px;padding:8px 16px;background:${C.card};border-bottom:1px solid ${C.border}">
          <span id="fpplay" style="display:none;width:32px;height:32px;border-radius:50%;background:${C.primary};align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#fff" onclick="Chat.playPreview()" title="استماع">${I.play}</span>
          <div style="flex:1;min-width:0">
            <div id="fplabel" style="font-size:11px;color:#60a5fa;font-weight:600"></div>
            <div id="fpname" style="font-size:12px;color:${C.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
          </div>
          <span id="fpdur" style="display:none;font-size:12px;color:${C.muted};direction:ltr"></span>
          <button style="background:none;border:none;color:${C.muted};padding:4px;cursor:pointer" onclick="Chat.clearFile()">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:${C.surface};border-top:1px solid ${C.border}">
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%" onclick="Chat.pickFile()" title="إرفاق ملف">${I.attach}</button>
          <div id="inpwrap" style="flex:1;display:flex;align-items:center">
            <div style="flex:1;background:${C.card};border-radius:24px;border:1px solid ${C.border};display:flex;align-items:center;padding:2px">
              <textarea id="input" style="flex:1;background:none;border:none;color:${C.text};font-size:15px;padding:10px 14px;outline:none;resize:none;max-height:120px;font-family:inherit" placeholder="اكتب رسالة..." rows="1"></textarea>
            </div>
          </div>
          <div id="recbar" style="display:none;flex:1;align-items:center;gap:10px;background:${C.card};border-radius:24px;border:1px solid ${C.border};padding:4px 12px;height:44px">
            <div style="display:flex;align-items:center;gap:2px;height:22px;transform:scaleY(-1)">
              ${[4,8,12,6,16,10,14,5,18,9].map((h,i) => '<div style="width:3px;height:'+h+'px;border-radius:2px;background:'+C.error+';animation:recwave .6s ease-in-out infinite;animation-delay:'+(i*0.07)+'s;transform-origin:center"></div>').join('')}
            </div>
            <span id="rectimer" style="font-size:16px;font-weight:700;color:${C.text};direction:ltr;min-width:48px">0:00</span>
            <div style="flex:1"></div>
            <button style="background:none;border:none;color:${C.muted};padding:6px;cursor:pointer;border-radius:50%;display:flex" onclick="Chat.cancelRec()" title="إلغاء">${I.trash}</button>
            <button id="recstopbtn" style="background:${C.error};border:none;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(239,68,68,.4)" onclick="Chat.stopRec()" title="إيقاف">${I.stop}</button>
          </div>
          <button id="recbtn" style="background:${C.primary};border:none;color:#fff;padding:10px;border-radius:50%;cursor:pointer;display:flex" onclick="Chat.toggleRecord()" title="تسجيل صوتي">${I.mic}</button>
          <button id="sendbtn" style="background:${C.primary};border:none;color:#fff;padding:10px;border-radius:50%;cursor:pointer;display:none" onclick="Chat.sendMsg()" title="إرسال">${I.send}</button>
        </div>
      </div>
    `);
    const inp = el('input');
    inp.addEventListener('input', () => {
      const val = inp.value.trim();
      el('sendbtn').style.display = val.length > 0 ? 'flex' : 'none';
      el('recbtn').style.display = val.length > 0 ? 'none' : 'flex';
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
      if (currentConv) API.post('/chat/typing', { conversationId: currentConv.id, isTyping: val.length > 0 }).catch(()=>{});
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
    loadMsgs(id);
    if (currentConv.id) try { PusherManager.subscribe(currentConv.id); } catch(e) {}
  }

  // ── Messages ──
  async function loadMsgs(convId) {
    const list = el('msgs'); if (!list) return;
    list.innerHTML = spinner();
    try {
      const data = await API.get('/chat/messages?conversationId=' + convId);
      messages = data.messages || [];
      renderMsgs();
    } catch (e) {
      list.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:24px;color:' + C.error + '">' + e.message + '</div>';
    }
  }

  function renderMsgs() {
    const list = el('msgs'); if (!list) return;
    const atBottom = list.scrollTop >= list.scrollHeight - list.clientHeight - 50;
    const sv = list.scrollTop;
    if (!messages.length) { list.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:24px;color:' + C.muted + '">لا توجد رسائل</div>'; return; }
    const u = uid();
    list.innerHTML = messages.map(m => {
      const isMine = m.senderId === u;
      const align = isMine ? 'align-self:flex-start' : 'align-self:flex-end';
      const bg = isMine ? 'background:rgba(59,130,246,0.2);border-radius:16px 16px 4px 16px' : 'background:rgba(55,65,81,0.6);border-radius:16px 16px 16px 4px';
      const attHtml = renderAtts(m.attachments);
      const contHtml = m.content ? '<div style="font-size:15px;line-height:1.4;white-space:pre-wrap;word-break:break-word">' + esc(m.content) + '</div>' : '';
      const edited = m.isEdited ? '<div style="font-size:10px;color:' + C.muted + ';margin-top:1px">تم التعديل</div>' : '';
      const reactHtml = m.reactions?.length ? renderReacts(m.reactions, m.id) : '';
      const status = isMine ? getStatus(m) : '';
      return '<div style="display:flex;flex-direction:column;max-width:78%;' + align + ';animation:fadeIn .2s" data-id="' + m.id + '">' +
        '<div style="' + bg + ';padding:8px 12px 4px;cursor:pointer" onclick="Chat.bubbleClick(event,\'' + m.id + '\')">' +
          (m.repliedTo ? '<div style="background:rgba(0,0,0,.2);border-radius:8px;padding:6px 8px;margin-bottom:6px;border-right:3px solid ' + C.primary + '"><div style="font-size:11px;color:#60a5fa;font-weight:600">رد</div><div style="font-size:11px;color:' + C.text + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.repliedTo.content||'') + '</div></div>' : '') +
          attHtml + contHtml + edited + reactHtml +
          '<div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:2px">' +
            '<span style="font-size:10px;color:' + (isMine ? 'rgba(96,165,250,0.7)' : C.muted) + '">' + fmt(m.createdAt) + '</span>' +
            status +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    if (atBottom) setTimeout(() => { if (list) list.scrollTop = list.scrollHeight; }, 50);
    else list.scrollTop = sv;
  }

  function renderAtts(atts) {
    if (!atts?.length) return '';
    return atts.map(a => {
      const mime = (a.mimeType||'').toLowerCase();
      if (mime.startsWith('image/')) return '<img src="' + esc(a.url) + '" style="width:100%;border-radius:8px;cursor:pointer;max-height:200px;object-fit:cover" onclick="event.stopPropagation();Chat.previewImage(\'' + esc(a.url) + '\')"/>';
      if (mime.startsWith('audio/')) {
        const pid = 'ap_' + Math.random().toString(36).slice(2, 8);
        return '<div style="display:flex;align-items:center;gap:6px;min-width:180px;direction:ltr;padding:4px 0">' +
          '<span id="' + pid + '" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" onclick="event.stopPropagation();Chat.playAudio(\'' + pid + '\',\'' + esc(a.url) + '\')">' + I.play + '</span>' +
          '<div style="flex:1;height:24px;display:flex;align-items:center;gap:1.5px">' +
            Array.from({length:30},(_,i)=>'<div class="wf_' + pid + '" data-i="' + i + '" style="width:2.5px;height:' + (6+Math.random()*14|0) + 'px;border-radius:1.5px;background:rgba(255,255,255,.35);flex-shrink:0;transition:background .15s"></div>').join('') +
          '</div>' +
          '<span class="ac_' + pid + '" style="font-size:11px;flex-shrink:0;min-width:30px;direction:ltr;color:inherit;opacity:.8">0:00</span>' +
          '<span style="flex-shrink:0;opacity:.5;display:flex">' + I.mic + '</span>' +
        '</div>';
      }
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:' + C.card + ';border-radius:8px;margin-top:4px"><span style="display:flex">' + I.attach + '</span><span style="font-size:13px;font-weight:500">' + esc(a.fileName||'ملف') + '</span></div>';
    }).join('');
  }

  function renderReacts(reactions, msgId) {
    const u = uid();
    const map = {};
    reactions.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, mine: false };
      map[r.emoji].count++;
      if (r.user?.id === u || r.userId === u) map[r.emoji].mine = true;
    });
    const groups = Object.values(map);
    return '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;padding-right:4px">' +
      groups.map(r => {
        const isMine = r.mine;
        return '<div style="display:flex;align-items:center;gap:2px;background:' + (isMine ? 'rgba(59,130,246,.25)' : 'rgba(59,130,246,.1)') + ';border:1px solid ' + (isMine ? 'rgba(96,165,250,.5)' : 'rgba(96,165,250,.2)') + ';border-radius:14px;padding:2px 7px;cursor:pointer;transition:transform .1s" onclick="event.stopPropagation();Chat.toggleReact(\'' + msgId + '\',\'' + r.emoji + '\')" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'"><span style="font-size:14px">' + r.emoji + '</span><span style="font-size:11px;color:' + (isMine ? C.primary : C.muted) + ';font-weight:' + (isMine ? '700' : '400') + ';min-width:12px;text-align:center">' + r.count + '</span></div>'
      }).join('') +
    '</div>';
  }

  function getStatus(m) {
    const others = (currentConv?.participants?.length||2) - 1;
    if (m.seenBy?.length >= others) return '<span style="font-size:12px;color:#60a5fa">✓✓</span>';
    if (m.status === 'READ' || m.status === 'DELIVERED') return '<span style="font-size:12px;color:' + C.success + '">✓✓</span>';
    return '<span style="font-size:12px;color:' + C.muted + '">✓</span>';
  }

  // ── Bubble Context Menu ──
  function bubbleClick(e, msgId) {
    e.stopPropagation();
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const isMine = msg.senderId === uid();
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:50;display:block';
    ov.innerHTML = '<div style="position:absolute;inset:0;background:rgba(0,0,0,.4)" onclick="this.parentElement.remove()"></div>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;background:' + C.surface + ';border-radius:20px 20px 0 0;padding:12px 16px 24px;animation:slideUp .25s">' +
        '<div style="width:40px;height:4px;border-radius:2px;background:rgba(156,163,175,.3);margin:0 auto 10px"></div>' +
        '<div style="display:flex;gap:4px;padding:8px 0 12px;justify-content:center;border-bottom:1px solid ' + C.border + ';margin-bottom:8px">' +
          ['👍','❤️','😂','😮','😢','🙏'].map(e => {
            const existing = msg.reactions?.some(r => r.emoji === e && (r.userId === uid() || r.user?.id === uid()));
            return '<button style="font-size:30px;background:' + (existing ? 'rgba(59,130,246,.2)' : 'transparent') + ';border:none;cursor:pointer;padding:6px 10px;border-radius:16px;transition:all .15s" onclick="event.stopPropagation();this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.toggleReact(\'' + msgId + '\',\'' + e + '\')" onmouseover="this.style.background=\'rgba(59,130,246,.15)\';this.style.transform=\'scale(1.2)\'" onmouseout="this.style.background=\'' + (existing ? 'rgba(59,130,246,.2)' : 'transparent') + '\';this.style.transform=\'scale(1)\'">' + e + '</button>'
          }).join('') +
        '</div>' +
        (isMine ? '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.editMsg(\'' + msgId + '\')"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.text + '">' + I.edit + '</span> تعديل</div>' : '') +
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.replyMsg(\'' + msgId + '\')"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.text + '">' + I.reply + '</span> رد</div>' +
        (isMine ? '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;color:' + C.error + '" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.delMsg(\'' + msgId + '\')"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.error + '">' + I.trash + '</span> حذف</div>' : '') +
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.msgInfo(\'' + msgId + '\')"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.text + '">' + I.info + '</span> معلومات</div>' +
      '</div>';
    document.body.appendChild(ov);
  }

  // ── Reply ──
  function replyMsg(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    replyingTo = msg;
    editingId = null;
    el('rlabel').textContent = 'الرد على رسالة';
    el('rtext').textContent = msg.content || (msg.attachments?.length ? 'ملف' : '');
    el('rply').style.display = 'flex';
    el('input').focus();
  }

  function cancelReply() { replyingTo = null; editingId = null; el('rply').style.display = 'none'; }

  // ── Edit ──
  function editMsg(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !msg.content) return;
    editingId = msgId;
    replyingTo = null;
    el('input').value = msg.content;
    el('rlabel').textContent = 'تعديل الرسالة';
    el('rtext').textContent = '';
    el('rply').style.display = 'flex';
    el('input').focus();
    el('input').dispatchEvent(new Event('input'));
  }

  // ── Delete ──
  async function delMsg(msgId) {
    if (!(await showConfirm('حذف هذه الرسالة؟'))) return;
    try {
      await API.post('/chat/messages/delete', { messageId: msgId, forEveryone: true });
      await loadMsgs(currentConv.id);
    } catch (e) { toast(e.message); }
  }

  // ── Reactions ──
  async function toggleReact(msgId, emoji) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const u = uid();
    const convId = currentConv?.id;
    const existing = msg.reactions?.find(r => r.emoji === emoji && (r.userId === u || r.user?.id === u));
    try {
      if (existing) {
        await API.del('/chat/messages/reaction', { messageId: msgId, emoji, conversationId: convId });
        msg.reactions = msg.reactions.filter(r => !(r.emoji === emoji && (r.userId === u || r.user?.id === u)));
      } else {
        await API.post('/chat/messages/reaction', { messageId: msgId, emoji, conversationId: convId });
        if (!msg.reactions) msg.reactions = [];
        msg.reactions.push({ emoji, userId: u, user: { id: u, name: (API.getUser()||{}).name } });
      }
      document.querySelectorAll('[style*="z-index:50"]').forEach(el => el.remove());
      renderMsgs();
    } catch (e) { toast(e.message); }
  }

  function showReactors(emoji) {
    const users = messages.flatMap(m => (m.reactions||[]).filter(r => r.emoji === emoji)).map(r => r.user?.name || r.userId || r.userName);
    toast(emoji + ' ' + [...new Set(users)].join(', '));
  }

  // ── Message Info ──
  function msgInfo(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    let html = '<div style="padding:16px">';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="width:80px;font-size:12px;color:' + C.muted + '">الحالة</span><span style="font-size:12px">' + (msg.status||'SENT') + '</span></div>';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="width:80px;font-size:12px;color:' + C.muted + '">الوقت</span><span style="font-size:12px;direction:ltr;text-align:start">' + new Date(msg.createdAt).toLocaleString('ar-SA') + '</span></div>';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="width:80px;font-size:12px;color:' + C.muted + '">المرسل</span><span style="font-size:12px">' + (msg.senderId === uid() ? 'أنت' : msg.senderId) + '</span></div>';
    if (msg.seenBy?.length) {
      html += '<div style="margin-top:8px;font-size:13px;font-weight:600">تمت المشاهدة (' + msg.seenBy.length + ')</div>';
      msg.seenBy.forEach(id => { html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><div style="width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + C.primary + '">' + (id[0]||'?') + '</div><span style="font-size:13px">' + id + '</span></div>'; });
    }
    if (msg.listenedBy?.length) {
      html += '<div style="margin-top:8px;font-size:13px;font-weight:600">تم الاستماع (' + msg.listenedBy.length + ')</div>';
      msg.listenedBy.forEach(id => { html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><div style="width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + C.primary + '">' + (id[0]||'?') + '</div><span style="font-size:13px">' + id + '</span></div>'; });
    }
    if (!msg.seenBy?.length && !msg.listenedBy?.length) html += '<div style="text-align:center;color:' + C.muted + ';padding:12px;font-size:13px">لا توجد معلومات</div>';
    html += '</div>';
    showSheet(html);
  }

  function showSheet(html) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:flex;align-items:flex-end;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:20px 20px 0 0;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;padding:12px 24px 24px;animation:slideUp .25s" onclick="event.stopPropagation()">' +
      '<div style="width:40px;height:4px;border-radius:2px;background:rgba(156,163,175,.3);margin:0 auto 12px"></div>' +
      html +
    '</div>';
    document.body.appendChild(ov);
  }

  // ── Send ──
  async function sendMsg() {
    const input = el('input');
    if (!input || !currentConv) return;
    const content = input.value.trim();
    if (!content && !selectedFile) return;
    try {
      if (editingId) {
        await API.patch('/chat/messages/edit', { messageId: editingId, content });
        editingId = null; cancelReply(); input.value = ''; input.style.height = 'auto'; input.dispatchEvent(new Event('input'));
        await loadMsgs(currentConv.id);
        return;
      }
      const body = { conversationId: currentConv.id, content: content || '' };
      if (replyingTo) body.repliedToId = replyingTo.id;
      if (selectedFile) {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('conversationId', currentConv.id);
        const uploadRes = await API.upload('/chat/upload', fd);
        body.attachments = [uploadRes];
        selectedFile = null; clearFile();
      }
      await API.post('/chat/messages', body);
      input.value = ''; input.style.height = 'auto'; input.dispatchEvent(new Event('input'));
      replyingTo = null; cancelReply();
      await loadMsgs(currentConv.id);
    } catch (e) { toast(e.message); }
  }

  // ── File Picker ──
  function pickFile() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*,.pdf,.doc,.docx,.txt';
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return;
      selectedFile = file;
      el('fplabel').innerHTML = file.type.startsWith('image/') ? I.camera : I.attach;
      el('fpname').textContent = file.name;
      el('fprev').style.display = 'flex';
    };
    inp.click();
  }

  let prevAudio = null;
  function playPreview() {
    const btn = el('fpplay');
    if (!recBlobUrl) return;
    if (prevAudio) { prevAudio.pause(); prevAudio = null; btn.innerHTML = I.play; btn.style.background = C.primary; return; }
    const audio = new Audio(recBlobUrl);
    prevAudio = audio;
    audio.play();
    btn.innerHTML = I.pause;
    btn.style.background = C.accent;
    const dur = el('fpdur');
    dur.style.display = 'block';
    audio.addEventListener('timeupdate', () => { dur.textContent = fmtDur(audio.currentTime); });
    audio.addEventListener('ended', () => { prevAudio = null; btn.innerHTML = I.play; btn.style.background = C.primary; dur.textContent = ''; });
    audio.addEventListener('loadedmetadata', () => { dur.textContent = fmtDur(audio.duration); });
  }
  function clearFile() {
    if (prevAudio) { prevAudio.pause(); prevAudio = null; }
    if (recBlobUrl) { URL.revokeObjectURL(recBlobUrl); recBlobUrl = null; }
    selectedFile = null; el('fprev').style.display = 'none';
  }

  // ── Voice Recording ──
  async function toggleRecord() {
    if (recording) { stopRec(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size) audioChunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!audioChunks.length) return;
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        if (recBlobUrl) URL.revokeObjectURL(recBlobUrl);
        recBlobUrl = URL.createObjectURL(blob);
        selectedFile = new File([blob], 'voice_' + Date.now() + '.webm', { type: 'audio/webm' });
        el('fplabel').innerHTML = I.mic;
        el('fpname').textContent = 'رسالة صوتية';
        el('fpplay').style.display = 'flex';
        el('fpplay').setAttribute('data-url', recBlobUrl);
        el('fprev').style.display = 'flex';
        el('sendbtn').style.display = 'flex';
        el('recbtn').style.display = 'none';
        el('recbar').style.display = 'none';
        el('inpwrap').style.display = 'flex';
        if (recTimer) { clearInterval(recTimer); recTimer = null; }
        recording = false;
      };
      mediaRecorder.start();
      recording = true;
      el('recbtn').style.display = 'none';
      el('sendbtn').style.display = 'none';
      el('inpwrap').style.display = 'none';
      el('recbar').style.display = 'flex';
      el('rectimer').textContent = '0:00';
      const t0 = Date.now();
      if (recTimer) clearInterval(recTimer);
      recTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - t0) / 1000);
        el('rectimer').textContent = fmtDur(sec);
      }, 200);
    } catch { toast('تعذر الوصول إلى الميكروفون'); }
  }

  function cancelRec() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    }
    audioChunks = [];
    el('recbar').style.display = 'none';
    el('inpwrap').style.display = 'flex';
    el('recbtn').style.display = 'flex';
    el('sendbtn').style.display = 'none';
    if (recTimer) { clearInterval(recTimer); recTimer = null; }
    recording = false;
  }
  function stopRec() { if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop(); }

  // ── Audio Playback ──
  let curAudio = null;
  let curBtnId = null;
  function playAudio(btnId, url) {
    const btn = el(btnId);
    if (!btn) return;
    if (curAudio && curBtnId === btnId) {
      curAudio.pause(); curAudio = null;
      btn.innerHTML = I.play;
      curBtnId = null;
      return;
    }
    if (curAudio) { curAudio.pause(); curAudio = null; if (curBtnId && el(curBtnId)) el(curBtnId).innerHTML = I.play; }
    const audio = new Audio(url);
    curAudio = audio; curBtnId = btnId;
    audio.play();
    btn.innerHTML = I.pause;
    const waves = document.querySelectorAll('.wf_' + btnId);
    const times = document.querySelector('.ac_' + btnId);
    const totalBars = waves.length;
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const pct = audio.currentTime / audio.duration;
      const active = Math.round(pct * totalBars);
      waves.forEach((w, i) => {
        w.style.background = i < active ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)';
      });
      if (times) times.textContent = fmtDur(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      btn.innerHTML = I.play;
      waves.forEach(w => { w.style.background = 'rgba(255,255,255,.35)'; });
      if (times) times.textContent = '0:00';
      curAudio = null; curBtnId = null;
    });
  }

  // ── Image Preview ──
  function previewImage(url) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:#000;z-index:100;display:flex;align-items:center;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<button style="position:absolute;top:16px;left:16px;background:rgba(0,0,0,.5);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px" onclick="event.stopPropagation();this.parentElement.remove()">✕</button><img src="' + url + '" style="max-width:100%;max-height:100%;object-fit:contain"/>';
    document.body.appendChild(ov);
  }

  // ── Group Info ──
  function showGroupInfo() {
    if (!currentConv) return;
    const conv = currentConv;
    const participants = conv.participants || [];
    const isAdmin = (conv.createdById || conv.createdBy) === uid();
    let html = '<div style="text-align:center;padding:12px 0">' +
      '<div style="width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,' + C.primary + ',' + C.accent + ');display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;margin:0 auto 12px">' + (conv.title||'G')[0].toUpperCase() + '</div>' +
      '<div style="font-size:18px;font-weight:600;margin-bottom:4px">' + esc(conv.title||'') + '</div>' +
      '<div style="font-size:13px;color:' + C.muted + '">' + participants.length + ' مشارك</div>' +
    '</div>';
    if (conv.inviteCodes?.length) {
      const code = conv.inviteCodes[0].code;
      html += '<div style="text-align:center;padding:8px 0"><div style="font-size:26px;font-weight:800;letter-spacing:3px;color:' + C.primary + ';direction:ltr;cursor:pointer" onclick="navigator.clipboard.writeText(\'' + code + '\').then(()=>Chat.toast(\'تم نسخ الرمز\'))">' + code + '</div></div>';
    } else if (isAdmin) {
      html += '<div style="display:flex;gap:12px;margin:16px 0"><div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:' + C.card + ';border-radius:12px;cursor:pointer;font-size:11px;color:' + C.text + '" onclick="Chat.genInvite()">' + I.plus + ' إنشاء رمز</div></div>';
    }
    html += '<div style="display:flex;gap:12px;margin:16px 0">' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:' + C.card + ';border-radius:12px;cursor:pointer;font-size:11px;color:' + C.text + '" onclick="document.querySelector(\'[style*=\\\'z-index:40\\\']\').remove()">' + I.info + ' المجموعة</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:rgba(239,68,68,.1);border-radius:12px;cursor:pointer;font-size:11px;color:' + C.error + '" onclick="Chat.leaveGroup(\'' + currentConv.id + '\')">' + (isAdmin ? I.trash + ' حذف المجموعة' : I.leave + ' مغادرة') + '</div>' +
    '</div>';
    html += '<div style="padding:8px 0"><div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;margin-bottom:8px"><span>المشاركون</span><span>' + participants.length + '</span></div>';
    participants.forEach(p => {
      const name = p.user?.name || p.name || p.id || '';
      html += '<div style="display:flex;align-items:center;gap:10px;padding:6px 0"><div style="width:36px;height:36px;border-radius:50%;background:rgba(59,130,246,.2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:' + C.primary + ';flex-shrink:0">' + (name[0]||'?').toUpperCase() + '</div><div style="font-size:14px">' + esc(name) + '</div></div>';
    });
    html += '</div>';
    showSheet(html);
  }

  async function genInvite() {
    try {
      const data = await API.post('/chat/invite', { conversationId: currentConv.id });
      const code = data.invite?.code || data.code || data.inviteCode;
      toast('رمز الدعوة: ' + code);
      document.querySelector('[style*="z-index:40"]')?.remove();
    } catch (e) { toast(e.message); }
  }

  async function leaveGroup(convId) {
    if (!(await showConfirm('تأكيد?'))) return;
    try {
      await API.del('/chat/conversations/' + convId);
      try { PusherManager.unsubscribe(convId); } catch(e) {}
      showChats();
      loadConvs();
    } catch (e) { toast(e.message); }
  }

  // ── Create Group ──
  async function loadUsers() {
    try {
      const data = await API.get('/users');
      users = data.users || data || [];
    } catch { users = []; }
  }

  function showCreateGroup() {
    loadUsers().then(() => {
      let html = '<div style="display:flex;flex-direction:column;gap:16px">' +
        '<div><input id="grpname" placeholder="اسم المجموعة" style="width:100%;background:' + C.card + ';border:1px solid ' + C.border + ';border-radius:12px;padding:12px 14px;color:' + C.text + ';font-size:15px;outline:none"/></div>' +
        '<div id="grpmembers"></div>' +
        '<button style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%" onclick="Chat.createGroup()">إنشاء</button>' +
      '</div>';
      showSheet(html);
      renderUserPicker();
    });
  }

  function renderUserPicker() {
    const list = el('grpmembers');
    if (!list) return;
    list.innerHTML = users.map(u =>
      '<div data-id="' + u.id + '" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer" onclick="this.classList.toggle(\'sel\');this.querySelector(\'div:first-child\').style.background=this.classList.contains(\'sel\')?\'#3b82f6\':\'transparent\'">' +
        '<div style="width:20px;height:20px;border-radius:4px;border:2px solid ' + C.border + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:transparent"></div>' +
        '<div style="width:32px;height:32px;border-radius:50%;background:rgba(59,130,246,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:' + C.primary + ';flex-shrink:0">' + (u.name||u.email||'U')[0].toUpperCase() + '</div>' +
        '<span style="font-size:14px">' + esc(u.name||u.email||'') + '</span>' +
      '</div>'
    ).join('');
  }

  async function createGroup() {
    const title = el('grpname')?.value.trim();
    const selected = document.querySelectorAll('#grpmembers .sel');
    const memberIds = Array.from(selected).map(el => el.dataset?.id || el.getAttribute('data-id'));
    if (!title) { toast('أدخل اسم المجموعة'); return; }
    try {
      await API.post('/chat/conversations', { title, isGroup: true, participantIds: memberIds });
      document.querySelector('[style*="z-index:40"]')?.remove();
      showChats();
      loadConvs();
      toast('تم إنشاء المجموعة');
    } catch (e) { toast(e.message); }
  }

  // ── Join via Code ──
  function showJoinModal() {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:flex;align-items:center;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:20px;width:90%;max-width:420px;max-height:85vh;display:flex;flex-direction:column;animation:fadeIn .2s" onclick="event.stopPropagation()">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 0"><h3 style="font-size:18px;font-weight:600">انضم برمز الدعوة</h3><button style="background:none;border:none;color:' + C.muted + ';padding:4px;cursor:pointer;border-radius:50%" onclick="this.closest(\'[style*=\\\'z-index:40\\\']\').remove()">✕</button></div>' +
      '<div style="padding:16px 24px;overflow-y:auto;flex:1">' +
        '<div><input id="jcode" placeholder="أدخل رمز الدعوة" style="width:100%;background:' + C.card + ';border:1px solid ' + C.border + ';border-radius:12px;padding:12px 14px;color:' + C.text + ';font-size:15px;outline:none"/></div>' +
        '<div id="jerr" style="color:' + C.error + ';font-size:12px;text-align:center;min-height:18px;margin-top:8px"></div>' +
      '</div>' +
      '<div style="padding:0 24px 20px"><button style="display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%" onclick="Chat.joinViaCode()">انضمام</button></div>' +
    '</div>';
    document.body.appendChild(ov);
  }

  async function joinViaCode() {
    const code = el('jcode')?.value.trim();
    const errEl = el('jerr');
    if (!code) { if (errEl) errEl.textContent = 'أدخل رمز الدعوة'; return; }
    try {
      await API.post('/chat/invite/join', { code });
      document.querySelector('[style*="z-index:40"]')?.remove();
      showChats();
      loadConvs();
    } catch (e) { if (errEl) errEl.textContent = e.message; }
  }

  // ── Profile ──
  function showProfile() {
    const user = API.getUser()||{};
    const name = user.name || user.email || '';
    const avatar = user.avatarUrl;
    const email = user.email || '';
    const role = user.role || '';
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:flex;align-items:center;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:20px;width:90%;max-width:360px;padding:32px 24px;text-align:center;animation:fadeIn .2s" onclick="event.stopPropagation()">' +
      '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,' + C.primary + ',' + C.accent + ');display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;margin:0 auto 12px;overflow:hidden;position:relative;cursor:pointer" title="تغيير الصورة" onclick="Chat.changeAvatar(this)">' +
        (avatar ? '<img src="' + avatar + '" style="width:100%;height:100%;object-fit:cover"/>' : (name[0]||'U').toUpperCase()) +
        '<div style="position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">' + I.camera + '</div>' +
      '</div>' +
      '<div style="font-size:18px;font-weight:600;margin-bottom:2px">' + esc(name) + '</div>' +
      '<div style="font-size:13px;color:' + C.muted + ';margin-bottom:16px">' + esc(email) + (role ? ' · ' + role : '') + '</div>' +
      '<div style="display:flex;gap:12px">' +
        '<button style="flex:1;padding:10px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.card + ';color:' + C.text + '" onclick="Chat.changeAvatar()">تغيير الصورة</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(ov);
  }

  async function changeAvatar(imgEl) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const form = new FormData();
      form.append('file', file);
      try {
        const data = await API.upload('/users/me/avatar', form);
        const url = data.url || data.avatarUrl;
        if (url) {
          const u = API.getUser();
          u.avatarUrl = url;
          API.setUser(u);
          if (imgEl) {
            imgEl.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover"/>';
          }
          toast('تم تحديث الصورة');
        }
      } catch (e) { toast(e.message); }
    };
    input.click();
  }

  // ── Pusher Handlers ──
  function onNewMsg(data) {
    if (currentConv && data.conversationId === currentConv.id) loadMsgs(currentConv.id);
    loadConvs();
  }
  function onEdit(data) {
    if (currentConv && data.conversationId === currentConv.id) loadMsgs(currentConv.id);
  }
  function onDel(data) {
    if (currentConv && data.conversationId === currentConv.id) loadMsgs(currentConv.id);
  }
  function onReact(data) {
    if (currentConv && data.conversationId === currentConv.id) loadMsgs(currentConv.id);
  }
  function onTyping(data) {
    if (currentConv && data.conversationId === currentConv.id && data.userId !== uid()) {
      el('ctyping').textContent = data.isTyping ? 'يكتب...' : '';
    }
  }
  function onRead(data) {
    if (currentConv && data.conversationId === currentConv.id) loadMsgs(currentConv.id);
    loadConvs();
  }

  // ── Logout ──
  function logout() {
    try { PusherManager.disconnect(); } catch(e) {}
    API.setToken(null);
    API.setUser(null);
    currentConv = null; messages = []; replyingTo = null;
    // Call auth's showLogin
    if (typeof Auth !== 'undefined' && Auth.showLogin) Auth.showLogin();
  }

  return {
    showChats, loadConvs, openConv, loadMsgs, renderMsgs,
    sendMsg, bubbleClick, toggleReact, showReactors, msgInfo,
    replyMsg, cancelReply, editMsg, delMsg,
    pickFile, clearFile, toggleRecord, stopRec, cancelRec, playAudio, playPreview, previewImage,
    showGroupInfo, genInvite, leaveGroup,
    showCreateGroup, renderUserPicker, createGroup,
    showJoinModal, joinViaCode,
    onNewMsg, onEdit, onDel, onReact, onTyping, onRead,
    logout, esc, toast, showProfile, changeAvatar,
  };
})();
