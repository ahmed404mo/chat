import 'user.dart';

class Conversation {
  final String id;
  final String? title;
  final String? imageUrl;
  final bool isGroup;
  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Message? lastMessage;
  final List<User> participants;
  final List<InviteCode> inviteCodes;
  int unreadCount;

  Conversation({
    required this.id,
    this.title,
    this.imageUrl,
    required this.isGroup,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.lastMessage,
    this.participants = const [],
    this.inviteCodes = const [],
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      title: json['title'] as String?,
      imageUrl: json['imageUrl'] as String?,
      isGroup: json['isGroup'] as bool? ?? false,
      createdBy: (json['createdBy'] ?? json['createdById']) as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      lastMessage: json['lastMessage'] != null
          ? Message.fromJson(json['lastMessage'] as Map<String, dynamic>)
          : null,
      participants: (json['participants'] as List<dynamic>?)
              ?.map((e) =>
                  User.fromJson((e as Map<String, dynamic>)['user'] as Map<String, dynamic>))
              .toList() ??
          [],
      inviteCodes: (json['inviteCodes'] as List<dynamic>?)
              ?.map((e) => InviteCode.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      unreadCount: json['unreadCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'imageUrl': imageUrl,
    'isGroup': isGroup,
    'createdBy': createdBy,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'lastMessage': lastMessage?.toJson(),
    'participants': participants.map((e) => e.toJson()).toList(),
    'inviteCodes': inviteCodes.map((e) => e.toJson()).toList(),
    'unreadCount': unreadCount,
  };

  String displayName(String currentUserId) {
    if (isGroup && title != null && title!.isNotEmpty) return title!;
    if (title != null && title!.isNotEmpty) return title!;
    final other = participants.where((p) => p.id != currentUserId).firstOrNull;
    return other?.name ?? 'غير معروف';
  }

  Conversation copyWith({
    String? id,
    String? title,
    String? imageUrl,
    bool? isGroup,
    String? createdBy,
    DateTime? createdAt,
    DateTime? updatedAt,
    Message? lastMessage,
    List<User>? participants,
    List<InviteCode>? inviteCodes,
    int? unreadCount,
  }) {
    return Conversation(
      id: id ?? this.id,
      title: title ?? this.title,
      imageUrl: imageUrl ?? this.imageUrl,
      isGroup: isGroup ?? this.isGroup,
      createdBy: createdBy ?? this.createdBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastMessage: lastMessage ?? this.lastMessage,
      participants: participants ?? this.participants,
      inviteCodes: inviteCodes ?? this.inviteCodes,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }

  String? displayImage(String currentUserId) {
    if (isGroup) return imageUrl;
    final other = participants.where((p) => p.id != currentUserId).firstOrNull;
    return other?.avatarUrl;
  }
}

class InviteCode {
  final String id;
  final String code;
  final String conversationId;
  final String createdBy;
  final DateTime? expiresAt;
  final int? maxUses;
  final int usedCount;
  final bool isActive;

  InviteCode({
    required this.id,
    required this.code,
    required this.conversationId,
    required this.createdBy,
    this.expiresAt,
    this.maxUses,
    this.usedCount = 0,
    this.isActive = true,
  });

  factory InviteCode.fromJson(Map<String, dynamic> json) {
    return InviteCode(
      id: json['id'] as String,
      code: json['code'] as String,
      conversationId: json['conversationId'] as String? ?? '',
      createdBy: json['createdBy'] as String? ?? '',
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'] as String)
          : null,
      maxUses: json['maxUses'] as int?,
      usedCount: json['usedCount'] as int? ?? 0,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'code': code,
    'conversationId': conversationId,
    'createdBy': createdBy,
    'expiresAt': expiresAt?.toIso8601String(),
    'maxUses': maxUses,
    'usedCount': usedCount,
    'isActive': isActive,
  };
}

class Message {
  Message copyWith({
    String? id,
    String? content,
    String? status,
    String? senderId,
    String? conversationId,
    String? repliedToId,
    Message? repliedTo,
    List<Attachment>? attachments,
    bool? isEdited,
    bool? isPinned,
    List<String>? mentionedUserIds,
    List<Reaction>? reactions,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Message(
      id: id ?? this.id,
      content: content ?? this.content,
      status: status ?? this.status,
      senderId: senderId ?? this.senderId,
      conversationId: conversationId ?? this.conversationId,
      repliedToId: repliedToId ?? this.repliedToId,
      repliedTo: repliedTo ?? this.repliedTo,
      attachments: attachments ?? this.attachments,
      isEdited: isEdited ?? this.isEdited,
      isPinned: isPinned ?? this.isPinned,
      mentionedUserIds: mentionedUserIds ?? this.mentionedUserIds,
      reactions: reactions ?? this.reactions,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  final String id;
  final String content;
  final String status;
  final String senderId;
  final String conversationId;
  final String? repliedToId;
  final Message? repliedTo;
  final List<Attachment> attachments;
  final bool isEdited;
  final bool isPinned;
  final List<String> mentionedUserIds;
  final List<Reaction> reactions;
  final DateTime createdAt;
  final DateTime updatedAt;

  Message({
    required this.id,
    required this.content,
    this.status = 'SENT',
    required this.senderId,
    required this.conversationId,
    this.repliedToId,
    this.repliedTo,
    this.attachments = const [],
    this.isEdited = false,
    this.isPinned = false,
    this.mentionedUserIds = const [],
    this.reactions = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      content: json['content'] as String? ?? '',
      status: json['status'] as String? ?? 'SENT',
      senderId: json['senderId'] as String,
      conversationId: json['conversationId'] as String,
      repliedToId: json['repliedToId'] as String?,
      repliedTo: json['repliedTo'] != null
          ? Message.fromJson(json['repliedTo'] as Map<String, dynamic>)
          : null,
      attachments: (json['attachments'] as List<dynamic>?)
              ?.map((e) => Attachment.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      isEdited: json['isEdited'] as bool? ?? false,
      isPinned: json['isPinned'] as bool? ?? false,
      mentionedUserIds: (json['mentionedUserIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      reactions: (json['reactions'] as List<dynamic>?)
              ?.map((e) => Reaction.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'content': content,
    'status': status,
    'senderId': senderId,
    'conversationId': conversationId,
    'repliedToId': repliedToId,
    'attachments': attachments.map((e) => e.toJson()).toList(),
    'isEdited': isEdited,
    'isPinned': isPinned,
    'mentionedUserIds': mentionedUserIds,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}

class Attachment {
  final String? id;
  final String fileName;
  final int fileSize;
  final String mimeType;
  final String url;
  final String? publicId;

  Attachment({
    this.id,
    required this.fileName,
    required this.fileSize,
    required this.mimeType,
    required this.url,
    this.publicId,
  });

  factory Attachment.fromJson(Map<String, dynamic> json) {
    return Attachment(
      id: json['id'] as String?,
      fileName: json['fileName'] as String,
      fileSize: json['fileSize'] as int,
      mimeType: json['mimeType'] as String,
      url: json['url'] as String,
      publicId: json['publicId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'fileName': fileName,
    'fileSize': fileSize,
    'mimeType': mimeType,
    'url': url,
    'publicId': publicId,
  };

  bool get isImage => mimeType.startsWith('image/');
  bool get isAudio => mimeType.startsWith('audio/');
  bool get isVideo => mimeType.startsWith('video/');
  bool get isPdf => mimeType == 'application/pdf';
}

class Reaction {
  final String id;
  final String emoji;
  final String userId;
  final String userName;
  final DateTime createdAt;

  Reaction({
    required this.id,
    required this.emoji,
    required this.userId,
    this.userName = '',
    required this.createdAt,
  });

  factory Reaction.fromJson(Map<String, dynamic> json) {
    return Reaction(
      id: json['id'] as String,
      emoji: json['emoji'] as String,
      userId: json['userId'] as String,
      userName: json['user']?['name'] as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'emoji': emoji,
    'userId': userId,
    'createdAt': createdAt.toIso8601String(),
  };
}
