import {Platform} from 'react-native';
import {Mixpanel} from 'mixpanel-react-native';

import {MIXPANEL_TOKEN} from '../config/mixpanel';
import {createLogger} from '../utils/logger';

const log = createLogger('Mixpanel');

export type MixpanelProperties = Record<string, string | number | boolean | null>;

let client: Mixpanel | null = null;
let initPromise: Promise<Mixpanel | null> | null = null;

function hasToken() {
  return MIXPANEL_TOKEN.trim().length > 0;
}

async function getClient(): Promise<Mixpanel | null> {
  if (client) return client;
  if (initPromise) return initPromise;
  return initMixpanel();
}

/**
 * Initializes Mixpanel once with the project token. No-ops when empty.
 */
export async function initMixpanel(distinctId?: string): Promise<Mixpanel | null> {
  if (!hasToken()) {
    log.warn('MIXPANEL_TOKEN empty — skipping init');
    return null;
  }

  if (client) {
    if (distinctId) await identifyUser(distinctId);
    return client;
  }

  if (initPromise) {
    const existing = await initPromise;
    if (distinctId && existing) await identifyUser(distinctId);
    return existing;
  }

  initPromise = (async () => {
    try {
      log.info('Initializing SDK', {
        tokenPrefix: `${MIXPANEL_TOKEN.slice(0, 6)}…`,
        distinctId: distinctId ?? null,
      });

      // trackAutomaticEvents=false — we send explicit product events only.
      const mixpanel = new Mixpanel(MIXPANEL_TOKEN, false);
      if (__DEV__) {
        mixpanel.setLoggingEnabled(true);
      }
      await mixpanel.init();
      mixpanel.registerSuperProperties({
        app: 'FlashVocab',
        platform: Platform.OS,
      });
      client = mixpanel;

      if (distinctId) {
        await mixpanel.identify(distinctId);
        mixpanel.getPeople().set({
          $platform: Platform.OS,
          app: 'FlashVocab',
        });
      }

      log.success('SDK ready', {
        distinctId: distinctId ?? (await mixpanel.getDistinctId()),
      });
      return mixpanel;
    } catch (error) {
      log.error('Init failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      initPromise = null;
      return null;
    }
  })();

  return initPromise;
}

export async function identifyUser(distinctId: string): Promise<void> {
  const mixpanel = await getClient();
  if (!mixpanel) return;

  try {
    log.info('identify', { distinctId });
    await mixpanel.identify(distinctId);
    await flushEvents();
    log.success('identify complete', { distinctId });
  } catch (error) {
    log.error('identify failed', {
      distinctId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Tracks an event and flushes immediately. */
export async function logEvent(
  eventName: string,
  properties?: MixpanelProperties,
): Promise<void> {
  const mixpanel = await getClient();
  if (!mixpanel) return;

  try {
    log.info('track', { eventName, properties });
    mixpanel.track(eventName, properties);
    await flushEvents();
    log.success('track + flush', { eventName });
  } catch (error) {
    log.error('track failed', {
      eventName,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function flushEvents(): Promise<void> {
  const mixpanel = client ?? (await getClient());
  if (!mixpanel) return;

  try {
    mixpanel.flush();
    log.debug('flush');
  } catch (error) {
    log.error('flush failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function resetUser(): Promise<void> {
  const mixpanel = await getClient();
  if (!mixpanel) return;

  try {
    log.info('reset');
    mixpanel.reset();
    await flushEvents();
    log.success('reset complete');
  } catch (error) {
    log.error('reset failed', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getDistinctId(): Promise<string | null> {
  const mixpanel = await getClient();
  if (!mixpanel) return null;

  try {
    return await mixpanel.getDistinctId();
  } catch (error) {
    log.error('getDistinctId failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function setUserProperties(properties: MixpanelProperties): void {
  if (!client) {
    log.warn('setUserProperties skipped — SDK not ready');
    return;
  }
  client.getPeople().set(properties);
}

/** One-shot smoke test after init. Safe to remove once Live View confirms delivery. */
export async function sendTestEvent(): Promise<void> {
  await logEvent('mixpanel_test', {
    source: 'bootstrap',
    timestamp: Date.now(),
  });
}
