import AsyncStorage from '@react-native-async-storage/async-storage';

import {loadSurvey, saveSurvey} from './survey';

export const onboardingCompleteKey = 'fluent:onboarding-complete';
export const forceOnboardingKey = 'fluent:debug-force-onboarding';

export async function loadOnboardingComplete() {
  try {
    const value = await AsyncStorage.getItem(onboardingCompleteKey);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete() {
  await AsyncStorage.multiRemove([forceOnboardingKey]).catch(() => undefined);
  await AsyncStorage.setItem(onboardingCompleteKey, 'true');
  const answers = await loadSurvey();
  await saveSurvey(answers, {onboardingComplete: true});
}

/** Dev helper: drop the completed flag so the next cold start opens Welcome. */
export async function resetOnboarding() {
  await AsyncStorage.setItem(forceOnboardingKey, 'true');
  await AsyncStorage.removeItem(onboardingCompleteKey);
  const answers = await loadSurvey();
  await saveSurvey(answers, {onboardingComplete: false});
}

export async function hydrateOnboardingComplete(remote?: boolean | null) {
  if (__DEV__) {
    const forceOnboarding = await AsyncStorage.getItem(forceOnboardingKey).catch(() => null);
    if (forceOnboarding === 'true') return false;
  }
  if (remote === true) {
    await AsyncStorage.setItem(onboardingCompleteKey, 'true');
    return true;
  }
  return loadOnboardingComplete();
}
