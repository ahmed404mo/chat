import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../config/theme.dart';
import '../../models/conversation.dart';
import '../../models/user.dart';
import '../../providers/chat_provider.dart';

class ChatInput extends StatefulWidget {
  final String conversationId;
  final Message? repliedTo;
  final List<User> participants;
  final VoidCallback? onCancelReply;

  const ChatInput({
    super.key,
    required this.conversationId,
    this.repliedTo,
    this.participants = const [],
    this.onCancelReply,
  });

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  final _audioRecorder = AudioRecorder();
  bool _isComposing = false;
  bool _isRecording = false;
  String? _selectedFilePath;
  String? _selectedFileName;
  Timer? _typingTimer;
  String? _recordedPath;
  OverlayEntry? _mentionOverlay;
  final _mentionLayerLink = LayerLink();
  int _mentionIndex = -1;
  List<User> _filteredUsers = [];
  String _mentionQuery = '';

  @override
  void initState() {
    super.initState();
    _textController.addListener(_onMentionChanged);
  }

  @override
  void dispose() {
    _textController.removeListener(_onMentionChanged);
    _textController.dispose();
    _focusNode.dispose();
    _audioRecorder.dispose();
    _typingTimer?.cancel();
    _hideMentionOverlay();
    super.dispose();
  }

  void _onMentionChanged() {
    final text = _textController.text;
    final cursorPos = _textController.selection.baseOffset;
    if (cursorPos < 0) {
      _hideMentionOverlay();
      return;
    }

    final beforeCursor = text.substring(0, cursorPos);
    final atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex == -1 || (atIndex > 0 && beforeCursor[atIndex - 1] != ' ' && beforeCursor[atIndex - 1] != '\n')) {
      _hideMentionOverlay();
      return;
    }

    final query = beforeCursor.substring(atIndex + 1);
    if (!RegExp(r'^[a-zA-Z\u0600-\u06FF]*$').hasMatch(query)) {
      _hideMentionOverlay();
      return;
    }

    _mentionQuery = query;
    final lower = query.toLowerCase();
    _filteredUsers = widget.participants
        .where((u) => u.name.toLowerCase().contains(lower))
        .take(5)
        .toList();

    if (_filteredUsers.isEmpty) {
      _hideMentionOverlay();
      return;
    }

    if (_mentionOverlay == null) {
      _showMentionOverlay();
    } else {
      _mentionOverlay!.markNeedsBuild();
    }
  }

  void _showMentionOverlay() {
    _hideMentionOverlay();
    _mentionOverlay = OverlayEntry(
      builder: (context) {
        return Positioned(
          width: 200,
          child: CompositedTransformFollower(
            link: _mentionLayerLink,
            targetAnchor: Alignment.topLeft,
            followerAnchor: Alignment.bottomLeft,
            child: Material(
              elevation: 4,
              borderRadius: BorderRadius.circular(8),
              color: AppTheme.surfaceColor,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 180),
                child: ListView.builder(
                  padding: EdgeInsets.zero,
                  itemCount: _filteredUsers.length,
                  itemBuilder: (_, i) {
                    final u = _filteredUsers[i];
                    return InkWell(
                      onTap: () => _insertMention(u),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.2),
                              child: Text(u.initials, style: const TextStyle(color: AppTheme.primaryColor, fontSize: 10)),
                            ),
                            const SizedBox(width: 8),
                            Text(u.name, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        );
      },
    );
    Overlay.of(context).insert(_mentionOverlay!);
  }

  void _hideMentionOverlay() {
    _mentionOverlay?.remove();
    _mentionOverlay = null;
  }

  void _insertMention(User user) {
    final text = _textController.text;
    final cursorPos = _textController.selection.baseOffset;
    final beforeCursor = text.substring(0, cursorPos);
    final atIndex = beforeCursor.lastIndexOf('@');
    final newText = '${text.substring(0, atIndex)}@${user.name} ${text.substring(cursorPos)}';
    _textController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: atIndex + user.name.length + 2),
    );
    _hideMentionOverlay();
  }

  void _onTextChanged(String text) {
    setState(() => _isComposing = text.trim().isNotEmpty);

    final chat = context.read<ChatProvider>();
    chat.startTyping();

    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 2), () {
      chat.stopTyping();
    });
  }

  String _repliedToSenderName(String senderId) {
    final sender = widget.participants.where((p) => p.id == senderId).firstOrNull;
    return sender?.name ?? senderId;
  }

  Widget _buildMicButton() {
    return AnimatedScale(
      scale: _isRecording ? 1.15 : 1.0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: _isRecording ? AppTheme.errorColor : AppTheme.primaryColor.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(28),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(28),
          onTap: _toggleRecording,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Icon(
              _isRecording ? Icons.stop_rounded : Icons.mic,
              color: _isRecording ? Colors.white : AppTheme.primaryColor,
              size: 26,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    final filePath = _selectedFilePath ?? _recordedPath;
    if (text.isEmpty && filePath == null) return;

    final chat = context.read<ChatProvider>();
    await chat.sendMessage(
      conversationId: widget.conversationId,
      content: text,
      repliedToId: widget.repliedTo?.id,
      filePath: filePath,
    );

    _textController.clear();
    setState(() {
      _isComposing = false;
      _selectedFilePath = null;
      _selectedFileName = null;
      _recordedPath = null;
    });
    chat.stopTyping();
    widget.onCancelReply?.call();
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: [
        'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx',
        'xls', 'xlsx', 'ppt', 'pptx', 'mp3', 'wav', 'ogg',
        'zip', 'rar', 'txt',
      ],
    );

    if (result != null) {
      String? path = result.files.single.path;
      if (path == null) {
        final bytes = result.files.single.bytes;
        if (bytes != null) {
          final dir = await getTemporaryDirectory();
          final file = File('${dir.path}/${result.files.single.name}');
          await file.writeAsBytes(bytes);
          path = file.path;
        }
      }
      if (path != null) {
        setState(() {
          _selectedFilePath = path;
          _selectedFileName = result.files.single.name;
          _recordedPath = null;
        });
      }
    }
  }

  Future<void> _toggleRecording() async {
    if (_isRecording) {
      try {
        final path = await _audioRecorder.stop();
        setState(() {
          _isRecording = false;
          if (path != null && path.isNotEmpty) {
            _recordedPath = path;
            _selectedFileName = 'تسجيل صوتي';
            _selectedFilePath = null;
          }
        });
      } catch (e) {
        setState(() => _isRecording = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('خطأ في إيقاف التسجيل: $e')),
          );
        }
      }
    } else {
      try {
        if (!await _audioRecorder.hasPermission()) {
          final status = await Permission.microphone.request();
          if (!status.isGranted) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('يرجى السماح بتسجيل الصوت من الإعدادات')),
              );
            }
            return;
          }
        }

        final dir = await getTemporaryDirectory();
        final path = '${dir.path}/recording_${DateTime.now().millisecondsSinceEpoch}.m4a';
        await _audioRecorder.start(
          const RecordConfig(encoder: AudioEncoder.aacLc),
          path: path,
        );
        setState(() => _isRecording = true);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('تعذر بدء التسجيل: $e')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _mentionLayerLink,
      child: Container(
        decoration: const BoxDecoration(
          color: AppTheme.surfaceColor,
          border: Border(
            top: BorderSide(color: AppTheme.borderColor, width: 0.5),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Reply preview
            if (widget.repliedTo != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: const BoxDecoration(
                  color: AppTheme.cardColor,
                  border: Border(
                    bottom: BorderSide(color: AppTheme.borderColor, width: 0.5),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 3,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                            Text(
                              'رد على ${_repliedToSenderName(widget.repliedTo!.senderId)}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppTheme.primaryColor,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          Text(
                            widget.repliedTo!.content.isNotEmpty
                                ? widget.repliedTo!.content
                                : '[ملف]',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.textMuted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: widget.onCancelReply,
                      child: const Icon(Icons.close, size: 18, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ),

            // Selected file/recording preview
            if (_selectedFilePath != null || _recordedPath != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: const BoxDecoration(
                  color: AppTheme.cardColor,
                  border: Border(
                    bottom: BorderSide(color: AppTheme.borderColor, width: 0.5),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _recordedPath != null ? Icons.audiotrack : Icons.attach_file,
                      size: 18,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _selectedFileName ?? '',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (_recordedPath != null)
                      TextButton.icon(
                        onPressed: _toggleRecording,
                        icon: const Icon(Icons.mic, size: 16),
                        label: const Text('إعادة', style: TextStyle(fontSize: 12)),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      ),
                    GestureDetector(
                      onTap: () => setState(() {
                        _selectedFilePath = null;
                        _selectedFileName = null;
                        _recordedPath = null;
                      }),
                      child: const Icon(Icons.close, size: 18, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ),

            // Recording indicator
            if (_isRecording)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.errorColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'تسجيل...',
                      style: TextStyle(color: AppTheme.errorColor, fontSize: 12),
                    ),
                  ],
                ),
              ),

            // Input row
            Padding(
              padding: EdgeInsets.only(
                left: 8,
                right: 8,
                bottom: MediaQuery.of(context).padding.bottom + 8,
                top: 8,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Attach file
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(24),
                      onTap: _pickFile,
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Icon(
                          Icons.attach_file,
                          color: _selectedFilePath != null
                              ? AppTheme.primaryColor
                              : AppTheme.textMuted,
                          size: 26,
                        ),
                      ),
                    ),
                  ),

                  // Text field
                  Expanded(
                    child: Container(
                      constraints: const BoxConstraints(maxHeight: 200),
                      decoration: BoxDecoration(
                        color: AppTheme.cardColor,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: _isComposing
                              ? AppTheme.primaryColor.withValues(alpha: 0.5)
                              : AppTheme.borderColor,
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _textController,
                              focusNode: _focusNode,
                              textInputAction: TextInputAction.send,
                              maxLines: null,
                              onChanged: _onTextChanged,
                              onSubmitted: _isComposing ? (_) => _sendMessage() : null,
                              style: const TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 16,
                              ),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                                hintText: 'اكتب رسالة...',
                                hintStyle: TextStyle(color: AppTheme.textMuted),
                              ),
                            ),
                          ),

                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 4),

                  // Send/Record button
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    switchInCurve: Curves.easeOut,
                    switchOutCurve: Curves.easeIn,
                    transitionBuilder: (child, animation) {
                      return ScaleTransition(scale: animation, child: child);
                    },
                    child: _isComposing || _selectedFilePath != null || _recordedPath != null
                        ? Material(
                            key: const ValueKey('send'),
                            color: AppTheme.primaryColor,
                            borderRadius: BorderRadius.circular(28),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(28),
                              onTap: _sendMessage,
                              child: const Padding(
                                padding: EdgeInsets.all(14),
                                child: Icon(
                                  Icons.send_rounded,
                                  color: Colors.white,
                                  size: 26,
                                ),
                              ),
                            ),
                          )
                        : _buildMicButton(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
