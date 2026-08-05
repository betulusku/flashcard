import React, {useEffect} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {goHomeFaded} from '../../navigation/navTransitions';
import {logEvent} from '../../services/mixpanel';
import {useAppSelector} from '../../store/hooks';
import {colors, radius, spacing} from '../../theme';
import {FluentLockup, PrimaryButtonBackground} from './OnboardingPrimitives';
import {ScreenShell} from './ScreenShell';
import {preloadTrialIntroAssets} from './trialIntroAssets';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'HelpUsGrow'>;
export function HelpUsGrowScreen({navigation}: Props) {
  const inReview = useAppSelector(s => s.purchases.inReview);

  useEffect(() => {
    if (inReview) {
      goHomeFaded(navigation);
      return;
    }
    void logEvent('onb_helpus_view');
    preloadTrialIntroAssets();
  }, [inReview, navigation]);

  const continueToTrial = () => {
    void logEvent('onb_helpus_click');
    if (inReview) {
      goHomeFaded(navigation);
      return;
    }
    navigation.replace('TrialIntro', {destination: 'OnboardingPaywall'});
  };

  return <ScreenShell padded={false}>
    <View style={styles.container}>
      <Image source={require('../../../assets/onboarding-help-bg.png')} style={styles.background} resizeMode="cover" accessibilityElementsHidden />
      <View style={styles.backgroundScrim} pointerEvents="none" accessibilityElementsHidden />
      <FluentLockup />
      <View style={styles.copy}>
        <Text style={styles.title}>Help us{`\n`}<Text style={styles.accent}>grow</Text></Text>
        <Text style={styles.lead}>Join 2M+ learners{`\n`}improving every day.</Text>
        <View style={styles.rule} />
      </View>
      <Image source={require('../../../assets/onboarding-community-card.png')} style={styles.communityCard} resizeMode="contain" accessible accessibilityLabel="More than two million FlashVocab learners worldwide" />
      <View style={styles.earthArtwork} accessibilityElementsHidden />
      <Pressable style={styles.cta} onPress={continueToTrial}><PrimaryButtonBackground /><Text style={styles.ctaText}>Continue</Text></Pressable>
    </View>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm, backgroundColor: '#030C17'},
  background: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: 'auto', height: 'auto'},
  backgroundScrim: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.64)'},
  copy: {marginTop: spacing.xxl},
  title: {fontFamily: 'Georgia', fontSize: 60, lineHeight: 58, letterSpacing: -2.8, color: colors.text}, accent: {color: colors.mint},
  lead: {fontSize: 20, lineHeight: 29, color: colors.text, marginTop: spacing.lg},
  rule: {width: 30, height: 2, marginTop: spacing.lg, backgroundColor: colors.muted},
  communityCard: {width: '100%', height: 132, marginTop: spacing.lg},
  earthArtwork: {flex: 1, marginHorizontal: -spacing.lg, marginTop: spacing.sm, overflow: 'hidden'},
  cta: {minHeight: 58, marginBottom: 56, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}, ctaText: {fontSize: 18, fontWeight: '700', color: colors.primaryText},
});
