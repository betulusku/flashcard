import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import type {VocabularyWord} from '../../data/vocabularyBank';
import {loadLearningState} from '../../logic/learningStorage';
import {loadSavedWordTokens} from '../../logic/savedWords';
import {collectionMeta, collectWords} from '../../logic/wordCollections';
import {colors, radius, spacing} from '../../theme';
import {AppBar, AppBarButton} from '../../components/AppBar';
import {Icon} from '../../components/Icon';
import {speak} from '../../services/feedback';
import {logEvent} from '../../services/mixpanel';
import {ScreenShell} from '../onboarding/ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Collection'>;

/**
 * One screen per collection reached from Home. It is a stack screen rather
 * than the My words tab so each group keeps its own search, its own count and
 * its own practice actions.
 */
export function WordCollectionScreen({navigation, route}: Props) {
  const {collection} = route.params;
  const meta = collectionMeta[collection];
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [saved, state] = await Promise.all([
      loadSavedWordTokens(),
      loadLearningState(),
    ]);
    const next = collectWords(collection, saved, state.progress);
    setWords(next);
    void logEvent('collection_view', {collection, count: next.length});
  }, [collection]);

  useEffect(() => {
    load().catch(() => undefined);
    return navigation.addListener('focus', () => load().catch(() => undefined));
  }, [load, navigation]);

  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    if (!needle) return words;
    return words.filter(word =>
      `${word.en} ${word.tr} ${word.definition ?? ''}`.toLocaleLowerCase('tr').includes(needle),
    );
  }, [query, words]);

  const ids = useMemo(() => rows.map(word => word.id), [rows]);

  return <ScreenShell>
    <AppBar
      title={meta.title}
      left={
        <AppBarButton onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Icon.ChevronLeft />
        </AppBarButton>
      }
    />

    <View style={styles.page}>
      <Text style={styles.subtitle}>{meta.subtitle}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={`Search ${meta.title.toLocaleLowerCase('en')}`}
        placeholderTextColor={colors.muted}
        style={styles.search}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      <Text style={styles.count}>
        {rows.length} {rows.length === 1 ? 'word' : 'words'}
        {query.trim() && words.length !== rows.length ? ` of ${words.length}` : ''}
      </Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {rows.map(word => {
          const isOpen = expanded === word.id;
          return <Pressable
            key={word.id}
            style={[styles.row, isOpen && styles.rowOpen]}
            onPress={() => setExpanded(isOpen ? null : word.id)}>
            <View style={styles.rowTop}>
              <Text style={styles.word}>{word.en}</Text>
              <Text style={styles.level}>{word.level}</Text>
            </View>
            <Text style={styles.translation}>{word.tr}</Text>
            {Boolean(word.definition) && <Text style={styles.definition} numberOfLines={isOpen ? undefined : 2}>{word.definition}</Text>}
            {isOpen && <>
              <Text style={styles.example}>“{word.example}”</Text>
              <View style={styles.rowActions}>
                <Pressable style={styles.rowActionBtn} onPress={() => {void logEvent('word_row_click', {screen: 'collection', word_id: word.id, action: 'listen'}); speak(word.en);}} accessibilityLabel="Read aloud"><Icon.Volume2 size={18} /><Text style={styles.rowAction}>Listen</Text></Pressable>
                <Pressable style={styles.rowActionBtn} onPress={() => {void logEvent('word_row_click', {screen: 'collection', word_id: word.id, action: 'sentence'}); speak(word.example);}} accessibilityLabel="Read example sentence"><Icon.Type size={18} /><Text style={styles.rowAction}>Sentence</Text></Pressable>
                <Pressable onPress={() => {void logEvent('word_row_click', {screen: 'collection', word_id: word.id, action: 'practice'}); navigation.navigate('Study', {ids: [word.id]});}}><Text style={styles.rowAction}>Practise this word</Text></Pressable>
              </View>
            </>}
          </Pressable>;
        })}
        {!rows.length && <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{words.length ? 'Nothing matches.' : 'Nothing here yet.'}</Text>
          <Text style={styles.emptyCopy}>{words.length ? 'Try another spelling or clear the search.' : meta.empty}</Text>
        </View>}
      </ScrollView>

      {rows.length > 0 && <View style={styles.actions}>
        <Pressable style={[styles.action, styles.actionQuiet]} onPress={() => {void logEvent('collection_action_click', {collection, action: 'test', word_count: ids.length}); navigation.navigate('Test', {ids});}}>
          <Text style={styles.actionQuietText}>Start test</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => {void logEvent('collection_action_click', {collection, action: 'flashcards', word_count: ids.length}); navigation.navigate('Study', {ids});}}>
          <Text style={styles.actionText}>Flashcards</Text>
        </Pressable>
      </View>}
    </View>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  page: {flex: 1, paddingTop: spacing.sm},
  subtitle: {color: colors.muted, fontSize: 14, marginBottom: spacing.md},
  search: {
    height: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  count: {marginTop: spacing.md, fontSize: 13, color: colors.muted},
  list: {flex: 1},
  listContent: {paddingTop: spacing.sm, paddingBottom: spacing.md, gap: 8},
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  rowOpen: {backgroundColor: colors.surfaceStrong},
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  word: {flex: 1, fontSize: 18, fontWeight: '700', color: colors.text},
  level: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(200,255,251,.12)',
    overflow: 'hidden',
  },
  translation: {fontSize: 13, color: colors.muted, marginTop: 3},
  definition: {fontSize: 14, lineHeight: 20, color: 'rgba(242,248,255,.78)', marginTop: 7},
  example: {fontSize: 14, lineHeight: 21, fontStyle: 'italic', color: colors.muted, marginTop: 8},
  rowActions: {flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm},
  rowActionBtn: {flexDirection: 'row', alignItems: 'center', gap: 6},
  rowAction: {fontSize: 13, fontWeight: '700', color: colors.mint},
  empty: {paddingTop: 74, paddingHorizontal: spacing.lg, alignItems: 'center'},
  emptyTitle: {fontFamily: 'Georgia', fontSize: 25, color: colors.text},
  emptyCopy: {marginTop: 8, textAlign: 'center', lineHeight: 20, color: colors.muted},
  actions: {flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs},
  action: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  actionQuiet: {backgroundColor: colors.surfaceStrong},
  actionText: {fontSize: 15, fontWeight: '700', color: colors.primaryText},
  actionQuietText: {fontSize: 15, fontWeight: '700', color: colors.text},
});
