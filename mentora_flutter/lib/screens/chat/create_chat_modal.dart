import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../providers/chat_provider.dart';
import '../../services/chat_service.dart';
import '../../services/user_service.dart';

class CreateChatModal extends StatefulWidget {
  final bool isGroup;

  const CreateChatModal({super.key, required this.isGroup});

  @override
  State<CreateChatModal> createState() => _CreateChatModalState();
}

class _CreateChatModalState extends State<CreateChatModal> {
  final _titleController = TextEditingController();
  final _searchController = TextEditingController();
  final _chatService = ChatService();
  final _userService = UserService();
  bool _isLoading = false;
  List<User> _allUsers = [];
  Set<String> _selectedIds = {};
  bool _usersLoaded = false;

  @override
  void initState() {
    super.initState();
    if (widget.isGroup) _loadUsers();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadUsers() async {
    try {
      final users = await _userService.getAllUsers();
      final currentId = context.read<AuthProvider>().user?.id;
      if (mounted) {
        setState(() {
          _allUsers = users.where((u) => u.id != currentId).toList();
          _usersLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _usersLoaded = true);
      }
    }
  }

  List<User> get _filteredUsers {
    if (_searchController.text.isEmpty) return _allUsers;
    final q = _searchController.text.toLowerCase();
    return _allUsers.where((u) => u.name.toLowerCase().contains(q)).toList();
  }

  Future<void> _create() async {
    if (_titleController.text.trim().isEmpty) return;
    if (widget.isGroup && _selectedIds.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      await _chatService.createConversation(
        title: _titleController.text.trim(),
        isGroup: widget.isGroup,
        memberIds: _selectedIds.isNotEmpty ? _selectedIds.toList() : null,
      );
      await context.read<ChatProvider>().loadConversations();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ: $e')),
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
            Text(
              widget.isGroup ? 'مجموعة جديدة' : 'محادثة جديدة',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: widget.isGroup ? 'اسم المجموعة' : 'الاسم',
                hintText: widget.isGroup ? 'أدخل اسم المجموعة' : 'أدخل اسم المحادثة',
              ),
              autofocus: true,
            ),
            if (widget.isGroup) ...[
              const SizedBox(height: 16),
              TextField(
                controller: _searchController,
                decoration: const InputDecoration(
                  labelText: 'بحث عن أعضاء',
                  hintText: 'اسم العضو...',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              if (!_usersLoaded)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else if (_filteredUsers.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'لا يوجد أعضاء متاحين',
                    style: TextStyle(color: AppTheme.textMuted),
                  ),
                )
              else
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 200),
                  child: ListView(
                    shrinkWrap: true,
                    children: _filteredUsers.map((u) {
                      final selected = _selectedIds.contains(u.id);
                      return CheckboxListTile(
                        dense: true,
                        value: selected,
                        title: Text(u.name, style: const TextStyle(fontSize: 14, color: AppTheme.textPrimary)),
                        subtitle: Text(u.role, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                        activeColor: AppTheme.primaryColor,
                        checkColor: Colors.white,
                        onChanged: (v) {
                          setState(() {
                            if (v == true) {
                              _selectedIds.add(u.id);
                            } else {
                              _selectedIds.remove(u.id);
                            }
                          });
                        },
                      );
                    }).toList(),
                  ),
                ),
              if (_selectedIds.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    '${_selectedIds.length} أعضاء مختارين',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.primaryLight,
                    ),
                  ),
                ),
            ],
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
                    onPressed: _isLoading ||
                            (widget.isGroup && _selectedIds.isEmpty)
                        ? null
                        : _create,
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('إنشاء'),
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
