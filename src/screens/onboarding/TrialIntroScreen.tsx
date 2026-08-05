import React, {useEffect, useRef, useState} from 'react';
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
import LottieView from 'lottie-react-native';

import {Icon} from '../../components/Icon';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {logEvent} from '../../services/mixpanel';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'TrialIntro'>;

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
const trialBg = require('../../../assets/trial-intro-bg.png');
const CHECK_BLUE = '#3B5BDB';

export function TrialIntroScreen({navigation, route}: Props) {
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void logEvent('onb_trial_view', {
      destination: route.params?.destination === 'OnboardingPaywall' ? 'OnboardingPaywall' : 'Paywall',
    });
  }, [route.params?.destination]);

  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1);
      return;
    }
    Animated.spring(entrance, {
      toValue: 1,
      friction: 7,
      tension: 70,
      useNativeDriver: true,
    }).start();
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
  }, [entrance, pulse, reduceMotion]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        route.params?.destination === 'OnboardingPaywall'
          ? navigation.replace('OnboardingPaywall')
          : navigation.replace('Paywall', {source: route.params?.source});
      },
      reduceMotion ? 2000 : 4200,
    );
    return () => clearTimeout(timer);
  }, [navigation, reduceMotion, route.params]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });
  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <Image
        source={trialBg}
        style={styles.bg}
        resizeMode="cover"
        pointerEvents="none"
      />

      {!reduceMotion && (
        <View pointerEvents="none" style={styles.confettiWrap}>
          <LottieView
            source={require('../../../assets/confetti.json')}
            autoPlay
            loop={false}
            resizeMode="cover"
            style={styles.confetti}
          />
        </View>
      )}

      <Animated.View
        style={[
          styles.content,
          {opacity: entrance, transform: [{scale: entranceScale}]},
        ]}
      >
        <View style={styles.checkCircle}>
          <Icon.Check size={52} strokeWidth={4} color="#FFFFFF" />
        </View>
        <Animated.View style={[styles.copy, {transform: [{scale: pulseScale}]}]}>
          <Text style={styles.title}>7-DAY TRIAL</Text>
          <Text style={styles.enabled}>is enabled!</Text>
        </Animated.View>
      </Animated.View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  // Keep confetti over the check — full-screen Lottie letterboxes to black.
  confettiWrap: {
    position: 'absolute',
    top: SCREEN_H * 0.14,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H * 0.42,
    zIndex: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  confetti: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
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
