import React, {useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Button, Pressable, StyleSheet, Text, View} from 'react-native';
import {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {SurveyAnswers} from '../../types/onboarding';
import {colors, spacing, typography} from '../../theme';
import {ScreenShell} from './ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Paywall'> & {answers: SurveyAnswers};
export function PaywallScreen({answers, navigation}: Props) {
  const [plan, setPlan] = useState<'yearly' | 'weekly'>('yearly');
  const name = answers.occupationText ? ` for ${answers.occupationText}` : '';
  return <ScreenShell><View style={styles.container}><Text style={styles.eyebrow}>YOUR PERSONAL PLAN</Text><Text style={styles.title}>Unlock your full learning path</Text><Text>We just built a personalized learning plan{name}. Keep it going with full access.</Text><Text>✓ Personalized word lists{'\n'}✓ Unlimited flashcards & tests{'\n'}✓ Streaks & progress tracking{'\n'}✓ New words daily</Text><Pressable style={[styles.plan, plan === 'yearly' && styles.selected]} onPress={() => setPlan('yearly')}><Text style={styles.planTitle}>Yearly — Best value</Text><Text>Save 70% · 7-day free trial · $39.99/year</Text></Pressable><Pressable style={[styles.plan, plan === 'weekly' && styles.selected]} onPress={() => setPlan('weekly')}><Text style={styles.planTitle}>Weekly</Text><Text>$4.99/week · no trial</Text></Pressable><Button title="Start Free Trial" onPress={() => navigation.replace('Home')} /><Text style={styles.small}>No payment now · Cancel anytime</Text><View style={styles.links}><Button title="Restore" onPress={() => Alert.alert('Restore purchases', 'Purchase restoration will be connected with the billing service in a later phase.')} /><Button title="Terms" onPress={() => Alert.alert('Terms', 'Terms link will be added with billing integration.')} /></View></View></ScreenShell>;
}
const styles = StyleSheet.create({container: {flex: 1, justifyContent: 'center', gap: spacing.md}, eyebrow: {fontWeight: '700', fontSize: typography.caption}, title: {fontSize: typography.title, fontWeight: '700'}, plan: {padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 6}, selected: {borderColor: colors.primary, backgroundColor: colors.selected}, planTitle: {fontWeight: '700'}, small: {textAlign: 'center', fontSize: typography.caption}, links: {flexDirection: 'row', justifyContent: 'center'}});
