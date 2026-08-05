import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Linking, Pressable, StyleSheet, Text, TextInput} from 'react-native';

import type {OnboardingStackParamList} from '../../../navigation/OnboardingNavigator';
import {loadUserId} from '../../../logic/userId';
import {logEvent} from '../../../services/mixpanel';
import {colors, radius, spacing} from '../../../theme';
import {SettingsScreen} from './SettingsChrome';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Contact'>;

export function ContactScreen({navigation}: Props) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void logEvent('contact_view');
  }, []);

  const send = async () => {
    const body = message.trim();
    if (body.length < 8) {
      void logEvent('contact_sent', {outcome: 'blocked_short', message_length: body.length});
      Alert.alert('Almost there', 'Tell us a little more so we can help.');
      return;
    }
    setSending(true);
    try {
      const userId = await loadUserId();
      const url =
        `mailto:hello@fluent.app` +
        `?subject=${encodeURIComponent('FlashVocab support')}` +
        `&body=${encodeURIComponent(`${body}\n\n—\nUser ID: ${userId}`)}`;
      const can = await Linking.canOpenURL(url);
      if (!can) {
        void logEvent('contact_sent', {outcome: 'no_mail_app', message_length: body.length});
        Alert.alert('No mail app', 'Email us at hello@fluent.app');
        return;
      }
      await Linking.openURL(url);
      void logEvent('contact_sent', {outcome: 'sent', message_length: body.length});
    } catch {
      void logEvent('contact_sent', {outcome: 'error', message_length: body.length});
      Alert.alert('Couldn’t open mail', 'Email us at hello@fluent.app');
    } finally {
      setSending(false);
    }
  };

  return (
    <SettingsScreen title="Contact Us" onBack={() => navigation.goBack()}>
      <Text style={styles.lead}>
        Bugs, ideas, or billing questions — we read every note.
      </Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="What’s on your mind?"
        placeholderTextColor={colors.muted}
        multiline
        textAlignVertical="top"
        style={styles.input}
      />
      <Pressable
        style={[styles.button, sending && styles.buttonDisabled]}
        disabled={sending}
        onPress={send}
      >
        <Text style={styles.buttonText}>{sending ? 'Opening…' : 'Send email'}</Text>
      </Pressable>
      <Text style={styles.hint}>Opens your mail app · hello@fluent.app</Text>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  lead: {color: colors.muted, fontSize: 15, lineHeight: 22},
  input: {
    minHeight: 160,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    padding: spacing.md,
  },
  button: {
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    padding: 17,
    alignItems: 'center',
  },
  buttonDisabled: {opacity: 0.6},
  buttonText: {color: colors.primaryText, fontSize: 16, fontWeight: '700'},
  hint: {color: colors.muted, fontSize: 13, textAlign: 'center'},
});
