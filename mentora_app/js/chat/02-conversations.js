function showChats() {
  if (currentConv) try { PusherManager.unsubscribe(currentConv.id); } catch(e) {}
  currentConv = null;
  if (!navigator.onLine) showNetBar('لا يوجد اتصال بالإنترنت', C.error);
  const user = API.getUser()||{};
  const isAdmin = user.role === 'admin' || user.role === 'HR';
  if (convPoll) clearInterval(convPoll);
  convPoll = setInterval(() => { if (el('clist')) loadConvs(true); }, 5000);
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

async function loadConvs(silent) {
  const list = el('clist'); if (!list) return;
  if (!silent) list.innerHTML = spinner();
  try {
    const data = await API.get('/chat/conversations');
    conversations = data.conversations || [];
    if (!conversations.length) { list.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:24px;color:' + C.muted + '">لا توجد محادثات</div>'; return; }
    const u = uid();
    list.innerHTML = conversations.map(c => {
      const part = (c.participants||[]).find(p => p.user?.id !== u);
      const title = c.isGroup ? c.title : part?.user?.name || c.title;
      const last = c.messages?.[0];
      if (!mentionedConvs.has(c.id) && Array.isArray(c.messages) && c.messages.some(m => m.mentionedUserIds?.includes(u))) mentionedConvs.add(c.id);
      let previewHtml = '';
      if (last) {
        const senderTag = (c.isGroup && last.sender?.name && last.senderId !== u) ? '<span style="color:' + userColor(last.senderId) + ';font-weight:600">' + esc(last.sender.name) + '</span>: ' : '';
        if (last.attachments?.length) {
          const a = last.attachments[0];
          const icon = a.mimeType?.startsWith('audio/') ? ms('mic',13) : a.mimeType?.startsWith('image/') ? ms('photo_camera',13) : ms('attach_file',13);
          const label = a.mimeType?.startsWith('audio/') ? 'رسالة صوتية' : a.mimeType?.startsWith('image/') ? 'صورة' : 'ملف';
          previewHtml = senderTag + '<span style="display:inline-flex;align-items:center;gap:4px">' + icon + ' ' + esc(label) + '</span>';
        } else previewHtml = senderTag + esc(last.content || '');
      }
      const time = last ? fmt(last.createdAt) : '';
      return '<div style="display:flex;align-items:center;padding:12px 20px;gap:12px;cursor:pointer;border-bottom:1px solid ' + C.card + '" onclick="Chat.openConv(\'' + c.id + '\')">' +
        '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,' + C.primary + ',' + C.accent + ');display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0">' + (title||'G')[0].toUpperCase() + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:15px;font-weight:600;margin-bottom:2px">' + esc(title||'غير معروف') + '</div>' +
          '<div style="font-size:13px;color:' + C.muted + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + previewHtml + '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">' +
          (mentionedConvs.has(c.id) ? '<div style="font-size:11px;color:' + C.primary + ';font-weight:700">@</div>' : '') +
          '<div style="font-size:11px;color:' + C.muted + '">' + time + '</div>' +
          ((c.unreadCount||0) > 0 ? '<div style="background:' + C.primary + ';color:#fff;font-size:11px;padding:2px 7px;border-radius:10px;font-weight:600">' + c.unreadCount + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    if (totalUnread > 0) setAppBadge(totalUnread);
    else clearAppBadge();
  } catch (e) {
    list.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:24px;color:' + C.error + '">' + e.message + '</div>';
  }
}

async function openConv(id) {
  if (convPoll) { clearInterval(convPoll); convPoll = null; }
  currentConv = conversations.find(c => c.id === id) || { id };
  mentionedConvs.delete(id);
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
        <div id="inpwrap" style="flex:1;display:flex;flex-direction:column;position:relative">
          <div id="mdrop" style="display:none;position:absolute;bottom:100%;left:0;right:0;background:${C.surface};border:1px solid ${C.border};border-radius:12px;max-height:180px;overflow-y:auto;box-shadow:0px -4px 12px rgba(15,23,42,0.08);z-index:50"></div>
          <div style="flex:1;background:${C.surface};border-radius:24px;border:1px solid ${C.border};display:flex;align-items:center;padding:2px;transition:border-color .2s" onfocusin="this.style.borderColor='${C.primary}';this.style.boxShadow='0 0 0 2px rgba(37,99,235,.2)'" onfocusout="this.style.borderColor='${C.border}';this.style.boxShadow='none'">
            <textarea id="input" style="flex:1;background:none;border:none;color:${C.text};font-size:15px;font-family:Cairo;padding:10px 14px;outline:none;resize:none;max-height:120px;-webkit-user-select:text;user-select:text" placeholder="اكتب رسالة..." rows="1"></textarea>
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
    const val = inp.value;
    const cursor = inp.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx !== -1 && (atIdx === 0 || textBefore[atIdx - 1] === ' ')) {
      const after = textBefore.slice(atIdx + 1);
      if (/^[\w\s]*$/.test(after)) {
        mentionStart = atIdx;
        mentionFilter = after;
        mentionSel = -1;
        showMentions();
      } else { closeMentions(); }
    } else { closeMentions(); }
    const hasContent = val.trim().length > 0 || selectedFiles.length > 0;
    el('sendbtn').style.display = hasContent ? 'flex' : 'none';
    el('recbtn').style.display = hasContent ? 'none' : 'flex';
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
    if (currentConv) {
      if (val.trim().length > 0 && !wasTyping) {
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
  inp.addEventListener('keydown', e => {
    if (mentionStart !== -1) {
      const drop = el('mdrop');
      if (drop && drop.style.display !== 'none') {
        const items = drop.querySelectorAll('[data-mid]');
        if (e.key === 'ArrowDown') { e.preventDefault(); mentionSel = Math.min(mentionSel + 1, items.length - 1); highlightMentionItem(drop, items); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); mentionSel = Math.max(mentionSel - 1, 0); highlightMentionItem(drop, items); return; }
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (mentionSel >= 0 && items[mentionSel]) items[mentionSel].click(); return; }
        if (e.key === 'Escape') { e.preventDefault(); closeMentions(); return; }
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  });
  inp.addEventListener('blur', () => setTimeout(closeMentions, 200));
  loadMsgs(id).then(() => markAsRead());
  const msgsEl = el('msgs');
  if (msgsEl) msgsEl.addEventListener('scroll', () => {
    if (msgsEl.scrollTop >= msgsEl.scrollHeight - msgsEl.clientHeight - 50) markAsRead();
  });
  if (currentConv.id) try { PusherManager.subscribe(currentConv.id); } catch(e) {}
}
