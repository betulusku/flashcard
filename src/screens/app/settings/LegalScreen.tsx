import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView, StyleSheet, Text} from 'react-native';

import {getLegalContent} from '../../../data/contentStore';
import type {OnboardingStackParamList} from '../../../navigation/OnboardingNavigator';
import {colors, spacing} from '../../../theme';
import {SettingsScreen} from './SettingsChrome';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Legal'>;

export function LegalScreen({navigation, route}: Props) {
  const legal = getLegalContent();
  const doc = legal[route.params.doc];
  const updated = legal.updatedAt
    ? `Last updated · ${legal.updatedAt}`
    : 'Last updated · August 2026';

  return (
    <SettingsScreen title={doc.title} onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <Text style={styles.updated}>{updated}</Text>
        {doc.sections.map(section => (
          <React.Fragment key={section.heading}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </React.Fragment>
        ))}
      </ScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  page: {paddingBottom: spacing.xl, gap: spacing.sm},
  updated: {color: colors.muted, fontSize: 13, marginBottom: spacing.sm},
  heading: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  body: {fontSize: 15, lineHeight: 23, color: colors.muted},
});
