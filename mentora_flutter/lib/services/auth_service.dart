import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();

  Future<User> login(String email, String password) async {
    final data = await _api.post('/auth/login', body: {
      'email': email,
      'password': password,
    }, auth: false) as Map<String, dynamic>;

    final token = data['token'] as String;
    await _api.setToken(token);

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<User> register(String name, String email, String password) async {
    final data = await _api.post('/auth/register', body: {
      'name': name,
      'email': email,
      'password': password,
    }, auth: false) as Map<String, dynamic>;

    final token = data['token'] as String;
    await _api.setToken(token);

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<User> getCurrentUser() async {
    final data = await _api.get('/users/me') as Map<String, dynamic>;
    final userData = data['user'] as Map<String, dynamic>;
    return User.fromJson(userData);
  }

  Future<void> logout() async {
    await _api.setToken(null);
  }

  Future<bool> isLoggedIn() async {
    final token = await _api.token;
    return token != null && token.isNotEmpty;
  }
}
