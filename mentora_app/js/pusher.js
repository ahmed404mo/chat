const PusherManager = (() => {
  let pusher = null;
  let channels = {};

  function connect() {
    if (pusher) return;
    pusher = new Pusher('3fae703aa9755ff411b6', {
      cluster: 'eu',
      authorizer: (channel) => ({
        authorize: (socketId, callback) => {
          fetch(`${API.BASE}/pusher/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${API.getToken()}`,
            },
            body: JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            }),
          })
            .then(r => r.json())
            .then(d => callback(null, d))
            .catch(e => callback(e, null));
        },
      }),
    });
  }

  function subscribe(conversationId) {
    if (channels[conversationId]) return;
    if (!pusher) connect();
    const channel = pusher.subscribe(`private-conversation-${conversationId}`);
    channel.bind('new-message', (data) => { try { Chat.onNewMsg(data); } catch(e) {} });
    channel.bind('message-edited', (data) => { try { Chat.onEdit(data); } catch(e) {} });
    channel.bind('message-deleted', (data) => { try { Chat.onDel(data); } catch(e) {} });
    channel.bind('message-reaction-added', (data) => { try { Chat.onReact(data); } catch(e) {} });
    channel.bind('message-reaction-removed', (data) => { try { Chat.onReactRemove(data); } catch(e) {} });
    channel.bind('user-typing', (data) => { try { Chat.onTyping(data); } catch(e) {} });
    channel.bind('user-stop-typing', (data) => { try { Chat.onTypingStop(data); } catch(e) {} });
    channel.bind('messages-read', (data) => { try { Chat.onRead(data); } catch(e) {} });
    channel.bind('member-removed', (data) => { try { Chat.onMemberRemoved(data); } catch(e) {} });
    channels[conversationId] = channel;
  }

  function unsubscribe(conversationId) {
    if (channels[conversationId]) {
      pusher.unsubscribe(`private-conversation-${conversationId}`);
      delete channels[conversationId];
    }
  }

  function disconnect() {
    Object.keys(channels).forEach(unsubscribe);
    if (pusher) { pusher.disconnect(); pusher = null; }
  }

  return { connect, subscribe, unsubscribe, disconnect };
})();
