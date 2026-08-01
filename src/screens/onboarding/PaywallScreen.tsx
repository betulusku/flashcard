import React, {useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';

import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import type {SurveyAnswers} from '../../types/onboarding';
import {colors, radius, spacing} from '../../theme';
import {ScreenShell} from './ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Paywall'> & {answers: SurveyAnswers};
type Plan = 'yearly' | 'weekly';

export function PaywallScreen({navigation}: Props) {
  const [plan, setPlan] = useState<Plan>('yearly');
  const start = () => navigation.replace('Home');

  return <ScreenShell>
    <View style={styles.container}>
      <View>
        <Text style={styles.eyebrow}>YOUR PATH IS READY</Text>
        <Text style={styles.title}>Keep the{`\n`}signal on.</Text>
        <Text style={styles.body}>Your own vocabulary, rhythm and{`\n`}practice space.</Text>
      </View>

      <View style={styles.plans}>
        <Pressable accessibilityRole="radio" accessibilityState={{selected: plan === 'yearly'}} onPress={() => setPlan('yearly')} style={[styles.yearlyCard, plan === 'yearly' && styles.planSelected]}>
          <View style={styles.planHeader}><Text style={styles.planEyebrow}>YEARLY · 7 DAYS FREE</Text>{plan === 'yearly' && <Text style={styles.selectedMark}>✓</Text>}</View>
          <Text style={styles.yearlyPrice}>$39.99</Text>
          <Text style={styles.planDetail}>$3.33/month · Cancel anytime</Text>
        </Pressable>

        <Pressable accessibilityRole="radio" accessibilityState={{selected: plan === 'weekly'}} onPress={() => setPlan('weekly')} style={[styles.weeklyCard, plan === 'weekly' && styles.planSelected]}>
          <View><Text style={styles.weeklyTitle}>Weekly</Text><Text style={styles.weeklyDetail}>Full access · Cancel anytime</Text></View>
          <View style={styles.weeklyPriceWrap}><Text style={styles.weeklyPrice}>$9.99</Text><Text style={styles.weeklyUnit}> / week</Text></View>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={start}><Text style={styles.ctaText}>{plan === 'yearly' ? 'Start free trial' : 'Continue with weekly'}</Text></Pressable>
        <Text style={styles.reassurance}>{plan === 'yearly' ? 'No payment now · Cancel anytime' : 'Cancel anytime'}</Text>
        <View style={styles.links}><Text style={styles.link} onPress={() => Alert.alert('Restore purchases', 'Purchase restoration will be connected with the billing service in a later phase.')}>Restore</Text><Text style={styles.dot}>·</Text><Text style={styles.link} onPress={() => Alert.alert('Terms', 'Terms link will be added with billing integration.')}>Terms</Text></View>
      </View>
    </View>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingTop: spacing.xl, paddingBottom: spacing.sm, justifyContent: 'space-between'},
  eyebrow: {fontSize: 12, letterSpacing: 2.4, color: colors.muted, fontWeight: '700'},
  title: {fontFamily: 'Georgia', fontSize: 55, lineHeight: 52, letterSpacing: -3, color: colors.text, marginTop: spacing.md},
  body: {fontSize: 20, lineHeight: 29, color: colors.muted, marginTop: spacing.md},
  plans: {gap: 11, marginTop: spacing.xl},
  yearlyCard: {padding: spacing.lg, minHeight: 190, justifyContent: 'space-between', backgroundColor: colors.backgroundRaised, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent'},
  planSelected: {borderColor: 'rgba(200,255,251,.44)'},
  planHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  planEyebrow: {fontSize: 12, letterSpacing: 2.2, color: colors.muted, fontWeight: '700'},
  selectedMark: {color: colors.mint, fontSize: 18, fontWeight: '700'},
  yearlyPrice: {fontFamily: 'Georgia', fontSize: 62, letterSpacing: -3, lineHeight: 68, color: colors.text, marginTop: 5},
  planDetail: {fontSize: 16, color: colors.muted, marginTop: -2},
  weeklyCard: {minHeight: 82, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  weeklyTitle: {fontSize: 18, fontWeight: '700', color: colors.text},
  weeklyDetail: {fontSize: 13, color: colors.muted, marginTop: 3},
  weeklyPriceWrap: {flexDirection: 'row', alignItems: 'baseline'},
  weeklyPrice: {fontFamily: 'Georgia', fontSize: 29, color: colors.text},
  weeklyUnit: {fontSize: 13, color: colors.muted},
  footer: {gap: spacing.sm},
  cta: {minHeight: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint},
  ctaText: {fontSize: 18, fontWeight: '700', color: colors.primaryText},
  reassurance: {fontSize: 13, textAlign: 'center', color: colors.muted},
  links: {flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 2},
  link: {fontSize: 14, color: colors.muted},
  dot: {color: colors.muted},
});
