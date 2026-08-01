import Tts from 'react-native-tts';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// The engine is async on a cold start, and iOS mutes AVSpeech when the
// hardware silent switch is on unless we explicitly ignore it.
let ready: Promise<void> | null = null;

export function warmUpSpeech() {
  if (!ready) {
    ready = Tts.getInitStatus()
      .then(() =>
        Promise.all([
          Tts.setIgnoreSilentSwitch('ignore'),
          Tts.setDefaultLanguage('en-US'),
          Tts.setDefaultRate(0.48),
        ]),
      )
      .then(() => undefined)
      .catch(() => {
        // Reset so the next tap can try again after a failed init.
        ready = null;
      });
  }
  return ready ?? Promise.resolve();
}

function safeStop() {
  try {
    const result = Tts.stop();
    if (result && typeof (result as Promise<boolean>).catch === 'function') {
      return (result as Promise<boolean>).catch(() => false);
    }
  } catch {
    // Native stop can still reject on a cold bridge; never surface it.
  }
  return Promise.resolve(false);
}

export async function speak(text: string) {
  const utterance = text.trim();
  if (!utterance) return;
  await warmUpSpeech();
  await safeStop();
  try {
    Tts.speak(utterance);
  } catch {
    // Pronunciation is helpful, never load-bearing.
  }
}

export function stopSpeaking() {
  safeStop();
}

export function haptic(type: 'selection' | 'success' | 'impact' = 'selection') {
  const method = type === 'success' ? 'notificationSuccess' : type === 'impact' ? 'impactMedium' : 'selection';
  ReactNativeHapticFeedback.trigger(method, {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
}
