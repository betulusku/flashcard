import React from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import LottieView from 'lottie-react-native';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
const confettiSource = require('../../../assets/confetti.json');

/** Isolated so TrialIntro can dynamic-import this after first paint. */
export function TrialIntroConfetti() {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <LottieView
        source={confettiSource}
        autoPlay
        loop={false}
        resizeMode="cover"
        style={styles.lottie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: SCREEN_H * 0.14,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H * 0.42,
    zIndex: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  lottie: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
