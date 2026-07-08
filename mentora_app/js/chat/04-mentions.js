function highlightMentions(text, color) {
  return text.replace(/@(\w[\w\s]*\w|\w+)/g, '<span style="color:' + color + ';font-weight:600">@$1</span>');
}

function showMentions() {
  const drop = el('mdrop'); if (!drop) return;
  const parts = currentConv?.participants || [];
  const u = uid();
  const filtered = parts
    .map(p => p.user).filter(Boolean)
    .filter(user => user.id !== u && (!mentionFilter || user.name?.toLowerCase().includes(mentionFilter.toLowerCase())));
  if (!filtered.length) { drop.style.display = 'none'; return; }
  drop.innerHTML = filtered.map((user, i) => {
    const safeName = (user.name||'').replace(/'/g, "\\'");
    return '<div data-mid="' + user.id + '" data-mname="' + safeName + '" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px' + (i === mentionSel ? ';background:' + C.surfaceLow : '') + '" onmouseenter="this.style.background=\'' + C.surfaceLow + '\'" onmouseleave="this.style.background=\'\'" onclick="Chat.insertMention(\'' + user.id + '\',\'' + safeName + '\')">' +
      '<div style="width:26px;height:26px;border-radius:50%;background:' + userColor(user.id) + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">' + esc((user.name||'?')[0]) + '</div>' +
      '<span style="font-weight:500">' + esc(user.name||'') + '</span></div>';
  }).join('');
  drop.style.display = 'block';
}

function closeMentions() {
  mentionStart = -1; mentionFilter = ''; mentionSel = -1;
  const drop = el('mdrop'); if (drop) drop.style.display = 'none';
}

function highlightMentionItem(drop, items) {
  items.forEach((el, i) => el.style.background = i === mentionSel ? C.surfaceLow : '');
}

function insertMention(userId, userName) {
  const inp = el('input'); if (!inp) return;
  const before = inp.value.slice(0, mentionStart);
  const after = inp.value.slice(inp.selectionStart);
  inp.value = before + '@' + userName + ' ' + after;
  inp.focus();
  const pos = (before + '@' + userName + ' ').length;
  inp.setSelectionRange(pos, pos);
  inp.dispatchEvent(new Event('input'));
  closeMentions();
}
