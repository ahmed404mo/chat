const PusherManager = (() => {
  let pusher = null;
  let channels = {};

  function connect() {
    if (pusher) return;
    pusher = new Pusher('3fae703aa9755ff411b6', {
      cluster: 'eu',
      authorizer: (channel) => ({
        authorize: (socketId, callback) => {
          fetch(`${API.BASE}/chat/pusher/auth`, {
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
    channel.bind('onMessageReceived', (data) => Chat.handleNewMessage(data));
    channel.bind('onMessageEdited', (data) => Chat.handleMessageEdited(data));
    channel.bind('onMessageDeleted', (data) => Chat.handleMessageDeleted(data));
    channel.bind('onReactionAdded', (data) => Chat.handleReactionUpdated(data));
    channel.bind('onReactionRemoved', (data) => Chat.handleReactionUpdated(data));
    channel.bind('onTyping', (data) => Chat.handleTyping(data));
    channel.bind('onRead', (data) => Chat.handleRead(data));
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
