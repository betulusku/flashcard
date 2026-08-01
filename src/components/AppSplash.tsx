import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const HOLD_MS = 1600;
/** User-provided Flashcard logo (icon + title + tagline). */
const splashLogo = require('../../assets/SplashScreen.png');
const splashBadge = require('../../assets/SplashBadge.png');

/** Same layout as native FlashSplashV4. */
export function AppSplash({children}: {children: React.ReactNode}) {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  if (ready) return <>{children}</>;

  return (
    <View style={styles.root} accessibilityLabel="Flashcard splash">
      <View style={styles.center}>
        <Image source={splashLogo} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 8) + 12}]}>
        <Image source={splashBadge} style={styles.badge} resizeMode="contain" />
        <View style={styles.track}>
          <View style={styles.fill} />
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
    width: 160,
    height: 160,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  badge: {
    width: 200,
    height: 56,
  },
  track: {
    width: 200,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#2E2E2E',
  },
  fill: {
    width: '30%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
});
