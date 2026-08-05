import React, {useEffect, useMemo, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {AppBar, AppBarButton} from '../../components/AppBar';
import {Icon} from '../../components/Icon';
import {OccupationPicker} from '../../components/survey/OccupationPicker';
import {markOnboardingComplete} from '../../logic/onboarding';
import {getSurveySteps, isStepValid, needsOccupation, SurveyStepKey} from '../../logic/surveyFlow';
import {OnboardingStackParamList} from '../../navigation/OnboardingNavigator';
import {goHomeFaded} from '../../navigation/navTransitions';
import {useAppSelector} from '../../store/hooks';
import {DailyCommitment, Goal, Level, SurveyAnswers, WeeklyGoal} from '../../types/onboarding';
import {colors, radius, spacing, typography} from '../../theme';
import {createLogger} from '../../utils/logger';
import {ScreenShell} from './ScreenShell';

const log = createLogger('Survey');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Survey'> & {answers: SurveyAnswers; onChange: React.Dispatch<React.SetStateAction<SurveyAnswers>>};
const levels: {key: Level; label: string}[] = [{key: 'a1', label: 'A1 Beginner'}, {key: 'a2', label: 'A2 Elementary'}, {key: 'b1', label: 'B1 Intermediate'}, {key: 'b2', label: 'B2 Upper-Intermediate'}, {key: 'c1', label: 'C1 Advanced'}, {key: 'unsure', label: 'Not sure yet'}];
const goals: {key: Goal; label: string; description: string}[] = [{key: 'work', label: 'Work & Career', description: 'Meetings, emails, presentations'}, {key: 'interview', label: 'Interview Prep', description: 'Sound confident under pressure'}, {key: 'travel', label: 'Travel', description: 'Order, ask, get around easily'}, {key: 'daily', label: 'Everyday Conversation', description: 'Casual, natural, fluent'}, {key: 'exam', label: 'Exam Prep', description: 'IELTS, TOEFL and more'}, {key: 'academic', label: 'Academic & Writing', description: 'Essays, reports, emails'}];
const daily: {key: DailyCommitment; label: string}[] = [{key: 'casual', label: '5 min · Casual'}, {key: 'regular', label: '10 min · Regular'}, {key: 'serious', label: '15 min · Serious'}, {key: 'intense', label: '20+ min · Intense'}];
const weekly: {key: WeeklyGoal; label: string}[] = [{key: 'easy', label: '20 words · Easy'}, {key: 'steady', label: '40 words · Steady'}, {key: 'challenge', label: '70 words · Challenging'}, {key: 'ambitious', label: '100 words · Ambitious'}];
const content: Record<SurveyStepKey, {title: string; subtext: string}> = {level: {title: 'What is your English level?', subtext: 'Choose the closest answer.'}, goals: {title: 'What are you learning for?', subtext: 'Choose one or more goals.'}, occupation: {title: 'What do you do?', subtext: 'We will personalize your work vocabulary.'}, daily: {title: 'How much time can you give daily?', subtext: 'You can change this later.'}, weekly: {title: 'Set your weekly word goal.', subtext: 'Keep it realistic and consistent.'}};

export function SurveyScreen({navigation, answers, onChange}: Props) {
  const inReview = useAppSelector(s => s.purchases.inReview);
  const steps = useMemo(() => getSurveySteps(answers), [answers]);
  const [index, setIndex] = useState(0);
  const step = steps[index];
  useEffect(() => { if (index >= steps.length) setIndex(steps.length - 1); }, [index, steps.length]);
  const set = (update: Partial<SurveyAnswers>) => onChange(current => ({...current, ...update}));
  const toggleGoal = (goal: Goal) => onChange(current => { const next = current.goals.includes(goal) ? current.goals.filter(item => item !== goal) : [...current.goals, goal]; return {...current, goals: next, ...(needsOccupation(next) ? {} : {occupation: null, occupationText: null})}; });
  const finishOnboardingHome = () => {
    log.info('Survey complete — skipping paywall (inReview)', {inReview});
    markOnboardingComplete().catch(() => undefined);
    goHomeFaded(navigation);
  };
  const next = () => {
    if (index !== steps.length - 1) {
      setIndex(index + 1);
      return;
    }
    if (inReview) {
      finishOnboardingHome();
      return;
    }
    navigation.navigate('Notifications');
  };
  const back = () => index === 0 ? navigation.goBack() : setIndex(index - 1);
  const valid = isStepValid(step, answers);
  return <ScreenShell>
    <AppBar
      title={`Step ${index + 1} of ${steps.length}`}
      left={
        <AppBarButton onPress={back} accessibilityLabel="Back">
          <Icon.ChevronLeft />
        </AppBarButton>
      }
    />
    <View style={styles.progress}>{steps.map((item, itemIndex) => <View key={item} style={[styles.segment, itemIndex <= index && styles.filled]} />)}</View>
    <Text style={styles.eyebrow}>STEP {index + 1} OF {steps.length}</Text>
    <Text style={styles.title}>{content[step].title}</Text>
    <Text style={styles.subtext}>{content[step].subtext}</Text>
    <View style={styles.body}>
      {step === 'level' && <Options options={levels} selected={answers.level} onPress={key => set({level: key as Level})} />}
      {step === 'goals' && <Options options={goals} selected={answers.goals} onPress={key => toggleGoal(key as Goal)} />}
      {step === 'occupation' && <OccupationPicker value={answers.occupationText} onSelect={(occupation, occupationText) => set({occupation, occupationText})} onClear={() => set({occupation: null, occupationText: null})} />}
      {step === 'daily' && <Options options={daily} selected={answers.daily} onPress={key => set({daily: key as DailyCommitment})} />}
      {step === 'weekly' && <Options options={weekly} selected={answers.weekly} onPress={key => set({weekly: key as WeeklyGoal})} />}
    </View>
    <Pressable disabled={!valid} style={[styles.continue, !valid && styles.continueDisabled]} onPress={next}>
      <Text style={styles.continueText}>Continue</Text>
    </Pressable>
  </ScreenShell>;
}

function Options({options, selected, onPress}: {options: {key: string; label: string; description?: string}[]; selected: string | string[] | null; onPress: (key: string) => void}) {
  const chosen = (key: string) => Array.isArray(selected) ? selected.includes(key) : selected === key;
  return <ScrollView showsVerticalScrollIndicator={false}>{options.map(option => {
    const active = chosen(option.key);
    return <Pressable key={option.key} style={[styles.option, active && styles.selected]} onPress={() => onPress(option.key)}>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, active && styles.selectedText]}>{option.label}</Text>
        {option.description ? <Text style={[styles.optionDescription, active && styles.selectedDescription]}>{option.description}</Text> : null}
      </View>
      {active ? <Icon.Check size={22} color={colors.primaryText} /> : <View style={styles.indicatorEmpty} />}
    </Pressable>;
  })}</ScrollView>;
}

const styles = StyleSheet.create({
  progress: {flexDirection: 'row', gap: 5, marginTop: spacing.sm},
  segment: {height: 4, flex: 1, borderRadius: 9, backgroundColor: '#2A303A'},
  filled: {backgroundColor: colors.mint},
  eyebrow: {marginTop: spacing.lg, color: colors.muted, fontWeight: '700', fontSize: typography.caption, letterSpacing: 2.2},
  title: {fontSize: 42, lineHeight: 45, letterSpacing: -2.1, color: colors.text, fontWeight: '700', marginTop: spacing.md},
  subtext: {marginTop: spacing.sm, color: colors.muted, fontSize: 18, lineHeight: 25},
  body: {flex: 1, marginTop: spacing.xl, marginBottom: spacing.md},
  option: {minHeight: 82, borderWidth: 0, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#171B21', gap: spacing.sm},
  optionCopy: {flex: 1},
  selected: {backgroundColor: colors.mint},
  optionTitle: {fontWeight: '500', color: colors.text, fontSize: 18},
  optionDescription: {color: colors.muted, marginTop: 5, fontSize: 14},
  selectedText: {color: '#101820', fontWeight: '600'},
  selectedDescription: {color: 'rgba(9,36,126,.72)'},
  indicatorEmpty: {width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.muted},
  continue: {borderRadius: radius.md, backgroundColor: colors.mint, paddingVertical: 18, alignItems: 'center', marginHorizontal: spacing.sm, marginBottom: 64},
  continueDisabled: {opacity: .34},
  continueText: {color: colors.primaryText, fontWeight: '700', fontSize: 18},
});
