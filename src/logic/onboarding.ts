import AsyncStorage from '@react-native-async-storage/async-storage';

import type {FluentUser} from '../services/api';
import type {SurveyAnswers} from '../types/onboarding';
import {emptySurvey, loadSurvey, saveSurvey, surveyFromUser} from './survey';

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
  await AsyncStorage.removeItem(forceOnboardingKey).catch(() => undefined);
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

/** Survey answers that mean the user already finished personalization. */
export function surveyLooksComplete(
  answers: Pick<SurveyAnswers, 'level' | 'goals' | 'daily' | 'weekly'> | null | undefined,
): boolean {
  if (!answers) return false;
  return Boolean(
    answers.level &&
      Array.isArray(answers.goals) &&
      answers.goals.length > 0 &&
      answers.daily &&
      answers.weekly,
  );
}

export function userSurveyLooksComplete(user: FluentUser | null | undefined): boolean {
  if (!user) return false;
  return surveyLooksComplete({
    level: (user.level ?? null) as SurveyAnswers['level'],
    goals: (user.goals ?? []) as SurveyAnswers['goals'],
    daily: (user.daily ?? null) as SurveyAnswers['daily'],
    weekly: (user.weekly ?? null) as SurveyAnswers['weekly'],
  });
}

/**
 * Resolve whether onboarding is done for cold start.
 * Prefers remote flag, keeps local truth, and infers from a filled survey
 * so returning users never get dumped back into Welcome/Survey.
 */
export async function hydrateOnboardingComplete(remote?: boolean | null, user?: FluentUser | null) {
  if (__DEV__) {
    const forceOnboarding = await AsyncStorage.getItem(forceOnboardingKey).catch(() => null);
    if (forceOnboarding === 'true') return false;
  }

  const local = await loadOnboardingComplete();
  const inferred = userSurveyLooksComplete(user);
  const complete = remote === true || local || inferred;

  if (!complete) return false;

  await AsyncStorage.setItem(onboardingCompleteKey, 'true');

  // Repair remote flag without wiping survey fields with an empty local shell.
  if (remote !== true) {
    const localAnswers = await loadSurvey();
    const fromUser = surveyFromUser(user);
    const answers: SurveyAnswers = surveyLooksComplete(localAnswers)
      ? localAnswers
      : {
          ...emptySurvey,
          level: fromUser?.level ?? null,
          goals: fromUser?.goals ?? [],
          occupation: fromUser?.occupation ?? null,
          occupationText: fromUser?.occupationText ?? null,
          daily: fromUser?.daily ?? null,
          weekly: fromUser?.weekly ?? null,
        };
    if (surveyLooksComplete(answers)) {
      saveSurvey(answers, {onboardingComplete: true}).catch(() => undefined);
    }
  }

  return true;
}
