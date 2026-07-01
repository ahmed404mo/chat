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
    const channel = pusher.subscribe(`presence-conversation-${conversationId}`);
    channel.bind('onMessageReceived', (data) => { try { Chat.onNewMsg(data); } catch(e) {} });
    channel.bind('onMessageEdited', (data) => { try { Chat.onEdit(data); } catch(e) {} });
    channel.bind('onMessageDeleted', (data) => { try { Chat.onDel(data); } catch(e) {} });
    channel.bind('onReactionAdded', (data) => { try { Chat.onReact(data); } catch(e) {} });
    channel.bind('onReactionRemoved', (data) => { try { Chat.onReact(data); } catch(e) {} });
    channel.bind('onTyping', (data) => { try { Chat.onTyping(data); } catch(e) {} });
    channel.bind('onRead', (data) => { try { Chat.onRead(data); } catch(e) {} });
    channels[conversationId] = channel;
  }

  function unsubscribe(conversationId) {
    if (channels[conversationId]) {
      pusher.unsubscribe(`presence-conversation-${conversationId}`);
      delete channels[conversationId];
    }
  }

  function disconnect() {
    Object.keys(channels).forEach(unsubscribe);
    if (pusher) { pusher.disconnect(); pusher = null; }
  }

  return { connect, subscribe, unsubscribe, disconnect };
})();
