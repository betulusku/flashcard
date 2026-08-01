import Tts from 'react-native-tts';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export function speak(text: string) {
  Tts.stop();
  Tts.setDefaultLanguage('en-US');
  Tts.speak(text);
}

export function haptic(type: 'selection' | 'success' | 'impact' = 'selection') {
  const method = type === 'success' ? 'notificationSuccess' : type === 'impact' ? 'impactMedium' : 'selection';
  ReactNativeHapticFeedback.trigger(method, {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
}
