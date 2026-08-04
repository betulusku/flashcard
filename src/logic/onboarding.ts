import AsyncStorage from '@react-native-async-storage/async-storage';

import {loadSurvey, saveSurvey} from './survey';

export const onboardingCompleteKey = 'fluent:onboarding-complete';

export async function loadOnboardingComplete() {
  try {
    const value = await AsyncStorage.getItem(onboardingCompleteKey);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete() {
  await AsyncStorage.setItem(onboardingCompleteKey, 'true');
  const answers = await loadSurvey();
  await saveSurvey(answers, {onboardingComplete: true});
}

export async function hydrateOnboardingComplete(remote?: boolean | null) {
  if (remote === true) {
    await AsyncStorage.setItem(onboardingCompleteKey, 'true');
    return true;
  }
  return loadOnboardingComplete();
}
