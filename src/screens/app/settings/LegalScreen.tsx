import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ScrollView, StyleSheet, Text} from 'react-native';

import type {OnboardingStackParamList} from '../../../navigation/OnboardingNavigator';
import {colors, spacing} from '../../../theme';
import {SettingsScreen} from './SettingsChrome';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Legal'>;

const docs = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'What we store on your device',
        body: 'Fluent keeps your practice history, saved words, survey answers, and settings in local storage on this phone. That data stays with you unless you choose to share it.',
      },
      {
        heading: 'Speech',
        body: 'Pronunciation uses the device speech engine. Utterances are not uploaded by Fluent for advertising or profiling.',
      },
      {
        heading: 'Support',
        body: 'If you contact us, your message and anonymous User ID help us debug. We don’t sell personal information.',
      },
      {
        heading: 'Changes',
        body: 'We’ll update this page when our practices change. Continued use of Fluent after an update means you accept the revised policy.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      {
        heading: 'The product',
        body: 'Fluent is a vocabulary practice app. Content is for learning; it’s not professional advice, and results vary with how often you practise.',
      },
      {
        heading: 'Your account & purchases',
        body: 'Subscriptions and one-time purchases are handled by the App Store. Restore Purchase recovers entitlements tied to your Apple ID on this device.',
      },
      {
        heading: 'Acceptable use',
        body: 'Don’t abuse the service, reverse engineer it for competing products, or use it in a way that harms other learners.',
      },
      {
        heading: 'Contact',
        body: 'Questions about these terms: hello@fluent.app.',
      },
    ],
  },
} as const;

export function LegalScreen({navigation, route}: Props) {
  const doc = docs[route.params.doc];
  return (
    <SettingsScreen title={doc.title} onBack={() => navigation.goBack()}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
        <Text style={styles.updated}>Last updated · August 2026</Text>
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
