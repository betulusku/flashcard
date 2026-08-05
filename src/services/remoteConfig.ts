import {
  fetchAndActivate,
  getAll,
  getRemoteConfig,
  getValue,
  type Value,
} from '@react-native-firebase/remote-config';

import {createLogger} from '../utils/logger';

const log = createLogger('RemoteConfig');

/** Firebase Remote Config key → purchases.inReview */
export const REVIEW_ENABLED_KEY = 'reviewEnabled';

const TRUTHY = new Set(['1', 'true', 't', 'yes', 'y', 'on']);

/** Coalesce concurrent callers only — cleared when the fetch settles. */
let inflight: Promise<boolean> | null = null;

/**
 * Parse Remote Config boolean that may arrive as bool, "true"/"false", "1"/"0".
 * Prefer string normalization — `asBoolean()` alone can disagree with stringy templates.
 */
export function parseRemoteBoolean(value: Value | string | boolean | number | null | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    return TRUTHY.has(value.trim().toLowerCase());
  }
  if (value && typeof value === 'object' && typeof value.asString === 'function') {
    const asBool = value.asBoolean();
    const raw = value.asString().trim().toLowerCase();
    const fromString = TRUTHY.has(raw);
    // If either interpretation is true, treat as true (catch string/bool mismatch).
    return asBool || fromString;
  }
  return false;
}

function logAllRemoteValues() {
  const rc = getRemoteConfig();
  const all = getAll(rc);
  const values: Record<
    string,
    {raw: string; asBoolean: boolean; parsed: boolean; source: string}
  > = {};
  for (const [key, entry] of Object.entries(all)) {
    values[key] = {
      raw: entry.asString(),
      asBoolean: entry.asBoolean(),
      parsed: parseRemoteBoolean(entry),
      source: entry.getSource(),
    };
  }
  log.info('Remote Config values', {
    keyCount: Object.keys(values).length,
    values,
  });
}

async function fetchReviewEnabledOnce(): Promise<boolean> {
  try {
    const rc = getRemoteConfig();
    rc.defaultConfig = {[REVIEW_ENABLED_KEY]: false};
    rc.settings = {
      fetchTimeoutMillis: 60_000,
      minimumFetchIntervalMillis: __DEV__ ? 0 : 60 * 60 * 1000,
    };

    const activated = await fetchAndActivate(rc);
    const entry = getValue(rc, REVIEW_ENABLED_KEY);
    const reviewEnabled = parseRemoteBoolean(entry);
    log.success('Remote Config ready', {
      reviewEnabled,
      activated,
      source: entry.getSource(),
      raw: entry.asString(),
      asBoolean: entry.asBoolean(),
      parsed: reviewEnabled,
    });
    logAllRemoteValues();
    return reviewEnabled;
  } catch (error) {
    log.warn('Remote Config fetch failed — defaulting reviewEnabled=false', {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Fetch `reviewEnabled` from Firebase (network every call after prior settles).
 * Concurrent callers share one in-flight request.
 */
export function prefetchReviewEnabled(): Promise<boolean> {
  if (!inflight) {
    log.info('Fetching Remote Config from Firebase…');
    inflight = fetchReviewEnabledOnce().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** Await a fresh Firebase fetch (same as prefetch). */
export function fetchReviewEnabled(): Promise<boolean> {
  return prefetchReviewEnabled();
}
