import React, { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { logEvent } from '../../services/mixpanel';
import { colors, radius, spacing, typography } from '../../theme';
import { ScreenShell } from './ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;
const wanderArtwork = require('../../assets/welcome-wander.png');

export function WelcomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  useEffect(() => {
    void logEvent('onb_welcome_view');
  }, []);
  return <ScreenShell tone="welcome" padded={false}><ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false} showsVerticalScrollIndicator={false}>
    <View style={styles.artStage}>
      <Image accessibilityIgnoresInvertColors source={wanderArtwork} resizeMode="contain" style={[styles.artwork, { width, height: width * 861 / 688 }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(12,15,17,0)', 'rgba(12,15,17,.22)', 'rgba(12,15,17,.72)', colors.background]} locations={[0, .32, .7, 1]} style={styles.artFade} />
    </View>
    <View style={styles.copy}>
      <Text style={styles.eyebrow}>PERSONAL ENGLISH PRACTICE</Text>
      <Text style={styles.title}>Find a way{`\n`}of saying it.</Text>
      <Text style={styles.body}>Language that moves at your pace and sounds like you when it matters.</Text>
    </View>
    <Pressable style={styles.button} onPress={() => { void logEvent('onb_welcome_click'); navigation.navigate('Survey'); }}><Text style={styles.buttonText}>Get started</Text></Pressable>
  </ScrollView></ScreenShell>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.lg },
  artStage: { width: '100%', overflow: 'hidden' },
  artwork: { alignSelf: 'stretch' },
  artFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 },
  copy: { paddingHorizontal: spacing.lg, paddingTop: 0 },
  eyebrow: { fontSize: typography.caption, letterSpacing: 2.2, color: colors.muted, fontWeight: '700', marginBottom: spacing.md },
  title: { fontFamily: 'Georgia', fontSize: 42, lineHeight: 42, letterSpacing: -2.2, color: colors.text },
  body: { marginTop: spacing.md, color: colors.muted, fontSize: 17, lineHeight: 24, maxWidth: 325 },
  button: {
    width: Dimensions.get('window').width * 0.875,
    height: 57.5,
    alignSelf: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Dimensions.get('window').height * 0.05,
  },
  buttonText: { color: colors.primaryText, fontSize: 17, fontWeight: '700' },
});
