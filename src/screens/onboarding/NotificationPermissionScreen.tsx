import React, {useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Button, StyleSheet, Text, View} from 'react-native';
import {requestNotifications, RESULTS} from 'react-native-permissions';
import {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {spacing, typography} from '../../theme';
import {ScreenShell} from './ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Notifications'>;
export function NotificationPermissionScreen({navigation}: Props) {
  const [requesting, setRequesting] = useState(false);
  const continueToPaywall = () => navigation.replace('Paywall');
  const requestPermission = async () => {
    setRequesting(true);
    try {
      const {status} = await requestNotifications(['alert', 'badge', 'sound']);
      if (status === RESULTS.BLOCKED) Alert.alert('Reminders are off', 'You can enable them later in Settings.');
    } catch { Alert.alert('Permission unavailable', 'You can enable reminders later in Settings.'); }
    finally { setRequesting(false); continueToPaywall(); }
  };
  return <ScreenShell><View style={styles.container}><Text style={styles.bell}>🔔</Text><Text style={styles.title}>Stay on track.</Text><Text style={styles.body}>Reminders help you protect your streak and keep learning.</Text><Button title={requesting ? 'Opening permission…' : 'Enable reminders'} disabled={requesting} onPress={requestPermission} /><Button title="Not now" onPress={continueToPaywall} /></View></ScreenShell>;
}
const styles = StyleSheet.create({container: {flex: 1, justifyContent: 'center', gap: spacing.lg}, bell: {fontSize: 42}, title: {fontSize: typography.title, fontWeight: '700'}, body: {fontSize: typography.body}});
