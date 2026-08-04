import AsyncStorage from '@react-native-async-storage/async-storage';

import {updateProfile as updateProfileRemote} from '../services/api';
import {loadUserId} from './userId';

export const profileKey = 'fluent:profile';

export type UserProfile = {
  name: string;
  photoUri: string | null;
};

export const emptyProfile: UserProfile = {name: '', photoUri: null};

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(profileKey);
    if (!raw) return emptyProfile;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name.trim() : '',
      photoUri: typeof parsed.photoUri === 'string' ? parsed.photoUri : null,
    };
  } catch {
    return emptyProfile;
  }
}

export async function hydrateProfile(remote: {
  name?: string;
  profilePicture?: string;
} | null | undefined) {
  if (!remote) return loadProfile();
  const next: UserProfile = {
    name: typeof remote.name === 'string' ? remote.name.trim() : '',
    photoUri:
      typeof remote.profilePicture === 'string' && remote.profilePicture
        ? remote.profilePicture
        : null,
  };
  try {
    await AsyncStorage.setItem(profileKey, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export async function saveProfile(profile: UserProfile) {
  const next: UserProfile = {
    name: profile.name.trim(),
    photoUri: profile.photoUri,
  };
  try {
    await AsyncStorage.setItem(profileKey, JSON.stringify(next));
  } catch {
    // Local preference only.
  }
  const deviceId = await loadUserId();
  updateProfileRemote(deviceId, {
    name: next.name,
    profilePicture: next.photoUri ?? '',
  }).catch(() => undefined);
  return next;
}

export function displayName(profile: UserProfile) {
  return profile.name.trim();
}

/** Home greeting line — falls back when the learner hasn’t set a name yet. */
export function greetingName(profile: UserProfile) {
  const name = displayName(profile);
  return name ? `${name}.` : 'learner.';
}
