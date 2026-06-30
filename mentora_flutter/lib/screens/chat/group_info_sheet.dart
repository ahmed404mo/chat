import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../config/theme.dart';
import '../../models/conversation.dart';
import '../../models/user.dart' as model;
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../services/chat_service.dart';
import '../../services/user_service.dart';

class GroupInfoSheet extends StatelessWidget {
  final String conversationId;

  const GroupInfoSheet({super.key, required this.conversationId});

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    final conversation = chat.conversations.where((c) => c.id == conversationId).firstOrNull;
    if (conversation == null) {
      return const SizedBox.shrink();
    }

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.85,
      minChildSize: 0.3,
      expand: false,
      builder: (_, scrollController) {
        return Column(
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              child: Column(
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

                  // Group avatar
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryColor, AppTheme.accentColor],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: conversation.imageUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: Image.network(
                              conversation.imageUrl!,
                              fit: BoxFit.cover,
                            ),
                          )
                        : const Center(
                            child: Icon(Icons.group, color: Colors.white, size: 36),
                          ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    conversation.title ?? 'المجموعة',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${conversation.participants.length} أعضاء',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Actions
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Builder(
                builder: (ctx) {
                  final auth = ctx.watch<AuthProvider>();
                  final canManage = auth.user?.canManageConversations ?? false;
                  return Column(
                    children: [
                      Row(
                        children: [
                          if (canManage)
                            _buildActionButton(context, Icons.edit, 'إعادة تسمية', () {
                              _showRenameDialog(context, conversation);
                            }),
                          if (canManage) const SizedBox(width: 16),
                          _buildActionButton(context, Icons.link, 'رمز الدعوة', () {
                            _generateInviteCode(context, conversation);
                          }),
                          if (canManage) ...[
                            const SizedBox(width: 16),
                            _buildActionButton(context, Icons.person_add, 'إضافة أعضاء', () {
                              _showAddMembers(context, conversation);
                            }),
                          ],
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildActionButton(context, Icons.delete_forever, 'حذف المجموعة', () {
                            _showDeleteGroupDialog(context, conversation);
                          }, isDestructive: true),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),

            const Divider(height: 32, indent: 24, endIndent: 24),

            // Members list
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'الأعضاء',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  Text(
                    '${conversation.participants.length}',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            Expanded(
              child: ListView.builder(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 24),
                itemCount: conversation.participants.length,
                itemBuilder: (context, index) {
                  final user = conversation.participants[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                          backgroundImage: user.avatarUrl != null
                              ? NetworkImage(user.avatarUrl!)
                              : null,
                          child: user.avatarUrl == null
                              ? Text(
                                  user.initials,
                                  style: const TextStyle(
                                    color: AppTheme.primaryColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            user.name,
                            style: const TextStyle(
                              fontSize: 15,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ),
                        if (user.isOnline)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppTheme.onlineGreen,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildActionButton(BuildContext context, IconData icon, String label, VoidCallback onTap, {bool isDestructive = false}) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isDestructive ? AppTheme.errorColor.withValues(alpha: 0.1) : AppTheme.cardColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: isDestructive ? AppTheme.errorColor : AppTheme.primaryColor, size: 24),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: isDestructive ? AppTheme.errorColor : AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showRenameDialog(BuildContext context, Conversation conversation) {
    final controller = TextEditingController(text: conversation.title);
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: AppTheme.surfaceColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'إعادة تسمية المجموعة',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: const InputDecoration(labelText: 'الاسم الجديد'),
                autofocus: true,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('إلغاء'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        if (controller.text.trim().isNotEmpty) {
                          try {
                            await ChatService().renameConversation(
                              conversation.id,
                              controller.text.trim(),
                            );
                            if (ctx.mounted) Navigator.pop(ctx);
                            if (context.mounted) {
                              context.read<ChatProvider>().loadConversations();
                            }
                          } catch (e) {
                            if (ctx.mounted) Navigator.pop(ctx);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('خطأ: $e')),
                              );
                            }
                          }
                        }
                      },
                      child: const Text('حفظ'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddMembers(BuildContext context, Conversation conversation) {
    final chatService = ChatService();
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Dialog(
          backgroundColor: AppTheme.surfaceColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: FutureBuilder<List<model.User>>(
            future: UserService().getAllUsers(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                );
              }
              final allUsers = snapshot.data ?? [];
              final existingIds = conversation.participants.map((p) => p.id).toSet();
              final available = allUsers.where((u) => !existingIds.contains(u.id)).toList();

              if (available.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.people, size: 48, color: AppTheme.textMuted),
                      const SizedBox(height: 16),
                      const Text('جميع المستخدمين موجودون بالفعل',
                          style: TextStyle(color: AppTheme.textPrimary)),
                      const SizedBox(height: 16),
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إغلاق')),
                    ],
                  ),
                );
              }

              return ConstrainedBox(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.6),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('إضافة أعضاء', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                      const SizedBox(height: 16),
                      Expanded(
                        child: ListView.separated(
                          itemCount: available.length,
                          separatorBuilder: (_, __) => const Divider(height: 1),
                          itemBuilder: (_, i) {
                            final u = available[i];
                            return ListTile(
                              leading: CircleAvatar(
                                radius: 18,
                                backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                                child: Text(u.initials, style: const TextStyle(color: AppTheme.primaryColor, fontSize: 12)),
                              ),
                              title: Text(u.name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
                              subtitle: Text(u.role, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                              trailing: ElevatedButton(
                                onPressed: () async {
                                  try {
                                    await chatService.addMembers(conversation.id, [u.id]);
                                    if (ctx.mounted) Navigator.pop(ctx);
                                    if (context.mounted) {
                                      context.read<ChatProvider>().loadConversations();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('تمت إضافة ${u.name}')),
                                      );
                                    }
                                  } catch (e) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('خطأ: $e')),
                                      );
                                    }
                                  }
                                },
                                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6)),
                                child: const Text('إضافة', style: TextStyle(fontSize: 12)),
                              ),
                            );
                          },
                        ),
                      ),
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إغلاق')),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  void _showDeleteGroupDialog(BuildContext context, Conversation conversation) {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          backgroundColor: AppTheme.surfaceColor,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'حذف المجموعة',
            style: TextStyle(color: AppTheme.errorColor),
          ),
          content: const Text(
            'هل أنت متأكد من حذف هذه المجموعة؟ لا يمكن التراجع عن هذا الإجراء.',
            style: TextStyle(color: AppTheme.textSecondary),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('إلغاء', style: TextStyle(color: AppTheme.textMuted)),
            ),
            TextButton(
              onPressed: () async {
                try {
                  await context.read<ChatProvider>().deleteConversation(conversation.id);
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst);
                } catch (e) {
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('خطأ: $e')),
                    );
                  }
                }
              },
              child: const Text('حذف', style: TextStyle(color: AppTheme.errorColor)),
            ),
          ],
        ),
      ),
    );
  }

  void _generateInviteCode(BuildContext context, Conversation conversation) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final code = await context.read<ChatProvider>().generateInviteCode(conversation.id);
      if (context.mounted) {
        Navigator.pop(context);
      }
      if (!context.mounted) return;

      await Clipboard.setData(ClipboardData(text: code));

      showDialog(
        context: context,
        builder: (ctx) => Directionality(
          textDirection: TextDirection.rtl,
          child: AlertDialog(
            backgroundColor: AppTheme.surfaceColor,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text(
              'رمز الدعوة',
              style: TextStyle(color: AppTheme.textPrimary),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'استخدم هذا الرمز لدعوة أعضاء جدد',
                  style: TextStyle(color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                  decoration: BoxDecoration(
                    color: AppTheme.cardColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.borderColor),
                  ),
                  child: Text(
                    code,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'تم نسخ الرمز إلى الحافظة',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.successColor,
                  ),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('إغلاق', style: TextStyle(color: AppTheme.textMuted)),
              ),
              TextButton(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: code));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('تم نسخ رمز الدعوة!'), duration: Duration(seconds: 2)),
                  );
                },
                child: const Text('نسخ', style: TextStyle(color: AppTheme.primaryColor)),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (context.mounted) Navigator.pop(context);
      if (context.mounted) {
        showDialog(
          context: context,
          builder: (ctx) => Directionality(
            textDirection: TextDirection.rtl,
            child: AlertDialog(
              backgroundColor: AppTheme.surfaceColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('خطأ', style: TextStyle(color: AppTheme.errorColor)),
              content: Text(
                'تعذر إنشاء رمز الدعوة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.\n\n$e',
                style: const TextStyle(color: AppTheme.textSecondary),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('إغلاق', style: TextStyle(color: AppTheme.textMuted)),
                ),
              ],
            ),
          ),
        );
      }
    }
  }
}
