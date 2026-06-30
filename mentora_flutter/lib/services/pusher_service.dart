import 'dart:convert';
import 'package:pusher_channels_flutter/pusher_channels_flutter.dart';
import '../config/constants.dart';
import 'api_service.dart';

class PusherService {
  static final PusherService _instance = PusherService._internal();
  factory PusherService() => _instance;
  PusherService._internal();

  PusherChannelsFlutter? _pusher;
  final ApiService _api = ApiService();

  Function(Map<String, dynamic>)? onMessageReceived;
  Function(Map<String, dynamic>)? onMessageEdited;
  Function(Map<String, dynamic>)? onMessageDeleted;
  Function(Map<String, dynamic>)? onReactionAdded;
  Function(Map<String, dynamic>)? onReactionRemoved;
  Function(Map<String, dynamic>)? onMessagesRead;
  Function(Map<String, dynamic>)? onUserTyping;
  Function(Map<String, dynamic>)? onUserOnline;
  Function(Map<String, dynamic>)? onUserOffline;
  Function(Map<String, dynamic>)? onConversationUpdated;

  Future<void> connect(String userId) async {
    _pusher = PusherChannelsFlutter.getInstance();

    await _pusher!.init(
      apiKey: AppConstants.pusherKey,
      cluster: AppConstants.pusherCluster,
      onConnectionStateChange: (currentState, previousState) {
        print('Pusher state: $currentState');
      },
      onError: (message, code, error) {
        print('Pusher error: $message code: $code exception: $error');
      },
      onAuthorizer: (String channelName, String socketId, dynamic options) async {
        try {
          final auth = await _api.post('/pusher/auth', body: {
            'socket_id': socketId,
            'channel_name': channelName,
          });
          return auth;
        } catch (e) {
          throw Exception('Pusher auth failed: $e');
        }
      },
    );

    await _pusher!.connect();

    await _pusher!.subscribe(
      channelName: 'presence-mentora',
      onEvent: (event) {
        _handlePresenceEvent(event);
      },
    );

    await _pusher!.subscribe(
      channelName: 'private-user-$userId',
      onEvent: (event) {
        _handleUserEvent(event);
      },
    );
  }

  void _handlePresenceEvent(PusherEvent event) {
    final data = event.data is String
        ? jsonDecode(event.data as String) as Map<String, dynamic>
        : event.data as Map<String, dynamic>;

    switch (event.eventName) {
      case 'client-user-online':
        onUserOnline?.call(data);
        break;
      case 'client-user-offline':
        onUserOffline?.call(data);
        break;
    }
  }

  void _handleUserEvent(PusherEvent event) {
    final data = event.data is String
        ? jsonDecode(event.data as String) as Map<String, dynamic>
        : event.data as Map<String, dynamic>;

    switch (event.eventName) {
      case 'message':
        onMessageReceived?.call(data);
        break;
      case 'message-edited':
        onMessageEdited?.call(data);
        break;
      case 'message-deleted':
        onMessageDeleted?.call(data);
        break;
      case 'reaction-added':
        onReactionAdded?.call(data);
        break;
      case 'reaction-removed':
        onReactionRemoved?.call(data);
        break;
      case 'messages-read':
        onMessagesRead?.call(data);
        break;
      case 'typing':
        onUserTyping?.call(data);
        break;
      case 'conversation-updated':
        onConversationUpdated?.call(data);
        break;
    }
  }

  Future<void> subscribeToConversation(String conversationId) async {
    await _pusher!.subscribe(
      channelName: 'private-conversation-$conversationId',
      onEvent: (event) {
        _handleConversationEvent(event, conversationId);
      },
    );
  }

  void _handleConversationEvent(PusherEvent event, String conversationId) {
    final data = event.data is String
        ? jsonDecode(event.data as String) as Map<String, dynamic>
        : event.data as Map<String, dynamic>;
    data['conversationId'] = conversationId;

    switch (event.eventName) {
      case 'client-message':
        onMessageReceived?.call(data);
        break;
      case 'client-typing':
        onUserTyping?.call(data);
        break;
      case 'client-stop-typing':
        onUserTyping?.call({...data, 'stopped': true});
        break;
    }
  }

  Future<void> emitTyping(String conversationId) async {
    await _pusher?.trigger(
      PusherEvent(
        channelName: 'private-conversation-$conversationId',
        eventName: 'client-typing',
        data: {'conversationId': conversationId},
      ),
    );
  }

  Future<void> emitStopTyping(String conversationId) async {
    await _pusher?.trigger(
      PusherEvent(
        channelName: 'private-conversation-$conversationId',
        eventName: 'client-stop-typing',
        data: {'conversationId': conversationId},
      ),
    );
  }

  Future<void> disconnect() async {
    await _pusher?.disconnect();
    _pusher = null;
  }
}
