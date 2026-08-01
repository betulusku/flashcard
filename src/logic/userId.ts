import AsyncStorage from '@react-native-async-storage/async-storage';

const userIdKey = 'fluent:user-id';

function createId() {
  const chunk = () => Math.random().toString(36).slice(2, 10);
  return `${chunk()}${chunk()}${Date.now().toString(36)}`.slice(0, 28);
}

/** Stable anonymous id for support / restore — created once per install. */
export async function loadUserId() {
  try {
    const existing = await AsyncStorage.getItem(userIdKey);
    if (existing) return existing;
    const next = createId();
    await AsyncStorage.setItem(userIdKey, next);
    return next;
  } catch {
    return createId();
  }
}
