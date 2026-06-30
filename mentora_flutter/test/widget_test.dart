import 'package:flutter_test/flutter_test.dart';
import 'package:mentora/main.dart';

void main() {
  testWidgets('Mentora app starts', (WidgetTester tester) async {
    await tester.pumpWidget(const MentoraApp());
    expect(find.text('Mentora'), findsOneWidget);
  });
}
