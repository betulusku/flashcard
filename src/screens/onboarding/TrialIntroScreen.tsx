import React, {useEffect, useRef, useState, type ComponentType} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {logEvent} from '../../services/mixpanel';
import {useAppSelector} from '../../store/hooks';
import {preloadTrialIntroAssets, trialIntroBg} from './trialIntroAssets';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'TrialIntro'>;

const {height: SCREEN_H} = Dimensions.get('window');
const CHECK_BLUE = '#3B5BDB';
/** Let the screen settle before loading the heavy Lottie module + JSON. */
const CONFETTI_DELAY_MS = 450;

function goToPaywall(
  navigation: Props['navigation'],
  route: Props['route'],
) {
  route.params?.destination === 'OnboardingPaywall'
    ? navigation.replace('OnboardingPaywall')
    : navigation.replace('Paywall', {source: route.params?.source});
}

export function TrialIntroScreen({navigation, route}: Props) {
  const inReview = useAppSelector(s => s.purchases.inReview);
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showBg, setShowBg] = useState(false);
  const [Confetti, setConfetti] = useState<ComponentType | null>(null);

  // App Review: never show trial intro — jump straight to the paywall.
  useEffect(() => {
    if (!inReview) return;
    goToPaywall(navigation, route);
  }, [inReview, navigation, route]);

  useEffect(() => {
    if (inReview) return;
    preloadTrialIntroAssets();
    // Solid color paints first; image on next frame avoids decode hitch.
    const raf = requestAnimationFrame(() => setShowBg(true));
    return () => cancelAnimationFrame(raf);
  }, [inReview]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (inReview) return;
    void logEvent('onb_trial_view', {
      destination:
        route.params?.destination === 'OnboardingPaywall'
          ? 'OnboardingPaywall'
          : 'Paywall',
    });
  }, [inReview, route.params?.destination]);

  useEffect(() => {
    if (inReview || reduceMotion) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      import('./TrialIntroConfetti')
        .then(mod => {
          if (!cancelled) setConfetti(() => mod.TrialIntroConfetti);
        })
        .catch(() => undefined);
    }, CONFETTI_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inReview, reduceMotion]);

  useEffect(() => {
    if (inReview || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [inReview, pulse, reduceMotion]);

  useEffect(() => {
    if (inReview) return;
    const timer = setTimeout(
      () => goToPaywall(navigation, route),
      reduceMotion ? 2000 : 4200,
    );
    return () => clearTimeout(timer);
  }, [inReview, navigation, reduceMotion, route]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  if (inReview) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      {showBg ? (
        <Image source={trialIntroBg} style={styles.bg} resizeMode="cover" />
      ) : null}

      {Confetti ? <Confetti /> : null}

      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
        <Animated.View style={[styles.copy, {transform: [{scale: pulseScale}]}]}>
          <Text style={styles.title}>7-DAY TRIAL</Text>
          <Text style={styles.enabled}>is enabled!</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070A',
    overflow: 'hidden',
  },
  bg: {
    ...StyleSheet.absoluteFill,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: -SCREEN_H * 0.04,
  },
  checkCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHECK_BLUE,
  },
  checkMark: {
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -2,
  },
  copy: {
    marginTop: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  enabled: {
    marginTop: 12,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '400',
    textAlign: 'center',
    color: '#FFFFFF',
  },
});
