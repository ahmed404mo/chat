import 'dart:io';
import '../models/user.dart';
import 'api_service.dart';

class UserService {
  final ApiService _api = ApiService();

  Future<String?> uploadAvatar(File file) async {
    final result = await _api.uploadFile('/users/me/avatar', file: file);
    return result['url'] as String?;
  }

  Future<List<User>> getAllUsers() async {
    final data = await _api.get('/users') as Map<String, dynamic>;
    final list = data['users'] as List<dynamic>;
    return list.map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
  }
}
