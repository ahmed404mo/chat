import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/constants.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _cachedToken;

  Future<String?> get token async {
    _cachedToken ??= await _storage.read(key: 'jwt_token');
    return _cachedToken;
  }

  Future<void> setToken(String? t) async {
    _cachedToken = t;
    if (t != null) {
      await _storage.write(key: 'jwt_token', value: t);
    } else {
      await _storage.delete(key: 'jwt_token');
    }
  }

  Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (auth) {
      final t = await token;
      if (t != null) headers['Authorization'] = 'Bearer $t';
    }
    return headers;
  }

  Future<dynamic> get(String path, {bool auth = true}) async {
    final url = Uri.parse('${AppConstants.apiPrefix}$path');
    final response = await http.get(url, headers: await _headers(auth: auth));
    return _handleResponse(response);
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body, bool auth = true}) async {
    final url = Uri.parse('${AppConstants.apiPrefix}$path');
    final response = await http.post(
      url,
      headers: await _headers(auth: auth),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Future<dynamic> patch(String path, {Map<String, dynamic>? body, bool auth = true}) async {
    final url = Uri.parse('${AppConstants.apiPrefix}$path');
    final response = await http.patch(
      url,
      headers: await _headers(auth: auth),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  Future<dynamic> delete(String path, {Map<String, dynamic>? body, bool auth = true}) async {
    final url = Uri.parse('${AppConstants.apiPrefix}$path');
    final request = http.Request('DELETE', url);
    request.headers.addAll(await _headers(auth: auth));
    if (body != null) request.body = jsonEncode(body);
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> uploadFile(
    String path, {
    required File file,
    String fieldName = 'file',
  }) async {
    final url = Uri.parse('${AppConstants.apiPrefix}$path');
    final request = http.MultipartRequest('POST', url);
    final t = await token;
    if (t != null) request.headers['Authorization'] = 'Bearer $t';
    request.files.add(await http.MultipartFile.fromPath(fieldName, file.path));
    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    return _handleResponse(response) as Map<String, dynamic>;
  }

  dynamic _handleResponse(http.Response response) {
    dynamic body;
    try {
      body = response.body.isNotEmpty ? jsonDecode(response.body) : null;
    } catch (_) {
      throw ApiException(
        response.statusCode >= 200 && response.statusCode < 300
            ? 'استجابة غير متوقعة من الخادم'
            : 'خطأ في الاتصال بالخادم (${response.statusCode})',
        statusCode: response.statusCode,
      );
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body is Map && body.containsKey('data')) return body['data'];
      return body;
    }

    final message = body is Map ? (body['error'] ?? body['message'] ?? 'خطأ في الخادم') as String : 'خطأ في الخادم';
    throw ApiException(message, statusCode: response.statusCode);
  }
}
