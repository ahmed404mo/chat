import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/conversation.dart';
import '../../models/user.dart';

class MessageInfoSheet extends StatelessWidget {
  final Message message;
  final List<User> participants;
  final bool hasAudio;

  const MessageInfoSheet({
    super.key,
    required this.message,
    required this.participants,
    this.hasAudio = false,
  });

  String _userName(String userId) {
    return participants
        .where((p) => p.id == userId)
        .firstOrNull
        ?.name ?? userId;
  }

  String _formatDateTime(DateTime dt) {
    final time = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    final date = '${dt.day}/${dt.month}/${dt.year}';
    return '$date $time';
  }

  @override
  Widget build(BuildContext context) {
    final seenBy = message.seenBy;
    final listenedBy = message.listenedBy;

    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.textMuted.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'تفاصيل الرسالة',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              _buildInfoRow('الحالة', _statusText(message.status)),
              _buildInfoRow('أرسلت في', _formatDateTime(message.createdAt)),
              if (message.isEdited)
                _buildInfoRow('تم التعديل', _formatDateTime(message.updatedAt)),
              if (message.attachments.isNotEmpty) ...[
                const SizedBox(height: 4),
                const Text(
                  'المرفقات',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                ...message.attachments.map((a) => Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    a.fileName,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textMuted,
                    ),
                  ),
                )),
              ],
              const Divider(height: 24),
              _buildSeenBySection(seenBy),
              if (hasAudio && listenedBy.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildListenedBySection(listenedBy),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textMuted,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textPrimary,
              ),
              textDirection: TextDirection.ltr,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSeenBySection(List<String> seenBy) {
    if (seenBy.isEmpty) {
      return const Text(
        'لا توجد معلومات عن المشاهدة',
        style: TextStyle(
          fontSize: 13,
          color: AppTheme.textMuted,
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'تمت المشاهدة (${seenBy.length})',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        ...seenBy.map((userId) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                child: Text(
                  (_userName(userId).isNotEmpty ? _userName(userId)[0] : '?').toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                _userName(userId),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }

  Widget _buildListenedBySection(List<String> listenedBy) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'تم الاستماع (${listenedBy.length})',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        ...listenedBy.map((userId) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: AppTheme.warningColor.withValues(alpha: 0.2),
                child: const Icon(
                  Icons.headphones,
                  size: 14,
                  color: AppTheme.warningColor,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                _userName(userId),
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }

  String _statusText(String status) {
    switch (status) {
      case 'READ':
        return 'تمت القراءة';
      case 'DELIVERED':
        return 'تم التوصيل';
      case 'SENT':
        return 'تم الإرسال';
      default:
        return status;
    }
  }
}
