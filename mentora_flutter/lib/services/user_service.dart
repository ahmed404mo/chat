import 'dart:io';
import 'api_service.dart';

class UserService {
  final ApiService _api = ApiService();

  Future<String?> uploadAvatar(File file) async {
    final result = await _api.uploadFile('/users/me/avatar', file: file);
    return result['url'] as String?;
  }
}
