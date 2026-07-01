const Chat = (() => {
  let conversations = [];
  let messages = [];
  let currentConversation = null;
  let replyingTo = null;
  let editingId = null;
  let selectedFile = null;
  let recording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let users = [];
  const userId = () => (API.getUser() || {})._id || '';

  // ── Conversations ──
  async function loadConversations() {
    const list = document.getElementById('chats-list');
    list.innerHTML = '<div class="loading-indicator"><div class="spinner"></div></div>';
    try {
      const data = await API.get('/chat/conversations');
      conversations = data.conversations || [];
      renderConversations();
    } catch (e) {
      list.innerHTML = `<div class="loading-indicator" style="color:var(--text-muted)">${e.message}</div>`;
    }
  }

  function renderConversations() {
    const list = document.getElementById('chats-list');
    if (!conversations.length) {
      list.innerHTML = '<div class="loading-indicator" style="color:var(--text-muted)">لا توجد محادثات</div>';
      return;
    }
    const uid = userId();
    list.innerHTML = conversations.map(c => {
      const title = c.isGroup ? c.title : (c.participants||[]).find(p => p.id !== uid)?.name || c.title;
      const last = c.lastMessage;
      let preview = '';
      if (last) {
        if (last.attachments?.length) {
          const a = last.attachments[0];
          preview = a.isAudio ? '🎤 رسالة صوتية' : a.isImage ? '🖼️ صورة' : '📎 ملف';
        } else {
          preview = last.content || '';
        }
      }
      const time = last ? formatTime(last.createdAt) : '';
      return `<div class="chat-item" onclick="Chat.openConversation('${c.id}')">
        <div class="chat-item-avatar">${(title||'G')[0].toUpperCase()}</div>
        <div class="chat-item-body">
          <div class="chat-item-name">${esc(title||'غير معروف')}</div>
          <div class="chat-item-preview">${esc(preview)}</div>
        </div>
        <div class="chat-item-meta">
          <div class="chat-item-time">${time}</div>
          ${(c.unreadCount||0) > 0 ? `<div class="chat-item-badge">${c.unreadCount}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // ── Open Conversation ──
  async function openConversation(id) {
    currentConversation = conversations.find(c => c.id === id) || { id };
    App.showScreen('chat-screen');
    const uid = userId();
    const title = currentConversation.isGroup
      ? currentConversation.title
      : (currentConversation.participants||[]).find(p => p.id !== uid)?.name || currentConversation.title;
    document.querySelector('#chat-title').textContent = title || 'المجموعة';
    document.getElementById('chat-avatar').textContent = (title||'G')[0].toUpperCase();
    document.getElementById('chat-typing').textContent = '';
    document.getElementById('reply-preview').style.display = 'none';
    replyingTo = null;
    editingId = null;
    document.getElementById('msg-input').value = '';
    App.toggleSendBtn();
    PusherManager.subscribe(id);
    await loadMessages(id);
  }

  // ── Messages ──
  async function loadMessages(conversationId) {
    const list = document.getElementById('messages-list');
    list.innerHTML = '<div class="loading-indicator"><div class="spinner"></div></div>';
    try {
      const data = await API.get(`/chat/messages?conversationId=${conversationId}`);
      messages = data.messages || [];
      renderMessages();
    } catch (e) {
      list.innerHTML = `<div class="loading-indicator" style="color:var(--text-muted)">${e.message}</div>`;
    }
  }

  function renderMessages() {
    const list = document.getElementById('messages-list');
    if (!messages.length) {
      list.innerHTML = '<div class="loading-indicator" style="color:var(--text-muted)">لا توجد رسائل</div>';
      return;
    }
    const uid = userId();
    let html = '';
    messages.forEach(m => {
      const isMine = m.senderId === uid;
      const groupClass = isMine ? 'mine' : 'other';
      const reactionsHtml = m.reactions?.length
        ? `<div class="message-reactions">${groupReactions(m.reactions).map(r =>
            `<div class="reaction-badge" onclick="Chat.showReactors('${m.id}','${r.emoji}')">
              <span>${r.emoji}</span><span class="count">${r.count}</span>
            </div>`).join('')}</div>`
        : '';
      const statusColor = isMine ? getStatusColor(m) : '';
      const statusIcon = isMine ? getStatusIcon(m) : '';
      html += `<div class="message-group ${groupClass}" data-id="${m.id}" data-sender="${m.senderId}">
        <div class="message-bubble" onclick="Chat.onBubbleClick(event,'${m.id}')">
          ${m.repliedTo ? `<div class="reply-banner">
            <div class="reply-banner-name">${esc(m.repliedTo.senderId === uid ? 'أنت' : '')}</div>
            <div class="reply-banner-text">${esc(m.repliedTo.content||'')}</div>
          </div>` : ''}
          ${renderAttachments(m.attachments)}
          ${m.content ? `<div class="message-text">${esc(m.content)}</div>` : ''}
          ${m.isEdited ? '<div class="message-edited">تم التعديل</div>' : ''}
          ${reactionsHtml}
          <div class="message-footer">
            <span class="message-time">${formatTime(m.createdAt)}</span>
            ${statusIcon ? `<span class="message-status ${statusColor}">${statusIcon}</span>` : ''}
          </div>
        </div>
      </div>`;
    });
    list.innerHTML = html;
    setTimeout(() => list.scrollTop = list.scrollHeight, 50);
  }

  function renderAttachments(attachments) {
    if (!attachments?.length) return '';
    return attachments.map(a => {
      if (a.isImage) return `<img class="attachment-img" src="${esc(a.url)}" onclick="event.stopPropagation();App.previewImage('${esc(a.url)}')"/>`;
      if (a.isAudio) {
        return `<div class="audio-attachment">
          <span class="audio-play-btn" onclick="event.stopPropagation();Chat.playAudio(this,'${esc(a.url)}')">▶</span>
          <div class="audio-progress"><div class="audio-progress-bar"><div class="audio-progress-fill" style="width:0%"></div></div>
          <div class="audio-times"><span>0:00</span><span>${formatDuration(a.duration||0)}</span></div></div>
        </div>`;
      }
      return `<div class="attachment-file"><span class="attachment-file-icon">📎</span><span class="attachment-file-name">${esc(a.fileName||'ملف')}</span></div>`;
    }).join('');
  }

  function groupReactions(reactions) {
    const map = {};
    reactions.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      map[r.emoji].count++;
      map[r.emoji].users.push(r.userId);
    });
    return Object.values(map);
  }

  function getStatusColor(m) {
    if (m.seenBy?.length >= ((currentConversation?.participants?.length||2)-1)) return 'all-read';
    if (m.status === 'READ' || m.status === 'DELIVERED') return 'delivered';
    return 'sent';
  }

  function getStatusIcon(m) {
    if (m.seenBy?.length >= ((currentConversation?.participants?.length||2)-1)) return '✓✓';
    if (m.status === 'READ' || m.status === 'DELIVERED') return '✓✓';
    return '✓';
  }

  // ── Send Message ──
  async function sendMessage() {
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content && !selectedFile) return;
    if (!currentConversation) return;
    try {
      if (editingId) {
        await API.patch('/chat/messages/edit', { messageId: editingId, content });
        editingId = null;
        document.getElementById('reply-preview').style.display = 'none';
        input.value = '';
        App.toggleSendBtn();
        await loadMessages(currentConversation.id);
        return;
      }
      const body = { conversationId: currentConversation.id, content: content || '' };
      if (replyingTo) body.repliedToId = replyingTo.id;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await API.upload('/chat/upload', formData);
        body.attachments = [uploadRes];
        selectedFile = null;
        document.getElementById('file-preview').style.display = 'none';
      }
      await API.post('/chat/messages', body);
      input.value = '';
      App.toggleSendBtn();
      replyingTo = null;
      document.getElementById('reply-preview').style.display = 'none';
      await loadMessages(currentConversation.id);
    } catch (e) {
      App.showToast(e.message);
    }
  }

  // ── Bubble Click (Context Menu) ──
  function onBubbleClick(e, msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const isMine = msg.senderId === userId();
    const overlay = document.createElement('div');
    overlay.className = 'context-menu active';
    overlay.innerHTML = `<div class="context-overlay" onclick="this.parentElement.remove()"></div>
      <div class="context-sheet">
        <div class="context-handle"></div>
        ${isMine ? `<div class="context-item" data-action="edit"><span class="context-item-icon">✏️</span> تعديل</div>` : ''}
        <div class="context-item" data-action="reply"><span class="context-item-icon">↩️</span> رد</div>
        ${isMine ? `<div class="context-item" data-action="delete" style="color:var(--error)"><span class="context-item-icon">🗑️</span> حذف</div>` : ''}
        <div class="context-item" data-action="info"><span class="context-item-icon">ℹ️</span> معلومات</div>
        <div class="reaction-picker">
          ${['👍','❤️','😂','😮','😢','🙏'].map(e => `<button onclick="Chat.toggleReaction('${msgId}','${e}')">${e}</button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.context-item').forEach(el => {
      el.addEventListener('click', () => {
        overlay.remove();
        if (el.dataset.action === 'reply') startReply(msgId);
        if (el.dataset.action === 'edit') startEdit(msgId);
        if (el.dataset.action === 'delete') deleteMessage(msgId);
        if (el.dataset.action === 'info') showMessageInfo(msgId);
      });
    });
  }

  // ── Reply ──
  function startReply(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    replyingTo = msg;
    document.getElementById('reply-label').textContent = 'الرد على رسالة';
    document.getElementById('reply-text').textContent = msg.content || (msg.attachments?.length ? '📎' : '');
    document.getElementById('reply-preview').style.display = 'flex';
    document.getElementById('msg-input').focus();
  }

  function cancelReply() {
    replyingTo = null;
    document.getElementById('reply-preview').style.display = 'none';
  }

  // ── Edit ──
  function startEdit(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !msg.content) return;
    editingId = msgId;
    document.getElementById('msg-input').value = msg.content;
    document.getElementById('reply-label').textContent = 'تعديل الرسالة';
    document.getElementById('reply-text').textContent = '';
    document.getElementById('reply-preview').style.display = 'flex';
    document.getElementById('msg-input').focus();
    App.toggleSendBtn();
  }

  // ── Delete ──
  async function deleteMessage(msgId) {
    if (!confirm('حذف هذه الرسالة؟')) return;
    try {
      await API.post('/chat/messages/delete', { messageId: msgId, forEveryone: true });
      await loadMessages(currentConversation.id);
    } catch (e) {
      App.showToast(e.message);
    }
  }

  // ── Reactions ──
  async function toggleReaction(msgId, emoji) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const uid = userId();
    const existing = msg.reactions?.find(r => r.emoji === emoji && r.userId === uid);
    try {
      if (existing) {
        await API.del('/chat/messages/reaction', { messageId: msgId, emoji });
      } else {
        await API.post('/chat/messages/reaction', { messageId: msgId, emoji });
      }
      const data = await API.get(`/chat/messages?conversationId=${currentConversation.id}`);
      messages = data.messages || [];
      renderMessages();
    } catch (e) {
      App.showToast(e.message);
    }
    document.querySelector('.context-menu.active')?.remove();
  }

  function showReactors(msgId, emoji) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const users = msg.reactions?.filter(r => r.emoji === emoji).map(r => r.userName || r.userId) || [];
    App.showToast(`${emoji} ${users.join(', ')}`);
  }

  // ── Message Info ──
  function showMessageInfo(msgId) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    let html = `<div class="msg-info-row"><span class="msg-info-label">الحالة</span><span class="msg-info-value">${msg.status||'SENT'}</span></div>`;
    html += `<div class="msg-info-row"><span class="msg-info-label">الوقت</span><span class="msg-info-value">${new Date(msg.createdAt).toLocaleString('ar-SA')}</span></div>`;
    html += `<div class="msg-info-row"><span class="msg-info-label">المرسل</span><span class="msg-info-value">${msg.senderId === userId() ? 'أنت' : msg.senderId}</span></div>`;
    if (msg.seenBy?.length) {
      html += `<div style="margin-top:8px;font-size:13px;font-weight:600">تمت المشاهدة (${msg.seenBy.length})</div>`;
      msg.seenBy.forEach(id => {
        html += `<div class="user-list-item"><div class="user-list-avatar">${id[0]}</div><div class="user-list-name">${id}</div></div>`;
      });
    }
    if (msg.listenedBy?.length) {
      html += `<div style="margin-top:8px;font-size:13px;font-weight:600">تم الاستماع (${msg.listenedBy.length})</div>`;
      msg.listenedBy.forEach(id => {
        html += `<div class="user-list-item"><div class="user-list-avatar">${id[0]}</div><div class="user-list-name">${id}</div></div>`;
      });
    }
    if (!msg.seenBy?.length && !msg.listenedBy?.length) {
      html += `<div style="text-align:center;color:var(--text-muted);padding:12px;font-size:13px">لا توجد معلومات</div>`;
    }
    document.getElementById('group-info-content').innerHTML = html;
    document.getElementById('group-info-overlay').classList.add('active');
  }

  // ── Audio Playback ──
  let currentAudio = null;
  function playAudio(btn, url) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    const audio = new Audio(url);
    currentAudio = audio;
    audio.play();
    const fill = btn.parentElement.querySelector('.audio-progress-fill');
    const times = btn.parentElement.querySelector('.audio-times');
    audio.addEventListener('timeupdate', () => {
      if (fill) fill.style.width = `${(audio.currentTime/audio.duration)*100}%`;
      if (times) times.children[0].textContent = formatDuration(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      btn.textContent = '▶';
      if (fill) fill.style.width = '0%';
      if (times) times.children[0].textContent = '0:00';
    });
    btn.textContent = '⏸';
  }

  // ── Voice Recording ──
  async function toggleRecord() {
    if (recording) { stopRecording(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size) audioChunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (!audioChunks.length) return;
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        selectedFile = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        document.getElementById('file-preview-icon').textContent = '🎤';
        document.getElementById('file-preview-name').textContent = 'رسالة صوتية';
        document.getElementById('file-preview').style.display = 'flex';
        recording = false;
        document.getElementById('record-btn').innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v3"/></svg>`;
      };
      mediaRecorder.start();
      recording = true;
      document.getElementById('record-btn').innerHTML = '<span style="color:var(--error);font-size:12px">⬤ تسجيل</span>';
    } catch { App.showToast('تعذر الوصول إلى الميكروفون'); }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  }

  // ── File Picker ──
  function pickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.txt';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      selectedFile = file;
      document.getElementById('file-preview-icon').textContent = file.type.startsWith('image/') ? '🖼️' : '📎';
      document.getElementById('file-preview-name').textContent = file.name;
      document.getElementById('file-preview').style.display = 'flex';
    };
    input.click();
  }

  function clearFile() {
    selectedFile = null;
    document.getElementById('file-preview').style.display = 'none';
  }

  // ── Group Info ──
  async function showGroupInfo() {
    if (!currentConversation) return;
    try {
      const data = await API.get(`/chat/conversations/${currentConversation.id}`);
      const conv = data.conversation || data;
      const participants = conv.participants || [];
      const uid = userId();
      const isAdmin = conv.createdBy === uid;
      let html = `<div class="group-info-header">
        <div class="group-info-avatar">${(conv.title||'G')[0].toUpperCase()}</div>
        <div class="group-info-name">${esc(conv.title||'')}</div>
        <div class="group-info-count">${participants.length} مشارك</div>
      </div>`;
      // Invite code
      if (conv.inviteCodes?.length) {
        const code = conv.inviteCodes[0].code;
        html += `<div class="invite-code-display">
          <div class="code" onclick="Chat.copyCode('${esc(code)}')">${code}</div>
          <div class="copied"></div>
        </div>`;
      } else if (isAdmin) {
        html += `<div class="group-actions"><div class="group-action" onclick="Chat.generateInvite()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          <span>إنشاء رمز دعوة</span>
        </div></div>`;
      }
      html += `<div class="group-actions">
        <div class="group-action" onclick="App.closeGroupInfo()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
          <span>المجموعة</span>
        </div>
        <div class="group-action ${isAdmin?'danger':''}" onclick="Chat.leaveGroup('${conv.id}')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          <span>${isAdmin ? 'حذف المجموعة' : 'مغادرة'}</span>
        </div>
      </div>`;
      html += `<div class="group-members-section">
        <div class="group-members-header"><span>المشاركون</span><span>${participants.length}</span></div>`;
      participants.forEach(p => {
        const name = p.name || p.email || p.id || '';
        html += `<div class="group-member">
          <div class="group-member-avatar">${name[0]?.toUpperCase()||'?'}</div>
          <div class="group-member-name">${esc(name)}</div>
        </div>`;
      });
      html += `</div>`;
      document.getElementById('group-info-content').innerHTML = html;
      document.getElementById('group-info-overlay').classList.add('active');
    } catch (e) {
      App.showToast(e.message);
    }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      document.querySelector('.invite-code-display .copied').textContent = 'تم النسخ!';
    });
  }

  async function generateInvite() {
    try {
      const data = await API.post('/chat/invite', { conversationId: currentConversation.id });
      const code = data.code || data.inviteCode;
      App.showToast(`رمز الدعوة: ${code}`);
      showGroupInfo();
    } catch (e) { App.showToast(e.message); }
  }

  async function leaveGroup(convId) {
    if (!confirm('تأكيد?')) return;
    try {
      await API.del(`/chat/conversations/${convId}`);
      PusherManager.unsubscribe(convId);
      App.backToChats();
      loadConversations();
    } catch (e) { App.showToast(e.message); }
  }

  // ── Create Group ──
  async function loadUsers() {
    try {
      const data = await API.get('/chat/users');
      users = data.users || data || [];
    } catch { users = []; }
  }

  function renderUserPicker() {
    const list = document.getElementById('members-list');
    if (!users.length) {
      loadUsers().then(renderUserPicker);
      return;
    }
    list.innerHTML = users.map(u =>
      `<div class="member-pick-item" data-id="${u.id}" onclick="Chat.toggleMember(this)">
        <div class="member-pick-checkbox"></div>
        <div class="member-pick-avatar">${(u.name||u.email||'U')[0].toUpperCase()}</div>
        <div class="member-pick-name">${esc(u.name||u.email||'')}</div>
      </div>`
    ).join('');
  }

  function toggleMember(el) {
    el.classList.toggle('selected');
  }

  async function createGroup() {
    const title = document.getElementById('new-group-name').value.trim();
    const selected = document.querySelectorAll('.member-pick-item.selected');
    const memberIds = Array.from(selected).map(el => el.dataset.id);
    if (!title) { App.showToast('أدخل اسم المجموعة'); return; }
    try {
      await API.post('/chat/conversations', { title, isGroup: true, participantIds: memberIds });
      App.closeCreateChat();
      loadConversations();
      App.showToast('تم إنشاء المجموعة');
    } catch (e) { App.showToast(e.message); }
  }

  // ── Join via Code ──
  async function joinViaCode() {
    const code = document.getElementById('join-code').value.trim();
    const errEl = document.getElementById('join-error');
    errEl.textContent = '';
    if (!code) { errEl.textContent = 'أدخل رمز الدعوة'; return; }
    try {
      await API.post('/chat/invite/join', { code });
      App.closeJoinModal();
      loadConversations();
      App.showToast('تم الانضمام');
    } catch (e) { errEl.textContent = e.message; }
  }

  // ── Pusher Handlers ──
  function handleNewMessage(data) {
    if (currentConversation && data.conversationId === currentConversation.id) loadMessages(currentConversation.id);
    loadConversations();
  }
  function handleMessageEdited(data) {
    if (currentConversation && data.conversationId === currentConversation.id) loadMessages(currentConversation.id);
  }
  function handleMessageDeleted(data) {
    if (currentConversation && data.conversationId === currentConversation.id) loadMessages(currentConversation.id);
  }
  function handleReactionUpdated(data) {
    if (currentConversation && data.conversationId === currentConversation.id) loadMessages(currentConversation.id);
  }
  function handleTyping(data) {
    if (currentConversation && data.conversationId === currentConversation.id && data.userId !== userId()) {
      document.getElementById('chat-typing').textContent = data.isTyping ? 'يكتب...' : '';
    }
  }
  function handleRead(data) {
    if (currentConversation && data.conversationId === currentConversation.id) loadMessages(currentConversation.id);
    loadConversations();
  }

  // ── Helpers ──
  function getCurrentConversation() { return currentConversation; }
  function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function formatTime(d) {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    if (Math.abs(now - date) < 86400000 && date.getDate() === now.getDate() && date.getMonth() === now.getMonth())
      return date.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit' });
    return date.toLocaleDateString('ar-SA', { day:'numeric', month:'short' });
  }
  function formatDuration(s) {
    if (!s) return '0:00';
    const m = Math.floor(s/60); const sec = Math.floor(s%60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }

  return {
    loadConversations, renderConversations, openConversation, loadMessages, renderMessages,
    sendMessage, onBubbleClick, toggleReaction, showReactors, showMessageInfo,
    playAudio, toggleRecord, pickFile, clearFile,
    startReply, cancelReply, startEdit, deleteMessage,
    showGroupInfo, copyCode, generateInvite, leaveGroup,
    loadUsers, renderUserPicker, toggleMember, createGroup,
    joinViaCode,
    handleNewMessage, handleMessageEdited, handleMessageDeleted,
    handleReactionUpdated, handleTyping, handleRead,
    getCurrentConversation, esc, formatTime, formatDuration,
  };
})();
