class AppConstants {
  static const String appName = 'Mentora';
  static const String baseUrl = 'https://chat-five-rho-38.vercel.app';
  static const String apiPrefix = '$baseUrl/api';
  static const String pusherKey = '3fae703aa9755ff411b6';
  static const String pusherCluster = 'eu';
  static const int messagesPerPage = 50;
  static const int maxFileSize = 50 * 1024 * 1024;
  static const String defaultGroupName = 'عام';
  static const Duration typingDebounce = Duration(milliseconds: 1500);
  static const Duration messageReadDebounce = Duration(milliseconds: 500);
}
