import {getApp} from '@react-native-firebase/app';
import {getAuth, signInAnonymously, type User} from '@react-native-firebase/auth';

import {createLogger} from '../utils/logger';

const log = createLogger('Firebase');

/**
 * Ensures a Firebase Anonymous Auth session exists and returns the user.
 * UID appears under Authentication in the Firebase console and is used as deviceId.
 */
export async function ensureAnonymousUser(): Promise<User> {
  log.info('Ensuring anonymous auth session…');

  try {
    const app = getApp();
    log.debug('Default app ready', {
      name: app.name,
      options: {
        projectId: app.options.projectId,
        appId: app.options.appId,
        storageBucket: app.options.storageBucket,
      },
    });

    const auth = getAuth();
    if (auth.currentUser) {
      log.success('Reusing existing anonymous user', {
        uid: auth.currentUser.uid,
        isAnonymous: auth.currentUser.isAnonymous,
      });
      return auth.currentUser;
    }

    log.info('No current user — signing in anonymously…');
    const credential = await signInAnonymously(auth);
    log.success('Anonymous sign-in complete', {
      uid: credential.user.uid,
      isAnonymous: credential.user.isAnonymous,
      providerId: credential.additionalUserInfo?.providerId,
      isNewUser: credential.additionalUserInfo?.isNewUser,
    });
    return credential.user;
  } catch (error) {
    log.error('Anonymous auth failed', {
      message: error instanceof Error ? error.message : String(error),
      error,
    });
    throw error;
  }
}
