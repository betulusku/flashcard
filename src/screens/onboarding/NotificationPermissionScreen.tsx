import React, {useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {requestNotifications, RESULTS} from 'react-native-permissions';

import {markOnboardingComplete} from '../../logic/onboarding';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {goHomeFaded} from '../../navigation/navTransitions';
import {useAppSelector} from '../../store/hooks';
import {colors, radius, spacing} from '../../theme';
import {createLogger} from '../../utils/logger';
import {ScreenShell} from './ScreenShell';

const log = createLogger('Notifications');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Notifications'>;

export function NotificationPermissionScreen({navigation}: Props) {
  const inReview = useAppSelector(s => s.purchases.inReview);
  const [requesting, setRequesting] = useState(false);

  const continueAfterNotifications = () => {
    if (inReview) {
      log.info('Skipping paywall after notifications (inReview)');
      markOnboardingComplete().catch(() => undefined);
      goHomeFaded(navigation);
      return;
    }
    log.info('Continuing to paywall');
    navigation.replace('Paywall');
  };

  const requestPermission = async () => {
    setRequesting(true);
    try {
      const {status} = await requestNotifications(['alert', 'badge', 'sound']);
      if (status === RESULTS.BLOCKED) {
        Alert.alert('Reminders are off', 'You can enable them later in Settings.');
      }
    } catch {
      Alert.alert('Permission unavailable', 'You can enable reminders later in Settings.');
    } finally {
      setRequesting(false);
      continueAfterNotifications();
    }
  };

  return (
    <ScreenShell>
      <View style={styles.container}>
        <View style={styles.copy}>
          <View style={styles.orb}>
            <View style={styles.orbLight} />
          </View>
          <Text style={styles.eyebrow}>A SMALL NUDGE</Text>
          <Text style={styles.title}>
            Stay close{`\n`}to it.
          </Text>
          <Text style={styles.body}>
            A reminder can bring you back to the promise you made here.
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            disabled={requesting}
            style={[styles.primary, requesting && styles.disabled]}
            onPress={requestPermission}
          >
            <Text style={styles.primaryText}>
              {requesting ? 'Opening permission…' : 'Enable reminders'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={continueAfterNotifications}>
            <Text style={styles.secondaryText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  copy: {gap: spacing.md},
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: spacing.lg,
    backgroundColor: '#254BFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#315BFF',
    shadowOpacity: 0.55,
    shadowRadius: 34,
    shadowOffset: {width: 0, height: 12},
    elevation: 10,
  },
  orbLight: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C8FFFB',
    opacity: 0.65,
  },
  eyebrow: {color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 2.6},
  title: {
    fontFamily: 'Georgia',
    fontSize: 54,
    lineHeight: 52,
    letterSpacing: -2.7,
    color: colors.text,
  },
  body: {maxWidth: 340, color: colors.muted, fontSize: 20, lineHeight: 29},
  actions: {gap: spacing.xs},
  primary: {
    minHeight: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  primaryText: {color: colors.primaryText, fontSize: 18, fontWeight: '700'},
  secondary: {minHeight: 46, alignItems: 'center', justifyContent: 'center'},
  secondaryText: {color: colors.muted, fontSize: 16},
  disabled: {opacity: 0.55},
});
