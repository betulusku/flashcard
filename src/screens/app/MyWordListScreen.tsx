import React, {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {NativeBottomTabScreenProps} from '@react-navigation/bottom-tabs/unstable';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import type {AppTabParamList} from '../../navigation/AppTabs';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import type {VocabularyWord} from '../../data/vocabularyBank';
import {loadLearningState, saveLearningState} from '../../logic/learningStorage';
import type {LearningState} from '../../logic/learningEngine';
import {findWordsByTokens, progressFor, savedWordsKey} from '../../logic/wordCollections';
import {AppBar, AppBarButton} from '../../components/AppBar';
import {Icon} from '../../components/Icon';
import {haptic, speak} from '../../services/feedback';
import {colors, radius, spacing, tabBarSpace} from '../../theme';
import {ScreenShell} from '../onboarding/ScreenShell';

type Props = CompositeScreenProps<
  NativeBottomTabScreenProps<AppTabParamList, 'WordsTab'>,
  NativeStackScreenProps<OnboardingStackParamList>
>;
type Sort = 'newest' | 'oldest' | 'az' | 'za';

const sortLabels: Record<Sort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  az: 'A–Z',
  za: 'Z–A',
};

/**
 * This tab holds only the words the learner added by hand from Search. Words
 * that merely have practice history live in the Learning and Memorized
 * screens reached from Home, so the two surfaces never mirror each other.
 */
export function MyWordListScreen({navigation}: Props) {
  const [tokens, setTokens] = useState<string[]>([]);
  const [learning, setLearning] = useState<LearningState | null>(null);
  const [sort, setSort] = useState<Sort>('newest');
  const [query, setQuery] = useState('');
  const [showSort, setShowSort] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [saved, state] = await Promise.all([AsyncStorage.getItem(savedWordsKey), loadLearningState()]);
    const nextTokens: string[] = saved ? JSON.parse(saved) : [];
    // Older saved lists had no timestamp. Give them a stable, persisted order
    // once so the date sort stays correct after relaunching the app.
    let migrated = state;
    let changed = false;
    findWordsByTokens(nextTokens).forEach((word, index) => {
      const key = state.progress[word.id] ? word.id : word.en;
      const current = state.progress[key] ?? {known: 0, unknown: 0, favorite: false};
      if (current.addedAt) return;
      migrated = {
        ...migrated,
        progress: {...migrated.progress, [key]: {...current, addedAt: Date.now() - index}},
      };
      changed = true;
    });
    if (changed) await saveLearningState(migrated);
    setTokens(nextTokens);
    setLearning(migrated);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
    return navigation.addListener('focus', () => load().catch(() => undefined));
  }, [load, navigation]);

  const remove = (word: VocabularyWord) => {
    const next = tokens.filter(token => token !== word.en && token !== word.id);
    setTokens(next);
    setExpanded(null);
    haptic('selection');
    AsyncStorage.setItem(savedWordsKey, JSON.stringify(next)).catch(() => undefined);
  };

  const rows = useMemo(() => {
    const progress = learning?.progress ?? {};
    const needle = query.toLocaleLowerCase('tr');
    return findWordsByTokens(tokens)
      .filter(word => `${word.en} ${word.tr} ${word.definition ?? ''}`.toLocaleLowerCase('tr').includes(needle))
      .sort((a, b) => {
        if (sort === 'az') return a.en.localeCompare(b.en);
        if (sort === 'za') return b.en.localeCompare(a.en);
        const difference = (progressFor(b, progress).addedAt ?? 0) - (progressFor(a, progress).addedAt ?? 0);
        return sort === 'newest' ? difference : -difference;
      });
  }, [learning, query, sort, tokens]);

  const ids = useMemo(() => rows.map(word => word.id), [rows]);
  const hasWords = tokens.length > 0;

  return <ScreenShell>
    <AppBar
      title="My words"
      right={
        <>
          <AppBarButton onPress={() => setShowSort(value => !value)} accessibilityLabel="Sort words" active={showSort}>
            <Icon.Filter />
          </AppBarButton>
          <AppBarButton onPress={() => navigation.navigate('SearchTab')} accessibilityLabel="Add words">
            <Icon.Plus />
          </AppBarButton>
        </>
      }
    />
    <View style={styles.page}>
      <Text style={styles.kicker}>SAVED BY YOU</Text>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search your words" placeholderTextColor={colors.muted} style={styles.search} returnKeyType="search" clearButtonMode="while-editing" />

      <View style={styles.controlRow}>
        <Text style={styles.result}>{rows.length} {rows.length === 1 ? 'word' : 'words'}</Text>
        <Text style={styles.sortLabel}>{sortLabels[sort]}</Text>
      </View>

      {showSort && <View style={styles.sortMenu}>
        {(Object.keys(sortLabels) as Sort[]).map(item => <Pressable key={item} onPress={() => {setSort(item); setShowSort(false);}} style={styles.sortOption}><Text style={[styles.sortOptionText, sort === item && styles.sortOptionTextActive]}>{sortLabels[item]}</Text>{sort === item && <Icon.Check size={16} />}</Pressable>)}
      </View>}

      <ScrollView
        style={styles.list}
        contentContainerStyle={[styles.listContent, !rows.length && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {rows.map(word => {
          const item = progressFor(word, learning?.progress ?? {});
          const isOpen = expanded === word.id;
          return <Pressable key={word.id} style={[styles.row, isOpen && styles.rowOpen]} onPress={() => setExpanded(isOpen ? null : word.id)}>
            <View style={styles.rowTop}>
              <View style={styles.wordLine}><Text style={styles.word}>{word.en}</Text>{item.favorite && <Icon.Star size={14} color="#FFD66B" fill="#FFD66B" />}</View>
              {item.known > 0 && (
                <View style={styles.learnedPill}>
                  <Text style={styles.learned}>Learned</Text>
                </View>
              )}
            </View>
            <Text style={styles.meta}>{word.tr}</Text>
            {Boolean(word.definition) && <Text style={styles.definition} numberOfLines={isOpen ? undefined : 2}>{word.definition}</Text>}
            {isOpen && <>
              <Text style={styles.example}>“{word.example}”</Text>
              <View style={styles.rowActions}>
                <Pressable style={styles.rowActionBtn} onPress={() => speak(word.en)} accessibilityLabel="Read aloud"><Icon.Volume2 size={18} /><Text style={styles.rowAction}>Listen</Text></Pressable>
                <Pressable style={styles.rowActionBtn} onPress={() => speak(word.example)} accessibilityLabel="Read example sentence"><Icon.Type size={18} /><Text style={styles.rowAction}>Sentence</Text></Pressable>
                <Pressable onPress={() => navigation.navigate('Study', {ids: [word.id]})}><Text style={styles.rowAction}>Practise</Text></Pressable>
                <Pressable onPress={() => remove(word)}><Text style={styles.rowRemove}>Remove</Text></Pressable>
              </View>
            </>}
          </Pressable>;
        })}
        {!rows.length && <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{hasWords ? 'Nothing matches.' : 'Your list is empty.'}</Text>
          <Text style={styles.emptyCopy}>{hasWords ? 'Try another spelling or clear the search.' : 'Look up any word in Search and tap Add. It waits for you here.'}</Text>
          {!hasWords && <Pressable style={styles.emptyAction} onPress={() => navigation.navigate('SearchTab')}><Text style={styles.emptyActionText}>Browse words</Text></Pressable>}
        </View>}
      </ScrollView>

      {rows.length > 0 && <View style={styles.actions}>
        <Pressable style={[styles.action, styles.actionQuiet]} onPress={() => navigation.navigate('Test', {ids})}><Text style={styles.actionQuietText}>Take test</Text></Pressable>
        <Pressable style={styles.action} onPress={() => navigation.navigate('Study', {ids})}><Text style={styles.actionText}>Flashcards</Text></Pressable>
      </View>}
    </View>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  page: {flex: 1, paddingTop: spacing.sm},
  kicker: {fontSize: 10, fontWeight: '700', letterSpacing: 1.7, color: colors.muted, marginBottom: spacing.sm},
  search: {
    height: 54,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  sortMenu: {
    marginTop: spacing.sm,
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceStrong,
  },
  sortOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sortOptionText: {color: colors.muted, fontSize: 15},
  sortOptionTextActive: {color: colors.mint, fontWeight: '700'},
  result: {fontSize: 13, color: colors.muted},
  sortLabel: {fontSize: 13, fontWeight: '600', color: colors.mint},
  list: {flex: 1, marginTop: spacing.sm},
  listContent: {paddingTop: spacing.xs, paddingBottom: spacing.md, gap: 8},
  listContentEmpty: {paddingBottom: tabBarSpace},
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
  wordLine: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7},
  word: {fontSize: 18, fontWeight: '700', color: colors.text},
  learnedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.mint,
  },
  learned: {
    fontSize: 11,
    color: colors.primaryText,
    fontWeight: '800',
  },
  meta: {fontSize: 13, color: colors.muted, marginTop: 3},
  definition: {fontSize: 14, lineHeight: 20, color: 'rgba(242,248,255,.78)', marginTop: 7},
  example: {fontSize: 14, lineHeight: 21, fontStyle: 'italic', color: colors.muted, marginTop: 8},
  rowActions: {flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm},
  rowActionBtn: {flexDirection: 'row', alignItems: 'center', gap: 6},
  rowAction: {fontSize: 13, fontWeight: '700', color: colors.mint},
  rowRemove: {fontSize: 13, fontWeight: '700', color: colors.danger},
  empty: {paddingTop: 74, paddingHorizontal: spacing.md, alignItems: 'center'},
  emptyTitle: {fontFamily: 'Georgia', color: colors.text, fontSize: 25},
  emptyCopy: {textAlign: 'center', color: colors.muted, marginTop: 8, lineHeight: 20},
  emptyAction: {
    marginTop: spacing.lg,
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  emptyActionText: {fontSize: 14, fontWeight: '700', color: colors.primaryText},
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: tabBarSpace,
  },
  action: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.mint,
  },
  actionQuiet: {backgroundColor: colors.surfaceStrong},
  actionText: {color: colors.primaryText, fontSize: 15, fontWeight: '700'},
  actionQuietText: {color: colors.text, fontSize: 15, fontWeight: '700'},
});
