const Chat = (() => {
  let currentConv = null;
  let messages = [];
  let replyingTo = null;
  let editingId = null;
  let selectedFiles = [];
  let fileUrls = [];
  let recording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let recTimer = null;
  let recBlobUrl = null;
  let users = [];
  let conversations = [];
  let typingTimeout = null;
  let wasTyping = false;

  const C = {
    bg: '#f8f9ff', surface: '#ffffff', card: '#eff4ff', border: '#c3c6d7',
    primary: '#2563eb', accent: '#585be6', text: '#0b1c30', muted: '#434655',
    error: '#ba1a1a', success: '#10b981',
    bubbleSelf: '#2563eb', bubbleOther: '#d3e4fe',
    onBubbleSelf: '#ffffff', onBubbleOther: '#0b1c30',
    outline: '#737686',
    surfaceLow: '#eff4ff', radius: '8px', shadowSm: '0px 4px 12px rgba(15,23,42,0.04)',
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

  function ms(icon, size, fill) {
    const s = size || 24;
    const f = fill ? "'FILL' 1" : "'FILL' 0";
    return '<span style="font-family:\'Material Symbols Outlined\';font-size:'+s+'px;line-height:1;font-variation-settings:'+f+',\'wght\' 400,\'GRAD\' 0,\'opsz\' 24;direction:ltr;display:inline-block">'+icon+'</span>';
  }

  function render(html) {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;height:100%;background:' + C.bg + ';color:' + C.text + ';font-family:Inter,sans-serif;font-size:16px;direction:rtl;overflow:hidden;-webkit-user-select:none;user-select:none';
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
      ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:16px;width:85%;max-width:340px;padding:24px;text-align:center;animation:fadeIn .2s" onclick="event.stopPropagation()">' +
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

  const I = {
    edit: ms('edit',18),
    reply: ms('reply',18),
    trash: ms('delete',18),
    info: ms('info',18),
    plus: ms('add',18),
    leave: ms('logout',18),
    close: ms('close',18),
    send: ms('send',18),
    attach: ms('attach_file',18),
    mic: ms('mic',18),
    back: ms('arrow_back',18),
    user: ms('person',18),
    camera: ms('photo_camera',18),
    play: ms('play_arrow',18),
    pause: ms('pause',18),
    stop: ms('stop',18),
    enter: ms('login',18),
    link: ms('link',18),
    invite: ms('group_add',18),
    group: ms('group',18),
    settings: ms('settings',18),
    done_all: ms('done_all',16),
    search: ms('search',20),
  };

  function toast(msg) {
    let t = el('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' + C.surface + ';color:' + C.text + ';padding:12px 20px;border-radius:12px;font-size:13px;z-index:100;opacity:1;border:1px solid ' + C.border + ';transition:opacity .3s;pointer-events:none;white-space:nowrap;box-shadow:0px 4px 12px rgba(15,23,42,0.04)';
    t.textContent = msg;
    clearTimeout(t._t);
    t._t = setTimeout(() => t.style.opacity = '0', 2500);
  }

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

  function showChats() {
    if (currentConv) try { PusherManager.unsubscribe(currentConv.id); } catch(e) {}
    currentConv = null;
    if (!navigator.onLine) showNetBar('لا يوجد اتصال بالإنترنت', C.error);
    const user = API.getUser()||{};
    const isAdmin = user.role === 'admin' || user.role === 'HR';
    render(`
      <div id="iapp" style="height:100vh;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;padding:12px 20px;background:${C.surface};border-bottom:1px solid ${C.border};min-height:56px;box-shadow:0px 4px 12px rgba(15,23,42,0.04)">
          <div style="flex:1;font-size:24px;font-weight:700;color:${C.primary}">Mentora</div>
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center" onclick="Chat.showJoinModal()" title="انضم برمز">${ms('group_add',20)}</button>
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center" onclick="Chat.showSettings()" title="الإعدادات">${ms('settings',20)}</button>
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
            const icon = a.mimeType?.startsWith('audio/') ? ms('mic',13) : a.mimeType?.startsWith('image/') ? ms('photo_camera',13) : ms('attach_file',13);
            const label = a.mimeType?.startsWith('audio/') ? 'رسالة صوتية' : a.mimeType?.startsWith('image/') ? 'صورة' : 'ملف';
            previewHtml = '<span style="display:inline-flex;align-items:center;gap:4px">' + icon + ' ' + esc(label) + '</span>';
          } else previewHtml = esc(last.content || '');
        }
        const time = last ? fmt(last.createdAt) : '';
        return '<div style="display:flex;align-items:center;padding:12px 20px;gap:12px;cursor:pointer;border-bottom:1px solid ' + C.card + '" onclick="Chat.openConv(\'' + c.id + '\')">' +
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

  async function openConv(id) {
    currentConv = conversations.find(c => c.id === id) || { id };
    const u = uid();
    const part = (currentConv.participants||[]).find(p => p.user?.id !== u);
    const title = currentConv.isGroup ? currentConv.title : part?.user?.name || currentConv.title;
    render(`
      <div id="iapp" style="height:100vh;display:flex;flex-direction:column">
        <div style="display:flex;align-items:center;padding:12px 20px;background:${C.surface};border-bottom:1px solid ${C.border};min-height:56px;gap:8px;box-shadow:0px 4px 12px rgba(15,23,42,0.04)">
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center" onclick="Chat.showChats()">${ms('arrow_back',20)}</button>
          <div style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer" onclick="Chat.showGroupInfo()">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,${C.primary},${C.accent});display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0">${(title||'G')[0].toUpperCase()}</div>
            <div>
              <div id="ctitle" style="font-size:15px;font-weight:600">${esc(title||'')}</div>
              <div id="ctyping" style="font-size:11px;color:${C.muted}"></div>
            </div>
          </div>
        </div>
        <div style="flex:1;overflow:hidden;position:relative">
          <div id="msgs" style="position:absolute;inset:0;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:4px;touch-action:pan-y">${spinner()}</div>
        </div>
        <div id="rply" style="display:none;align-items:center;gap:10px;padding:8px 20px;background:${C.card};border-bottom:1px solid ${C.border}">
          <div style="flex:1;min-width:0">
            <div id="rlabel" style="font-size:11px;color:#2563eb;font-weight:600"></div>
            <div id="rtext" style="font-size:12px;color:${C.muted};overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></div>
          </div>
          <button style="background:none;border:none;color:${C.muted};padding:4px;cursor:pointer;font-size:14px" onclick="Chat.cancelReply()">✕</button>
        </div>
        <div id="fprev" style="display:none;background:${C.surface};border-top:1px solid ${C.border};padding:8px 10px;gap:8px;overflow-x:auto">
          <div id="fpthumbs" style="display:flex;gap:6px"></div>
          <div style="display:flex;align-items:center;gap:8px">
            <div id="fpinfo" style="flex:1;min-width:0;font-size:12px;color:${C.muted}"></div>
            <button style="background:none;border:none;color:${C.muted};padding:4px;cursor:pointer;display:flex;border-radius:50%;font-size:14px" onclick="Chat.clearFile()" title="إلغاء">✕</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:${C.surface};border-top:1px solid ${C.border}">
          <button style="background:none;border:none;color:${C.muted};padding:8px;cursor:pointer;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center" onclick="Chat.pickFile()" title="إرفاق ملف">${ms('attach_file',20)}</button>
          <div id="inpwrap" style="flex:1;display:flex;align-items:center">
            <div style="flex:1;background:${C.surface};border-radius:24px;border:1px solid ${C.border};display:flex;align-items:center;padding:2px;transition:border-color .2s" onfocusin="this.style.borderColor='${C.primary}';this.style.boxShadow='0 0 0 2px rgba(37,99,235,.2)'" onfocusout="this.style.borderColor='${C.border}';this.style.boxShadow='none'">
              <textarea id="input" style="flex:1;background:none;border:none;color:${C.text};font-size:15px;font-family:Inter;padding:10px 14px;outline:none;resize:none;max-height:120px;-webkit-user-select:text;user-select:text" placeholder="اكتب رسالة..." rows="1"></textarea>
            </div>
          </div>
          <div id="recbar" style="display:none;flex:1;align-items:center;gap:10px;background:${C.surface};border-radius:24px;border:1px solid ${C.border};padding:4px 12px;height:44px">
            <div style="display:flex;align-items:center;gap:2px;height:22px;transform:scaleY(-1)">
              ${[4,8,12,6,16,10,14,5,18,9].map((h,i) => '<div style="width:3px;height:'+h+'px;border-radius:2px;background:'+C.error+';animation:recwave .6s ease-in-out infinite;animation-delay:'+(i*0.07)+'s;transform-origin:center"></div>').join('')}
            </div>
            <span id="rectimer" style="font-size:16px;font-weight:700;color:${C.text};direction:ltr;min-width:48px">0:00</span>
            <div style="flex:1"></div>
            <button style="background:none;border:none;color:${C.muted};padding:6px;cursor:pointer;border-radius:50%;display:flex" onclick="Chat.cancelRec()" title="إلغاء">${ms('delete',20)}</button>
            <button id="recstopbtn" style="background:${C.error};border:none;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(186,26,26,.4)" onclick="Chat.stopRec()" title="إيقاف">${ms('stop',18)}</button>
          </div>
          <button id="recbtn" style="background:${C.primary};border:none;color:#fff;padding:10px;border-radius:50%;cursor:pointer;display:flex;width:44px;height:44px;align-items:center;justify-content:center" onclick="Chat.toggleRecord()" title="تسجيل صوتي">${ms('mic',20)}</button>
          <button id="sendbtn" style="background:${C.primary};border:none;color:#fff;padding:10px;border-radius:50%;cursor:pointer;display:none;width:44px;height:44px;align-items:center;justify-content:center" onclick="Chat.sendMsg()" title="إرسال">${ms('send',20)}</button>
        </div>
      </div>
    `);
    const inp = el('input');
    inp.addEventListener('input', () => {
      const val = inp.value.trim();
      const hasContent = val.length > 0 || selectedFiles.length > 0;
      el('sendbtn').style.display = hasContent ? 'flex' : 'none';
      el('recbtn').style.display = hasContent ? 'none' : 'flex';
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
      if (currentConv) {
        if (val.length > 0 && !wasTyping) {
          wasTyping = true;
          API.post('/chat/typing', { conversationId: currentConv.id, action: 'typing' }).catch(()=>{});
        }
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          if (wasTyping) {
            wasTyping = false;
            API.post('/chat/typing', { conversationId: currentConv.id, action: 'stop-typing' }).catch(()=>{});
          }
        }, 1500);
      }
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } });
    loadMsgs(id);
    if (currentConv.id) try { PusherManager.subscribe(currentConv.id); } catch(e) {}
  }

  async function loadMsgs(convId, silent) {
    const list = el('msgs'); if (!list) return;
    if (!silent) list.innerHTML = spinner();
    try {
      const data = await API.get('/chat/messages?conversationId=' + convId);
      messages = (data.messages || []).map(m => ({
        ...m,
        seenBy: (m.readBy || m.seenBy || []).map(r => r.userId || r.user?.id || r),
      }));
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
      const justify = isMine ? 'justify-content:flex-start' : 'justify-content:flex-end';
      const bg = isMine ? 'background:' + C.bubbleSelf + ';border-radius:16px 16px 4px 16px' : 'background:' + C.bubbleOther + ';border-radius:16px 16px 16px 4px';
      const txtColor = isMine ? 'color:#fff' : 'color:' + C.onBubbleOther;
      const metaColor = isMine ? 'color:rgba(255,255,255,.7)' : 'color:' + C.muted;
      const senderName = (!isMine && currentConv?.isGroup && m.sender?.name) ? '<div style="font-size:11px;color:' + C.primary + ';font-weight:600;margin-bottom:2px">' + esc(m.sender.name) + '</div>' : '';
      const attHtml = renderAtts(m.attachments, isMine);
      const contHtml = m.content ? '<div style="font-size:15px;line-height:1.4;white-space:pre-wrap;word-break:break-word;' + txtColor + '">' + esc(m.content) + '</div>' : '';
      const edited = m.isEdited ? '<div style="font-size:10px;' + metaColor + ';margin-top:1px">تم التعديل</div>' : '';
      const reactHtml = m.reactions?.length ? renderReacts(m.reactions, m.id, isMine) : '';
      const status = isMine ? getStatus(m) : '';
      return '<div data-id="' + m.id + '" style="display:flex;animation:fadeIn .2s;' + justify + '">' +
        '<div style="display:flex;flex-direction:column;max-width:78%">' +
        '<div style="' + bg + ';padding:8px 12px 4px;' + txtColor + ';cursor:pointer" onclick="Chat.bubbleClick(event,\'' + m.id + '\')" oncontextmenu="Chat.showContextMenu(\'' + m.id + '\');return false">' +
          (m.repliedTo ? '<div style="background:rgba(0,0,0,.1);border-radius:8px;padding:6px 8px;margin-bottom:6px;border-right:3px solid ' + C.primary + '"><div style="font-size:11px;color:' + (isMine ? 'rgba(255,255,255,.8)' : '#2563eb') + ';font-weight:600">رد</div><div style="font-size:11px;' + txtColor + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.repliedTo.content||'') + '</div></div>' : '') +
          senderName + attHtml + contHtml + edited + reactHtml +
          '<div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:2px">' +
            '<span style="font-size:10px;' + metaColor + '">' + fmt(m.createdAt) + '</span>' +
            status +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
    }).join('');
    if (atBottom) setTimeout(() => { if (list) list.scrollTop = list.scrollHeight; }, 50);
    else list.scrollTop = sv;
    list.querySelectorAll('div[data-id]').forEach(w => {
      const b = w.firstElementChild;
      if (!b) return;
      const msgId = w.dataset.id;
      const msg = messages.find(m => m.id === msgId);
      const isMine = msg && msg.senderId === uid();
      w.style.touchAction = 'pan-y';
      let lt = 0, lp = false, startX = 0, startY = 0, swiping = false, swipeAmt = 0;
      const barSide = isMine ? 'right' : 'left';
      const barColor = isMine ? '#10b981' : '#2563eb';
      const swipeDir = isMine ? 1 : -1;
      const replyBar = document.createElement('div');
      replyBar.style.cssText = 'position:absolute;' + barSide + ':0;top:0;bottom:0;width:3px;background:' + barColor + ';border-radius:2px;opacity:0;transition:opacity .15s';
      b.style.position = 'relative';
      b.prepend(replyBar);
      function resetSwipe() {
        w.style.transform = ''; w.style.transition = '';
        replyBar.style.opacity = '0';
        swiping = false; swipeAmt = 0;
      }
      let longPressTimer = null;
      w.addEventListener('touchstart', (e) => {
        lt = Date.now(); lp = false; swiping = false; swipeAmt = 0;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        w.style.transition = 'transform .15s ease';
        const sx = startX, sy = startY;
        longPressTimer = setTimeout(() => {
          if (!swiping && !lp && Math.abs(sx - startX) < 10 && Math.abs(sy - startY) < 10) {
            showContextMenu(msgId);
          }
        }, 500);
      }, {passive:true});
      w.addEventListener('touchmove', (e) => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        const dirDx = dx * swipeDir;
        if (Math.abs(dx) > Math.abs(dy) && dirDx > 15) {
          lp = true; swiping = true;
          swipeAmt = Math.min(dirDx, 80);
          w.style.transform = 'translateX(' + (swipeAmt * swipeDir) + 'px)';
          replyBar.style.opacity = Math.min(swipeAmt / 40, 1);
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
          lp = true;
        }
      }, {passive:true});
      w.addEventListener('touchend', (e) => {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        if (swiping && swipeAmt > 30) {
          if (msgId) { e.preventDefault(); replyMsg(msgId); }
          resetSwipe();
          return;
        }
        resetSwipe();
      }, {passive:false});
      w.addEventListener('touchcancel', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } resetSwipe(); }, {passive:true});
    });
  }

  function renderAtts(atts, isMine) {
    if (!atts?.length) return '';
    const txtColor = isMine ? '#fff' : C.text;
    return atts.map(a => {
      const mime = (a.mimeType||'').toLowerCase();
      if (mime.startsWith('image/')) return '<img src="' + esc(a.url) + '" style="width:100%;border-radius:8px;cursor:pointer;max-height:200px;object-fit:cover" onclick="event.stopPropagation();Chat.previewImage(\'' + esc(a.url) + '\')"/>';
      if (mime.startsWith('audio/')) {
        const pid = 'ap_' + Math.random().toString(36).slice(2, 8);
        return '<div style="display:flex;align-items:center;gap:6px;min-width:180px;direction:ltr;padding:4px 0">' +
          '<span id="' + pid + '" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" onclick="event.stopPropagation();Chat.playAudio(\'' + pid + '\',\'' + esc(a.url) + '\')">' + ms('play_arrow',18,isMine) + '</span>' +
          '<div style="flex:1;height:24px;display:flex;align-items:center;gap:1.5px">' +
            Array.from({length:30},(_,i)=>'<div class="wf_' + pid + '" data-i="' + i + '" style="width:2.5px;height:' + (6+Math.random()*14|0) + 'px;border-radius:1.5px;background:rgba(255,255,255,.35);flex-shrink:0;transition:background .15s"></div>').join('') +
          '</div>' +
          '<span class="ac_' + pid + '" style="font-size:11px;flex-shrink:0;min-width:30px;direction:ltr;color:inherit;opacity:.8">0:00</span>' +
          '<span style="flex-shrink:0;opacity:.5;display:flex">' + ms('mic',14) + '</span>' +
        '</div>';
      }
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:' + (isMine ? 'rgba(0,0,0,.1)' : C.card) + ';border-radius:8px;margin-top:4px;cursor:pointer" onclick="event.stopPropagation();Chat.openFile(\'' + esc(a.url) + '\')"><span style="display:flex">' + ms('attach_file',16) + '</span><span style="font-size:13px;font-weight:500;' + txtColor + '">' + esc(a.fileName||'ملف') + '</span></div>';
    }).join('');
  }

  function renderReacts(reactions, msgId, isMine) {
    const u = uid();
    const map = {};
    reactions.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, mine: false };
      map[r.emoji].count++;
      if (r.user?.id === u || r.userId === u) map[r.emoji].mine = true;
    });
    const groups = Object.values(map);
    const reactBg = isMine ? 'rgba(255,255,255,.15)' : 'rgba(37,99,235,.1)';
    const reactBorder = isMine ? 'rgba(255,255,255,.3)' : 'rgba(37,99,235,.2)';
    return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:3px;margin-top:4px;padding-right:4px">' +
      groups.map(r => {
        const mine = r.mine;
        return '<div style="display:flex;align-items:center;gap:2px;background:' + (mine ? (isMine ? 'rgba(255,255,255,.25)' : 'rgba(37,99,235,.25)') : reactBg) + ';border:1px solid ' + (mine ? (isMine ? 'rgba(255,255,255,.5)' : 'rgba(37,99,235,.5)') : reactBorder) + ';border-radius:14px;padding:2px 7px;cursor:pointer;transition:transform .1s" onclick="event.stopPropagation();Chat.toggleReact(\'' + msgId + '\',\'' + r.emoji + '\')" onmouseover="this.style.transform=\'scale(1.1)\'" onmouseout="this.style.transform=\'scale(1)\'"><span style="font-size:14px">' + r.emoji + '</span><span style="font-size:11px;color:' + (mine ? C.primary : C.muted) + ';font-weight:' + (mine ? '700' : '400') + ';min-width:12px;text-align:center">' + r.count + '</span></div>'
      }).join('') +
    '</div>';
  }

  function getStatus(m) {
    const others = (currentConv?.participants?.length||2) - 1;
    const seen = m.seenBy?.length || 0;
    if (seen >= others) return '<span style="font-size:12px;color:#10b981">' + ms('done_all',14) + '</span>';
    if ((m.status === 'READ' || m.status === 'DELIVERED') && others > 0) return '<span style="font-size:12px;color:' + C.muted + '">' + ms('done_all',14) + '</span>';
    return '<span style="font-size:12px;color:' + C.muted + '">' + ms('check',14) + '</span>';
  }

  function showContextMenu(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const isMine = msg.senderId === uid();
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:60;display:block';
    ov.innerHTML = '<div style="position:absolute;inset:0;background:rgba(0,0,0,.4)" onclick="this.parentElement.remove()"></div>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;background:' + C.surface + ';border-radius:16px 16px 0 0;padding:12px 20px 24px;animation:slideUp .25s">' +
        '<div style="width:40px;height:4px;border-radius:2px;background:rgba(67,70,85,.2);margin:0 auto 10px"></div>' +
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.copyMsg(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.primary + '">' + ms('content_copy',18) + '</span> نسخ</div>' +
        (isMine ? '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.editMsg(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.primary + '">' + ms('edit',18) + '</span> تعديل</div>' : '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.replyMsg(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.primary + '">' + ms('reply',18) + '</span> رد</div>') +
        (isMine ? '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;color:' + C.error + ';transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.delMsg(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.error + '">' + ms('delete',18) + '</span> حذف</div>' : '') +
        '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.msgInfo(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.primary + '">' + ms('info',18) + '</span> معلومات</div>' +
      '</div>';
    document.body.appendChild(ov);
  }

  const emojiSections = [
    { label: 'وجوه', emojis: ['😍','🥰','😘','😊','🙂','😉','😁','😂','🤣','😭','😢','😅','😆','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫','🤔','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','🫨','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','👿','💀','☠️','👻','👽','🤖','🎃','🤡','👹','👺','😈','💩'] },
    { label: 'قلوب', emojis: ['❤️','💖','💗','💓','💕','💞','💔','❤️‍🔥','❤️‍🩹','💟','❣️','🩷','🧡','💛','💚','💙','🩵','💜','🖤','🩶','🤍','🤎','💋','💌','💘','💝'] },
    { label: 'إيماءات', emojis: ['👍','👎','👊','✊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','👋','✋','🖐️','✌️','🤞','🫰','🤟','🤘','🤙','🫵','🫂','👥','🗣️','👤','💬','💭','🗨️'] },
    { label: 'حيوانات', emojis: ['😺','😸','😹','😻','😼','😽','🙀','😿','😾','🐶','🐱','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊'] },
    { label: 'رموز', emojis: ['✨','🔥','💯','🎉','🎊','💪','🙌','👏','💣','🕳️','⭐','🌟','💫','⚡','🌈','☀️','🌙','⭐','🌟','💥','💨','🕊️','🌹','🌸','🌺','🌻','🌷','💐','🍀','🌿','☘️','🌱','🍄','🌍','🌎','🌏','🌐','🗺️','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎪','🎭','🎨','🎬','🎤','🎧','🎷','🎸','🎹','🎺','🎻','🥁','🪘','🎵','🎶','🎙️','📻','🎛️','🎚️','🎞️','📷','📸','📹','🎥','📽️','🎞️','📺','📱','☎️','📞','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗂️','📁','📂','📅','📆','📋','📌','📍','✂️','🔗','🧷','🔒','🔓','🔑','🗝️','🔔','🔕','🎵','🎶'] }
  ];
  let customEmoji = null;

  function bubbleClick(e, msgId) {
    e.stopPropagation();
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const u = uid();
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:50;display:block';
    const bubble = e.currentTarget.closest('[style*="max-width"],div[style*="flex-direction"]');
    const rect = bubble ? bubble.getBoundingClientRect() : null;
    const emojis = ['👍','❤️','😂','😮','😢','🙏'];
    let allEmojis = customEmoji ? [...emojis, customEmoji, '+'] : [...emojis, '+'];
    const emojiRow = allEmojis.map(e => {
      const existing = msg.reactions?.some(r => r.emoji === e && (r.userId === u || r.user?.id === u));
      if (e === '+') {
        return '<button style="font-size:18px;font-weight:700;background:transparent;border:none;cursor:pointer;padding:4px 7px;border-radius:10px;transition:all .1s;line-height:1;color:' + C.muted + '" onclick="event.stopPropagation();this.parentElement.parentElement.remove();Chat.showMoreEmojis(\'' + msgId + '\')" onmouseover="this.style.background=\'rgba(37,99,235,.1)\';this.style.transform=\'scale(1.15)\'" onmouseout="this.style.background=\'transparent\';this.style.transform=\'scale(1)\'">+</button>';
      }
      return '<button style="font-size:24px;background:' + (existing ? C.primary + '30' : 'transparent') + ';border:none;cursor:pointer;padding:4px 7px;border-radius:12px;transition:all .1s;line-height:1" onclick="event.stopPropagation();this.parentElement.parentElement.remove();Chat.toggleReact(\'' + msgId + '\',\'' + e + '\')" onmouseover="this.style.background=' + (existing ? "'" + C.primary + "40'" : "'rgba(37,99,235,.1)'") + ';this.style.transform=\'scale(1.15)\'" onmouseout="this.style.background=' + (existing ? "'" + C.primary + "30'" : "'transparent'") + ';this.style.transform=\'scale(1)\'">' + e + '</button>'
    }).join('');
    let leftPos = '50%';
    let topPos = '30%';
    if (rect) {
      const barW = 280;
      const half = barW / 2;
      const ctr = rect.left + rect.width / 2;
      const clamped = Math.max(8 + half, Math.min(ctr, window.innerWidth - 8 - half));
      leftPos = clamped + 'px';
      topPos = Math.max(3, rect.top - 44) + 'px';
    }
    ov.innerHTML = '<div style="position:absolute;inset:0" onclick="this.parentElement.remove()"></div>' +
      '<div style="position:absolute;left:' + leftPos + ';top:' + topPos + ';transform:translateX(-60%);display:flex;align-items:center;gap:0;background:' + C.surface + ';border:1px solid ' + C.border + ';border-radius:22px;padding:3px 5px;box-shadow:0 3px 16px rgba(0,0,0,.4);animation:fadeIn .1s;direction:ltr">' + emojiRow + '</div>';
    document.body.appendChild(ov);
  }

  function showMoreEmojis(msgId) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:70;display:block';
    const tabIcons = ['😊','❤️','👋','🐱','✨'];
    const tabHtml = '<div style="display:flex;gap:4px;padding:8px 0;flex-shrink:0;position:sticky;top:-4px;background:#ffffff;z-index:1">' +
      emojiSections.map((s,i) =>
        '<button style="flex:1;font-size:20px;background:transparent;border:none;cursor:pointer;padding:6px 0;border-radius:10px;transition:all .15s;line-height:1;color:' + C.muted + '" onclick="document.getElementById(\'esec' + i + '\').scrollIntoView({behavior:\'smooth\'})" onmouseover="this.style.background=\'rgba(37,99,235,.1)\'" onmouseout="this.style.background=\'transparent\'">' + tabIcons[i] + '</button>'
      ).join('') + '</div>';
    let sectionsHtml = emojiSections.map((s,i) =>
      '<div id="esec' + i + '" style="margin-bottom:10px">' +
        '<div style="font-size:14px;color:' + C.muted + ';font-weight:600;padding:4px 2px 6px">' + s.label + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:4px;direction:ltr">' +
          s.emojis.map(e => '<button style="font-size:34px;background:transparent;border:none;cursor:pointer;padding:4px 6px;border-radius:12px;transition:all .1s;line-height:1" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.setCustomEmoji(\'' + e + '\');Chat.toggleReact(\'' + msgId + '\',\'' + e + '\')" onmouseover="this.style.background=\'rgba(37,99,235,.1)\';this.style.transform=\'scale(1.2)\'" onmouseout="this.style.background=\'transparent\';this.style.transform=\'scale(1)\'">' + e + '</button>').join('') +
        '</div></div>'
    ).join('');
    ov.innerHTML = '<div style="position:absolute;inset:0;background:rgba(0,0,0,.5)" onclick="this.parentElement.remove()"></div>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;background:' + C.surface + ';border-radius:24px 24px 0 0;padding:4px 16px 24px;animation:slideUp .25s;max-height:75vh;overflow-y:auto">' +
        '<div style="width:40px;height:4px;border-radius:2px;background:' + C.border + ';margin:4px auto 4px;flex-shrink:0;position:sticky;top:0;z-index:2"></div>' +
        tabHtml + sectionsHtml + '</div>';
    document.body.appendChild(ov);
  }

  function setCustomEmoji(e) { customEmoji = e; }

  function copyMsg(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const text = msg.content || '';
    if (!text) { toast('لا يوجد نص للنسخ'); return; }
    navigator.clipboard.writeText(text).then(() => toast('تم النسخ')).catch(() => toast('فشل النسخ'));
  }

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

  async function delMsg(msgId) {
    if (!(await showConfirm('حذف هذه الرسالة؟'))) return;
    try {
      await API.post('/chat/messages/delete', { messageId: msgId, conversationId: currentConv?.id, forEveryone: true });
      messages = messages.filter(m => m.id !== msgId);
      renderMsgs();
    } catch (e) { toast(e.message); }
  }

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
      await loadMsgs(currentConv.id, true);
    } catch (e) { toast(e.message); }
  }

  function showReactors(emoji) {
    const users = messages.flatMap(m => (m.reactions||[]).filter(r => r.emoji === emoji)).map(r => r.user?.name || r.userId || r.userName);
    toast(emoji + ' ' + [...new Set(users)].join(', '));
  }

  function resolveUser(id) {
    const p = (currentConv?.participants||[]).find(p => (p.user?.id || p.id) === id);
    if (p) return { name: p.user?.name || p.name || id, id: p.user?.id || p.id };
    const u = users.find(u => u.id === id || u._id === id);
    if (u) return { name: u.name || u.username || id, id: u.id || u._id };
    return { name: id, id };
  }

  function msgInfo(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    let html = '<div style="padding:16px">';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="width:80px;font-size:12px;color:' + C.muted + '">الحالة</span><span style="font-size:12px;color:' + C.text + '">' + (msg.status||'SENT') + '</span></div>';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="width:80px;font-size:12px;color:' + C.muted + '">الوقت</span><span style="font-size:12px;direction:ltr;text-align:start;color:' + C.text + '">' + new Date(msg.createdAt).toLocaleString('ar-SA') + '</span></div>';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><span style="width:80px;font-size:12px;color:' + C.muted + '">المرسل</span><span style="font-size:12px;color:' + C.text + '">' + (msg.senderId === uid() ? 'أنت' : resolveUser(msg.senderId).name) + '</span></div>';
    if (msg.seenBy?.length) {
      html += '<div style="margin-top:8px;font-size:13px;font-weight:600">تمت المشاهدة (' + msg.seenBy.length + ')</div>';
      msg.seenBy.forEach(id => {
        const u = resolveUser(id);
        html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><div style="width:28px;height:28px;border-radius:50%;background:rgba(37,99,235,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + C.primary + '">' + (u.name[0]||'?').toUpperCase() + '</div><span style="font-size:13px;color:' + C.text + '">' + esc(u.name) + '</span></div>';
      });
    }
    if (msg.listenedBy?.length) {
      html += '<div style="margin-top:8px;font-size:13px;font-weight:600">تم الاستماع (' + msg.listenedBy.length + ')</div>';
      msg.listenedBy.forEach(id => {
        const u = resolveUser(id);
        html += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0"><div style="width:28px;height:28px;border-radius:50%;background:rgba(37,99,235,.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:' + C.primary + '">' + (u.name[0]||'?').toUpperCase() + '</div><span style="font-size:13px;color:' + C.text + '">' + esc(u.name) + '</span></div>';
      });
    }
    if (!msg.seenBy?.length && !msg.listenedBy?.length) html += '<div style="text-align:center;color:' + C.muted + ';padding:12px;font-size:13px">لا توجد معلومات</div>';
    html += '</div>';
    showSheet(html);
  }

  function showSheet(html) {
    const ov = document.createElement('div');
    ov.dataset.ov = '1';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:flex;align-items:flex-end;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:16px 16px 0 0;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;padding:12px 24px 24px;animation:slideUp .25s" onclick="event.stopPropagation()">' +
      '<div style="width:40px;height:4px;border-radius:2px;background:rgba(67,70,85,.2);margin:0 auto 12px"></div>' +
      html +
    '</div>';
    document.body.appendChild(ov);
  }

  async function sendMsg() {
    const input = el('input');
    if (!input || !currentConv) return;
    const content = input.value.trim();
    if (!content && !selectedFiles.length) return;
    try {
      if (editingId) {
        await API.patch('/chat/messages/edit', { messageId: editingId, content });
        const msg = messages.find(m => m.id === editingId);
        if (msg) msg.content = content;
        editingId = null; cancelReply(); input.value = ''; input.style.height = 'auto'; input.dispatchEvent(new Event('input'));
        renderMsgs();
        return;
      }
      const body = { conversationId: currentConv.id, content: content || '' };
      if (replyingTo) body.repliedToId = replyingTo.id;
      if (selectedFiles.length) {
        body.attachments = [];
        for (const f of selectedFiles) {
          const fd = new FormData();
          fd.append('file', f);
          fd.append('conversationId', currentConv.id);
          const uploadRes = await API.upload('/chat/upload', fd);
          body.attachments.push(uploadRes);
        }
        clearFile();
      }
      const res = await API.post('/chat/messages', body);
      input.value = ''; input.style.height = 'auto'; input.dispatchEvent(new Event('input'));
      replyingTo = null; cancelReply();
      if (wasTyping) { wasTyping = false; API.post('/chat/typing', { conversationId: currentConv.id, action: 'stop-typing' }).catch(()=>{}); }
      if (res?.message) { messages.push(res.message); renderMsgs(); }
      else await loadMsgs(currentConv.id);
    } catch (e) { toast(e.message); }
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + sizes[i];
  }

  function pickFile() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = true;
    inp.accept = 'image/*,.pdf,.doc,.docx,.txt';
    inp.onchange = () => {
      const files = Array.from(inp.files);
      if (!files.length) return;
      selectedFiles = selectedFiles.concat(files);
      const container = el('fpthumbs');
      container.innerHTML = '';
      let total = 0;
      selectedFiles.forEach((f, i) => {
        if (f.type.startsWith('image/')) {
          const url = URL.createObjectURL(f); fileUrls.push(url);
          const div = document.createElement('div');
          div.style.cssText = 'width:60px;height:60px;border-radius:8px;overflow:hidden;flex-shrink:0;position:relative';
          div.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover"/>' +
            '<span style="position:absolute;bottom:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;font-size:10px;padding:1px 4px;border-radius:4px">' + formatSize(f.size) + '</span>';
          container.appendChild(div);
        } else {
          const icons = { 'pdf':'picture_as_pdf','doc':'description','docx':'description','txt':'article' };
          const ext = f.name.split('.').pop()?.toLowerCase();
          const div = document.createElement('div');
          div.style.cssText = 'width:60px;height:60px;border-radius:8px;background:' + C.surfaceLow + ';flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;position:relative';
          div.innerHTML = ms(icons[ext] || 'attach_file', 18) +
            '<span style="font-size:9px;color:' + C.muted + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:56px;padding:0 2px">' + f.name.split('.').pop() + '</span>';
          container.appendChild(div);
        }
        total += f.size;
      });
      if (selectedFiles.length > 1) {
        el('fpinfo').textContent = selectedFiles.length + ' ملفات (' + formatSize(total) + ')';
      } else {
        el('fpinfo').textContent = selectedFiles[0].name + ' (' + formatSize(selectedFiles[0].size) + ')';
      }
      el('fprev').style.display = 'block';
      el('sendbtn').style.display = 'flex';
      el('recbtn').style.display = 'none';
    };
    inp.click();
  }

  let prevAudio = null;
  function playPreview() {
    if (!recBlobUrl) { toast('لا يوجد تسجيل للاستماع'); return; }
    if (prevAudio) { prevAudio.pause(); prevAudio = null; return; }
    const audio = new Audio(recBlobUrl);
    prevAudio = audio;
    audio.play();
    audio.addEventListener('ended', () => { prevAudio = null; });
  }
  function clearFile() {
    if (prevAudio) { prevAudio.pause(); prevAudio = null; }
    if (recBlobUrl) { URL.revokeObjectURL(recBlobUrl); recBlobUrl = null; }
    fileUrls.forEach(u => URL.revokeObjectURL(u)); fileUrls = [];
    selectedFiles = []; el('fprev').style.display = 'none';
    el('fpthumbs').innerHTML = ''; el('fpinfo').textContent = '';
    el('inpwrap').style.display = 'flex';
    const hasText = (el('input')?.value || '').trim().length > 0;
    el('recbtn').style.display = hasText ? 'none' : 'flex';
    el('sendbtn').style.display = hasText ? 'flex' : 'none';
  }

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
        fileUrls.forEach(u => URL.revokeObjectURL(u)); fileUrls = [];
        selectedFiles = [new File([blob], 'voice_' + Date.now() + '.webm', { type: 'audio/webm' })];
        el('fpthumbs').innerHTML = '';
        const div = document.createElement('div');
        div.style.cssText = 'width:60px;height:60px;border-radius:8px;background:' + C.surfaceLow + ';flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px';
        div.innerHTML = ms('mic', 18) + '<span style="font-size:9px;color:' + C.muted + '">صوت</span>';
        el('fpthumbs').appendChild(div);
        el('fpinfo').textContent = 'رسالة صوتية';
        el('fprev').style.display = 'block';
        el('sendbtn').style.display = 'flex';
        el('recbtn').style.display = 'none';
        el('recbar').style.display = 'none';
        el('inpwrap').style.display = 'none';
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

  let curAudio = null;
  let curBtnId = null;
  function playAudio(btnId, url) {
    const btn = el(btnId);
    if (!btn) return;
    if (curAudio && curBtnId === btnId) {
      curAudio.pause(); curAudio = null;
      btn.innerHTML = ms('play_arrow',18);
      curBtnId = null;
      return;
    }
    if (curAudio) { curAudio.pause(); curAudio = null; if (curBtnId && el(curBtnId)) el(curBtnId).innerHTML = ms('play_arrow',18); }
    const audio = new Audio(url);
    curAudio = audio; curBtnId = btnId;
    audio.play();
    btn.innerHTML = ms('pause',18);
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
      btn.innerHTML = ms('play_arrow',18);
      waves.forEach(w => { w.style.background = 'rgba(255,255,255,.35)'; });
      if (times) times.textContent = '0:00';
      curAudio = null; curBtnId = null;
    });
  }

  function openFile(url) {
    const token = API.getToken();
    const proxyUrl = API.BASE + '/chat/download?url=' + encodeURIComponent(url) + '&token=' + encodeURIComponent(token || '') + '&download=1';
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }

  function previewImage(url) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:#000;z-index:100;display:flex;flex-direction:column;opacity:0;transition:opacity .2s';
    let zoomed = false, dragY = 0, dragging = false, startY = 0;

    function close() {
      ov.style.opacity = '0';
      setTimeout(() => ov.remove(), 180);
    }

    ov.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(rgba(0,0,0,.6),transparent);position:absolute;top:0;left:0;right:0;z-index:2">' +
        '<button id="pvclose" style="background:none;border:none;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px">' + ms('arrow_back',22) + '</button>' +
        '<div style="flex:1"></div>' +
        '<a id="pvdl" href="' + url + '" download style="background:none;border:none;color:#fff;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none">' + ms('download',22) + '</a>' +
      '</div>' +
      '<div id="pvimgwrap" style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none">' +
        '<img id="pvimg" src="' + url + '" style="max-width:100%;max-height:100%;object-fit:contain;transform:scale(1);transition:transform .2s;will-change:transform"/>' +
      '</div>';

    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.style.opacity = '1');

    const img = ov.querySelector('#pvimg');
    const wrap = ov.querySelector('#pvimgwrap');

    ov.querySelector('#pvclose').onclick = (e) => { e.stopPropagation(); close(); };
    ov.querySelector('#pvdl').onclick = (e) => e.stopPropagation();

    img.onclick = (e) => {
      e.stopPropagation();
      zoomed = !zoomed;
      img.style.transform = zoomed ? 'scale(2.2)' : 'scale(1)';
    };

    wrap.addEventListener('touchstart', (e) => {
      if (zoomed) return;
      startY = e.touches[0].clientY;
      dragging = true;
      img.style.transition = 'none';
    }, {passive:true});

    wrap.addEventListener('touchmove', (e) => {
      if (!dragging || zoomed) return;
      dragY = e.touches[0].clientY - startY;
      if (dragY > 0) {
        img.style.transform = 'translateY(' + dragY + 'px) scale(' + Math.max(1 - dragY/600, 0.7) + ')';
        ov.style.opacity = Math.max(1 - dragY/300, 0.3);
      }
    }, {passive:true});

    wrap.addEventListener('touchend', () => {
      dragging = false;
      img.style.transition = 'transform .2s';
      if (dragY > 100) { close(); }
      else { img.style.transform = zoomed ? 'scale(2.2)' : 'scale(1)'; ov.style.opacity = '1'; }
      dragY = 0;
    }, {passive:true});

    ov.onclick = (e) => { if (e.target === ov || e.target === wrap) close(); };
  }

  function showGroupInfo() {
    if (!currentConv) return;
    const conv = currentConv;
    const participants = conv.participants || [];
    const isAdmin = (conv.createdById || conv.createdBy) === uid();
    const user = API.getUser()||{};
    const canManage = user.role === 'admin' || user.role === 'HR';
    let html = '<div style="text-align:center;padding:12px 0">' +
      '<div style="width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,' + C.primary + ',' + C.accent + ');display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;margin:0 auto 12px">' + (conv.title||'G')[0].toUpperCase() + '</div>' +
      '<div style="font-size:18px;font-weight:600;margin-bottom:4px">' + esc(conv.title||'') + '</div>' +
      '<div style="font-size:13px;color:' + C.muted + '">' + participants.length + ' مشارك</div>' +
    '</div>';
    if (conv.inviteCodes?.length) {
      const code = conv.inviteCodes[0].code;
      html += '<div style="text-align:center;padding:8px 0"><div style="font-size:26px;font-weight:800;letter-spacing:3px;color:' + C.primary + ';direction:ltr;cursor:pointer" onclick="navigator.clipboard.writeText(\'' + code + '\').then(()=>Chat.toast(\'تم نسخ الرمز\'))">' + code + '</div></div>';
    } else if (canManage) {
      html += '<div style="display:flex;gap:12px;margin:16px 0"><div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:' + C.card + ';border-radius:12px;cursor:pointer;font-size:11px;color:' + C.text + '" onclick="Chat.genInvite()">' + ms('link',18) + ' إنشاء رمز</div></div>';
    }
    html += '<div style="display:flex;gap:12px;margin:16px 0">' +
      (canManage ? '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:' + C.card + ';border-radius:12px;cursor:pointer;font-size:11px;color:' + C.text + '" onclick="Chat.showAddMembers()">' + ms('person_add',18) + ' إضافة عضو</div>' : '') +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:' + C.card + ';border-radius:12px;cursor:pointer;font-size:11px;color:' + C.text + '" onclick="document.querySelector(\'[style*=\\\'z-index:40\\\']\').remove()">' + ms('info',18) + ' المجموعة</div>' +
      '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:rgba(186,26,26,.1);border-radius:12px;cursor:pointer;font-size:11px;color:' + C.error + '" onclick="Chat.leaveGroup(\'' + currentConv.id + '\')">' + (isAdmin ? ms('delete',18) + ' حذف المجموعة' : ms('logout',18) + ' مغادرة') + '</div>' +
    '</div>';
    html += '<div style="padding:8px 0"><div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;margin-bottom:8px"><span>المشاركون</span><span>' + participants.length + '</span></div>';
    participants.forEach(p => {
      const name = p.user?.name || p.name || p.id || '';
      const pid = p.user?.id || p.id;
      const isSelf = pid === uid();
      html += '<div style="display:flex;align-items:center;gap:10px;padding:6px 0">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:rgba(37,99,235,.2);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:' + C.primary + ';flex-shrink:0">' + (name[0]||'?').toUpperCase() + '</div>' +
        '<div style="flex:1;font-size:14px;color:' + C.text + '">' + esc(name) + (isSelf ? ' <span style="color:' + C.muted + ';font-size:11px">(أنت)</span>' : '') + '</div>' +
        (canManage && !isSelf ? '<button style="background:none;border:none;color:' + C.error + ';padding:4px;cursor:pointer;border-radius:50%;font-size:14px" onclick="event.stopPropagation();Chat.removeMember(\'' + pid + '\')">' + ms('close',14) + '</button>' : '') +
      '</div>';
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

  async function removeMember(userId) {
    if (!currentConv) return;
    const part = (currentConv.participants||[]).find(p => (p.user?.id || p.id) === userId);
    const userName = part?.user?.name || part?.name || userId;
    if (!(await showConfirm('إزالة ' + esc(userName) + ' من المجموعة؟'))) return;
    try {
      await API.del('/chat/conversations/' + currentConv.id + '/members', { userId });
      toast('تم إزالة ' + esc(userName));
      document.querySelector('[data-ov]')?.remove();
      const data = await API.get('/chat/conversations');
      const conv = (data.conversations||[]).find(c => c.id === currentConv.id);
      if (conv) currentConv = conv;
      showGroupInfo();
    } catch (e) { toast(e.message); }
  }

  function showAddMembers() {
    document.querySelector('[data-ov]')?.remove();
    loadUsers().then(() => {
      const existing = (currentConv?.participants||[]).map(p => p.user?.id || p.id);
      const available = users.filter(u => !existing.includes(u.id));
      if (!available.length) { toast('لا يوجد أعضاء جدد للإضافة'); return; }
      let html = '<div style="display:flex;flex-direction:column;gap:12px">' +
        '<div style="font-size:16px;font-weight:600;padding:4px 0">إضافة أعضاء</div>' +
        '<div id="addmemb">' +
          available.map(u =>
            '<div data-id="' + u.id + '" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;transition:background .15s" onclick="this.classList.toggle(\'sel\');this.querySelector(\'div:first-child\').style.background=this.classList.contains(\'sel\')?\'' + C.primary + '\':\'transparent\';this.style.background=this.classList.contains(\'sel\')?\'' + C.card + '\':\'transparent\'" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="if(!this.classList.contains(\'sel\'))this.style.background=\'transparent\'">' +
              '<div style="width:20px;height:20px;border-radius:4px;border:2px solid ' + C.border + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:transparent;transition:background .15s"></div>' +
              '<div style="width:32px;height:32px;border-radius:50%;background:rgba(37,99,235,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:' + C.primary + ';flex-shrink:0">' + (u.name||u.email||'U')[0].toUpperCase() + '</div>' +
              '<span style="font-size:14px;color:' + C.text + '">' + esc(u.name||u.email||'') + '</span>' +
            '</div>'
          ).join('') +
        '</div>' +
        '<button style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%;min-height:44px;font-family:Inter" onclick="Chat.addMembers()">' + ms('person_add',18) + ' إضافة</button>' +
      '</div>';
      showSheet(html);
    });
  }

  async function addMembers() {
    const selected = document.querySelectorAll('#addmemb .sel');
    const memberIds = Array.from(selected).map(el => el.dataset?.id || el.getAttribute('data-id'));
    if (!memberIds.length) { toast('اختر عضوًا على الأقل'); return; }
    try {
      await API.post('/chat/conversations/' + currentConv.id + '/members', { userIds: memberIds });
      document.querySelector('[style*="z-index:40"]')?.remove();
      const data = await API.get('/chat/conversations');
      const conv = (data.conversations||[]).find(c => c.id === currentConv.id);
      if (conv) currentConv = conv;
      showGroupInfo();
      toast('تمت إضافة ' + memberIds.length + ' عضو');
    } catch (e) { toast(e.message); }
  }

  async function loadUsers() {
    try {
      const data = await API.get('/users');
      users = data.users || data || [];
    } catch { users = []; }
  }

  function showCreateGroup() {
    loadUsers().then(() => {
      let html = '<div style="display:flex;flex-direction:column;gap:16px">' +
        '<div><input id="grpname" placeholder="اسم المجموعة" style="width:100%;background:' + C.surface + ';border:1px solid ' + C.border + ';border-radius:12px;padding:12px 14px;color:' + C.text + ';font-size:15px;font-family:Inter;outline:none;transition:border-color .2s" onfocus="this.style.borderColor=\'' + C.primary + '\'" onblur="this.style.borderColor=\'' + C.border + '\'"/></div>' +
        '<div id="grpmembers"></div>' +
        '<button style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%;min-height:44px;font-family:Inter" onclick="Chat.createGroup()">' + ms('group_add',18) + ' إنشاء</button>' +
      '</div>';
      showSheet(html);
      renderUserPicker();
    });
  }

  function renderUserPicker() {
    const list = el('grpmembers');
    if (!list) return;
    list.innerHTML = users.map(u =>
      '<div data-id="' + u.id + '" style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;transition:background .15s" onclick="this.classList.toggle(\'sel\');this.querySelector(\'div:first-child\').style.background=this.classList.contains(\'sel\')?\'' + C.primary + '\':\'transparent\';this.style.background=this.classList.contains(\'sel\')?\'' + C.card + '\':\'transparent\'" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="if(!this.classList.contains(\'sel\'))this.style.background=\'transparent\'">' +
        '<div style="width:20px;height:20px;border-radius:4px;border:2px solid ' + C.border + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:transparent;transition:background .15s"></div>' +
        '<div style="width:32px;height:32px;border-radius:50%;background:rgba(37,99,235,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:' + C.primary + ';flex-shrink:0">' + (u.name||u.email||'U')[0].toUpperCase() + '</div>' +
        '<span style="font-size:14px;color:' + C.text + '">' + esc(u.name||u.email||'') + '</span>' +
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

  function showSettings() {
    const user = API.getUser()||{};
    const isAdmin = user.role === 'admin' || user.role === 'HR';
    const ov = document.createElement('div');
    ov.dataset.ov = '1';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:flex;align-items:flex-end;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:16px 16px 0 0;width:100%;max-width:500px;padding:12px 0 calc(12px + env(safe-area-inset-bottom,12px));animation:slideUp .25s" onclick="event.stopPropagation()">' +
      '<div style="width:40px;height:4px;border-radius:2px;background:rgba(67,70,85,.2);margin:0 auto 16px"></div>' +
      (isAdmin ? '<div style="display:flex;align-items:center;gap:14px;padding:16px 24px;cursor:pointer;transition:background .15s;border-bottom:1px solid ' + C.border + '" onclick="event.stopPropagation();this.closest(\'[data-ov]\').remove();Chat.showCreateGroup()" onmouseover="this.style.background=' + C.card + '" onmouseout="this.style.background=\'transparent\'">' +
        '<span style="display:flex;color:' + C.primary + '">' + ms('group',20) + '</span>' +
        '<span style="font-size:15px;font-weight:500;color:' + C.text + '">مجموعة جديدة</span>' +
      '</div>' : '') +
      '<div style="display:flex;align-items:center;gap:14px;padding:16px 24px;cursor:pointer;transition:background .15s;border-bottom:1px solid ' + C.border + '" onclick="event.stopPropagation();this.closest(\'[data-ov]\').remove();Chat.showProfile()" onmouseover="this.style.background=' + C.card + '" onmouseout="this.style.background=\'transparent\'">' +
        '<span style="display:flex;color:' + C.primary + '">' + ms('person',20) + '</span>' +
        '<span style="font-size:15px;font-weight:500;color:' + C.text + '">الملف الشخصي</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:14px;padding:16px 24px;cursor:pointer;transition:background .15s" onclick="event.stopPropagation();this.closest(\'[data-ov]\').remove();Chat.logout()" onmouseover="this.style.background=' + C.card + '" onmouseout="this.style.background=\'transparent\'">' +
        '<span style="display:flex;color:' + C.error + '">' + ms('logout',20) + '</span>' +
        '<span style="font-size:15px;font-weight:500;color:' + C.error + '">تسجيل الخروج</span>' +
      '</div>' +
    '</div>';
    document.body.appendChild(ov);
  }

  function showJoinModal() {
    const ov = document.createElement('div');
    ov.dataset.ov = '1';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:flex;align-items:center;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:16px;width:90%;max-width:420px;max-height:85vh;display:flex;flex-direction:column;animation:fadeIn .2s;box-shadow:0 8px 24px rgba(15,23,42,0.08)" onclick="event.stopPropagation()">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 0"><h3 style="font-size:18px;font-weight:600;color:' + C.text + '">انضم برمز الدعوة</h3><button style="background:none;border:none;color:' + C.muted + ';padding:4px;cursor:pointer;border-radius:50%;font-size:18px" onclick="event.stopPropagation();this.closest(\'[data-ov]\').remove()">✕</button></div>' +
      '<div style="padding:16px 24px;overflow-y:auto;flex:1">' +
        '<div><input id="jcode" placeholder="أدخل رمز الدعوة" style="width:100%;background:' + C.surface + ';border:1px solid ' + C.border + ';border-radius:12px;padding:12px 14px;color:' + C.text + ';font-size:15px;font-family:Inter;outline:none;transition:border-color .2s" onfocus="this.style.borderColor=\'' + C.primary + '\'" onblur="this.style.borderColor=\'' + C.border + '\'"/></div>' +
        '<div id="jerr" style="color:' + C.error + ';font-size:12px;text-align:center;min-height:18px;margin-top:8px"></div>' +
      '</div>' +
      '<div style="padding:0 24px 20px"><button style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%;min-height:44px;font-family:Inter" onclick="Chat.joinViaCode()">' + ms('login',18) + ' انضمام</button></div>' +
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

  function showProfile() {
    const user = API.getUser()||{};
    const name = user.name || user.email || '';
    const avatar = user.avatarUrl;
    const email = user.email || '';
    const role = user.role || '';
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:40;display:flex;align-items:center;justify-content:center';
    ov.onclick = () => ov.remove();
    ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:16px;width:90%;max-width:360px;padding:32px 24px;text-align:center;animation:fadeIn .2s;box-shadow:0 8px 24px rgba(15,23,42,0.08)" onclick="event.stopPropagation()">' +
      '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,' + C.primary + ',' + C.accent + ');display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;margin:0 auto 12px;overflow:hidden;position:relative;cursor:pointer" title="تغيير الصورة" onclick="Chat.changeAvatar(this)">' +
        (avatar ? '<img src="' + avatar + '" style="width:100%;height:100%;object-fit:cover"/>' : (name[0]||'U').toUpperCase()) +
        '<div style="position:absolute;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">' + ms('photo_camera',20) + '</div>' +
      '</div>' +
      '<div style="font-size:18px;font-weight:600;margin-bottom:2px;color:' + C.text + '">' + esc(name) + '</div>' +
      '<div style="font-size:13px;color:' + C.muted + ';margin-bottom:16px">' + esc(email) + (role ? ' · ' + role : '') + '</div>' +
      '<div style="display:flex;gap:12px">' +
        '<button style="flex:1;padding:10px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.card + ';color:' + C.text + ';font-family:Inter" onclick="Chat.changeAvatar()">تغيير الصورة</button>' +
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
  function onReactRemove(data) {
    if (currentConv && data.conversationId === currentConv.id) loadMsgs(currentConv.id);
  }
  function onTyping(data) {
    if (currentConv && data.conversationId === currentConv.id && data.userId !== uid()) {
      el('ctyping').textContent = data.name ? (data.name + ' يكتب...') : 'يكتب...';
    }
  }
  function onTypingStop(data) {
    if (currentConv && data.conversationId === currentConv.id) {
      el('ctyping').textContent = '';
    }
  }
  function onRead(data) {
    if (currentConv && data.conversationId === currentConv.id && data.messageIds?.length) {
      data.messageIds.forEach(id => {
        const msg = messages.find(m => m.id === id);
        if (msg) {
          if (!msg.seenBy) msg.seenBy = [];
          if (!msg.seenBy.includes(data.userId)) msg.seenBy.push(data.userId);
          if (!msg.readBy) msg.readBy = [];
          if (!msg.readBy.find(r => (r.userId || r.user?.id) === data.userId)) {
            msg.readBy.push({ userId: data.userId, user: { id: data.userId, name: data.userName }, readAt: data.readAt });
          }
        }
      });
      renderMsgs();
    }
    loadConvs();
  }

  function onMemberRemoved(data) {
    if (data.removedUserId === uid()) {
      if (currentConv && data.conversationId === currentConv.id) {
        try { PusherManager.unsubscribe(currentConv.id); } catch(e) {}
        currentConv = null; messages = [];
        showChats();
      }
      toast('تمت إزالتك من المجموعة');
    } else {
      if (currentConv && data.conversationId === currentConv.id) {
        loadMsgs(currentConv.id);
      }
      loadConvs();
    }
  }

  async function logout() {
    if (!(await showConfirm('تسجيل الخروج؟'))) return;
    try { PusherManager.disconnect(); } catch(e) {}
    API.setToken(null);
    API.setUser(null);
    currentConv = null; messages = []; replyingTo = null;
    if (typeof Auth !== 'undefined' && Auth.showLogin) Auth.showLogin();
  }

  return {
    showChats, loadConvs, openConv, loadMsgs, renderMsgs,
    sendMsg, bubbleClick, showContextMenu, showMoreEmojis, setCustomEmoji, copyMsg, toggleReact, showReactors, msgInfo,
    replyMsg, cancelReply, editMsg, delMsg,
    pickFile, clearFile, toggleRecord, stopRec, cancelRec, playAudio, playPreview, previewImage, openFile,
    showGroupInfo, genInvite, leaveGroup,
    showCreateGroup, renderUserPicker, createGroup,
    showJoinModal, joinViaCode, showSettings, showAddMembers, addMembers,
    onNewMsg, onEdit, onDel, onReact, onReactRemove, onTyping, onTypingStop, onRead, onMemberRemoved,
    logout, esc, toast, showProfile, changeAvatar, removeMember,
  };
})();
