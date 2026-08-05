import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Image, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {bootstrapApp, type BootstrapState} from '../logic/bootstrap';
import {requestTrackingPermission} from '../logic/trackingPermission';
import {initMixpanel, logEvent, sendTestEvent} from '../services/mixpanel';
import {useAppDispatch} from '../store/hooks';
import {initPurchases} from '../store/purchasesSlice';
import {createLogger} from '../utils/logger';

const log = createLogger('Splash');

/** Show splash first; fire auth/bootstrap requests after this delay. */
const REQUEST_DELAY_MS = 3000;
const LOADER_TRACK_W = 200;
const LOADER_FILL_W = 72;
/** The exact same mark used by the native launch screen and app lockups. */
const splashLogo = require('../../assets/SplashMark.png');
const splashBadge = require('../../assets/SplashBadge.png');

type Props = {
  children: (bootstrap: BootstrapState) => React.ReactNode;
};

/** Same layout as native FlashSplashV4. Runs checkUser before revealing the app. */
export function AppSplash({children}: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const loader = useRef(new Animated.Value(0)).current;
  const splashStartedAt = useRef(Date.now()).current;

  useEffect(() => {
    void logEvent('splash_view');
  }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(loader, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [loader]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // ATT before analytics so Mixpanel can attach IDFA when the user allows it.
      // Brief delay so the splash UI is on screen (Apple rejects pre-UI prompts).
      await new Promise<void>(resolve => setTimeout(resolve, 400));
      if (cancelled) return;
      const tracking = await requestTrackingPermission();
      log.info('ATT complete', {tracking});
      if (cancelled) return;

      // Mixpanel next — don't wait on Firebase or the splash delay, otherwise
      // "Verify Connection" stays empty when bootstrap is slow / stuck.
      try {
        log.info('Mixpanel early init');
        const early = await initMixpanel();
        if (early && !cancelled) {
          await sendTestEvent();
          log.success('Mixpanel early smoke event sent');
        }
      } catch (error) {
        log.warn('Mixpanel early init failed (continuing)', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
      if (cancelled) return;

      log.info(`Waiting ${REQUEST_DELAY_MS}ms before bootstrap…`);
      await new Promise<void>(resolve => setTimeout(resolve, REQUEST_DELAY_MS));
      if (cancelled) return;

      log.info('Starting Firebase bootstrap + RevenueCat + Mixpanel identify');
      const state = await bootstrapApp();
      if (cancelled) return;

      // Attach Firebase UID once we have it; smoke event already fired above.
      await initMixpanel(state.deviceId)
        .then(async mixpanel => {
          if (!mixpanel) return;
          log.success('Mixpanel identified with Firebase UID', {
            distinctId: state.deviceId,
          });
        })
        .catch(error => {
          log.warn('Mixpanel identify failed on splash (continuing)', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      if (cancelled) return;

      // RevenueCat configure + offerings → Redux (don't block splash on RC failure).
      await dispatch(initPurchases(state.deviceId))
        .unwrap()
        .then(result => {
          log.success('RevenueCat init from splash', {
            planCount: result.plans.length,
            isPremium: result.isPremium,
            appUserId: result.appUserId,
          });
        })
        .catch(error => {
          log.warn('RevenueCat init failed on splash (continuing)', {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      if (!cancelled) {
        log.success('Splash complete — revealing app', {
          deviceId: state.deviceId,
          onboardingComplete: state.onboardingComplete,
        });
        void logEvent('splash_complete', {
          content_source: state.contentSource,
          onboarding_complete: state.onboardingComplete,
          is_new_user: state.isNewUser,
          fallback_used: false,
          duration_ms: Date.now() - splashStartedAt,
        });
        setBootstrap(state);
      }
    })().catch(async error => {
      log.error('Bootstrap threw — using local fallback', {
        message: error instanceof Error ? error.message : String(error),
      });
      // Last-resort local bootstrap if anything unexpected throws.
      const {loadUserId} = await import('../logic/userId');
      const {loadOnboardingComplete} = await import('../logic/onboarding');
      const [deviceId, onboardingComplete] = await Promise.all([
        loadUserId(),
        loadOnboardingComplete(),
      ]);
      await initMixpanel(deviceId)
        .then(async mixpanel => {
          if (!mixpanel) return;
          log.success('Mixpanel identified with Firebase UID (fallback)', {
            distinctId: deviceId,
          });
          await sendTestEvent();
        })
        .catch(mpError => {
          log.warn('Mixpanel init failed on fallback splash', {
            message: mpError instanceof Error ? mpError.message : String(mpError),
          });
        });
      await dispatch(initPurchases(deviceId))
        .unwrap()
        .catch(rcError => {
          log.warn('RevenueCat init failed on fallback splash', {
            message: rcError instanceof Error ? rcError.message : String(rcError),
          });
        });
      if (!cancelled) {
        void logEvent('splash_complete', {
          content_source: 'local',
          onboarding_complete: onboardingComplete,
          is_new_user: false,
          fallback_used: true,
          duration_ms: Date.now() - splashStartedAt,
        });
        setBootstrap({
          deviceId,
          user: null,
          isNewUser: false,
          onboardingComplete,
          contentSource: 'local',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (bootstrap) return <>{children(bootstrap)}</>;

  const loaderX = loader.interpolate({
    inputRange: [0, 1],
    outputRange: [-LOADER_FILL_W, LOADER_TRACK_W],
  });

  return (
    <View style={styles.root} accessibilityLabel="FlashVocab splash">
      <View style={styles.center}>
        <Image source={splashLogo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.name}>FlashVocab</Text>
        <Text style={styles.tagline}>IELTS &amp; Interview Vocabulary</Text>
      </View>
      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 8) + 12}]}>
        <Image source={splashBadge} style={styles.badge} resizeMode="contain" />
        <View style={styles.track}>
          <Animated.View
            style={[styles.fill, {transform: [{translateX: loaderX}]}]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 24,
  },
  name: {marginTop: 14, color: '#FFFFFF', fontSize: 24, fontWeight: '800'},
  tagline: {marginTop: 5, color: '#B8C2D8', fontSize: 13, fontWeight: '600'},
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  badge: {
    width: 200,
    height: 56,
  },
  track: {
    width: LOADER_TRACK_W,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#2E2E2E',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: LOADER_FILL_W,
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});

