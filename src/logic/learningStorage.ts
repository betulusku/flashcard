import AsyncStorage from '@react-native-async-storage/async-storage';
import {emptyLearningState, LearningState} from './learningEngine';

const key = 'fluent:learning-state';
export async function loadLearningState(): Promise<LearningState> {
  const value = await AsyncStorage.getItem(key);
  return value ? {...emptyLearningState, ...(JSON.parse(value) as LearningState)} : emptyLearningState;
}
export async function saveLearningState(state: LearningState) {
  await AsyncStorage.setItem(key, JSON.stringify(state));
}
export function recordPractice(state: LearningState, wordId: string, known: boolean): LearningState {
  const current = state.progress[wordId] ?? {known: 0, unknown: 0, favorite: false};
  const today = new Date().toISOString().slice(0, 10);
  const activity = state.activity ?? {};
  const todayActivity = activity[today] ?? {reviewed: 0, learned: 0};
  return {
    ...state,
    progress: {...state.progress, [wordId]: {...current, known: current.known + (known ? 1 : 0), unknown: current.unknown + (known ? 0 : 1)}},
    practicedDays: state.practicedDays.includes(today) ? state.practicedDays : [today, ...state.practicedDays].slice(0, 30),
    activity: {...activity, [today]: {reviewed: todayActivity.reviewed + 1, learned: todayActivity.learned + (known ? 1 : 0)}},
  };
}

export function toggleFavorite(state: LearningState, wordId: string): LearningState {
  const current = state.progress[wordId] ?? {known: 0, unknown: 0, favorite: false};
  return {...state, progress: {...state.progress, [wordId]: {...current, favorite: !current.favorite}}};
}
