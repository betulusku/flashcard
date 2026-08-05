import React, {useEffect, useMemo, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {getInboxSeed} from '../../data/contentStore';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {AppBar, AppBarButton} from '../../components/AppBar';
import {Icon} from '../../components/Icon';
import {colors, radius, spacing} from '../../theme';
import {ScreenShell} from '../onboarding/ScreenShell';
import {haptic} from '../../services/feedback';
import {logEvent} from '../../services/mixpanel';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Inbox'>;

const toneFill = {
  mint: 'rgba(200,255,251,.16)',
  warm: 'rgba(255,214,107,.16)',
  soft: 'rgba(150,180,255,.14)',
} as const;

export function InboxScreen({navigation}: Props) {
  const [notes, setNotes] = useState(() => getInboxSeed());
  const unread = useMemo(() => notes.filter(n => n.unread).length, [notes]);

  useEffect(() => {
    void logEvent('inbox_view', {unread_count: unread});
  }, []);

  const markAll = () => {
    void logEvent('inbox_mark_click');
    setNotes(list => list.map(n => ({...n, unread: false})));
    haptic('selection');
  };

  const openNote = (id: string) => {
    void logEvent('inbox_note_click', {note_id: id});
    setNotes(list =>
      list.map(n => (n.id === id ? {...n, unread: false} : n)),
    );
    haptic('selection');
  };

  return (
    <ScreenShell>
      <AppBar
        title="Notifications"
        left={
          <AppBarButton onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <Icon.ChevronLeft />
          </AppBarButton>
        }
        right={
          unread > 0 ? (
            <Pressable onPress={markAll} hitSlop={10} accessibilityRole="button">
              <Text style={styles.markAll}>Mark all read</Text>
            </Pressable>
          ) : (
            <View style={styles.markAllSpacer} />
          )
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {unread > 0 ? (
          <Text style={styles.kicker}>{unread} new</Text>
        ) : (
          <Text style={styles.kicker}>You’re caught up</Text>
        )}

        {notes.map(note => {
          const Glyph = Icon[note.icon];
          return (
            <Pressable
              key={note.id}
              style={[styles.card, note.unread && styles.cardUnread]}
              onPress={() => openNote(note.id)}
            >
              <View
                style={[
                  styles.iconWrap,
                  {backgroundColor: toneFill[note.tone ?? 'soft']},
                ]}
              >
                <Glyph size={20} color={colors.mint} />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {note.title}
                  </Text>
                  {note.unread ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.body} numberOfLines={2}>
                  {note.body}
                </Text>
                <Text style={styles.time}>{note.time}</Text>
              </View>
            </Pressable>
          );
        })}

        <View style={styles.footer}>
          <Icon.Bell size={18} color={colors.muted} />
          <Text style={styles.footerText}>
            Practice reminders and progress notes land here.
          </Text>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  markAll: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mint,
    paddingHorizontal: 4,
  },
  markAllSpacer: {width: 44, height: 44},
  list: {paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: 8},
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  cardUnread: {
    backgroundColor: colors.surfaceStrong,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1, gap: 4},
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  title: {flex: 1, fontSize: 16, fontWeight: '700', color: colors.text},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mint,
  },
  body: {fontSize: 14, lineHeight: 20, color: colors.muted},
  time: {marginTop: 2, fontSize: 12, fontWeight: '600', color: 'rgba(184,200,229,.72)'},
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
