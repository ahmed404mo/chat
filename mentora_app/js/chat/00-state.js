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
let convPoll = null;
let mentionStart = -1;
let mentionFilter = '';
let mentionSel = -1;

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

const colors = ['#2563eb','#7c3aed','#dc2626','#059669','#d97706','#0891b2','#db2777','#65a30d','#9333ea','#ca8a04'];
function userColor(id) {
  if (!id) return colors[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i);
  return colors[Math.abs(h) % colors.length];
}

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
  document.body.style.cssText = 'margin:0;height:100%;background:' + C.bg + ';color:' + C.text + ';font-family:Cairo,sans-serif;font-size:16px;direction:rtl;overflow:hidden;-webkit-user-select:none;user-select:none';
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

let backTimer = null;
try {
  const cap = window.Capacitor;
  if (cap && cap.isNative && cap.Plugins?.App) {
    cap.Plugins.App.addListener('backButton', () => {
      if (currentConv) { showChats(); }
      else if (!backTimer) {
        backTimer = setTimeout(() => backTimer = null, 2000);
        toast('اضغط مرة أخرى للخروج');
      } else {
        clearTimeout(backTimer); backTimer = null;
        cap.Plugins.App.exitApp();
      }
    });
  }
} catch(e) {}
document.addEventListener('backbutton', (e) => {
  if (currentConv) showChats();
});

window.addEventListener('navigate-conversation', (e) => {
  const convId = e.detail?.conversationId;
  if (convId) {
    if (API.getToken()) {
      setTimeout(() => openConv(convId), 100);
    } else {
      pendingNav = convId;
    }
  }
});

function setAppBadge(count) {
  try {
    if (navigator.setAppBadge) navigator.setAppBadge(count);
  } catch(e) {}
}

function clearAppBadge() {
  try {
    if (navigator.clearAppBadge) navigator.clearAppBadge();
  } catch(e) {}
}

let customEmoji = null;
let prevAudio = null;
let curAudio = null;
let curBtnId = null;
let pendingNav = null;
