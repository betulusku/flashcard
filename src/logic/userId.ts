import AsyncStorage from '@react-native-async-storage/async-storage';

import {ensureAnonymousUser} from '../services/firebase';
import {createLogger} from '../utils/logger';

const log = createLogger('UserId');
const userIdKey = 'fluent:user-id';

function createId() {
  const chunk = () => Math.random().toString(36).slice(2, 10);
  return `${chunk()}${chunk()}${Date.now().toString(36)}`.slice(0, 28);
}

/**
 * Prefer Firebase Anonymous Auth UID (visible in Firebase Auth console).
 * Falls back to a local id if Auth is unavailable (offline / provider off).
 */
export async function loadUserId() {
  try {
    const user = await ensureAnonymousUser();
    await AsyncStorage.setItem(userIdKey, user.uid);
    log.success('Using Firebase Auth UID as deviceId', {deviceId: user.uid});
    return user.uid;
  } catch (error) {
    log.warn('Firebase auth unavailable — falling back to local deviceId', {
      message: error instanceof Error ? error.message : String(error),
    });
    try {
      const existing = await AsyncStorage.getItem(userIdKey);
      if (existing) {
        log.info('Restored local deviceId from storage', {deviceId: existing});
        return existing;
      }
      const next = createId();
      await AsyncStorage.setItem(userIdKey, next);
      log.warn('Created new local deviceId', {deviceId: next});
      return next;
    } catch (storageError) {
      const next = createId();
      log.error('AsyncStorage failed — ephemeral local deviceId', {
        deviceId: next,
        message:
          storageError instanceof Error ? storageError.message : String(storageError),
      });
      return next;
    }
  }
}
