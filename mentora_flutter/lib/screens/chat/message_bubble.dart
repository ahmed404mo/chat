import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/theme.dart';
import '../../models/conversation.dart';
import '../../models/user.dart';

class MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMine;
  final List<User> participants;
  final void Function(Message)? onReply;
  final void Function(Message)? onDelete;
  final void Function(Message, String)? onReact;
  final void Function(Message, String)? onEdit;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isMine,
    this.participants = const [],
    this.onReply,
    this.onDelete,
    this.onReact,
    this.onEdit,
  });

  User? get _sender {
    return participants.where((p) => p.id == message.senderId).firstOrNull;
  }

  String get _senderName => _sender?.name ?? message.senderId;

  String get _repliedSenderName {
    if (message.repliedTo == null) return '';
    final repliedSender = participants
        .where((p) => p.id == message.repliedTo!.senderId)
        .firstOrNull;
    return repliedSender?.name ?? message.repliedTo!.senderId;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: GestureDetector(
        onLongPress: () => _showContextMenu(context),
        child: Column(
          crossAxisAlignment:
              isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            // Sender name in groups
            if (!isMine && participants.length > 2)
              Padding(
                padding: const EdgeInsets.only(bottom: 2, left: 12, right: 12),
                child: Text(
                  _senderName,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.primaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),

            // Bubble
            IntrinsicWidth(
              child: Container(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.78,
                ),
                decoration: BoxDecoration(
                  color: isMine
                      ? AppTheme.primaryColor.withValues(alpha: 0.25)
                      : AppTheme.cardColor.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(16),
                    topRight: const Radius.circular(16),
                    bottomLeft: isMine
                        ? const Radius.circular(16)
                        : const Radius.circular(4),
                    bottomRight: isMine
                        ? const Radius.circular(4)
                        : const Radius.circular(16),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Reply indicator
                    if (message.repliedTo != null) _buildReplyPreview(context),

                    // Attachments
                    if (message.attachments.isNotEmpty) ...[
                      ...message.attachments
                          .map((att) => _buildAttachment(context, att)),
                      const SizedBox(height: 4),
                    ],

                    // Content
                    if (message.content.isNotEmpty)
                      SelectableText(
                        message.content,
                        style: TextStyle(
                          fontSize: 15,
                          color: isMine
                              ? AppTheme.textPrimary
                              : AppTheme.textPrimary,
                          height: 1.4,
                        ),
                      ),

                    // Edited indicator
                    if (message.isEdited)
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Text(
                          'تم التعديل',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppTheme.textMuted,
                          ),
                        ),
                      ),

                    // Reactions
                    if (message.reactions.isNotEmpty) _buildReactions(),

                    // Time and status
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _formatTime(message.createdAt),
                            style: TextStyle(
                              fontSize: 10,
                              color: isMine
                                  ? AppTheme.primaryLight
                                      .withValues(alpha: 0.7)
                                  : AppTheme.textMuted,
                            ),
                          ),
                          if (isMine) ...[
                            const SizedBox(width: 4),
                            Icon(
                              _statusIcon,
                              size: 14,
                              color: _statusColor,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData get _statusIcon {
    switch (message.status) {
      case 'READ':
        return Icons.done_all;
      case 'DELIVERED':
        return Icons.done_all;
      default:
        return Icons.done;
    }
  }

  Color get _statusColor {
    switch (message.status) {
      case 'READ':
        return AppTheme.primaryLight;
      case 'DELIVERED':
        return AppTheme.successColor;
      default:
        return AppTheme.textMuted;
    }
  }

  Widget _buildReplyPreview(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isMine
            ? Colors.black.withValues(alpha: 0.25)
            : AppTheme.borderColor.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(8),
        border: Border(
          right: BorderSide(
            color: AppTheme.primaryColor,
            width: 3,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'رد على ${_repliedSenderName}',
            style: TextStyle(
              fontSize: 11,
              color: AppTheme.primaryLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            message.repliedTo!.content.isNotEmpty
                ? message.repliedTo!.content
                : '[مرفق]',
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textSecondary,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildAttachment(BuildContext context, Attachment attachment) {
    if (attachment.isImage) {
      return GestureDetector(
        onTap: () => _showImagePreview(context, attachment.url),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.network(
            attachment.url,
            fit: BoxFit.cover,
            width: double.infinity,
            errorBuilder: (_, __, ___) => Container(
              height: 100,
              color: AppTheme.cardColor,
              child: const Center(
                child: Icon(Icons.broken_image, color: AppTheme.textMuted),
              ),
            ),
            loadingBuilder: (_, child, progress) {
              if (progress == null) return child;
              return Container(
                height: 150,
                color: AppTheme.cardColor,
                child: const Center(
                  child:
                      CircularProgressIndicator(color: AppTheme.primaryColor),
                ),
              );
            },
          ),
        ),
      );
    }

    if (attachment.isAudio) {
      return Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppTheme.cardColor,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.audiotrack,
                color: AppTheme.primaryColor, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    attachment.fileName,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppTheme.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    _formatFileSize(attachment.fileSize),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.play_circle_outline,
                color: AppTheme.primaryColor, size: 28),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getFileIcon(attachment.mimeType),
            color: AppTheme.primaryColor,
            size: 24,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  attachment.fileName,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textPrimary,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  _formatFileSize(attachment.fileSize),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReactions() {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        spacing: 2,
        runSpacing: 2,
        children: message.reactions.map((reaction) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.primaryLight.withValues(alpha: 0.3),
                width: 0.5,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(reaction.emoji, style: const TextStyle(fontSize: 14)),
                if (reaction.userName.isNotEmpty) ...[
                  const SizedBox(width: 2),
                  Text(
                    reaction.userName,
                    style: const TextStyle(
                      fontSize: 10,
                      color: AppTheme.textMuted,
                    ),
                  ),
                ],
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  void _showContextMenu(BuildContext context) {
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

              // Reply
              if (!isMine)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.reply, color: AppTheme.primaryColor),
                  ),
                  title: const Text('رد',
                      style: TextStyle(color: AppTheme.textPrimary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    onReply?.call(message);
                  },
                ),

              // Copy
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.copy, color: AppTheme.primaryColor),
                ),
                title: const Text('نسخ',
                    style: TextStyle(color: AppTheme.textPrimary)),
                onTap: () {
                  Navigator.pop(ctx);
                  Clipboard.setData(ClipboardData(text: message.content));
                },
              ),

              // Edit (only for own messages)
              if (isMine)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.warningColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.edit, color: AppTheme.warningColor),
                  ),
                  title: const Text('تعديل',
                      style: TextStyle(color: AppTheme.textPrimary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showEditDialog(context);
                  },
                ),

              // Delete (only for own messages)
              if (isMine)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.errorColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child:
                        const Icon(Icons.delete_outline, color: AppTheme.errorColor),
                  ),
                  title: const Text('حذف',
                      style: TextStyle(color: AppTheme.errorColor)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showDeleteDialog(context);
                  },
                ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _showEditDialog(BuildContext context) {
    final controller = TextEditingController(text: message.content);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surfaceColor,
        title: const Text('تعديل الرسالة',
            style: TextStyle(color: AppTheme.textPrimary)),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            hintText: 'عدل رسالتك...',
            hintStyle: TextStyle(color: AppTheme.textMuted),
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء',
                style: TextStyle(color: AppTheme.textMuted)),
          ),
          TextButton(
            onPressed: () {
              final newText = controller.text.trim();
              if (newText.isNotEmpty && newText != message.content) {
                onEdit?.call(message, newText);
              }
              Navigator.pop(ctx);
            },
            child: const Text('حفظ',
                style: TextStyle(color: AppTheme.primaryColor)),
          ),
        ],
      ),
    );
  }

  void _showDeleteDialog(BuildContext context) {
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
                  onDelete?.call(message);
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
                  child:
                      const Icon(Icons.delete_outline, color: AppTheme.textMuted),
                ),
                title: const Text('حذف لدي',
                    style: TextStyle(color: AppTheme.textPrimary)),
                subtitle: const Text('سيتم حذف الرسالة لك فقط',
                    style: TextStyle(color: AppTheme.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  // Implement "delete for me" if needed
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _showImagePreview(BuildContext context, String url) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: Center(
            child: InteractiveViewer(
              child: Image.network(url, fit: BoxFit.contain),
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) {
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
    if (diff.inDays == 1) return 'أمس';
    if (diff.inDays < 7) {
      return ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
          [date.weekday % 7];
    }
    return '${date.day}/${date.month}';
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  IconData _getFileIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('audio/')) return Icons.audiotrack;
    if (mimeType.startsWith('video/')) return Icons.videocam;
    if (mimeType.contains('pdf')) return Icons.picture_as_pdf;
    if (mimeType.contains('word') || mimeType.contains('document'))
      return Icons.description;
    if (mimeType.contains('excel') || mimeType.contains('spreadsheet'))
      return Icons.table_chart;
    if (mimeType.contains('presentation') || mimeType.contains('powerpoint'))
      return Icons.slideshow;
    if (mimeType.contains('zip') || mimeType.contains('rar'))
      return Icons.folder_zip;
    return Icons.insert_drive_file;
  }
}
