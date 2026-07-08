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
      '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.msgInfo(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.primary + '">' + ms('info',18) + '</span> معلومات</div>' +
      (isMine ? '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.editMsg(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.primary + '">' + ms('edit',18) + '</span> تعديل</div>' : '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.replyMsg(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.primary + '">' + ms('reply',18) + '</span> رد</div>') +
      (isMine ? '<div style="display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:10px;cursor:pointer;font-size:14px;color:' + C.error + ';transition:background .15s" onclick="this.closest(\'[style*=\\\'z-index\\\']\').remove();Chat.delMsg(\'' + msgId + '\')" onmouseover="this.style.background=\'' + C.card + '\'" onmouseout="this.style.background=\'transparent\'"><span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + C.error + '">' + ms('delete',18) + '</span> حذف</div>' : '') +
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
  document.querySelectorAll('[style*="z-index:60"]').forEach(el => el.remove());
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
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:70;display:flex;align-items:flex-end;justify-content:center';
  ov.onclick = () => ov.remove();
  ov.innerHTML = '<div style="background:' + C.surface + ';border-radius:16px 16px 0 0;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;padding:12px 24px 24px;animation:slideUp .25s" onclick="event.stopPropagation()">' +
    '<div style="width:40px;height:4px;border-radius:2px;background:rgba(67,70,85,.2);margin:0 auto 12px"></div>' +
    html +
  '</div>';
  document.body.appendChild(ov);
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
  const user = API.getUser();
  const isAdmin = user?.role === 'admin' || user?.role === 'HR';
  if (!(await showConfirm(isAdmin ? 'حذف المجموعة بالكامل؟' : 'مغادرة المجموعة؟'))) return;
  try {
    if (isAdmin) {
      await API.del('/chat/conversations/' + convId);
    } else {
      await API.del('/chat/conversations/' + convId + '/members', { userId: uid() });
    }
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
      '<button style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%;min-height:44px;font-family:Cairo" onclick="Chat.addMembers()">' + ms('person_add',18) + ' إضافة</button>' +
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
      '<div><input id="grpname" placeholder="اسم المجموعة" style="width:100%;background:' + C.surface + ';border:1px solid ' + C.border + ';border-radius:12px;padding:12px 14px;color:' + C.text + ';font-size:15px;font-family:Cairo;outline:none;transition:border-color .2s" onfocus="this.style.borderColor=\'' + C.primary + '\'" onblur="this.style.borderColor=\'' + C.border + '\'"/></div>' +
      '<div id="grpmembers"></div>' +
      '<button style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%;min-height:44px;font-family:Cairo" onclick="Chat.createGroup()">' + ms('group_add',18) + ' إنشاء</button>' +
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
      '<div><input id="jcode" placeholder="أدخل رمز الدعوة" style="width:100%;background:' + C.surface + ';border:1px solid ' + C.border + ';border-radius:12px;padding:12px 14px;color:' + C.text + ';font-size:15px;font-family:Cairo;outline:none;transition:border-color .2s" onfocus="this.style.borderColor=\'' + C.primary + '\'" onblur="this.style.borderColor=\'' + C.border + '\'"/></div>' +
      '<div id="jerr" style="color:' + C.error + ';font-size:12px;text-align:center;min-height:18px;margin-top:8px"></div>' +
    '</div>' +
    '<div style="padding:0 24px 20px"><button style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.primary + ';color:#fff;width:100%;min-height:44px;font-family:Cairo" onclick="Chat.joinViaCode()">' + ms('login',18) + ' انضمام</button></div>' +
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
      '<button style="flex:1;padding:10px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;background:' + C.card + ';color:' + C.text + ';font-family:Cairo" onclick="Chat.changeAvatar()">تغيير الصورة</button>' +
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
