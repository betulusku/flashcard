import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import type {OnboardingStackParamList} from '../../../navigation/OnboardingNavigator';
import type {SurveyAnswers} from '../../../types/onboarding';
import {emptySurvey, loadSurvey, saveSurvey} from '../../../logic/survey';
import {haptic} from '../../../services/feedback';
import {logEvent} from '../../../services/mixpanel';
import {colors, radius, spacing} from '../../../theme';
import {SettingsScreen} from './SettingsChrome';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Preferences'>;

const levels = [
  {id: 'a1', label: 'A1 · Beginner'},
  {id: 'a2', label: 'A2 · Elementary'},
  {id: 'b1', label: 'B1 · Intermediate'},
  {id: 'b2', label: 'B2 · Upper-Int.'},
  {id: 'c1', label: 'C1 · Advanced'},
] as const;

const daily = [
  {id: 'casual', label: '5 words / day'},
  {id: 'regular', label: '10 words / day'},
  {id: 'serious', label: '15 words / day'},
  {id: 'intense', label: '20 words / day'},
] as const;

const weekly = [
  {id: 'easy', label: '20 / week'},
  {id: 'steady', label: '40 / week'},
  {id: 'challenge', label: '70 / week'},
  {id: 'ambitious', label: '100 / week'},
] as const;

export function PreferencesScreen({navigation}: Props) {
  const [answers, setAnswers] = useState<SurveyAnswers>(emptySurvey);

  useEffect(() => {
    void logEvent('prefs_view');
    loadSurvey()
      .then(setAnswers)
      .catch(() => undefined);
  }, []);

  const patch = async (next: SurveyAnswers) => {
    for (const field of ['level', 'daily', 'weekly'] as const) {
      if (answers[field] !== next[field]) {
        void logEvent('prefs_survey_update', {
          field,
          old_value: answers[field] ?? '',
          new_value: next[field] ?? '',
        });
        break;
      }
    }
    setAnswers(next);
    haptic('selection');
    await saveSurvey(next);
  };

  return (
    <SettingsScreen title="Preferences" onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <Text style={styles.lead}>Tune how FlashVocab paces your practice.</Text>

        <Text style={styles.section}>Level</Text>
        <View style={styles.chips}>
          {levels.map(item => (
            <Chip
              key={item.id}
              label={item.label}
              selected={answers.level === item.id}
              onPress={() => patch({...answers, level: item.id})}
            />
          ))}
        </View>

        <Text style={styles.section}>Daily pace</Text>
        <View style={styles.chips}>
          {daily.map(item => (
            <Chip
              key={item.id}
              label={item.label}
              selected={answers.daily === item.id}
              onPress={() => patch({...answers, daily: item.id})}
            />
          ))}
        </View>

        <Text style={styles.section}>Weekly goal</Text>
        <View style={styles.chips}>
          {weekly.map(item => (
            <Chip
              key={item.id}
              label={item.label}
              selected={answers.weekly === item.id}
              onPress={() => patch({...answers, weekly: item.id})}
            />
          ))}
        </View>
      </ScrollView>
    </SettingsScreen>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{selected}}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {gap: spacing.sm, paddingBottom: spacing.xl},
  lead: {color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: spacing.sm},
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    color: colors.mint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: 'rgba(200,255,251,.18)',
  },
  chipText: {color: colors.text, fontSize: 14, fontWeight: '600'},
  chipTextOn: {color: colors.mint},
});
