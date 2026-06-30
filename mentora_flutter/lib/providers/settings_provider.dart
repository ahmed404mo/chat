import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider extends ChangeNotifier {
  static const String _notifKey = 'notifications_enabled';

  bool _notificationsEnabled = true;

  bool get notificationsEnabled => _notificationsEnabled;

  SettingsProvider() {
    _init();
  }

  Future<void> _init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _notificationsEnabled = prefs.getBool(_notifKey) ?? true;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> toggleNotifications() async {
    _notificationsEnabled = !_notificationsEnabled;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_notifKey, _notificationsEnabled);
  }
}
