import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {getOccCats} from '../../data/contentStore';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import type {SurveyAnswers} from '../../types/onboarding';
import {colors, spacing} from '../../theme';
import {ScreenShell} from '../onboarding/ScreenShell';
import {loadLearningState} from '../../logic/learningStorage';
import {greetingName, loadProfile} from '../../logic/profile';
import {AppBarButton} from '../../components/AppBar';
import {Icon} from '../../components/Icon';
import {dateKey, greeting, recentWeek} from '../../logic/dates';
import {collectionMeta, collectWords, type CollectionId} from '../../logic/wordCollections';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Home'> & {answers: SurveyAnswers};
type HomeStats = {today: number; week: number; learning: number; memorized: number; favorites: number; practiceDays: string[]};

const levelLabels = {a1: 'A1 · Beginner', a2: 'A2 · Elementary', b1: 'B1 · Intermediate', b2: 'B2 · Upper-Int.', c1: 'C1 · Advanced', unsure: 'Finding your level'};
const dailyWords = {casual: 5, regular: 10, serious: 15, intense: 20};
const weeklyWords = {easy: 20, steady: 40, challenge: 70, ambitious: 100};
const emptyStats: HomeStats = {today: 0, week: 0, learning: 0, memorized: 0, favorites: 0, practiceDays: []};

export function HomeScreen({answers, navigation}: Props) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<HomeStats>(emptyStats);
  const [nameLine, setNameLine] = useState('learner.');
  // Recomputed on every focus refresh so the greeting and the strip follow the
  // clock instead of freezing at whatever they were when the app launched.
  const [now, setNow] = useState(() => new Date());
  const week = recentWeek(now);
  const occupation = answers.occupation ? getOccCats()[answers.occupation] : null;
  const dailyTarget = answers.daily ? dailyWords[answers.daily] : 10;
  const weeklyTarget = answers.weekly ? weeklyWords[answers.weekly] : 40;
  const level = answers.level ? levelLabels[answers.level] : 'Your level';
  const progressPercent = Math.min(100, Math.round((stats.today / dailyTarget) * 100));

  // Counted through the same collector the collection screens use, so a row's
  // number always matches the list it opens.
  const refresh = () =>
    Promise.all([loadLearningState(), loadProfile()])
      .then(([learning, profile]) => {
        const activity = learning.activity ?? {};
        setNow(new Date());
        setNameLine(greetingName(profile));
        const weekKeys = recentWeek().map(day => day.key);
        const size = (collection: CollectionId) =>
          collectWords(collection, [], learning.progress).length;
        setStats({
          today: activity[dateKey()]?.learned ?? 0,
          week: weekKeys.reduce(
            (total, day) => total + (activity[day]?.learned ?? 0),
            0,
          ),
          learning: size('learning'),
          memorized: size('memorized'),
          favorites: size('favorites'),
          practiceDays: learning.practicedDays,
        });
      })
      .catch(() => undefined);

  useEffect(() => {
    refresh();
    return navigation.addListener('focus', refresh);
  }, [navigation]);

  const openCollection = (collection: CollectionId) => navigation.navigate('Collection', {collection});

  return <ScreenShell tone="blue" padded={false}>
    <View style={styles.screen}>
    <LinearGradient pointerEvents="none" colors={['#2A4BCB', '#112B91', '#061549']} locations={[0, .45, 1]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={['rgba(136,177,255,.34)', 'rgba(62,108,233,.13)', 'rgba(14,39,139,0)']} locations={[0, .34, .8]} start={{x: 0, y: 0}} end={{x: .88, y: .73}} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={['rgba(151,247,244,.34)', 'rgba(91,189,232,.11)', 'rgba(8,31,117,0)']} locations={[0, .34, .82]} start={{x: 1, y: 0}} end={{x: .15, y: .76}} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={['rgba(23,58,209,.40)', 'rgba(6,21,73,0)']} locations={[0, .7]} start={{x: 0, y: 1}} end={{x: .72, y: .44}} style={StyleSheet.absoluteFill} />
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + 12}]}
      contentInsetAdjustmentBehavior="never">
      <View style={styles.topBar}>
        <Text style={styles.levelLabel} numberOfLines={1}>
          {level}
        </Text>
        <AppBarButton
          glass
          onPress={() => navigation.navigate('Inbox')}
          accessibilityLabel="Notifications"
        >
          <Icon.Bell color="#F8FCFF" />
        </AppBarButton>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>YOUR DAILY PRACTICE</Text>
        <Text style={styles.title}>
          {greeting(now)},{`\n`}
          <Text style={styles.titleAccent}>{nameLine}</Text>
        </Text>
      </View>

      <View style={styles.progressCard}>
        <LinearGradient pointerEvents="none" colors={['rgba(155,246,247,.25)', 'rgba(39,55,169,.35)']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.progressGradient} />
        <BlurView pointerEvents="none" blurType="dark" blurAmount={18} reducedTransparencyFallbackColor="#0E2358" style={styles.progressBlur} />
        <View style={styles.progressTop}>
          <View style={styles.ring}><View style={styles.ringInner}><Text style={styles.ringNumber}>{progressPercent}%</Text></View></View>
          <View style={styles.targets}><Text style={styles.targetMain}>{stats.today} words today</Text><Text style={styles.targetSub}>{stats.week} / {weeklyTarget} words this week</Text></View>
        </View>
        <View style={styles.dayRow}>{week.map(day => {
          const complete = stats.practiceDays.includes(day.key);
          return <View
            key={day.key}
            accessibilityLabel={`${day.name}${day.isToday ? ', today' : ''}${complete ? ', practised' : ''}`}
            style={[styles.day, complete && styles.dayComplete, day.isToday && !complete && styles.dayToday]}>
            <Text style={[styles.dayText, complete && styles.dayTextComplete]}>{day.label}</Text>
          </View>;
        })}</View>
      </View>

      <Pressable style={styles.practiceButton} onPress={() => navigation.navigate('Study')}><LinearGradient pointerEvents="none" colors={['#C8FFFB', '#AEEEFF']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={StyleSheet.absoluteFill} /><Text style={styles.practiceText}>Start today’s practice</Text></Pressable>

      <SectionHeading title="Keep going" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        style={styles.lessonScroller}
        contentContainerStyle={styles.lessonRail}>
        <LessonCard title={occupation?.lessonLabel ?? 'Tech vocabulary'} progress={`${Math.min(stats.today, dailyTarget)} of ${dailyTarget} words`} fill={dailyTarget ? stats.today / dailyTarget : 0} onPress={() => navigation.navigate('Study')} />
        <LessonCard title="Gerund & infinitive" progress="Grammar lesson" fill={.4} onPress={() => navigation.navigate('Grammar', {lesson: 'gerund'})} />
        <LessonCard title="Prepositions" progress="Grammar lesson" fill={.25} onPress={() => navigation.navigate('Grammar', {lesson: 'prepositions'})} />
      </ScrollView>

      {/* The saved list is deliberately absent: it belongs to the My words tab. */}
      <SectionHeading title="Your progress" />
      <View style={styles.progressList}>
        <CollectionRow collection="learning" count={stats.learning} onPress={openCollection} />
        <CollectionRow collection="memorized" count={stats.memorized} onPress={openCollection} />
        {stats.favorites > 0 && (
          <CollectionRow collection="favorites" count={stats.favorites} onPress={openCollection} />
        )}
      </View>
    </ScrollView>
    </View>
  </ScreenShell>;
}

function SectionHeading({title}: {title: string}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function LessonCard({title, progress, fill, onPress}: {title: string; progress: string; fill: number; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} style={styles.lessonCard}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(103,224,245,.23)', 'rgba(34,55,183,.34)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.cardGradient}
      />
      <BlurView
        pointerEvents="none"
        blurType="dark"
        blurAmount={16}
        reducedTransparencyFallbackColor="#0E2358"
        style={styles.glassBlur}
      />
      <View style={styles.lessonBody}>
        <Text style={styles.lessonTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.lessonSub} numberOfLines={1}>
          {progress}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, {width: `${Math.max(0, Math.min(100, fill * 100))}%`}]} />
      </View>
    </Pressable>
  );
}

const collectionAccent: Record<
  CollectionId,
  {icon: string; wash: [string, string]}
> = {
  saved: {icon: colors.mint, wash: ['rgba(65,88,209,.36)', 'rgba(12,43,124,.42)']},
  learning: {icon: '#9BE7FF', wash: ['rgba(56,120,220,.40)', 'rgba(14,48,140,.46)']},
  memorized: {icon: colors.mint, wash: ['rgba(48,150,160,.34)', 'rgba(14,55,130,.46)']},
  favorites: {icon: '#FFE08A', wash: ['rgba(120,100,60,.30)', 'rgba(30,50,130,.46)']},
};

function CollectionRow({
  collection,
  count,
  onPress,
}: {
  collection: CollectionId;
  count: number;
  onPress: (collection: CollectionId) => void;
}) {
  const meta = collectionMeta[collection];
  const accent = collectionAccent[collection];
  const Glyph = Icon[meta.icon];
  return (
    <Pressable style={styles.wordRow} onPress={() => onPress(collection)}>
      <LinearGradient
        pointerEvents="none"
        colors={accent.wash}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.wordRowGradient}
      />
      <BlurView
        pointerEvents="none"
        blurType="dark"
        blurAmount={16}
        reducedTransparencyFallbackColor="#0E2358"
        style={styles.wordRowBlur}
      />
      <View style={styles.wordIcon}>
        <Glyph size={22} color={accent.icon} />
      </View>
      <View style={styles.wordCopy}>
        <Text style={styles.wordTitle}>{meta.title}</Text>
        <Text style={styles.wordSub}>{meta.subtitle}</Text>
      </View>
      <Text style={styles.wordCount}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Deepest stop matches ScreenShell blueSafe so the canvas never seams under the tab bar.
  screen: {flex: 1, backgroundColor: '#061549'},
  content: {paddingHorizontal: spacing.md, paddingBottom: 110, gap: 12},
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  levelLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(248,252,255,.88)',
  },
  glassBlur: {...StyleSheet.absoluteFill, borderRadius: 22},
  progressBlur: {...StyleSheet.absoluteFill, borderRadius: 29},
  greeting: {gap: spacing.xs, marginTop: 4},
  eyebrow: {fontSize: 12, fontWeight: '700', letterSpacing: 2.2, color: 'rgba(219,233,249,.72)'},
  title: {fontFamily: 'Georgia', fontSize: 47, lineHeight: 44, letterSpacing: -2.8, color: '#F8FCFF'},
  titleAccent: {color: colors.mint, fontStyle: 'italic'},
  progressCard: {
    overflow: 'hidden',
    marginTop: 4,
    padding: 17,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(191,248,255,.32)',
    backgroundColor: 'rgba(8,25,78,.28)',
    shadowColor: '#010F3C',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
  },
  progressGradient: {...StyleSheet.absoluteFill, borderRadius: 29},
  cardGradient: {...StyleSheet.absoluteFill, borderRadius: 22},
  progressTop: {flexDirection: 'row', alignItems: 'center', gap: 15},
  ring: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 7,
    borderColor: 'rgba(170, 226, 255, .35)',
    borderTopColor: colors.mint,
    borderRightColor: '#79D7F2',
    transform: [{rotate: '35deg'}],
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {transform: [{rotate: '-35deg'}]},
  ringNumber: {fontSize: 15, fontWeight: '700', color: colors.text},
  targets: {flex: 1, gap: 4},
  targetMain: {fontSize: 20, lineHeight: 22, fontWeight: '700', color: colors.text},
  targetSub: {fontSize: 13, color: 'rgba(226, 242, 255, .7)'},
  dayRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 15},
  day: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(210, 240, 255, .25)',
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  dayComplete: {backgroundColor: colors.mint, borderColor: colors.mint},
  dayToday: {borderColor: colors.mint, borderWidth: 1.5},
  dayText: {fontSize: 11, fontWeight: '700', color: 'rgba(232, 246, 255, .72)'},
  dayTextComplete: {color: colors.primaryText},
  practiceButton: {
    minHeight: 58,
    overflow: 'hidden',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000B3C',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 7},
    elevation: 4,
  },
  practiceText: {fontSize: 18, fontWeight: '700', color: colors.primaryText},
  sectionHeading: {
    marginTop: spacing.sm,
    marginHorizontal: 1,
  },
  sectionTitle: {fontSize: 18, fontWeight: '600', letterSpacing: -0.4, color: colors.text},
  lessonScroller: {marginHorizontal: -spacing.md},
  lessonRail: {gap: spacing.sm, paddingHorizontal: spacing.md},
  lessonCard: {
    overflow: 'hidden',
    width: 200,
    height: 128,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(221,246,255,.20)',
    backgroundColor: 'rgba(9,27,88,.22)',
  },
  // Title + subtitle sit tight; progress bar locks to the bottom edge padding.
  lessonBody: {flex: 1, gap: 6},
  lessonTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.45,
    color: colors.text,
  },
  lessonSub: {
    fontSize: 13,
    lineHeight: 16,
    color: 'rgba(233,246,255,.68)',
  },
  track: {
    height: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,.16)',
  },
  fill: {height: '100%', borderRadius: 8, backgroundColor: colors.mint},
  progressList: {gap: 8},
  wordRow: {
    overflow: 'hidden',
    minHeight: 76,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(193,240,255,.22)',
    backgroundColor: 'rgba(9,27,88,.22)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  wordRowGradient: {...StyleSheet.absoluteFill, borderRadius: 22},
  wordRowBlur: {...StyleSheet.absoluteFill, borderRadius: 22},
  wordIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(185,255,250,.14)',
  },
  wordCopy: {flex: 1, gap: 4},
  wordTitle: {fontSize: 17, fontWeight: '700', letterSpacing: -0.35, color: colors.text},
  wordSub: {fontSize: 13, lineHeight: 17, color: 'rgba(226,241,255,.66)'},
  wordCount: {fontSize: 28, fontWeight: '700', letterSpacing: -1.2, color: '#D3FFFB'},
});
