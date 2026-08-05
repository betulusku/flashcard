import {Platform} from 'react-native';
import {PERMISSIONS, RESULTS, check, request} from 'react-native-permissions';

import {createLogger} from '../utils/logger';

const log = createLogger('ATT');

export type TrackingPermissionResult =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable'
  | 'skipped';

/**
 * iOS App Tracking Transparency prompt. No-op on Android / already-decided states
 * that shouldn't re-prompt. Safe to call once near cold start after UI is up.
 * Never throws into the splash bootstrap path.
 */
export async function requestTrackingPermission(): Promise<TrackingPermissionResult> {
  if (Platform.OS !== 'ios') return 'skipped';

  try {
    const status = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    if (status === RESULTS.GRANTED) {
      log.info('Already granted');
      return 'granted';
    }
    if (status === RESULTS.BLOCKED || status === RESULTS.UNAVAILABLE) {
      log.info('Not promptable', {status});
      return status === RESULTS.BLOCKED ? 'blocked' : 'unavailable';
    }

    const next = await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    log.info('Prompt result', {status: next});
    if (next === RESULTS.GRANTED) return 'granted';
    if (next === RESULTS.BLOCKED) return 'blocked';
    if (next === RESULTS.DENIED) return 'denied';
    return 'unavailable';
  } catch (error) {
    // Missing native handler (stale build / pods) must not redbox splash.
    log.warn('Request failed — continuing without ATT', {
      message: error instanceof Error ? error.message : String(error),
    });
    return 'unavailable';
  }
}
