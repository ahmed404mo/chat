import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../config/theme.dart';
import '../../providers/chat_provider.dart';

class ChatInput extends StatefulWidget {
  final String conversationId;

  const ChatInput({super.key, required this.conversationId});

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isComposing = false;
  bool _isRecording = false;
  bool _showEmojiPicker = false;
  String? _selectedFilePath;
  String? _selectedFileName;
  Timer? _typingTimer;

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    _typingTimer?.cancel();
    super.dispose();
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

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty && _selectedFilePath == null) return;

    final chat = context.read<ChatProvider>();
    await chat.sendMessage(
      conversationId: widget.conversationId,
      content: text,
      filePath: _selectedFilePath,
    );

    _textController.clear();
    setState(() {
      _isComposing = false;
      _selectedFilePath = null;
      _selectedFileName = null;
    });
    chat.stopTyping();
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

    if (result != null && result.files.single.path != null) {
      setState(() {
        _selectedFilePath = result.files.single.path;
        _selectedFileName = result.files.single.name;
      });
    }
  }

  Future<void> _toggleRecording() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.audio,
    );

    if (result != null && result.files.single.path != null) {
      setState(() {
        _selectedFilePath = result.files.single.path;
        _selectedFileName = 'تسجيل صوتي';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceColor,
        border: Border(
          top: BorderSide(color: AppTheme.borderColor, width: 0.5),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Selected file preview
          if (_selectedFilePath != null)
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
                    _selectedFileName?.contains('تسجيل') == true
                        ? Icons.audiotrack
                        : Icons.attach_file,
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
                  GestureDetector(
                    onTap: () => setState(() {
                      _selectedFilePath = null;
                      _selectedFileName = null;
                    }),
                    child: const Icon(Icons.close, size: 18, color: AppTheme.textMuted),
                  ),
                ],
              ),
            ),

          // Input row
          Padding(
            padding: EdgeInsets.only(
              left: 8,
              right: 8,
              bottom: MediaQuery.of(context).padding.bottom + 4,
              top: 4,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Attach file
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: _pickFile,
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Icon(
                        Icons.attach_file,
                        color: _selectedFilePath != null
                            ? AppTheme.primaryColor
                            : AppTheme.textMuted,
                        size: 24,
                      ),
                    ),
                  ),
                ),

                // Text field
                Expanded(
                  child: Container(
                    constraints: const BoxConstraints(maxHeight: 120),
                    decoration: BoxDecoration(
                      color: AppTheme.cardColor,
                      borderRadius: BorderRadius.circular(20),
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
                              fontSize: 15,
                            ),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 10,
                              ),
                              hintText: 'اكتب رسالة...',
                              hintStyle: TextStyle(color: AppTheme.textMuted),
                            ),
                          ),
                        ),

                        // Emoji button
                        Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(20),
                            onTap: () {
                              setState(() => _showEmojiPicker = !_showEmojiPicker);
                              if (_showEmojiPicker) _focusNode.unfocus();
                            },
                            child: const Padding(
                              padding: EdgeInsets.all(8),
                              child: Icon(
                                Icons.emoji_emotions_outlined,
                                color: AppTheme.textMuted,
                                size: 22,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(width: 4),

                // Send/Record button
                _isComposing || _selectedFilePath != null
                    ? Material(
                        color: AppTheme.primaryColor,
                        borderRadius: BorderRadius.circular(24),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: _sendMessage,
                          child: const Padding(
                            padding: EdgeInsets.all(10),
                            child: Icon(
                              Icons.send_rounded,
                              color: Colors.white,
                              size: 22,
                            ),
                          ),
                        ),
                      )
                    : Material(
                        color: AppTheme.cardColor,
                        borderRadius: BorderRadius.circular(24),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(24),
                          onTap: _toggleRecording,
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Icon(
                              _isRecording ? Icons.stop_rounded : Icons.mic,
                              color: _isRecording
                                  ? AppTheme.errorColor
                                  : AppTheme.textMuted,
                              size: 22,
                            ),
                          ),
                        ),
                      ),
              ],
            ),
          ),

          // Recording indicator
          if (_isRecording)
            Container(
              padding: const EdgeInsets.only(bottom: 8),
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
                    style: TextStyle(
                      color: AppTheme.errorColor,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
