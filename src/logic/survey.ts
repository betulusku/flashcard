import AsyncStorage from '@react-native-async-storage/async-storage';

import {updateSurvey as updateSurveyRemote, type FluentUser} from '../services/api';
import type {SurveyAnswers} from '../types/onboarding';
import {loadUserId} from './userId';

export const surveyKey = 'fluent:survey';

export const emptySurvey: SurveyAnswers = {
  level: null,
  goals: [],
  occupation: null,
  occupationText: null,
  daily: null,
  weekly: null,
};

export async function loadSurvey(): Promise<SurveyAnswers> {
  try {
    const raw = await AsyncStorage.getItem(surveyKey);
    if (!raw) return emptySurvey;
    return {...emptySurvey, ...(JSON.parse(raw) as SurveyAnswers)};
  } catch {
    return emptySurvey;
  }
}

export async function saveSurveyLocal(answers: SurveyAnswers) {
  await AsyncStorage.setItem(surveyKey, JSON.stringify(answers));
}

/** Build survey answers from a user doc (flat fields and/or nested survey). */
export function surveyFromUser(user: FluentUser | null | undefined): Partial<SurveyAnswers> | null {
  if (!user) return null;
  const nested = (user.survey ?? {}) as Partial<SurveyAnswers>;
  return {
    level: (user.level ?? nested.level ?? null) as SurveyAnswers['level'],
    goals: (user.goals ?? nested.goals ?? []) as SurveyAnswers['goals'],
    occupation: (user.occupation ?? nested.occupation ?? null) as SurveyAnswers['occupation'],
    occupationText: user.occupationText ?? nested.occupationText ?? null,
    daily: (user.daily ?? nested.daily ?? null) as SurveyAnswers['daily'],
    weekly: (user.weekly ?? nested.weekly ?? null) as SurveyAnswers['weekly'],
  };
}

export async function hydrateSurvey(remote: Partial<SurveyAnswers> | null | undefined) {
  if (!remote || typeof remote !== 'object') return loadSurvey();
  const next: SurveyAnswers = {
    level: remote.level ?? null,
    goals: Array.isArray(remote.goals) ? remote.goals : [],
    occupation: remote.occupation ?? null,
    occupationText: remote.occupationText ?? null,
    daily: remote.daily ?? null,
    weekly: remote.weekly ?? null,
  };
  // Don't overwrite a filled local survey with an empty remote shell.
  const hasRemoteData =
    Boolean(next.level) ||
    next.goals.length > 0 ||
    Boolean(next.occupation) ||
    Boolean(next.daily) ||
    Boolean(next.weekly);
  if (!hasRemoteData) return loadSurvey();
  await saveSurveyLocal(next);
  return next;
}

/** Persist survey locally and sync flattened fields to the user document. */
export async function saveSurvey(
  answers: SurveyAnswers,
  options?: {onboardingComplete?: boolean},
) {
  await saveSurveyLocal(answers);
  const deviceId = await loadUserId();
  updateSurveyRemote(
    deviceId,
    answers as unknown as Record<string, unknown>,
    options?.onboardingComplete,
  ).catch(() => undefined);
  return answers;
}
