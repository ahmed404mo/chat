import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/chat_provider.dart';
import '../../providers/auth_provider.dart';

class JoinModal extends StatefulWidget {
  const JoinModal({super.key});

  @override
  State<JoinModal> createState() => _JoinModalState();
}

class _JoinModalState extends State<JoinModal> {
  final _codeController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      final conv = await context.read<ChatProvider>().joinViaCode(code);
      if (conv != null && mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم الانضمام إلى ${conv.displayName(context.read<AuthProvider>().user?.id ?? '')}'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('خطأ: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppTheme.surfaceColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: AppTheme.accentColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.login,
                color: AppTheme.accentColor,
                size: 28,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'انضم إلى محادثة',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'أدخل رمز الدعوة للانضمام إلى المحادثة',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _codeController,
              decoration: const InputDecoration(
                labelText: 'رمز الدعوة',
                hintText: 'أدخل الرمز',
                prefixIcon: Icon(Icons.vpn_key),
              ),
              textDirection: TextDirection.ltr,
              textAlign: TextAlign.center,
              autofocus: true,
              style: const TextStyle(
                fontSize: 18,
                letterSpacing: 2,
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.bold,
              ),
              onSubmitted: (_) => _join(),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('إلغاء'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _join,
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('انضمام'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
