import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../config/theme.dart';
import '../../models/conversation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import 'chat_screen.dart';
import 'create_chat_modal.dart';
import '../join/join_modal.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatProvider>().loadConversations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final canCreate = auth.user?.canManageConversations ?? false;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('المحادثات'),
        actions: [
          if (canCreate)
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: () => _showCreateOptions(context),
            ),
        ],
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chat, _) {
          if (chat.isLoadingConversations) {
            return _buildShimmer();
          }

          if (chat.error != null) {
            return _buildError(chat);
          }

          if (chat.conversations.isEmpty) {
            return _buildEmpty();
          }

          return RefreshIndicator(
            onRefresh: () => chat.loadConversations(),
            color: AppTheme.primaryColor,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              itemCount: chat.conversations.length,
              itemBuilder: (context, index) {
                return _buildConversationItem(context, chat.conversations[index], index);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: AppTheme.cardColor,
      highlightColor: AppTheme.borderColor,
      child: ListView.builder(
        padding: const EdgeInsets.all(8),
        itemCount: 8,
        itemBuilder: (_, __) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
          child: Row(
            children: [
              const CircleAvatar(radius: 28, backgroundColor: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 120,
                      height: 14,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: 200,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildError(ChatProvider chat) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 64, color: AppTheme.textMuted),
            const SizedBox(height: 16),
            const Text(
              'حدث خطأ في تحميل المحادثات',
              style: TextStyle(
                fontSize: 16,
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              chat.error!,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => chat.loadConversations(),
              icon: const Icon(Icons.refresh),
              label: const Text('إعادة المحاولة'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    final auth = context.watch<AuthProvider>();
    final canCreate = auth.user?.canManageConversations ?? false;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppTheme.cardColor,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.chat_bubble_outline,
                size: 48,
                color: AppTheme.textMuted,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'لا توجد محادثات بعد',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              canCreate ? 'ابدأ محادثة جديدة أو انضم باستخدام رمز دعوة' : 'انضم باستخدام رمز دعوة',
              style: const TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            if (canCreate)
              ElevatedButton.icon(
                onPressed: () => _showCreateOptions(context),
                icon: const Icon(Icons.add),
                label: const Text('محادثة جديدة'),
              ),
            if (canCreate) const SizedBox(height: 12),
            TextButton.icon(
              onPressed: () => _showJoinModal(context),
              icon: const Icon(Icons.login),
              label: const Text('انضم برمز دعوة'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConversationItem(BuildContext context, Conversation conversation, int index) {
    final auth = context.watch<AuthProvider>();
    final currentUserId = auth.user?.id ?? '';
    final isUnread = conversation.unreadCount > 0;

    return TweenAnimationBuilder<double>(
      key: ValueKey(conversation.id),
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 200 + (index * 50).clamp(0, 400)),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        return Opacity(
          opacity: value,
          child: Transform.translate(
            offset: Offset(0, 20 * (1 - value)),
            child: child,
          ),
        );
      },
      child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            context.read<ChatProvider>().selectConversation(conversation.id);
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ChatScreen(conversation: conversation),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                // Avatar
                Stack(
                  children: [
                    _buildAvatar(conversation, currentUserId),
                    if (isUnread)
                      Positioned(
                        top: 0,
                        right: 0,
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: AppTheme.primaryColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 12),

                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              conversation.displayName(currentUserId),
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: isUnread ? FontWeight.w700 : FontWeight.w500,
                                color: AppTheme.textPrimary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            conversation.lastMessage != null
                                ? _formatTime(conversation.lastMessage!.createdAt)
                                : '',
                            style: TextStyle(
                              fontSize: 12,
                              color: isUnread ? AppTheme.primaryColor : AppTheme.textMuted,
                              fontWeight: isUnread ? FontWeight.w600 : FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              conversation.lastMessage?.content ?? 'لا توجد رسائل بعد',
                              style: TextStyle(
                                fontSize: 14,
                                color: isUnread ? AppTheme.textSecondary : AppTheme.textMuted,
                                fontWeight: isUnread ? FontWeight.w500 : FontWeight.normal,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (conversation.lastMessage != null)
                            _buildStatusIcon(conversation.lastMessage!),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),  // InkWell
        ),  // Material
    ),  // outer Padding
  );  // TweenAnimationBuilder
  }

  Widget _buildAvatar(Conversation conversation, String currentUserId) {
    final imageUrl = conversation.displayImage(currentUserId);
    if (conversation.isGroup) {
      if (imageUrl != null) {
        return CircleAvatar(
          radius: 28,
          backgroundImage: NetworkImage(imageUrl),
          backgroundColor: AppTheme.cardColor,
        );
      }
      return Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppTheme.primaryColor, AppTheme.accentColor],
          ),
          borderRadius: BorderRadius.circular(28),
        ),
        child: const Center(
          child: Icon(Icons.group, color: Colors.white, size: 24),
      ),
      ),
    );
  }

    final other = conversation.participants
        .where((p) => p.id != currentUserId)
        .firstOrNull;

    if (other?.avatarUrl != null) {
      return CircleAvatar(
        radius: 28,
        backgroundImage: NetworkImage(other!.avatarUrl!),
        backgroundColor: AppTheme.cardColor,
      );
    }

    return CircleAvatar(
      radius: 28,
      backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
      child: Text(
        other?.initials ?? '?',
        style: const TextStyle(
          color: AppTheme.primaryColor,
          fontWeight: FontWeight.bold,
          fontSize: 18,
        ),
      ),
    );
  }

  Widget _buildStatusIcon(Message message) {
    if (message.status == 'READ') {
      return const Padding(
        padding: EdgeInsets.only(right: 4),
        child: Icon(Icons.done_all, size: 16, color: AppTheme.primaryLight),
      );
    }
    if (message.status == 'DELIVERED') {
      return const Padding(
        padding: EdgeInsets.only(right: 4),
        child: Icon(Icons.done_all, size: 16, color: AppTheme.textMuted),
      );
    }
    return const Padding(
      padding: EdgeInsets.only(right: 4),
      child: Icon(Icons.done, size: 16, color: AppTheme.textMuted),
    );
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) {
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
    if (diff.inDays == 1) return 'أمس';
    if (diff.inDays < 7) return timeago.format(date, locale: 'ar');
    return '${date.day}/${date.month}';
  }

  void _showCreateOptions(BuildContext context) {
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
              const SizedBox(height: 24),
              const Text(
                'إنشاء جديد',
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
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.group_add, color: AppTheme.primaryColor),
                ),
                title: const Text('مجموعة جديدة',
                    style: TextStyle(color: AppTheme.textPrimary)),
                subtitle: const Text('أنشئ مجموعة محادثة جديدة',
                    style: TextStyle(color: AppTheme.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  _showCreateChatModal(context, isGroup: true);
                },
              ),
              const Divider(),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.accentColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.login, color: AppTheme.accentColor),
                ),
                title: const Text('انضم برمز دعوة',
                    style: TextStyle(color: AppTheme.textPrimary)),
                subtitle: const Text('استخدم رمز دعوة للانضمام',
                    style: TextStyle(color: AppTheme.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  _showJoinModal(context);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateChatModal(BuildContext context, {required bool isGroup}) {
    showDialog(
      context: context,
      builder: (_) => CreateChatModal(isGroup: isGroup),
    );
  }

  void _showJoinModal(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const JoinModal(),
    );
  }
}
