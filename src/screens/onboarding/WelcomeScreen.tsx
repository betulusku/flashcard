import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, StyleSheet, Text, View} from 'react-native';
import {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {spacing, typography} from '../../theme';
import {ScreenShell} from './ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;
export function WelcomeScreen({navigation}: Props) {
  return <ScreenShell><View style={styles.container}><Text style={styles.eyebrow}>FLUENT</Text><Text style={styles.title}>English that fits your life.</Text><Text style={styles.body}>Personalized words and real sentences, built around your goals in just a few minutes a day.</Text><Button title="Get started" onPress={() => navigation.navigate('Survey')} /></View></ScreenShell>;
}
const styles = StyleSheet.create({container: {flex: 1, justifyContent: 'center', gap: spacing.lg}, eyebrow: {fontSize: typography.caption, fontWeight: '700'}, title: {fontSize: typography.title, fontWeight: '700'}, body: {fontSize: typography.body}});
