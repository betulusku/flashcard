import AsyncStorage from '@react-native-async-storage/async-storage';

export const autoSpeakKey = 'fluent:auto-speak';
export const appLanguageKey = 'fluent:app-language';

export type AppLanguage = 'en' | 'tr';

export const languageLabels: Record<AppLanguage, string> = {
  en: 'English',
  tr: 'Türkçe',
};

/** Hearing every new word is the default; the toggle is for quiet places. */
export async function loadAutoSpeak(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(autoSpeakKey);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export async function saveAutoSpeak(enabled: boolean) {
  try {
    await AsyncStorage.setItem(autoSpeakKey, String(enabled));
  } catch {
    // A failed write only costs the preference on the next launch.
  }
}

export async function loadAppLanguage(): Promise<AppLanguage> {
  try {
    const stored = await AsyncStorage.getItem(appLanguageKey);
    return stored === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

export async function saveAppLanguage(language: AppLanguage) {
  try {
    await AsyncStorage.setItem(appLanguageKey, language);
  } catch {
    // Preference only.
  }
}
