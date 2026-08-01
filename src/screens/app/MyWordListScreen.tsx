import React, {useCallback, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';

import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {wordBank, VocabularyWord} from '../../data/vocabularyBank';
import {loadLearningState, saveLearningState} from '../../logic/learningStorage';
import type {LearningState, WordProgress} from '../../logic/learningEngine';
import {colors, radius, spacing} from '../../theme';
import {ScreenShell} from '../onboarding/ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'MyCards'>;
type Filter = 'all' | 'learning' | 'memorized' | 'favorites';
type Sort = 'newest' | 'oldest' | 'az' | 'za';

const storageKey = 'fluent:my-words';
const sortLabels: Record<Sort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  az: 'A–Z',
  za: 'Z–A',
};

function findWord(token: string) {
  return wordBank.find(word => word.id === token || word.en === token);
}

function progressFor(word: VocabularyWord, progress: Record<string, WordProgress>): WordProgress {
  const byId = progress[word.id];
  const byName = progress[word.en];
  if (!byId && !byName) return {known: 0, unknown: 0, favorite: false};
  return {
    known: (byId?.known ?? 0) + (byName?.known ?? 0),
    unknown: (byId?.unknown ?? 0) + (byName?.unknown ?? 0),
    favorite: Boolean(byId?.favorite || byName?.favorite),
    addedAt: byId?.addedAt ?? byName?.addedAt,
  };
}

export function MyWordListScreen({navigation, route}: Props) {
  const [tokens, setTokens] = useState<string[]>([]);
  const [learning, setLearning] = useState<LearningState | null>(null);
  const [filter, setFilter] = useState<Filter>((route.params as {filter?: Filter} | undefined)?.filter ?? 'all');
  const [sort, setSort] = useState<Sort>('newest');
  const [query, setQuery] = useState('');
  const [showSort, setShowSort] = useState(false);

  const load = useCallback(async () => {
    const [saved, state] = await Promise.all([AsyncStorage.getItem(storageKey), loadLearningState()]);
    const nextTokens: string[] = saved ? JSON.parse(saved) : [];
    // Older saved lists had no timestamp. Give them a stable, persisted order
    // once so the date sort stays correct after relaunching the app.
    let migrated = state;
    let changed = false;
    nextTokens.forEach((token, index) => {
      const word = findWord(token);
      if (!word) return;
      const key = state.progress[word.id] ? word.id : word.en;
      const current = state.progress[key] ?? {known: 0, unknown: 0, favorite: false};
      if (current.addedAt) return;
      migrated = {
        ...migrated,
        progress: {
          ...migrated.progress,
          [key]: {...current, addedAt: Date.now() - index},
        },
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

  useEffect(() => {
    const requestedFilter = (route.params as {filter?: Filter} | undefined)?.filter;
    if (requestedFilter) setFilter(requestedFilter);
  }, [route.params]);

  const rows = useMemo(() => {
    const progress = learning?.progress ?? {};
    // A word becomes visible here as soon as it has progress, even if it was
    // not manually saved from Search. This makes Learning and Memorized real
    // collections rather than counters that lead to an empty list.
    const trackedTokens = Object.keys(progress);
    const source = Array.from(new Set([...tokens, ...trackedTokens]));
    return source
      .map(findWord)
      .filter((word): word is VocabularyWord => Boolean(word))
      .filter(word => {
        const item = progressFor(word, progress);
        const matchesFilter = filter === 'all'
          || (filter === 'learning' ? item.unknown > 0 && item.known === 0
            : filter === 'memorized' ? item.known > 0 : item.favorite);
        const searchable = `${word.en} ${word.tr} ${word.pos}`.toLocaleLowerCase('tr');
        return matchesFilter && searchable.includes(query.toLocaleLowerCase('tr'));
      })
      .sort((a, b) => {
        const aProgress = progressFor(a, progress);
        const bProgress = progressFor(b, progress);
        if (sort === 'az') return a.en.localeCompare(b.en);
        if (sort === 'za') return b.en.localeCompare(a.en);
        const difference = (bProgress.addedAt ?? 0) - (aProgress.addedAt ?? 0);
        return sort === 'newest' ? difference : -difference;
      });
  }, [filter, learning, query, sort, tokens]);

  const hasWords = tokens.length > 0 || Object.keys(learning?.progress ?? {}).length > 0;
  return <ScreenShell>
    <View style={styles.page}>
      <View style={styles.heading}><Text style={styles.kicker}>YOUR COLLECTION</Text><Text style={styles.title}>My word list</Text></View>

      <TextInput value={query} onChangeText={setQuery} placeholder="Search your words" placeholderTextColor={colors.muted} style={styles.search} returnKeyType="search" clearButtonMode="while-editing" />

      <View style={styles.controlRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', 'learning', 'memorized', 'favorites'] as Filter[]).map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}
        </ScrollView>
        <Pressable style={styles.sortButton} onPress={() => setShowSort(value => !value)}><Text style={styles.sortText}>↕ {sortLabels[sort]}</Text></Pressable>
      </View>

      {showSort && <View style={styles.sortMenu}>
        {(Object.keys(sortLabels) as Sort[]).map(item => <Pressable key={item} onPress={() => {setSort(item); setShowSort(false);}} style={styles.sortOption}><Text style={[styles.sortOptionText, sort === item && styles.sortOptionTextActive]}>{sortLabels[item]}</Text>{sort === item && <Text style={styles.check}>✓</Text>}</Pressable>)}
      </View>}

      <Text style={styles.result}>{rows.length} {filter === 'all' ? 'words' : filter}</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.list, hasWords && styles.listWithActions]}>
        {rows.map(word => {
          const item = progressFor(word, learning?.progress ?? {});
          return <Pressable key={word.id} style={styles.row} onPress={() => navigation.navigate('Study', {pool: 'myWords'})}>
            <View style={styles.rowCopy}><View style={styles.wordLine}><Text style={styles.word}>{word.en}</Text>{item.favorite && <Text style={styles.star}>★</Text>}</View><Text style={styles.meta}>{word.pos} · {word.tr}</Text></View>
            <View style={styles.rowRight}>{item.known > 0 && <Text style={styles.learned}>Learned</Text>}<Text style={styles.chevron}>›</Text></View>
          </Pressable>;
        })}
        {!rows.length && <View style={styles.empty}><Text style={styles.emptyTitle}>{hasWords ? 'Nothing in this view.' : 'Your list is ready.'}</Text><Text style={styles.emptyCopy}>{hasWords ? 'Try another filter or search.' : 'Find a word in Search and tap Add.'}</Text>{!hasWords && <Pressable style={styles.emptyAction} onPress={() => navigation.navigate('SearchTab' as never)}><Text style={styles.emptyActionText}>Browse words</Text></Pressable>}</View>}
      </ScrollView>
      {hasWords && <View style={styles.actions}><Pressable style={[styles.action, styles.actionQuiet]} onPress={() => navigation.navigate('Test', {pool: 'myWords'})}><Text style={styles.actionQuietText}>Take test</Text></Pressable><Pressable style={styles.action} onPress={() => navigation.navigate('Study', {pool: 'myWords'})}><Text style={styles.actionText}>Study this list</Text></Pressable></View>}
    </View>
  </ScreenShell>;
}

const styles = StyleSheet.create({
  page: {flex: 1, paddingTop: spacing.lg},
  heading: {marginBottom: spacing.lg},
  kicker: {fontSize: 10, fontWeight: '700', letterSpacing: 1.7, color: colors.muted},
  title: {fontFamily: 'Georgia', fontSize: 34, color: colors.text, marginTop: 4},
  search: {height: 54, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, fontSize: 16},
  controlRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md},
  filters: {gap: 7, paddingRight: spacing.xs},
  filter: {paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: colors.surface},
  filterActive: {backgroundColor: colors.mint},
  filterText: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  filterTextActive: {color: colors.primaryText},
  sortButton: {paddingHorizontal: 10, paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: colors.border},
  sortText: {fontSize: 12, fontWeight: '700', color: colors.text},
  sortMenu: {marginTop: spacing.sm, padding: 6, borderRadius: radius.md, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border},
  sortOption: {paddingHorizontal: spacing.md, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between'},
  sortOptionText: {color: colors.muted, fontSize: 15},
  sortOptionTextActive: {color: colors.mint, fontWeight: '700'},
  check: {color: colors.mint, fontWeight: '700'},
  result: {marginTop: spacing.md, fontSize: 13, color: colors.muted},
  list: {paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: 8},
  listWithActions: {paddingBottom: 92},
  row: {minHeight: 77, paddingHorizontal: spacing.md, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  rowCopy: {flex: 1, paddingRight: spacing.sm},
  wordLine: {flexDirection: 'row', alignItems: 'center', gap: 7},
  word: {fontSize: 18, fontWeight: '700', color: colors.text},
  star: {fontSize: 15, color: '#FFD66B'},
  meta: {fontSize: 13, color: colors.muted, marginTop: 4},
  rowRight: {alignItems: 'flex-end', gap: 5},
  learned: {fontSize: 10, color: colors.mint, fontWeight: '700'},
  chevron: {fontSize: 25, color: colors.muted},
  empty: {paddingTop: 86, paddingHorizontal: spacing.xl, alignItems: 'center'},
  emptyTitle: {fontFamily: 'Georgia', color: colors.text, fontSize: 25},
  emptyCopy: {textAlign: 'center', color: colors.muted, marginTop: 8, lineHeight: 20},
  emptyAction: {marginTop: spacing.lg, paddingHorizontal: 18, height: 48, borderRadius: 24, justifyContent: 'center', backgroundColor: colors.mint},
  emptyActionText: {fontSize: 14, fontWeight: '700', color: colors.primaryText},
  actions: {position: 'absolute', left: -spacing.lg, right: -spacing.lg, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm, flexDirection: 'row', backgroundColor: 'rgba(12,15,17,.94)', borderTopWidth: 1, borderColor: 'rgba(202,239,255,.16)'},
  action: {flex: 1, minHeight: 50, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.mint},
  actionQuiet: {backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border},
  actionText: {color: colors.primaryText, fontSize: 14, fontWeight: '700'},
  actionQuietText: {color: colors.text, fontSize: 14, fontWeight: '700'},
});
