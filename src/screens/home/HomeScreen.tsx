import React, {useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, Button, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {OCC_CATS} from '../../data/occupations';
import {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {SurveyAnswers} from '../../types/onboarding';
import {colors, spacing, typography} from '../../theme';
import {ScreenShell} from '../onboarding/ScreenShell';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Home'> & {answers: SurveyAnswers};
const levelLabels = {a1: 'A1 Beginner', a2: 'A2 Elementary', b1: 'B1 Intermediate', b2: 'B2 Upper-Intermediate', c1: 'C1 Advanced', unsure: 'Finding your level'};
const dailyWords = {casual: 5, regular: 10, serious: 15, intense: 20};
const weeklyWords = {easy: 20, steady: 40, challenge: 70, ambitious: 100};
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HomeScreen({answers}: Props) {
  const [period, setPeriod] = useState<'today' | 'week'>('today');
  const occupation = answers.occupation ? OCC_CATS[answers.occupation] : null;
  const currentLevel = answers.level ? levelLabels[answers.level] : 'Your level';
  const wordTarget = answers.daily ? dailyWords[answers.daily] : 10;
  const weekTarget = answers.weekly ? weeklyWords[answers.weekly] : 40;
  const placeholder = (feature: string) => Alert.alert(`${feature} is next`, 'This action will be connected when Study and Test are built.');
  return <ScreenShell><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><Button title="Menu" onPress={() => placeholder('Menu')} /><Text style={styles.level}>{currentLevel}</Text><Button title="Reminders" onPress={() => placeholder('Reminder settings')} /></View>
    <Text style={styles.title}>Your learning path</Text>
    <View style={styles.progressBlock}><View style={styles.ring}><Text style={styles.ringNumber}>30%</Text><Text>to next level</Text></View><View style={styles.targets}><Text style={styles.targetNumber}>{wordTarget}</Text><Text>words today</Text><Text style={styles.targetNumber}>{weekTarget}</Text><Text>words this week</Text></View></View>
    <View style={styles.streak}><Text style={styles.sectionTitle}>Current streak</Text><View style={styles.dayRow}>{days.map((day, index) => <View key={day} style={styles.day}><View style={[styles.dayDot, index < 3 && styles.done, index === 3 && styles.today]} /><Text>{day}</Text></View>)}</View></View>
    <Button title="Start Today’s Practice" onPress={() => placeholder('Today’s Practice')} />
    <Text style={styles.sectionTitle}>Lessons</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lessonRow}><LessonCard title="Gerund & Infinitive" subtitle="Grammar lesson" onPress={() => placeholder('Gerund & Infinitive')} /><LessonCard title="Prepositions" subtitle="Grammar lesson" onPress={() => placeholder('Prepositions')} /><LessonCard title={occupation?.lessonLabel ?? 'Interview & Work English'} subtitle={answers.occupationText ? `For: ${answers.occupationText}` : 'Build confidence at work'} onPress={() => placeholder('Interview & Work English')} /></ScrollView>
    <Text style={styles.sectionTitle}>Word Lists</Text>
    <ListRow title="My words" subtitle="Words you add yourself" onPress={() => placeholder('My words')} /><ListRow title="Memorized" subtitle="Words you know well" onPress={() => placeholder('Memorized')} /><ListRow title="Favorites" subtitle="Words you saved" onPress={() => placeholder('Favorites')} />
    <View style={styles.periodToggle}><Pressable style={[styles.period, period === 'today' && styles.periodActive]} onPress={() => setPeriod('today')}><Text>Today</Text></Pressable><Pressable style={[styles.period, period === 'week' && styles.periodActive]} onPress={() => setPeriod('week')}><Text>Week</Text></Pressable></View><Text style={styles.stat}>{period === 'today' ? '0 words learned today' : '0 words learned this week'}</Text>
  </ScrollView></ScreenShell>;
}
function LessonCard({title, subtitle, onPress}: {title: string; subtitle: string; onPress: () => void}) { return <Pressable style={styles.lessonCard} onPress={onPress}><Text style={styles.cardTitle}>{title}</Text><Text>{subtitle}</Text><Text style={styles.cardMeta}>0% complete · 0 words</Text></Pressable>; }
function ListRow({title, subtitle, onPress}: {title: string; subtitle: string; onPress: () => void}) { return <Pressable style={styles.listRow} onPress={onPress}><View><Text style={styles.cardTitle}>{title}</Text><Text>{subtitle}</Text></View><Text>0  ›</Text></Pressable>; }
const styles = StyleSheet.create({content: {gap: spacing.md, paddingBottom: spacing.xl}, topbar: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, level: {fontWeight: '700'}, title: {fontSize: typography.title, fontWeight: '700'}, progressBlock: {flexDirection: 'row', gap: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, padding: spacing.md, borderRadius: 8}, ring: {width: 110, height: 110, borderRadius: 55, borderWidth: 10, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center'}, ringNumber: {fontSize: typography.heading, fontWeight: '700'}, targets: {gap: 2}, targetNumber: {fontSize: typography.heading, fontWeight: '700', marginTop: spacing.xs}, streak: {gap: spacing.sm}, sectionTitle: {fontSize: typography.heading, fontWeight: '700', marginTop: spacing.sm}, dayRow: {flexDirection: 'row', justifyContent: 'space-between'}, day: {alignItems: 'center', gap: 4}, dayDot: {width: 20, height: 20, borderRadius: 10, backgroundColor: colors.disabled}, done: {backgroundColor: colors.primary}, today: {borderWidth: 2, borderColor: colors.text}, lessonRow: {gap: spacing.sm}, lessonCard: {width: 210, minHeight: 130, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, justifyContent: 'space-between'}, cardTitle: {fontWeight: '700', fontSize: typography.body}, cardMeta: {fontSize: typography.caption, color: colors.muted}, listRow: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, periodToggle: {flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden'}, period: {flex: 1, padding: spacing.sm, alignItems: 'center'}, periodActive: {backgroundColor: colors.selected}, stat: {textAlign: 'center', color: colors.muted}});
