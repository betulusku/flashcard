/**
 * Thin HTTP client for flashcard-functions Cloud Functions.
 * Base URL points at the deployed project; override with FLUENT_API_BASE if needed.
 */

export type ApiResult<T> =
  | {success: true; message: string; data: T}
  | {success: false; message: string; error: string; data: null};

const DEFAULT_BASE =
  'https://us-central1-flashcar-3900c.cloudfunctions.net';

const baseUrl = (globalThis as {FLUENT_API_BASE?: string}).FLUENT_API_BASE ?? DEFAULT_BASE;

async function post<T>(name: string, body: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  const response = await fetch(`${baseUrl}/${name}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as ApiResult<T>;
  return json;
}

export type VocabularyWord = {
  id: string;
  en: string;
  tr: string;
  example: string;
  pos: string;
  level: string;
  definition: string;
  definitionTr: string;
  exampleTr: string;
};

export type WordProgress = {
  wordId: string;
  known: number;
  unknown: number;
  favorite: boolean;
  addedAt?: number;
};

export type FluentUser = {
  deviceId: string;
  isPremium: boolean;
  premiumExpireAt: unknown;
  deviceDetails?: Record<string, unknown> | null;
  isActive: boolean;
  isDeleted: boolean;
  profilePicture: string;
  name: string;
  authUid?: string;
  authProvider?: string;
  langLevel: string;
  /** English level from onboarding (a1–c1 / unsure). */
  level?: string | null;
  /** Learning goals / interest areas. */
  goals?: string[];
  occupation?: string | null;
  occupationText?: string | null;
  daily?: string | null;
  weekly?: string | null;
  onboardingComplete?: boolean;
  survey?: Record<string, unknown> | null;
  isNew?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastSeenAt?: unknown;
};

/** Register (create) or login (return existing) by device id. */
export function checkUser(
  deviceId: string,
  deviceDetails?: Record<string, unknown>,
) {
  return post<FluentUser>('checkUser', {deviceId, deviceDetails});
}

export function getUser(deviceId: string) {
  return post<FluentUser>('getUser', {deviceId});
}

export function updateProfile(
  deviceId: string,
  fields: {name?: string; profilePicture?: string; langLevel?: string},
) {
  return post<FluentUser>('updateProfile', {deviceId, ...fields});
}

export function updateSurvey(
  deviceId: string,
  survey: Record<string, unknown>,
  onboardingComplete?: boolean,
) {
  return post<FluentUser>('updateSurvey', {
    deviceId,
    survey,
    ...(typeof onboardingComplete === 'boolean' ? {onboardingComplete} : {}),
  });
}

/** Bootstrap: vocabulary + grammar + occupations + legal + inbox seed. */
export function getAppContent(includeVocabulary = true) {
  return post<{
    vocabulary: VocabularyWord[] | null;
    grammarLessons: Array<{
      id: string;
      title: string;
      sections: {title: string; items: {pattern: string; rule: string; example: string}[]}[];
    }>;
    occupations: {
      categories: Record<string, {label: string; lessonLabel: string}>;
      titles?: Record<string, string[]>;
      keywords: Record<string, string[]>;
      occupations: {title: string; category: string}[];
    } | null;
    legal: {
      updatedAt?: string;
      privacy: {title: string; sections: {heading: string; body: string}[]};
      terms: {title: string; sections: {heading: string; body: string}[]};
    } | null;
    inboxSeed: {notes?: unknown[]} | null;
    meta: unknown;
  }>('getAppContent', {includeVocabulary});
}

export function getVocabulary(params: {
  level?: string;
  query?: string;
  limit?: number;
  offset?: number;
} = {}) {
  return post<{words: VocabularyWord[]; total: number; offset: number; limit: number | null}>(
    'getVocabulary',
    params,
  );
}

export function getVocabularyByIds(ids: string[]) {
  return post<{words: VocabularyWord[]}>('getVocabularyByIds', {ids});
}

export function getGrammarLessons(lessonId?: string) {
  return post<unknown>('getGrammarLessons', lessonId ? {lessonId} : {});
}

export function getOccupations() {
  return post<unknown>('getOccupations');
}

export function getLegalDocs() {
  return post<unknown>('getLegalDocs');
}

export function getInboxSeed() {
  return post<unknown>('getInboxSeed');
}

export function getLearningState(deviceId: string) {
  return post<{
    progress: Record<string, WordProgress>;
    practicedDays: string[];
    dailyIds: string[];
    dailyDate: string;
    activity: Record<string, {reviewed: number; learned: number}>;
    savedWordIds: string[];
  }>('getLearningState', {deviceId});
}

export function toggleFavorite(deviceId: string, wordId: string) {
  return post<{wordId: string; favorite: boolean; progress: WordProgress}>(
    'toggleFavorite',
    {deviceId, wordId},
  );
}

export function getFavorites(deviceId: string) {
  return post<{words: (VocabularyWord & {progress: WordProgress})[]; count: number}>(
    'getFavorites',
    {deviceId},
  );
}

export function recordPractice(deviceId: string, wordId: string, known: boolean) {
  return post<{progress: WordProgress}>('recordPractice', {deviceId, wordId, known});
}

export function addSavedWord(deviceId: string, wordId: string, en?: string) {
  return post<{wordId: string; en: string}>('addSavedWord', {deviceId, wordId, en});
}

export function removeSavedWord(deviceId: string, wordId: string) {
  return post<{wordId: string}>('removeSavedWord', {deviceId, wordId});
}

export function getSavedWords(deviceId: string) {
  return post<{words: VocabularyWord[]; savedWordIds: string[]; count: number}>(
    'getSavedWords',
    {deviceId},
  );
}

export function getWordCollection(
  deviceId: string,
  collection: 'saved' | 'learning' | 'memorized' | 'favorites',
) {
  return post<{
    collection: string;
    words: (VocabularyWord & {progress: WordProgress | null})[];
    count: number;
  }>('getWordCollection', {deviceId, collection});
}

export function setDailyPool(deviceId: string, dailyIds: string[], dailyDate: string) {
  return post<{dailyIds: string[]; dailyDate: string}>('setDailyPool', {
    deviceId,
    dailyIds,
    dailyDate,
  });
}

/** Admin only — seeds Firestore from bundled JSON. */
export function seedContent(secretKey: string, wipeVocabulary = false) {
  return post<{
    vocabularyCount: number;
    chunkCount: number;
    grammarLessonCount: number;
    occupationCount: number;
  }>('seedContent', {secretKey, wipeVocabulary});
}
