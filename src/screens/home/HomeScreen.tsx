import React, {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {OCC_CATS} from '../../data/occupations';
import type {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import type {SurveyAnswers} from '../../types/onboarding';
import {colors, radius, spacing} from '../../theme';
import {ScreenShell} from '../onboarding/ScreenShell';
import {loadLearningState} from '../../logic/learningStorage';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Home'> & {answers: SurveyAnswers};
type HomeStats = {today: number; week: number; myWords: number; learning: number; memorized: number; favorites: number; practiceDays: string[]};

const levelLabels = {a1: 'A1 · Beginner', a2: 'A2 · Elementary', b1: 'B1 · Intermediate', b2: 'B2 · Upper-Int.', c1: 'C1 · Advanced', unsure: 'Finding your level'};
const dailyWords = {casual: 5, regular: 10, serious: 15, intense: 20};
const weeklyWords = {easy: 20, steady: 40, challenge: 70, ambitious: 100};
const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const emptyStats: HomeStats = {today: 0, week: 0, myWords: 0, learning: 0, memorized: 0, favorites: 0, practiceDays: []};

function dateKey(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function HomeScreen({answers, navigation}: Props) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<HomeStats>(emptyStats);
  const occupation = answers.occupation ? OCC_CATS[answers.occupation] : null;
  const dailyTarget = answers.daily ? dailyWords[answers.daily] : 10;
  const weeklyTarget = answers.weekly ? weeklyWords[answers.weekly] : 40;
  const level = answers.level ? levelLabels[answers.level] : 'Your level';
  const progressPercent = Math.min(100, Math.round((stats.today / dailyTarget) * 100));

  const refresh = () => Promise.all([loadLearningState(), AsyncStorage.getItem('fluent:my-words')]).then(([learning, saved]) => {
    const activity = learning.activity ?? {};
    const progress = Object.values(learning.progress);
    const recentDays = Array.from({length: 7}, (_, index) => dateKey(index));
    setStats({
      today: activity[dateKey()]?.learned ?? 0,
      week: recentDays.reduce((total, day) => total + (activity[day]?.learned ?? 0), 0),
      myWords: saved ? (JSON.parse(saved) as string[]).length : 0,
      learning: progress.filter(word => word.unknown > 0 && word.known === 0).length,
      memorized: progress.filter(word => word.known > 0).length,
      favorites: progress.filter(word => word.favorite).length,
      practiceDays: learning.practicedDays,
    });
  }).catch(() => undefined);

  useEffect(() => {
    refresh();
    return navigation.addListener('focus', refresh);
  }, [navigation]);

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
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Menu" style={styles.topButton}><MenuIcon /></Pressable>
        <Text style={styles.level}>{level}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reminders" style={styles.topButton}><BellIcon /></Pressable>
      </View>

      <View style={styles.greeting}>
        <Text style={styles.eyebrow}>YOUR DAILY PRACTICE</Text>
        <Text style={styles.title}>Good evening,{`\n`}<Text style={styles.titleAccent}>Betül.</Text></Text>
      </View>

      <View style={styles.progressCard}>
        <LinearGradient pointerEvents="none" colors={['rgba(155,246,247,.25)', 'rgba(39,55,169,.35)']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.progressGradient} />
        <BlurView pointerEvents="none" blurType="dark" blurAmount={18} reducedTransparencyFallbackColor="#1B3C9B" style={styles.glassBlur} />
        <View style={styles.progressTop}>
          <View style={styles.ring}><View style={styles.ringInner}><Text style={styles.ringNumber}>{progressPercent}%</Text></View></View>
          <View style={styles.targets}><Text style={styles.targetMain}>{stats.today} words today</Text><Text style={styles.targetSub}>{stats.week} / {weeklyTarget} words this week</Text></View>
        </View>
        <View style={styles.dayRow}>{dayLabels.map((label, index) => {
          const key = dateKey(6 - index);
          const complete = stats.practiceDays.includes(key);
          const today = index === 6;
          return <View key={`${label}-${index}`} style={[styles.day, complete && styles.dayComplete, today && !complete && styles.dayToday]}><Text style={[styles.dayText, complete && styles.dayTextComplete]}>{label}</Text></View>;
        })}</View>
      </View>

      <Pressable style={styles.practiceButton} onPress={() => navigation.navigate('Study')}><LinearGradient pointerEvents="none" colors={['#C8FFFB', '#AEEEFF']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={StyleSheet.absoluteFill} /><Text style={styles.practiceText}>Start today’s practice</Text></Pressable>

      <SectionHeading title="Keep going" action="See all" />
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

      <SectionHeading title="Your words" action="Library" />
      <WordRow symbol="◎" title="My words" subtitle="Words added by you" count={stats.myWords} onPress={() => (navigation as any).navigate('WordsTab', {filter: 'all'})} />
      <WordRow symbol="↗" title="Learning" subtitle="Words to practise again" count={stats.learning} onPress={() => (navigation as any).navigate('WordsTab', {filter: 'learning'})} />
      <WordRow symbol="⌁" title="Memorized" subtitle="Words you know well" count={stats.memorized} onPress={() => (navigation as any).navigate('WordsTab', {filter: 'memorized'})} />
      {stats.favorites > 0 && <WordRow symbol="★" title="Favorites" subtitle="Words you saved" count={stats.favorites} onPress={() => (navigation as any).navigate('WordsTab', {filter: 'favorites'})} />}
    </ScrollView>
    </View>
  </ScreenShell>;
}

function SectionHeading({title, action}: {title: string; action: string}) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionAction}>{action}</Text></View>;
}

function MenuIcon() {
  return <View pointerEvents="none" style={styles.menuIcon}>
    <View style={styles.menuLine} />
    <View style={styles.menuLine} />
    <View style={styles.menuLine} />
  </View>;
}

function BellIcon() {
  return <View pointerEvents="none" style={styles.bellIcon}>
    <View style={styles.bellDome} />
    <View style={styles.bellRim} />
    <View style={styles.bellClapper} />
  </View>;
}

function LessonCard({title, progress, fill, onPress}: {title: string; progress: string; fill: number; onPress: () => void}) {
  return <Pressable onPress={onPress} style={styles.lessonCard}><LinearGradient pointerEvents="none" colors={['rgba(103,224,245,.23)', 'rgba(34,55,183,.34)']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.cardGradient} /><BlurView pointerEvents="none" blurType="dark" blurAmount={16} reducedTransparencyFallbackColor="#1B3C9B" style={styles.glassBlur} /><Text style={styles.lessonTitle}>{title}</Text><Text style={styles.lessonSub}>{progress}</Text><View style={styles.track}><View style={[styles.fill, {width: `${Math.max(0, Math.min(100, fill * 100))}%`}]} /></View></Pressable>;
}

function WordRow({symbol, title, subtitle, count, onPress}: {symbol: string; title: string; subtitle: string; count: number; onPress: () => void}) {
  return <Pressable style={styles.wordRow} onPress={onPress}><LinearGradient pointerEvents="none" colors={['rgba(65,88,209,.33)', 'rgba(12,43,124,.42)']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.cardGradient} /><BlurView pointerEvents="none" blurType="dark" blurAmount={16} reducedTransparencyFallbackColor="#1B3C9B" style={styles.glassBlur} /><View style={styles.wordIcon}><Text style={styles.wordIconText}>{symbol}</Text></View><View style={styles.wordCopy}><Text style={styles.wordTitle}>{title}</Text><Text style={styles.wordSub}>{subtitle}</Text></View><Text style={styles.wordCount}>{count}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#2A4BCB', overflow: 'hidden'},
  content: {paddingHorizontal: 20, paddingBottom: 86, gap: 12},
  glassBlur: {...StyleSheet.absoluteFill, overflow: 'hidden'},
  topbar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14},
  topButton: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(207,238,255,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.20)', shadowColor: '#000A32', shadowOpacity: .14, shadowRadius: 12, shadowOffset: {width: 0, height: 6}},
  menuIcon: {width: 20, height: 16, justifyContent: 'space-between'},
  menuLine: {height: 1.8, borderRadius: 2, backgroundColor: colors.mint},
  bellIcon: {width: 22, height: 22, alignItems: 'center', justifyContent: 'flex-end'},
  bellDome: {width: 14, height: 15, borderWidth: 1.8, borderColor: colors.mint, borderBottomWidth: 0, borderTopLeftRadius: 9, borderTopRightRadius: 9},
  bellRim: {width: 18, height: 2, borderRadius: 2, backgroundColor: colors.mint, marginTop: -1},
  bellClapper: {width: 4, height: 4, borderRadius: 2, backgroundColor: colors.mint, marginTop: 2},
  level: {fontSize: 16, fontWeight: '600', color: colors.text},
  greeting: {gap: spacing.xs, marginTop: 0},
  eyebrow: {fontSize: 12, fontWeight: '700', letterSpacing: 2.2, color: 'rgba(219,233,249,.72)'},
  title: {fontFamily: 'Georgia', fontSize: 47, lineHeight: 44, letterSpacing: -2.8, color: '#F8FCFF'},
  titleAccent: {color: colors.mint, fontStyle: 'italic'},
  progressCard: {overflow: 'hidden', marginTop: 4, padding: 17, borderRadius: 29, borderWidth: 1, borderColor: 'rgba(191,248,255,.32)', backgroundColor: 'rgba(8,25,78,.10)', shadowColor: '#010F3C', shadowOpacity: .18, shadowRadius: 18, shadowOffset: {width: 0, height: 10}},
  progressGradient: {...StyleSheet.absoluteFill, borderRadius: 29},
  cardGradient: {...StyleSheet.absoluteFill},
  progressTop: {flexDirection: 'row', alignItems: 'center', gap: 15},
  ring: {width: 70, height: 70, borderRadius: 35, borderWidth: 7, borderColor: 'rgba(170, 226, 255, .35)', borderTopColor: colors.mint, borderRightColor: '#79D7F2', transform: [{rotate: '35deg'}], justifyContent: 'center', alignItems: 'center'},
  ringInner: {transform: [{rotate: '-35deg'}]},
  ringNumber: {fontSize: 15, fontWeight: '700', color: colors.text},
  targets: {flex: 1, gap: 4},
  targetMain: {fontSize: 20, lineHeight: 22, fontWeight: '700', color: colors.text},
  targetSub: {fontSize: 13, color: 'rgba(226, 242, 255, .7)'},
  dayRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 15},
  day: {width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210, 240, 255, .25)', backgroundColor: 'rgba(255,255,255,.06)'},
  dayComplete: {backgroundColor: colors.mint, borderColor: colors.mint},
  dayToday: {borderColor: colors.mint, borderWidth: 1.5},
  dayText: {fontSize: 11, fontWeight: '700', color: 'rgba(232, 246, 255, .72)'},
  dayTextComplete: {color: colors.primaryText},
  practiceButton: {minHeight: 58, overflow: 'hidden', borderRadius: 19, alignItems: 'center', justifyContent: 'center', shadowColor: '#000B3C', shadowOpacity: .28, shadowRadius: 14, shadowOffset: {width: 0, height: 7}, elevation: 4},
  practiceText: {fontSize: 18, fontWeight: '700', color: colors.primaryText},
  sectionHeading: {marginTop: spacing.sm, marginHorizontal: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionTitle: {fontSize: 18, fontWeight: '600', letterSpacing: -.4, color: colors.text},
  sectionAction: {fontSize: 12, fontWeight: '500', color: 'rgba(223,240,255,.62)'},
  lessonScroller: {marginHorizontal: -20},
  lessonRail: {gap: spacing.sm, paddingHorizontal: 20},
  lessonCard: {overflow: 'hidden', width: 193, height: 118, padding: 15, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(221,246,255,.20)', backgroundColor: 'rgba(9,27,88,.08)', justifyContent: 'space-between'},
  lessonTitle: {fontSize: 16, lineHeight: 18, fontWeight: '700', letterSpacing: -.5, color: colors.text},
  lessonSub: {fontSize: 12, color: 'rgba(233,246,255,.67)'},
  track: {height: 5, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.16)'},
  fill: {height: '100%', borderRadius: 8, backgroundColor: colors.mint},
  wordRow: {overflow: 'hidden', minHeight: 62, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(193,240,255,.20)', backgroundColor: 'rgba(9,27,88,.08)', flexDirection: 'row', alignItems: 'center', gap: 12},
  wordIcon: {width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(185,255,250,.18)'},
  wordIconText: {fontSize: 20, color: colors.mint},
  wordCopy: {flex: 1},
  wordTitle: {fontSize: 15, fontWeight: '700', letterSpacing: -.25, color: colors.text},
  wordSub: {fontSize: 12, marginTop: 3, color: 'rgba(226,241,255,.63)'},
  wordCount: {fontSize: 21, fontWeight: '700', letterSpacing: -.8, color: '#D3FFFB'},
});
