import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/conversation.dart';

class MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMine;
  final void Function(Message)? onReply;
  final void Function(Message)? onDelete;
  final void Function(Message, String)? onReact;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isMine,
    this.onReply,
    this.onDelete,
    this.onReact,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: GestureDetector(
        onLongPress: () => _showContextMenu(context),
        child: Align(
          alignment: isMine ? Alignment.centerLeft : Alignment.centerRight,
          child: Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            decoration: BoxDecoration(
              color: isMine ? AppTheme.messageSent : AppTheme.messageReceived,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: isMine
                    ? const Radius.circular(4)
                    : const Radius.circular(16),
                bottomRight: isMine
                    ? const Radius.circular(16)
                    : const Radius.circular(4),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Reply indicator
                if (message.repliedTo != null)
                  _buildReplyPreview(context),

                // Attachments
                if (message.attachments.isNotEmpty) ...[
                  ...message.attachments.map((att) => _buildAttachment(context, att)),
                  const SizedBox(height: 4),
                ],

                // Content
                if (message.content.isNotEmpty)
                  Text(
                    message.content,
                    style: TextStyle(
                      fontSize: 15,
                      color: isMine ? AppTheme.textPrimary : AppTheme.textPrimary,
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
                if (message.reactions.isNotEmpty)
                  _buildReactions(),

                // Time and status
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatTime(message.createdAt),
                        style: TextStyle(
                          fontSize: 11,
                          color: isMine
                              ? AppTheme.primaryLight.withValues(alpha: 0.7)
                              : AppTheme.textMuted,
                        ),
                      ),
                      if (isMine) ...[
                        const SizedBox(width: 4),
                        Icon(
                          message.status == 'READ'
                              ? Icons.done_all
                              : message.status == 'DELIVERED'
                                  ? Icons.done_all
                                  : Icons.done,
                          size: 14,
                          color: message.status == 'READ'
                              ? AppTheme.primaryLight
                              : isMine
                                  ? AppTheme.primaryLight.withValues(alpha: 0.5)
                                  : AppTheme.textMuted,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReplyPreview(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isMine
            ? Colors.black.withValues(alpha: 0.2)
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
            'رد على رسالة',
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            message.repliedTo!.content.isNotEmpty
                ? message.repliedTo!.content
                : '[مرفق]',
            style: const TextStyle(
              fontSize: 13,
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
                  child: CircularProgressIndicator(color: AppTheme.primaryColor),
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
          children: [
            const Icon(Icons.audiotrack, color: AppTheme.primaryColor, size: 20),
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

    // Generic file attachment
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
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
        children: message.reactions.map((reaction) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: AppTheme.cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.borderColor,
                width: 0.5,
              ),
            ),
            child: Text(
              reaction.emoji,
              style: const TextStyle(fontSize: 16),
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
              if (!isMine)
                ListTile(
                  leading: const Icon(Icons.reply, color: AppTheme.textPrimary),
                  title: const Text('رد', style: TextStyle(color: AppTheme.textPrimary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    onReply?.call(message);
                  },
                ),
              ListTile(
                leading: const Icon(Icons.copy, color: AppTheme.textPrimary),
                title: const Text('نسخ', style: TextStyle(color: AppTheme.textPrimary)),
                onTap: () {
                  Navigator.pop(ctx);
                  // Copy to clipboard
                },
              ),
              if (isMine)
                ListTile(
                  leading: const Icon(Icons.edit, color: AppTheme.textPrimary),
                  title: const Text('تعديل', style: TextStyle(color: AppTheme.textPrimary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    // Edit message
                  },
                ),
              if (isMine)
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: AppTheme.errorColor),
                  title: const Text('حذف', style: TextStyle(color: AppTheme.errorColor)),
                  onTap: () {
                    Navigator.pop(ctx);
                    onDelete?.call(message);
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
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
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
