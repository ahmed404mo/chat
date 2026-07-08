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

function markAsRead() {
  if (!currentConv?.id) return;
  API.post('/chat/messages/read', { conversationId: currentConv.id }).catch(() => {});
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
    const senderName = (!isMine && currentConv?.isGroup && m.sender?.name) ? '<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><div style="width:18px;height:18px;border-radius:50%;background:' + userColor(m.senderId) + ';display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;flex-shrink:0">' + esc(m.sender.name[0]||'') + '</div><span style="font-size:11px;color:' + userColor(m.senderId) + ';font-weight:600">' + esc(m.sender.name) + '</span></div>' : '';
    const attHtml = renderAtts(m.attachments, isMine);
    const isMentioned = m.mentionedUserIds?.includes(u);
    const contHtml = m.content ? '<div style="font-size:15px;line-height:1.4;white-space:pre-wrap;word-break:break-word;' + txtColor + '">' + (isMentioned ? highlightMentions(esc(m.content), C.primary) : esc(m.content)) + '</div>' : '';
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
    if (res?.message) { if (!messages.find(m => m.id === res.message.id)) { messages.push(res.message); renderMsgs(); } }
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

function playPreview() {
  if (!recBlobUrl) { toast('لا يوجد تسجيل للاستماع'); return; }
  if (prevAudio) { prevAudio.pause(); prevAudio = null; return; }
  const audio = new Audio(recBlobUrl);
  prevAudio = audio;
  audio.play();
  audio.addEventListener('ended', () => { prevAudio = null; });
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
