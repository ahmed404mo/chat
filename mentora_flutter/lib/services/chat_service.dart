import 'dart:io';
import '../models/conversation.dart';
import 'api_service.dart';

class ChatService {
  final ApiService _api = ApiService();

  Future<List<Conversation>> getConversations() async {
    final data = await _api.get('/chat/conversations') as Map<String, dynamic>;
    final list = data['conversations'] as List<dynamic>;
    return list.map((e) => Conversation.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Conversation> createConversation({
    required String title,
    bool isGroup = true,
    List<String>? memberIds,
  }) async {
    final data = await _api.post('/chat/conversations', body: {
      'title': title,
      'isGroup': isGroup,
      if (memberIds != null) 'participantIds': memberIds,
    }) as Map<String, dynamic>;
    return Conversation.fromJson(data['conversation'] as Map<String, dynamic>);
  }

  Future<void> renameConversation(String id, String title) async {
    await _api.patch('/chat/conversations/$id', body: {'title': title});
  }

  Future<void> deleteConversation(String id) async {
    await _api.delete('/chat/conversations/$id');
  }

  Future<void> addMembers(String id, List<String> userIds) async {
    await _api.post('/chat/conversations/$id/members', body: {
      'userIds': userIds,
    });
  }

  Future<String> uploadGroupImage(String id, String filePath) async {
    final result = await _api.uploadFile('/chat/conversations/$id/image', file: File(filePath));
    return result['imageUrl'] as String;
  }

  Future<List<Message>> getMessages(String conversationId, {String? cursor}) async {
    final queryParams = '?conversationId=$conversationId${cursor != null ? '&cursor=$cursor' : ''}';
    final data = await _api.get('/chat/messages$queryParams') as Map<String, dynamic>;
    final messages = (data['messages'] as List<dynamic>)
        .map((e) => Message.fromJson(e as Map<String, dynamic>))
        .toList();
    return messages;
  }

  Future<Message> sendMessage({
    required String conversationId,
    required String content,
    String? repliedToId,
    List<String>? mentionedUserIds,
    String? filePath,
  }) async {
    final body = <String, dynamic>{
      'conversationId': conversationId,
      'content': content,
      if (repliedToId != null) 'repliedToId': repliedToId,
      if (mentionedUserIds != null && mentionedUserIds.isNotEmpty)
        'mentionedUserIds': mentionedUserIds,
    };

    dynamic data;
    if (filePath != null) {
      final uploadResult = await _api.uploadFile('/chat/upload', file: File(filePath));
      body['attachments'] = [uploadResult];
      data = await _api.post('/chat/messages', body: body);
    } else {
      data = await _api.post('/chat/messages', body: body);
    }

    return Message.fromJson(data['message'] as Map<String, dynamic>);
  }

  Future<void> editMessage(String messageId, String content) async {
    await _api.patch('/chat/messages/edit', body: {
      'messageId': messageId,
      'content': content,
    });
  }

  Future<void> deleteMessage(String messageId, {bool forEveryone = false}) async {
    await _api.post('/chat/messages/delete', body: {
      'messageId': messageId,
      'forEveryone': forEveryone,
    });
  }

  Future<void> markAsRead(String conversationId, List<String> messageIds) async {
    await _api.post('/chat/messages/read', body: {
      'conversationId': conversationId,
      'messageIds': messageIds,
    });
  }

  Future<void> addReaction(String messageId, String emoji) async {
    await _api.post('/chat/messages/reaction', body: {
      'messageId': messageId,
      'emoji': emoji,
    });
  }

  Future<void> removeReaction(String messageId, String emoji) async {
    await _api.delete('/chat/messages/reaction', body: {
      'messageId': messageId,
      'emoji': emoji,
    });
  }

  Future<String> generateInviteCode(String conversationId) async {
    final data = await _api.post('/chat/invite', body: {
      'conversationId': conversationId,
    }) as Map<String, dynamic>;
    return data['code'] as String;
  }

  Future<Conversation?> joinViaCode(String code) async {
    final data = await _api.post('/chat/invite/join', body: {
      'code': code,
    });
    if (data is Map<String, dynamic>) {
    return Conversation.fromJson(data['conversation'] as Map<String, dynamic>);
    }
    return null;
  }

  Future<void> emitTyping(String conversationId, bool isTyping) async {
    await _api.post('/chat/typing', body: {
      'conversationId': conversationId,
      'isTyping': isTyping,
    });
  }
}
