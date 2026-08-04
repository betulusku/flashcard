import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addSavedWord as addSavedWordRemote,
  removeSavedWord as removeSavedWordRemote,
} from '../services/api';
import {savedWordsKey} from './wordCollections';
import {loadUserId} from './userId';

export async function loadSavedWordTokens(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(savedWordsKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function saveSavedWordTokens(tokens: string[]) {
  await AsyncStorage.setItem(savedWordsKey, JSON.stringify(tokens));
}

/** Replace local saved-word tokens with backend ids (or keep local on empty remote). */
export async function hydrateSavedWords(remoteIds: string[]) {
  if (!remoteIds.length) {
    // Keep any local list if remote is empty (first migrate).
    return loadSavedWordTokens();
  }
  await saveSavedWordTokens(remoteIds);
  return remoteIds;
}

export async function addSavedWordToken(word: {id: string; en: string}) {
  const current = await loadSavedWordTokens();
  if (current.includes(word.id) || current.includes(word.en)) {
    return current;
  }
  const next = [word.id, ...current];
  await saveSavedWordTokens(next);
  const deviceId = await loadUserId();
  addSavedWordRemote(deviceId, word.id, word.en).catch(() => undefined);
  return next;
}

export async function removeSavedWordToken(word: {id: string; en: string}) {
  const current = await loadSavedWordTokens();
  const next = current.filter(token => token !== word.id && token !== word.en);
  await saveSavedWordTokens(next);
  const deviceId = await loadUserId();
  removeSavedWordRemote(deviceId, word.id).catch(() => undefined);
  return next;
}
