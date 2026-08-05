import React, {useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {requestNotifications, RESULTS} from 'react-native-permissions';
import InAppReview from 'react-native-in-app-review';
import Svg, {Path} from 'react-native-svg';

import {Icon} from '../../components/Icon';
import {markOnboardingComplete} from '../../logic/onboarding';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {goHomeFaded} from '../../navigation/navTransitions';
import {useAppSelector} from '../../store/hooks';
import {colors, radius, spacing} from '../../theme';
import {createLogger} from '../../utils/logger';
import {FluentLockup, PrimaryButtonBackground} from './OnboardingPrimitives';
import {ScreenShell} from './ScreenShell';

const log = createLogger('Notifications');
type Props = NativeStackScreenProps<OnboardingStackParamList, 'Notifications'>;

export function NotificationPermissionScreen({navigation}: Props) {
  const inReview = useAppSelector(s => s.purchases.inReview);
  const [requesting, setRequesting] = useState(false);
  const openingReview = useRef(false);
  const next = async () => {
    if (inReview) { markOnboardingComplete().catch(() => undefined); goHomeFaded(navigation); return; }
    if (openingReview.current) return;
    openingReview.current = true;
    try {
      if (InAppReview.isAvailable()) {
        await InAppReview.RequestInAppReview();
      }
    } catch {
      // Apple may decline or suppress the prompt; onboarding must still continue.
    } finally {
      navigation.replace('HelpUsGrow');
    }
  };
  const requestPermission = async () => {
    setRequesting(true);
    try {
      const {status} = await requestNotifications(['alert', 'badge', 'sound']);
      if (status === RESULTS.BLOCKED) Alert.alert('Reminders are off', 'You can enable them later in Settings.');
    } catch { Alert.alert('Permission unavailable', 'You can enable reminders later in Settings.'); }
    finally { setRequesting(false); log.info('Notification step complete'); await next(); }
  };
  return <ScreenShell padded={false}>
    <View style={styles.container}>
      <FluentLockup />
      <View style={styles.heroIcon}>
        <Svg width="320" height="180" style={styles.waves} viewBox="0 0 320 180" pointerEvents="none">
          <Path d="M56 50 C28 76 28 104 56 130" fill="none" stroke="rgba(200,255,251,0.13)" strokeWidth="2" strokeLinecap="round" />
          <Path d="M72 65 C55 81 55 99 72 115" fill="none" stroke="rgba(200,255,251,0.1)" strokeWidth="2" strokeLinecap="round" />
          <Path d="M264 50 C292 76 292 104 264 130" fill="none" stroke="rgba(200,255,251,0.13)" strokeWidth="2" strokeLinecap="round" />
          <Path d="M248 65 C265 81 265 99 248 115" fill="none" stroke="rgba(200,255,251,0.1)" strokeWidth="2" strokeLinecap="round" />
        </Svg>
        <Image source={require('../../../assets/onboarding-bell.png')} style={styles.bellImage} resizeMode="contain" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>A SMALL NUDGE</Text>
        <Text style={styles.title}>Stay close{`\n`}to your <Text style={styles.accent}>goal.</Text></Text>
        <Text style={styles.body}>A gentle reminder brings you back{`\n`}when it’s time for a few new words.</Text>
      </View>
      <View style={styles.infoCard}>
        <InfoRow icon="clock" title="At your time" detail="We’ll remind you at your chosen time." />
        <View style={styles.divider} />
        <InfoRow icon="target" title="Stay consistent" detail="Small steps every day lead to big results." />
        <View style={styles.divider} />
        <InfoRow icon="chart" title="Your progress" detail="Build a habit that lasts." />
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={next}><Text style={styles.secondaryText}>Not Now</Text></Pressable>
        <Pressable disabled={requesting} style={[styles.primary, requesting && styles.disabled]} onPress={requestPermission}><PrimaryButtonBackground /><Text style={styles.primaryText}>{requesting ? 'Opening permission…' : 'Enable Reminders'}</Text></Pressable>
      </View>
    </View>
  </ScreenShell>;
}

function InfoRow({icon, title, detail}: {icon: 'clock' | 'target' | 'chart'; title: string; detail: string}) {
  const RowIcon = icon === 'clock' ? Icon.Clock : icon === 'target' ? Icon.Target : Icon.BarChart;
  return <View style={styles.infoRow}><View style={styles.infoIcon}><RowIcon size={27} color={colors.mint} strokeWidth={1.8} /></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDetail}>{detail}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm, backgroundColor: '#030C17'},
  heroIcon: {height: 170, marginTop: spacing.md, alignItems: 'center', justifyContent: 'center'},
  bellImage: {width: 124, height: 124},
  waves: {position: 'absolute'},
  copy: {alignItems: 'center'},
  eyebrow: {fontSize: 12, fontWeight: '700', letterSpacing: 3, color: colors.mint},
  title: {fontFamily: 'Georgia', fontSize: 48, lineHeight: 49, letterSpacing: -2.2, textAlign: 'center', color: colors.text, marginTop: spacing.sm},
  accent: {color: colors.mint},
  body: {fontSize: 15, lineHeight: 22, textAlign: 'center', color: colors.muted, marginTop: spacing.sm},
  infoCard: {marginTop: spacing.lg, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: '#111824'},
  infoRow: {minHeight: 66, flexDirection: 'row', alignItems: 'center'},
  infoIcon: {width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,255,251,.06)'},
  infoCopy: {flex: 1, marginLeft: spacing.md}, infoTitle: {fontSize: 16, fontWeight: '700', color: colors.text}, infoDetail: {fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 4},
  divider: {height: StyleSheet.hairlineWidth, marginLeft: 60, backgroundColor: colors.border},
  actions: {marginTop: 'auto', marginBottom: 56, gap: spacing.xs}, primary: {minHeight: 58, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'}, primaryText: {fontSize: 18, fontWeight: '700', color: colors.primaryText},
  secondary: {minHeight: 44, alignItems: 'center', justifyContent: 'center'}, secondaryText: {fontSize: 16, fontWeight: '600', color: colors.mint}, disabled: {opacity: .55},
});
