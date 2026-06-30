import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/conversation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import 'chat_input.dart';
import 'message_bubble.dart';
import 'group_info_sheet.dart';

class ChatScreen extends StatefulWidget {
  final Conversation conversation;

  const ChatScreen({super.key, required this.conversation});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _scrollController = ScrollController();
  final _viewableKey = GlobalKey<SliverAnimatedListState>();
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _markAsRead();
    });
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore) return;
    _isLoadingMore = true;
    await context.read<ChatProvider>().loadMessages();
    _isLoadingMore = false;
  }

  void _markAsRead() {
    context.read<ChatProvider>().markAsRead(widget.conversation.id);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final currentUserId = auth.user?.id ?? '';

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: GestureDetector(
          onTap: () => _showGroupInfo(context),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildAvatar(currentUserId),
              const SizedBox(width: 10),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.conversation.displayName(currentUserId),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    Consumer<ChatProvider>(
                      builder: (context, chat, _) {
                        final typingUsers = chat.typingUsersInActiveConversation;
                        if (typingUsers.isNotEmpty) {
                          return Text(
                            'يكتب...',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppTheme.primaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showGroupInfo(context),
          ),
        ],
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chat, _) {
          return Column(
            children: [
              // Messages list
              Expanded(
                child: _buildMessagesList(chat, currentUserId),
              ),

              // Typing indicator
              Consumer<ChatProvider>(
                builder: (context, chat, _) {
                  final typingUsers = chat.typingUsersInActiveConversation
                      .where((uid) => uid != currentUserId)
                      .toList();
                  if (typingUsers.isEmpty) return const SizedBox.shrink();

                  final names = typingUsers
                      .map((uid) {
                        final user = widget.conversation.participants
                            .where((p) => p.id == uid)
                            .firstOrNull;
                        return user?.name ?? '';
                      })
                      .where((n) => n.isNotEmpty)
                      .join('، ');

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    color: AppTheme.backgroundColor,
                    child: Row(
                      children: [
                        Text(
                          '$names يكتبون...',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.primaryLight,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),

              // Chat input
              ChatInput(
                conversationId: widget.conversation.id,
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMessagesList(ChatProvider chat, String currentUserId) {
    if (chat.isLoadingMessages && chat.messages.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.primaryColor),
      );
    }

    if (chat.messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.cardColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.chat_outlined,
                  size: 40,
                  color: AppTheme.textMuted,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'لا توجد رسائل بعد',
                style: TextStyle(
                  fontSize: 16,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'أرسل أول رسالة لبدء المحادثة!',
                style: TextStyle(
                  fontSize: 13,
                  color: AppTheme.textMuted,
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Messages are fetched newest-first from API
    final reversedMessages = chat.messages.reversed.toList();

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: ListView.builder(
        controller: _scrollController,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        reverse: true,
        itemCount: chat.hasMoreMessages ? reversedMessages.length + 1 : reversedMessages.length,
        itemBuilder: (context, index) {
          if (index == reversedMessages.length && chat.hasMoreMessages) {
            return const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppTheme.textMuted,
                  ),
                ),
              ),
            );
          }

          final message = reversedMessages[index];
          final isMine = message.senderId == currentUserId;

          return MessageBubble(
            message: message,
            isMine: isMine,
            onReply: (msg) {
              // Set reply in ChatInput
            },
            onDelete: (msg) => _showDeleteOptions(msg),
            onReact: (msg, emoji) => chat.addReaction(msg.id, emoji),
          );
        },
      ),
    );
  }

  Widget _buildAvatar(String currentUserId) {
    final imageUrl = widget.conversation.displayImage(currentUserId);
    if (widget.conversation.isGroup) {
      if (imageUrl != null) {
        return CircleAvatar(
          radius: 18,
          backgroundImage: NetworkImage(imageUrl),
          backgroundColor: AppTheme.cardColor,
        );
      }
      return Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppTheme.primaryColor, AppTheme.accentColor],
          ),
          borderRadius: BorderRadius.circular(18),
        ),
        child: const Center(
          child: Icon(Icons.group, color: Colors.white, size: 18),
        ),
      );
    }

    final other = widget.conversation.participants
        .where((p) => p.id != currentUserId)
        .firstOrNull;

    return CircleAvatar(
      radius: 18,
      backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
      backgroundImage: other?.avatarUrl != null
          ? NetworkImage(other!.avatarUrl!)
          : null,
      child: other?.avatarUrl == null
          ? Text(
              other?.initials ?? '?',
              style: const TextStyle(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            )
          : null,
    );
  }

  void _showGroupInfo(BuildContext context) {
    if (widget.conversation.isGroup) {
      showModalBottomSheet(
        context: context,
        backgroundColor: AppTheme.surfaceColor,
        isScrollControlled: true,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        builder: (_) => GroupInfoSheet(conversation: widget.conversation),
      );
    }
  }

  void _showDeleteOptions(Message message) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.textMuted.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'حذف الرسالة',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.errorColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.delete, color: AppTheme.errorColor),
                ),
                title: const Text('حذف للجميع',
                    style: TextStyle(color: AppTheme.textPrimary)),
                subtitle: const Text('سيتم حذف الرسالة للجميع',
                    style: TextStyle(color: AppTheme.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  context.read<ChatProvider>().deleteMessage(message.id, forEveryone: true);
                },
              ),
              const Divider(),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.textMuted.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.delete_outline, color: AppTheme.textMuted),
                ),
                title: const Text('حذف لدي',
                    style: TextStyle(color: AppTheme.textPrimary)),
                subtitle: const Text('سيتم حذف الرسالة لك فقط',
                    style: TextStyle(color: AppTheme.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  context.read<ChatProvider>().deleteMessage(message.id, forEveryone: false);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
