import React, {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {CompositeScreenProps} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeBottomTabScreenProps} from '@react-navigation/bottom-tabs/unstable';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  Alert,
  Clipboard,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {AppTabParamList} from '../../navigation/AppTabs';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {languageLabels, loadAppLanguage} from '../../logic/settings';
import {loadUserId} from '../../logic/userId';
import type {SurveyAnswers} from '../../types/onboarding';
import {haptic} from '../../services/feedback';
import {Icon} from '../../components/Icon';
import {colors, radius, spacing} from '../../theme';
import {
  SettingsAction,
  SettingsGroup,
  SettingsRow,
  SettingsScreen,
} from './settings/SettingsChrome';

type Props = CompositeScreenProps<
  NativeBottomTabScreenProps<AppTabParamList, 'ProfileTab'>,
  NativeStackScreenProps<OnboardingStackParamList>
>;

const levelLabels: Record<string, string> = {
  a1: 'A1',
  a2: 'A2',
  b1: 'B1',
  b2: 'B2',
  c1: 'C1',
  unsure: 'Exploring',
};

export function ProfileScreen({navigation}: Props) {
  const [userId, setUserId] = useState('');
  const [language, setLanguage] = useState('English');
  const [level, setLevel] = useState('Your level');
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    loadUserId().then(setUserId).catch(() => undefined);
    loadAppLanguage()
      .then(code => setLanguage(languageLabels[code]))
      .catch(() => undefined);
    AsyncStorage.getItem('fluent:survey')
      .then(value => {
        if (!value) return;
        const answers = JSON.parse(value) as SurveyAnswers;
        setLevel(answers.level ? levelLabels[answers.level] ?? 'Your level' : 'Your level');
      })
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const open = (screen: keyof OnboardingStackParamList, params?: object) => {
    // Tab sits inside the root stack; navigate bubbles to Study/Legal/etc.
    (navigation as any).navigate(screen, params);
  };

  const copyId = () => {
    if (!userId) return;
    Clipboard.setString(userId);
    haptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const restorePurchases = () => {
    Alert.alert(
      'Restore purchase',
      'Looking for subscriptions on this Apple ID…',
      [
        {
          text: 'OK',
          onPress: () =>
            Alert.alert(
              'Nothing to restore',
              'No active Fluent purchase was found. If you think this is wrong, contact us with your User ID.',
            ),
        },
      ],
    );
  };

  const rateUs = () => {
    Alert.alert('Rate Fluent', 'Thanks for learning with us. Rating opens after App Store listing is live.');
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message: 'I’m practising English with Fluent — short daily words that stick.',
      });
    } catch {
      // User dismissed the sheet.
    }
  };

  const shortId =
    userId.length > 22 ? `${userId.slice(0, 10)}…${userId.slice(-8)}` : userId;

  return (
    <SettingsScreen title="Profile" footerPad>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.hero}>
          <Text style={styles.name}>Betül.</Text>
          <Text style={styles.meta}>{level} · preferences & account</Text>
        </View>

        <SettingsGroup>
          <SettingsRow
            icon="Users"
            label="Preference Selection"
            onPress={() => open('Preferences')}
          />
          <SettingsRow
            icon="Globe"
            label="Language"
            value={language}
            onPress={() => open('Language')}
          />
          <SettingsRow
            icon="Mail"
            label="Contact Us"
            onPress={() => open('Contact')}
          />
          <SettingsRow
            icon="Shield"
            label="Privacy Policy"
            onPress={() => open('Legal', {doc: 'privacy'})}
          />
          <SettingsRow
            icon="RefreshCw"
            label="Restore Purchase"
            onPress={restorePurchases}
          />
          <SettingsRow
            icon="FileText"
            label="Terms of Use"
            last
            onPress={() => open('Legal', {doc: 'terms'})}
          />
        </SettingsGroup>

        <View style={styles.idCard}>
          <View style={styles.idIcon}>
            <Icon.User size={20} color={colors.text} />
          </View>
          <View style={styles.idCopy}>
            <Text style={styles.idLabel}>User ID</Text>
            <Text style={styles.idValue} numberOfLines={1}>
              {shortId || '…'}
            </Text>
          </View>
          <Pressable
            onPress={copyId}
            style={styles.copyBtn}
            accessibilityLabel="Copy user id"
          >
            <Icon.Copy size={18} color={copied ? colors.mint : colors.text} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <SettingsAction icon="Star" label="Rate Us" accent onPress={rateUs} />
          <SettingsAction icon="Share2" label="Share App" onPress={shareApp} />
        </View>

        <Pressable
          onPress={() => open('Account')}
          style={styles.accountLink}
          accessibilityRole="button"
        >
          <Text style={styles.accountLinkText}>Account & sign-in</Text>
          <Icon.ChevronRight size={16} color={colors.muted} />
        </Pressable>
      </ScrollView>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {gap: spacing.md, paddingBottom: spacing.lg},
  hero: {gap: 4, marginBottom: spacing.xs},
  name: {
    fontFamily: 'Georgia',
    fontSize: 36,
    lineHeight: 40,
    color: colors.text,
  },
  meta: {color: colors.muted, fontSize: 14},
  idCard: {
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  idIcon: {width: 28, alignItems: 'center'},
  idCopy: {flex: 1, gap: 2},
  idLabel: {fontSize: 13, fontWeight: '600', color: colors.text},
  idValue: {fontSize: 13, color: colors.muted},
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
  },
  actions: {flexDirection: 'row', gap: spacing.sm},
  accountLink: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  accountLinkText: {color: colors.muted, fontSize: 14, fontWeight: '600'},
});
