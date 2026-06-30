import 'dart:async';
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import '../models/conversation.dart';
import '../models/user.dart';
import '../services/chat_service.dart';
import '../services/pusher_service.dart';
import '../config/constants.dart';

class ChatProvider extends ChangeNotifier {
  final ChatService _chatService = ChatService();
  final PusherService _pusherService = PusherService();
  String? _currentUserId;

  List<Conversation> _conversations = [];
  Conversation? _activeConversation;
  List<Message> _messages = [];
  bool _isLoadingConversations = false;
  bool _isLoadingMessages = false;
  bool _hasMoreMessages = true;
  String? _cursor;
  String? _error;
  String? _activeConversationId;

  Map<String, List<String>> _typingUsers = {};
  Timer? _typingTimer;
  bool _isTyping = false;

  List<Conversation> get conversations => _conversations;
  Conversation? get activeConversation => _activeConversation;
  List<Message> get messages => _messages;
  bool get isLoadingConversations => _isLoadingConversations;
  bool get isLoadingMessages => _isLoadingMessages;
  bool get hasMoreMessages => _hasMoreMessages;
  String? get error => _error;
  String? get activeConversationId => _activeConversationId;

  void setCurrentUserId(String id) => _currentUserId = id;

  List<String> get typingUsersInActiveConversation {
    if (_activeConversationId == null) return [];
    return _typingUsers[_activeConversationId!] ?? [];
  }

  void _setupPusherListeners() {
    _pusherService.onMessageReceived = (data) {
      final msg = Message.fromJson(data);
      if (msg.conversationId == _activeConversationId) {
        _messages.insert(0, msg);
        _updateLastMessage(msg);
        notifyListeners();
      }
    };

    _pusherService.onMessageEdited = (data) {
      final msg = Message.fromJson(data);
      final idx = _messages.indexWhere((m) => m.id == msg.id);
      if (idx != -1) {
        _messages[idx] = msg;
        notifyListeners();
      }
    };

    _pusherService.onMessageDeleted = (data) {
      final messageId = data['messageId'] as String?;
      if (messageId == null) return;
      _messages.removeWhere((m) => m.id == messageId);
      notifyListeners();
    };

    _pusherService.onReactionAdded = (data) {
      _updateReactionInMessages(data);
    };

    _pusherService.onReactionRemoved = (data) {
      _updateReactionInMessages(data);
    };

    _pusherService.onMessagesRead = (data) {
      final messageIds = (data['messageIds'] as List<dynamic>).cast<String>();
      for (final msg in _messages) {
        if (messageIds.contains(msg.id)) {
          _messages[_messages.indexOf(msg)] = msg.copyWith(status: 'READ');
        }
      }
      notifyListeners();
    };

    _pusherService.onUserTyping = (data) {
      final convId = data['conversationId'] as String?;
      final userId = data['userId'] as String?;
      final stopped = data['stopped'] as bool? ?? false;
      if (convId == null || userId == null) return;

      _typingUsers.putIfAbsent(convId, () => []);
      if (stopped) {
        _typingUsers[convId]!.remove(userId);
      } else if (!_typingUsers[convId]!.contains(userId)) {
        _typingUsers[convId]!.add(userId);
      }
      notifyListeners();
    };

    _pusherService.onConversationUpdated = (data) {
      _loadConversations();
    };
  }

  void _updateReactionInMessages(Map<String, dynamic> data) {
    final messageId = data['messageId'] as String?;
    if (messageId == null) return;
    // Reload reactions for this message
    _chatService.getMessages(_activeConversationId!).then((msgs) {
      final updated = msgs.where((m) => m.id == messageId).firstOrNull;
      if (updated != null) {
        final idx = _messages.indexWhere((m) => m.id == messageId);
        if (idx != -1) {
          _messages[idx] = updated;
          notifyListeners();
        }
      }
    });
  }

  void _updateLastMessage(Message msg) {
    final idx = _conversations.indexWhere((c) => c.id == msg.conversationId);
    if (idx != -1) {
      final conv = _conversations[idx];
      _conversations[idx] = conv.copyWith(lastMessage: msg);
      _conversations.sort((a, b) {
        final aTime = a.lastMessage?.createdAt ?? a.updatedAt;
        final bTime = b.lastMessage?.createdAt ?? b.updatedAt;
        return bTime.compareTo(aTime);
      });
    }
  }

  Future<void> loadConversations() async {
    _setupPusherListeners();
    await _loadConversations();
  }

  Future<void> _loadConversations() async {
    _isLoadingConversations = true;
    notifyListeners();

    try {
      _conversations = await _chatService.getConversations();
      _error = null;
    } catch (e) {
      _error = e.toString();
    }

    _isLoadingConversations = false;
    notifyListeners();
  }

  Future<void> selectConversation(String conversationId) async {
    if (_activeConversationId == conversationId) return;

    _activeConversationId = conversationId;
    _messages = [];
    _cursor = null;
    _hasMoreMessages = true;

    await _pusherService.subscribeToConversation(conversationId);

    _activeConversation = _conversations.firstWhereOrNull(
      (c) => c.id == conversationId,
    );
    if (_activeConversation == null) return;

    await loadMessages();
    notifyListeners();
  }

  Future<void> loadMessages({bool refresh = false}) async {
    if (_activeConversationId == null) return;
    if (_isLoadingMessages) return;
    if (!_hasMoreMessages && !refresh) return;

    _isLoadingMessages = true;
    notifyListeners();

    try {
      final newMessages = await _chatService.getMessages(
        _activeConversationId!,
        cursor: refresh ? null : _cursor,
      );

      if (refresh) {
        _messages = newMessages;
      } else {
        _messages.addAll(newMessages);
      }

      _hasMoreMessages = newMessages.length >= AppConstants.messagesPerPage;
      _cursor = _messages.isNotEmpty ? _messages.last.id : null;
      _error = null;
    } catch (e) {
      _error = e.toString();
    }

    _isLoadingMessages = false;
    notifyListeners();
  }

  Future<void> sendMessage({
    required String conversationId,
    required String content,
    String? repliedToId,
    String? filePath,
  }) async {
    if (content.trim().isEmpty && filePath == null) return;

    // Extract mentioned user IDs
    final mentionedIds = <String>[];
    final mentionRegex = RegExp(r'@(\w+)');
    final matches = mentionRegex.allMatches(content);
    for (final match in matches) {
      final username = match.group(1);
      if (username != null) {
        // Find user by name in active conversation participants
        final user = _activeConversation?.participants
            .where((p) => p.name.contains(username))
            .firstOrNull;
        if (user != null) mentionedIds.add(user.id);
      }
    }

    try {
      final msg = await _chatService.sendMessage(
        conversationId: conversationId,
        content: content,
        repliedToId: repliedToId,
        mentionedUserIds: mentionedIds.isNotEmpty ? mentionedIds : null,
        filePath: filePath,
      );
      _messages.insert(0, msg);
      _updateLastMessage(msg);
      _error = null;
      stopTyping();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> deleteConversation(String id) async {
    try {
      await _chatService.deleteConversation(id);
      _conversations.removeWhere((c) => c.id == id);
      if (_activeConversationId == id) {
        _activeConversation = null;
        _activeConversationId = null;
        _messages = [];
      }
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> editMessage(String messageId, String content) async {
    try {
      await _chatService.editMessage(messageId, content);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> deleteMessage(String messageId, {bool forEveryone = false}) async {
    try {
      await _chatService.deleteMessage(messageId, forEveryone: forEveryone);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> fetchMessageStatus(String messageId) async {
    try {
      return await _chatService.getMessageStatus(messageId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  Future<void> addReaction(String messageId, String emoji) async {
    try {
      await _chatService.addReaction(messageId, emoji);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> removeReaction(String messageId, String emoji) async {
    try {
      await _chatService.removeReaction(messageId, emoji);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> markAsRead(String conversationId) async {
    final unreadMessages = _messages
        .where((m) => m.status != 'READ' && m.senderId != _currentUserId)
        .map((m) => m.id)
        .toList();

    if (unreadMessages.isEmpty) return;

    try {
      await _chatService.markAsRead(conversationId, unreadMessages);
      final conv = _conversations.firstWhereOrNull((c) => c.id == conversationId);
      conv?.unreadCount = 0;
      notifyListeners();
    } catch (e) {
      // silently fail
    }
  }

  Future<String> generateInviteCode(String conversationId) async {
    try {
      return await _chatService.generateInviteCode(conversationId);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<Conversation?> joinViaCode(String code) async {
    try {
      final conv = await _chatService.joinViaCode(code);
      if (conv != null) {
        await _loadConversations();
      }
      return conv;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return null;
    }
  }

  void startTyping() {
    if (_activeConversationId == null || _isTyping) return;
    _isTyping = true;
    _chatService.emitTyping(_activeConversationId!, true);

    _typingTimer?.cancel();
    _typingTimer = Timer(AppConstants.typingDebounce, () {
      stopTyping();
    });
  }

  void stopTyping() {
    if (!_isTyping || _activeConversationId == null) return;
    _isTyping = false;
    _chatService.emitTyping(_activeConversationId!, false);
    _typingTimer?.cancel();
  }

  @override
  void dispose() {
    _typingTimer?.cancel();
    super.dispose();
  }
}
