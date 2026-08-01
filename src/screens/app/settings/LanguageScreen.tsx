import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {OnboardingStackParamList} from '../../../navigation/OnboardingNavigator';
import {
  type AppLanguage,
  languageLabels,
  loadAppLanguage,
  saveAppLanguage,
} from '../../../logic/settings';
import {haptic} from '../../../services/feedback';
import {Icon} from '../../../components/Icon';
import {colors, radius, spacing} from '../../../theme';
import {SettingsScreen} from './SettingsChrome';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Language'>;

const options: AppLanguage[] = ['en', 'tr'];

export function LanguageScreen({navigation}: Props) {
  const [language, setLanguage] = useState<AppLanguage>('en');

  useEffect(() => {
    loadAppLanguage().then(setLanguage).catch(() => undefined);
  }, []);

  const select = async (next: AppLanguage) => {
    setLanguage(next);
    haptic('selection');
    await saveAppLanguage(next);
  };

  return (
    <SettingsScreen title="Language" onBack={() => navigation.goBack()}>
      <Text style={styles.lead}>
        Choose the language for menus and helper text. Word content stays in
        English ↔ Turkish.
      </Text>
      <View style={styles.list}>
        {options.map((option, index) => {
          const selected = language === option;
          return (
            <Pressable
              key={option}
              onPress={() => select(option)}
              style={[styles.row, index === options.length - 1 && styles.rowLast]}
              accessibilityRole="button"
              accessibilityState={{selected}}
            >
              <Text style={styles.label}>{languageLabels[option]}</Text>
              {selected ? <Icon.Check size={20} color={colors.mint} /> : null}
            </Pressable>
          );
        })}
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  lead: {color: colors.muted, fontSize: 15, lineHeight: 22},
  list: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingVertical: 4,
    gap: 2,
  },
  row: {
    minHeight: 54,
    marginHorizontal: 4,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLast: {},
  label: {fontSize: 16, fontWeight: '600', color: colors.text},
});
