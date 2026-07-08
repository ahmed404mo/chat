function onNewMsg(data) {
  if (currentConv && data.conversationId === currentConv.id) {
    const idx = messages.findIndex(m => m.id === data.id);
    if (idx === -1) {
      messages.push(data); renderMsgs();
      const list = el('msgs');
      if (list && list.scrollTop >= list.scrollHeight - list.clientHeight - 50) markAsRead();
    }
  }
  if (data.mentionedUserIds?.includes(uid())) {
    mentionedConvs.add(data.conversationId);
    if (!currentConv || data.conversationId !== currentConv.id) {
      toast('@ ' + (data.sender?.name||'شخص') + ' منشنك في ' + (data.conversation?.title||'المجموعة'));
    }
  }
  loadConvs();
}
function onEdit(data) {
  if (currentConv && data.conversationId === currentConv.id) {
    const idx = messages.findIndex(m => m.id === data.id);
    if (idx !== -1) { messages[idx] = data; renderMsgs(); }
  }
}
function onDel(data) {
  if (currentConv && data.conversationId === currentConv.id) {
    messages = messages.filter(m => m.id !== data.messageId);
    renderMsgs();
  }
}
function onReact(data) {
  if (currentConv && data.conversationId === currentConv.id) {
    const msg = messages.find(m => m.id === data.messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      const existing = msg.reactions.findIndex(r => r.userId === data.reaction.userId && r.emoji === data.reaction.emoji);
      if (existing === -1) msg.reactions.push(data.reaction);
      else msg.reactions[existing] = data.reaction;
      renderMsgs();
    }
  }
}
function onReactRemove(data) {
  if (currentConv && data.conversationId === currentConv.id) {
    const msg = messages.find(m => m.id === data.messageId);
    if (msg && msg.reactions) {
      msg.reactions = msg.reactions.filter(r => !(r.userId === data.userId && r.emoji === data.emoji));
      renderMsgs();
    }
  }
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
