import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  recordPractice as recordPracticeRemote,
  setDailyPool as setDailyPoolRemote,
  toggleFavorite as toggleFavoriteRemote,
  type WordProgress as RemoteWordProgress,
} from '../services/api';
import {dateKey} from './dates';
import {emptyLearningState, LearningState, WordProgress} from './learningEngine';
import {loadUserId} from './userId';

const key = 'fluent:learning-state';

function toLocalProgress(
  remote: Record<string, RemoteWordProgress>,
): Record<string, WordProgress> {
  const progress: Record<string, WordProgress> = {};
  Object.entries(remote ?? {}).forEach(([id, item]) => {
    progress[id] = {
      known: item.known ?? 0,
      unknown: item.unknown ?? 0,
      favorite: Boolean(item.favorite),
      addedAt: item.addedAt,
    };
  });
  return progress;
}

export async function loadLearningState(): Promise<LearningState> {
  const value = await AsyncStorage.getItem(key);
  return value
    ? {...emptyLearningState, ...(JSON.parse(value) as LearningState)}
    : emptyLearningState;
}

export async function saveLearningState(state: LearningState) {
  await AsyncStorage.setItem(key, JSON.stringify(state));
}

/** Replace local cache with a backend learning snapshot. */
export async function hydrateLearningState(remote: {
  progress?: Record<string, RemoteWordProgress>;
  practicedDays?: string[];
  dailyIds?: string[];
  dailyDate?: string;
  activity?: LearningState['activity'];
}) {
  const next: LearningState = {
    progress: toLocalProgress(remote.progress ?? {}),
    practicedDays: remote.practicedDays ?? [],
    dailyIds: remote.dailyIds ?? [],
    dailyDate: remote.dailyDate ?? '',
    activity: remote.activity ?? {},
  };
  await saveLearningState(next);
  return next;
}

export function applyPractice(
  state: LearningState,
  wordId: string,
  known: boolean,
): LearningState {
  const current = state.progress[wordId] ?? {known: 0, unknown: 0, favorite: false};
  const today = dateKey();
  const activity = state.activity ?? {};
  const todayActivity = activity[today] ?? {reviewed: 0, learned: 0};
  return {
    ...state,
    progress: {
      ...state.progress,
      [wordId]: {
        ...current,
        known: current.known + (known ? 1 : 0),
        unknown: current.unknown + (known ? 0 : 1),
      },
    },
    practicedDays: state.practicedDays.includes(today)
      ? state.practicedDays
      : [today, ...state.practicedDays].slice(0, 30),
    activity: {
      ...activity,
      [today]: {
        reviewed: todayActivity.reviewed + 1,
        learned: todayActivity.learned + (known ? 1 : 0),
      },
    },
  };
}

export function applyFavoriteToggle(
  state: LearningState,
  wordId: string,
): LearningState {
  const current = state.progress[wordId] ?? {known: 0, unknown: 0, favorite: false};
  return {
    ...state,
    progress: {
      ...state.progress,
      [wordId]: {...current, favorite: !current.favorite},
    },
  };
}

/** @deprecated use applyPractice — kept for call-site clarity during migration */
export const recordPractice = applyPractice;
/** @deprecated use applyFavoriteToggle */
export const toggleFavorite = applyFavoriteToggle;

/** Optimistic local write + backend sync. */
export async function syncPractice(wordId: string, known: boolean) {
  const learning = await loadLearningState();
  const next = applyPractice(learning, wordId, known);
  await saveLearningState(next);
  const deviceId = await loadUserId();
  recordPracticeRemote(deviceId, wordId, known).catch(() => undefined);
  return next;
}

export async function syncToggleFavorite(wordId: string) {
  const learning = await loadLearningState();
  const next = applyFavoriteToggle(learning, wordId);
  await saveLearningState(next);
  const deviceId = await loadUserId();
  toggleFavoriteRemote(deviceId, wordId).catch(() => undefined);
  return next;
}

export async function syncDailyPool(dailyIds: string[], dailyDate: string) {
  const learning = await loadLearningState();
  const next = {...learning, dailyIds, dailyDate};
  await saveLearningState(next);
  const deviceId = await loadUserId();
  setDailyPoolRemote(deviceId, dailyIds, dailyDate).catch(() => undefined);
  return next;
}
