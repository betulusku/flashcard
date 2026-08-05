import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {colors} from '../../theme';

export function FluentBackdrop() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={styles.base} />
    <View style={styles.blueWash} />
    <View style={styles.mintWash} />
  </View>;
}

export function FluentLockup() {
  return <View style={styles.lockup} accessibilityLabel="FlashVocab">
    <Image source={require('../../../assets/SplashMark.png')} style={styles.mark} resizeMode="contain" />
    <Text style={styles.brand}>FlashVocab</Text>
  </View>;
}

export function PrimaryButtonBackground() {
  return <LinearGradient pointerEvents="none" colors={['#C8FFFB', '#AEEEFF']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={StyleSheet.absoluteFill} />;
}

const styles = StyleSheet.create({
  base: {flex: 1, backgroundColor: colors.background},
  blueWash: {position: 'absolute', width: 300, height: 300, borderRadius: 150, right: -170, top: 70, backgroundColor: colors.blue, opacity: .1, shadowColor: colors.blue, shadowOpacity: .55, shadowRadius: 70},
  mintWash: {position: 'absolute', width: 230, height: 230, borderRadius: 115, left: -155, bottom: 90, backgroundColor: colors.mint, opacity: .035, shadowColor: colors.mint, shadowOpacity: .45, shadowRadius: 65},
  lockup: {flexDirection: 'row', alignItems: 'center', gap: 12},
  mark: {width: 36, height: 36, borderRadius: 9},
  brand: {color: colors.text, fontSize: 26, fontWeight: '700', letterSpacing: -.5},
});
