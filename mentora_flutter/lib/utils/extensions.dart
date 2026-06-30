import 'package:intl/intl.dart';
import 'package:flutter/material.dart';

extension DateTimeFormatting on DateTime {
  String get timeString => DateFormat('HH:mm').format(this);
  String get dateString => DateFormat('yyyy/MM/dd').format(this);
  String get relativeTime {
    final now = DateTime.now();
    final diff = now.difference(this);
    if (diff.inSeconds < 60) return 'الآن';
    if (diff.inMinutes < 60) return 'منذ ${diff.inMinutes} د';
    if (diff.inHours < 24) return 'منذ ${diff.inHours} س';
    if (diff.inDays < 7) return 'منذ ${diff.inDays} ي';
    return dateString;
  }
}

extension StringCasing on String {
  String get capitalize => '${this[0].toUpperCase()}${substring(1)}';
}

extension ContextExtensions on BuildContext {
  bool get isRtl => Directionality.of(this) == TextDirection.rtl;
  Size get screenSize => MediaQuery.of(this).size;
  bool get isMobile => screenSize.width < 768;
  double get keyboardHeight => MediaQuery.of(this).viewInsets.bottom;
}
