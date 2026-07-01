const App = (() => {
  let toastTimeout = null;

  function init() {
    Auth.init();
  }

  // ── Screen Navigation ──
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function togglePassword(id, btn) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>`;
    } else {
      input.type = 'password';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }

  function backToChats() {
    const conv = Chat.getCurrentConversation();
    if (conv) {
      PusherManager.unsubscribe(conv.id);
    }
    showScreen('chats-screen');
    Chat.renderConversations();
  }

  // ── Show/Hide Screens ──
  function showLogin() { showScreen('login-screen'); }
  function showRegister() { showScreen('register-screen'); }

  // ── Input ──
  function onInput() {
    toggleSendBtn();
    const conv = Chat.getCurrentConversation();
    if (conv) {
      const val = document.getElementById('msg-input').value.trim();
      API.post('/chat/typing', { conversationId: conv.id, isTyping: val.length > 0 }).catch(()=>{});
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      Chat.sendMessage();
    }
  }

  function toggleSendBtn() {
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    const recordBtn = document.getElementById('record-btn');
    if (input.value.trim().length > 0) {
      sendBtn.style.display = 'flex';
      recordBtn.style.display = 'none';
    } else {
      sendBtn.style.display = 'none';
      recordBtn.style.display = 'flex';
    }
  }

  // ── Modals ──
  function showGroupInfo() { Chat.showGroupInfo(); }
  function closeGroupInfo() { document.getElementById('group-info-overlay').classList.remove('active'); }

  function showCreateChat() {
    Chat.renderUserPicker();
    document.getElementById('create-chat-overlay').classList.add('active');
  }
  function closeCreateChat() {
    document.getElementById('create-chat-overlay').classList.remove('active');
    document.getElementById('new-group-name').value = '';
  }
  function createGroup() { Chat.createGroup(); }

  function showJoinModal() { document.getElementById('join-overlay').classList.add('active'); }
  function closeJoinModal() { document.getElementById('join-overlay').classList.remove('active'); document.getElementById('join-code').value = ''; document.getElementById('join-error').textContent = ''; }
  function joinViaCode() { Chat.joinViaCode(); }

  // ── Image Preview ──
  function previewImage(url) {
    const overlay = document.createElement('div');
    overlay.id = 'image-preview-overlay';
    overlay.className = 'active';
    overlay.innerHTML = `<button class="close-btn" onclick="this.parentElement.remove()">✕</button><img src="${url}" alt=""/>`;
    document.body.appendChild(overlay);
  }

  // ── Audio Player ──
  function closeAudioPlayer() { document.getElementById('audio-player-overlay').classList.remove('active'); }

  // ── Toast ──
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('show'), 2500);
  }

  // ── Cancel Reply ──
  function cancelReply() { Chat.cancelReply(); }
  function clearFile() { Chat.clearFile(); }

  // ── Send ──
  function sendMessage() { Chat.sendMessage(); }

  // ── File ──
  function pickFile() { Chat.pickFile(); }

  // ── Record ──
  function toggleRecord() { Chat.toggleRecord(); }

  document.addEventListener('DOMContentLoaded', init);

  return {
    init, showScreen, backToChats, showLogin, showRegister,
    onInput, onKeyDown, toggleSendBtn,
    showGroupInfo, closeGroupInfo,
    showCreateChat, closeCreateChat, createGroup,
    showJoinModal, closeJoinModal, joinViaCode,
    previewImage, closeAudioPlayer,
    showToast, cancelReply, clearFile,
    sendMessage, pickFile, toggleRecord,
    togglePassword,
  };
})();
