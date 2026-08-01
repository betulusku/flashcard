import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, radius, spacing, typography } from '../../theme';
import { ScreenShell } from '../onboarding/ScreenShell';
import { haptic, speak } from '../../services/feedback';
import { gerundAndInfinitive, prepositions } from '../../data/grammarLessons';
import { wordBank } from '../../data/vocabularyBank';
import {
  loadLearningState,
  recordPractice,
  saveLearningState,
  toggleFavorite,
} from '../../logic/learningStorage';
import {
  applyAnswer,
  dailyPool,
  dailyTarget,
} from '../../logic/learningEngine';

const words = [
  {
    id: 'stakeholder',
    en: 'Stakeholder',
    tr: 'Paydaş',
    pos: 'Noun',
    track: 'Interview',
    definition: 'A person with an interest in a project.',
    example: 'In my last role, I aligned every stakeholder before we launched.',
  },
  {
    id: 'ahead',
    en: 'Ahead',
    tr: 'Önde, ileride',
    pos: 'Preposition',
    track: 'Core',
    definition: 'Earlier than expected, or further forward.',
    example: 'The train is ahead of schedule.',
  },
  {
    id: 'wander',
    en: 'Wander',
    tr: 'Dolaşmak',
    pos: 'Verb',
    track: 'Core',
    definition: 'To move around without a fixed plan.',
    example: 'We wandered through the city after dinner.',
  },
  {
    id: 'reliable',
    en: 'Reliable',
    tr: 'Güvenilir',
    pos: 'Adjective',
    track: 'Core',
    definition: 'Able to be trusted to work well or behave well.',
    example: 'She is a reliable member of the team.',
  },
  {
    id: 'clearly',
    en: 'Clearly',
    tr: 'Açıkça',
    pos: 'Adverb',
    track: 'Core',
    definition: 'In a way that is easy to understand.',
    example: 'Please explain the plan clearly.',
  },
];
const definitions: Record<string, string> = {
  accomplish: 'To succeed in doing or completing something.',
  ahead: 'Earlier than expected, or further forward.',
  avoid: 'To keep away from someone or something; to prevent something happening.',
  clearly: 'In a way that is easy to understand.',
  improve: 'To make something better than it was before.',
  integrate: 'To combine separate parts so that they work together.',
  migrate: 'To move data, software, or a system from one environment to another.',
  reliable: 'Able to be trusted to work well or behave well.',
  stakeholder: 'A person or group with an interest in a project or decision.',
  transition: 'To change from one state, process, or system to another.',
  wander: 'To move around without a fixed plan or purpose.',
};
function definitionFor(word: {en: string; pos: string}) {
  const defined = definitions[word.en.toLocaleLowerCase('en')];
  if (defined) return defined;
  const kind = word.pos.toLocaleLowerCase('en');
  if (kind.includes('verb')) return `To ${word.en.toLocaleLowerCase('en')}; see the example for how it is used.`;
  if (kind.includes('adjective')) return `Describing something as ${word.en.toLocaleLowerCase('en')}.`;
  if (kind.includes('adverb')) return `In a ${word.en.toLocaleLowerCase('en')} way.`;
  return `The meaning of “${word.en}” is shown through the example below.`;
}
const library = wordBank.map(word => ({
  ...word,
  track: 'Core',
  definition: definitionFor(word),
}));
type Props = NativeStackScreenProps<OnboardingStackParamList, 'Study'>;
const Back = ({ onPress }: { onPress: () => void }) => (
  <Pressable hitSlop={12} onPress={onPress}>
    <Text style={styles.back}>‹</Text>
  </Pressable>
);
const Button = ({
  title,
  onPress,
  quiet,
}: {
  title: string;
  onPress: () => void;
  quiet?: boolean;
}) => (
  <Pressable
    style={[styles.button, quiet && styles.buttonQuiet]}
    onPress={onPress}
  >
    <Text style={[styles.buttonText, quiet && styles.buttonQuietText]}>
      {title}
    </Text>
  </Pressable>
);

export function StudyScreen({ navigation, route }: Props) {
  const [activeWords, setActiveWords] = useState(words);
  const [queue, setQueue] = useState(words.map(word => word.en));
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [checkpoint, setCheckpoint] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const transition = useRef(new Animated.Value(0)).current;
  const word = activeWords.find(item => item.en === queue[0]) ?? activeWords[0];
  useEffect(() => {
    if (route.params?.pool === 'myWords')
      AsyncStorage.getItem('fluent:my-words')
        .then(value => {
          const names: string[] = value ? JSON.parse(value) : [];
          const next = library
            .filter(item => names.includes(item.en))
            .map(item => ({
              id: item.id,
              en: item.en,
              tr: item.tr,
              pos: item.pos,
              track: 'Core',
              definition: item.definition,
              example: item.example,
            }));
          if (next.length) {
            setActiveWords(next);
            setQueue(next.map(item => item.en));
          }
        })
        .catch(() => undefined);
    else
      Promise.all([AsyncStorage.getItem('fluent:survey'), loadLearningState()])
        .then(([survey, learning]) => {
          const answers = survey
            ? (JSON.parse(survey) as { level?: string; daily?: string })
            : {};
          const next = dailyPool(
            answers.level ?? null,
            dailyTarget(answers.daily),
            learning,
          ).map(item => ({
            id: item.id,
            en: item.en,
            tr: item.tr,
            pos: item.pos,
            track: 'Core',
            definition: definitionFor(item),
            example: item.example,
          }));
          if (next.length) {
            setActiveWords(next);
            setQueue(next.map(item => item.en));
          }
        })
        .catch(() => undefined);
  }, [route.params?.pool]);
  useEffect(() => {
    loadLearningState()
      .then(learning =>
        setIsFavorite(Boolean(learning.progress[word.id]?.favorite || learning.progress[word.en]?.favorite)),
      )
      .catch(() => undefined);
  }, [word.en]);
  const flip = () => {
    haptic('impact');
    Animated.sequence([
      Animated.timing(transition, {
        toValue: -1,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(transition, {
        toValue: 0,
        friction: 7,
        tension: 72,
        useNativeDriver: true,
      }),
    ]).start();
    setRevealed(value => !value);
  };
  const next = async (isKnown: boolean) => {
    const learning = await loadLearningState();
    await saveLearningState(recordPractice(learning, word.id, isKnown));
    const nextQueue = applyAnswer(queue);
    if (isKnown) setKnown(value => value + 1);
    setQueue(nextQueue);
    setReviewed(value => value + 1);
    setRevealed(false);
    transition.setValue(0);
    if (!nextQueue.length)
      navigation.replace('StudyComplete', {
        known: isKnown ? known + 1 : known,
        total: reviewed + 1,
      });
  };
  const continueAfterCheckpoint = () => {
    setCheckpoint(false);
  };
  const requestExit = () => {
    if (reviewed > 0 && queue.length) setCheckpoint(true);
    else navigation.goBack();
  };
  const favorite = async () => {
    const learning = await loadLearningState();
    const nextState = toggleFavorite(learning, word.id);
    await saveLearningState(nextState);
    setIsFavorite(nextState.progress[word.id].favorite);
    haptic('selection');
  };
  return (
    <ScreenShell>
      <View style={styles.top}>
        <Back onPress={requestExit} />
        <Text style={styles.counter}>
          {reviewed + 1} / {Math.max(activeWords.length, reviewed + queue.length)}
        </Text>
        <View style={styles.topActions}>
          <Pressable
            onPress={favorite}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? 'Remove from favorites' : 'Add to favorites'
            }
          >
            <Text
              style={[styles.topSymbol, isFavorite && styles.topSymbolActive]}
            >
              {isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => speak(word.en)}
            accessibilityRole="button"
            accessibilityLabel="Read aloud"
          >
            <Text style={styles.listen}>🔊</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={flip}>
          <Animated.View
            style={[
              styles.flashcard,
              {
                transform: [
                  {
                    translateX: transition.interpolate({
                      inputRange: [-1, 0],
                      outputRange: [-52, 0],
                    }),
                  },
                ],
                opacity: transition.interpolate({
                  inputRange: [-1, -0.45, 0],
                  outputRange: [0.15, 0.78, 1],
                }),
              },
            ]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.pill}>
                {revealed ? 'TURKISH' : word.track}
              </Text>
              <Text style={styles.cardMeta}>B1</Text>
            </View>
            {revealed ? (
              <>
                <Text style={styles.word}>{word.tr}</Text>
                <Text style={styles.partOfSpeech}>Turkish meaning</Text>
                <Text style={styles.definition}>{word.en}</Text>
                <Text style={styles.example}>“{word.example}”</Text>
                <Text style={styles.tapHint}>
                  Tap again to return to English
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.word}>{word.en}</Text>
                <Text style={styles.partOfSpeech}>{word.pos}</Text>
                <Text style={styles.definition}>{word.definition}</Text>
                {word.track === 'Interview' && (
                  <Text style={styles.interview}>
                    SAY IT LIKE THIS IN AN INTERVIEW
                  </Text>
                )}
                <Text style={styles.example}>“{word.example}”</Text>
                <Text style={styles.tapHint}>
                  Tap the card to reveal Turkish
                </Text>
              </>
            )}
          </Animated.View>
        </Pressable>
        <View style={styles.segmentRow}>
          {activeWords.map((item, itemIndex) => (
            <View
              key={item.en}
              style={[
                styles.segment,
                itemIndex < reviewed && styles.segmentDone,
                itemIndex === reviewed && styles.segmentCurrent,
              ]}
            />
          ))}
        </View>
        <Text style={styles.skip} onPress={() => next(false)}>
          Skip
        </Text>
        {checkpoint && (
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>
              Leave this practice?
            </Text>
            <Text style={styles.cardSub}>Your progress is saved. You can continue later.</Text>
            <View style={styles.listActions}>
              <Button
                title="Exit"
                quiet
                onPress={() => navigation.goBack()}
              />
              <Button title="Continue" onPress={continueAfterCheckpoint} />
            </View>
          </View>
        )}
      </ScrollView>
      <View style={styles.studyActions}>
        <Button title="I don’t know" onPress={() => next(false)} />
        <Button title="I know" quiet onPress={() => next(true)} />
      </View>
    </ScreenShell>
  );
}
export function StudyCompleteScreen({
  navigation,
  route,
}: NativeStackScreenProps<OnboardingStackParamList, 'StudyComplete'>) {
  return (
    <ScreenShell>
      <View style={styles.complete}>
        <Text style={styles.completeMark}>✦</Text>
        <Text style={styles.display}>Nice work.</Text>
        <Text style={styles.completeCopy}>
          {route.params.known} words known · {route.params.total} reviewed
        </Text>
        <Button
          title="Practice again"
          onPress={() => navigation.replace('Study')}
        />
        <Button
          title="Back to Home"
          quiet
          onPress={() => navigation.navigate('Home')}
        />
      </View>
    </ScreenShell>
  );
}
export function TestScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'Test'>) {
  // A test needs enough questions for a meaningful mid-session pause. The
  // production pool replaces this fallback whenever a selected list is used.
  const testWords = library.slice(0, 10);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [checkpoint, setCheckpoint] = useState(false);
  const word = testWords[Math.min(index, testWords.length - 1)];
  const answers = useMemo(
    () => [
      word.tr,
      ...testWords
        .filter(item => item.id !== word.id)
        .slice(0, 3)
        .map(item => item.tr),
    ],
    [word],
  );

  const finish = (finalScore: number) =>
    navigation.replace('TestComplete', {
      score: finalScore,
      total: testWords.length,
    });
  const select = async (answer: string) => {
    if (selected || checkpoint) return;
    const correct = answer === word.tr;
    const learning = await loadLearningState();
    await saveLearningState(recordPractice(learning, word.id, correct));
    haptic(correct ? 'success' : 'impact');
    setSelected(answer);
    const nextScore = score + (correct ? 1 : 0);
    if (correct) setScore(nextScore);

    setTimeout(() => {
      const nextIndex = index + 1;
      // The sheet opens after question 6, before the next question is shown.
      if (nextIndex === 6) {
        setIndex(nextIndex);
        setSelected(null);
        setCheckpoint(true);
        return;
      }
      if (nextIndex >= testWords.length) finish(nextScore);
      else {
        setIndex(nextIndex);
        setSelected(null);
      }
    }, 650);
  };

  const continueAfterCheckpoint = () => {
    setCheckpoint(false);
    if (index >= testWords.length) finish(score);
  };

  return (
    <ScreenShell>
      <View style={styles.top}>
        <Back onPress={() => navigation.goBack()} />
        <Text style={styles.counter}>
          {Math.min(index + 1, testWords.length)} / {testWords.length}
        </Text>
        <Pressable
          onPress={() => speak(word.en)}
          accessibilityRole="button"
          accessibilityLabel="Read aloud"
        >
          <Text style={styles.listen}>🔊</Text>
        </Pressable>
      </View>
      <View style={styles.page}>
        <View style={styles.quizCard}>
          <Text style={styles.cardMeta}>
            {word.level ?? 'B1'} · {word.track}
          </Text>
          <Text style={styles.word}>{word.en}</Text>
          <Text style={styles.history}>Choose the Turkish meaning.</Text>
        </View>
        <Text style={styles.question}>Choose the meaning</Text>
        {answers.map(answer => (
          <Pressable
            key={answer}
            style={[
              styles.answer,
              selected === answer &&
                (answer === word.tr
                  ? styles.answerCorrect
                  : styles.answerWrong),
            ]}
            onPress={() => select(answer)}
          >
            <Text style={styles.answerText}>{answer}</Text>
          </Pressable>
        ))}
      </View>
      {checkpoint && (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Checkpoint</Text>
          <Text style={styles.cardSub}>
            6 questions done · {score} correct so far.
          </Text>
          <Text style={styles.completeCopy}>
            Take a breath, then finish the remaining {testWords.length - index}{' '}
            questions.
          </Text>
          <View style={styles.listActions}>
            <Button
              title="Exit test"
              quiet
              onPress={() => navigation.navigate('Home')}
            />
            <Button title="Keep going" onPress={continueAfterCheckpoint} />
          </View>
        </View>
      )}
    </ScreenShell>
  );
}
export function TestCompleteScreen({
  navigation,
  route,
}: NativeStackScreenProps<OnboardingStackParamList, 'TestComplete'>) {
  return (
    <ScreenShell>
      <View style={styles.complete}>
        <Text style={styles.completeMark}>✦</Text>
        <Text style={styles.display}>Keep moving.</Text>
        <Text style={styles.completeCopy}>
          {route.params.score} / {route.params.total} correct
        </Text>
        <Button title="Test again" onPress={() => navigation.replace('Test')} />
        <Button
          title="Back to Home"
          quiet
          onPress={() => navigation.navigate('Home')}
        />
      </View>
    </ScreenShell>
  );
}
export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(timer);
    }, []),
  );

  useEffect(() => {
    AsyncStorage.getItem('fluent:my-words')
      .then(value => setSaved(value ? JSON.parse(value) : []))
      .catch(() => undefined);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase('tr');
  const list = library
    .filter(
      word =>
        !normalizedQuery ||
        word.en.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        word.tr.toLocaleLowerCase('tr').includes(normalizedQuery) ||
        word.pos.toLocaleLowerCase('tr').includes(normalizedQuery),
    )
    .slice(0, 50);
  const toggleSaved = (word: (typeof library)[number]) => {
    const next = saved.includes(word.en)
      ? saved.filter(item => item !== word.en)
      : [word.en, ...saved];
    setSaved(next);
    AsyncStorage.setItem('fluent:my-words', JSON.stringify(next)).catch(
      () => undefined,
    );
    haptic('selection');
  };
  return (
    <ScreenShell>
      <View style={styles.page}>
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search words"
          placeholderTextColor={colors.muted}
          style={styles.search}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {list.map(word => {
          const isSaved = saved.includes(word.en);
          return <Pressable key={word.id} style={styles.searchRow} onPress={() => toggleSaved(word)}>
            <View>
              <Text style={styles.cardTitle}>{word.en}</Text>
              <Text style={styles.cardSub}>
                {word.pos} · {word.tr}
              </Text>
            </View>
            <Text style={[styles.addToList, isSaved && styles.addedToList]}>{isSaved ? 'Added' : 'Add'}</Text>
          </Pressable>;
        })}
        {normalizedQuery.length > 0 && !list.length && <View style={styles.searchEmpty}><Text style={styles.emptyTitle}>No matching words.</Text><Text style={styles.emptyCopy}>Try English, Turkish, or a word type.</Text></View>}
      </View>
    </ScreenShell>
  );
}
export function MyCardsScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'MyCards'>) {
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [sort, setSort] = useState<'new' | 'az' | 'za'>('new');
  const [showLibrary, setShowLibrary] = useState(false);
  React.useEffect(() => {
    AsyncStorage.getItem('fluent:my-words')
      .then(value =>
        setSaved(value ? JSON.parse(value) : ['Stakeholder', 'Ahead']),
      )
      .catch(() => undefined);
  }, []);
  const update = (next: string[]) => {
    setSaved(next);
    AsyncStorage.setItem('fluent:my-words', JSON.stringify(next)).catch(
      () => undefined,
    );
  };
  const rows = library
    .filter(
      word =>
        saved.includes(word.en) &&
        word.en.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'az'
        ? a.en.localeCompare(b.en)
        : sort === 'za'
        ? b.en.localeCompare(a.en)
        : saved.indexOf(b.en) - saved.indexOf(a.en),
    );
  const additions = library.filter(
    word =>
      !saved.includes(word.en) &&
      word.en.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <ScreenShell>
      <View style={styles.top}>
        <Back onPress={() => navigation.goBack()} />
        <Text style={styles.counter}>My word list</Text>
        <Pressable onPress={() => setShowLibrary(value => !value)}>
          <Text style={styles.topSymbol}>＋</Text>
        </Pressable>
      </View>
      <View style={styles.page}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your word list"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <View style={styles.listHeading}>
          <Text style={styles.cardTitle}>All ({saved.length})</Text>
          <Pressable
            onPress={() =>
              setSort(value =>
                value === 'new' ? 'az' : value === 'az' ? 'za' : 'new',
              )
            }
          >
            <Text style={styles.sort}>
              ↕{' '}
              {sort === 'new' ? 'Newest' : sort === 'az' ? 'A to Z' : 'Z to A'}
            </Text>
          </Pressable>
        </View>
        {showLibrary && (
          <View style={styles.addPanel}>
            <Text style={styles.cardSub}>Add from word bank</Text>
            {additions.map(word => (
              <Pressable
                key={word.en}
                style={styles.addRow}
                onPress={() => {
                  haptic();
                  update([word.en, ...saved]);
                }}
              >
                <Text style={styles.cardTitle}>{word.en}</Text>
                <Text style={styles.add}>Add</Text>
              </Pressable>
            ))}
          </View>
        )}
        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.map(word => (
            <View key={word.en} style={styles.wordRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.wordRowTop}>
                  <Text style={styles.cardTitle}>{word.en}</Text>
                  <Text style={styles.levelBadge}>B1</Text>
                </View>
                <Text style={styles.cardSub}>
                  {word.pos} · {word.tr}
                </Text>
                <Text style={styles.wordDefinition}>{word.definition}</Text>
                <Text style={styles.wordExample}>“{word.example}”</Text>
                <View style={styles.rowActions}>
                  <Text style={styles.action} onPress={() => speak(word.en)}>
                    Speak
                  </Text>
                  <Text
                    style={styles.action}
                    onPress={() => navigation.navigate('Study')}
                  >
                    Study
                  </Text>
                  <Text
                    style={styles.delete}
                    onPress={() =>
                      update(saved.filter(item => item !== word.en))
                    }
                  >
                    Remove
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.listActions}>
          <Button
            title="Take quiz"
            quiet
            onPress={() => navigation.navigate('Test')}
          />
          <Button title="Study" onPress={() => navigation.navigate('Study')} />
        </View>
      </View>
    </ScreenShell>
  );
}
export function ProfileScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'Profile'>) {
  const [signedIn, setSignedIn] = useState(true);
  return (
    <ScreenShell>
      <View style={styles.page}>
        {signedIn ? (
          <>
            <Text style={styles.display}>Betül.</Text>
            <Text style={styles.profileEmail}>betul@fluent.app</Text>
            <View style={styles.profileCard}>
              <Text style={styles.cardTitle}>B1 · Intermediate</Text>
              <Text style={styles.cardSub}>10 min daily · 40 words weekly</Text>
            </View>
            <View style={styles.profileCard}>
              <Text style={styles.cardTitle}>Tech vocabulary</Text>
              <Text style={styles.cardSub}>
                Personalised for Product Manager
              </Text>
            </View>
            <Button
              title="Edit preferences"
              quiet
              onPress={() => navigation.navigate('Survey')}
            />
            <Text style={styles.signOut} onPress={() => setSignedIn(false)}>
              Sign out
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.display}>Make it yours.</Text>
            <Text style={styles.completeCopy}>
              Create an account to keep your words, progress and name across
              devices.
            </Text>
            <Button
              title="Create your account"
              onPress={() => navigation.navigate('Account')}
            />
            <Text
              style={styles.signOut}
              onPress={() => navigation.navigate('Account')}
            >
              I already have an account
            </Text>
          </>
        )}
      </View>
    </ScreenShell>
  );
}
export function AccountScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'Account'>) {
  const [name, setName] = useState('');
  return (
    <ScreenShell>
      <View style={styles.top}>
        <Back onPress={() => navigation.goBack()} />
        <Text style={styles.counter}>Account</Text>
        <View style={{ width: 28 }} />
      </View>
      <View style={styles.page}>
        <Text style={styles.display}>Your name.</Text>
        <Text style={styles.completeCopy}>
          This is how Fluent will greet you every day.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="First name"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <Button
          title="Continue"
          onPress={() => navigation.navigate('Profile')}
        />
      </View>
    </ScreenShell>
  );
}
export function GrammarScreen({
  navigation,
  route,
}: NativeStackScreenProps<OnboardingStackParamList, 'Grammar'>) {
  const lesson =
    route.params.lesson === 'gerund' ? gerundAndInfinitive : prepositions;
  return (
    <ScreenShell>
      <View style={styles.top}>
        <Back onPress={() => navigation.goBack()} />
        <Text style={styles.counter}>{lesson.title}</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        {lesson.sections.map(section => (
          <View key={section.title}>
            <Text style={styles.grammarHeading}>{section.title}</Text>
            {section.items.map(item => (
              <View style={styles.grammarRow} key={item.pattern}>
                <Text style={styles.cardTitle}>{item.pattern}</Text>
                <Text style={styles.cardSub}>{item.rule}</Text>
                <Text style={styles.wordExample}>{item.example}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}
const styles = StyleSheet.create({
  top: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { fontSize: 42, lineHeight: 42, color: colors.text },
  counter: { fontWeight: '600', color: colors.text, fontSize: 16 },
  topActions: { flexDirection: 'row', gap: spacing.sm },
  topSymbol: { fontSize: 24, color: colors.mint },
  topSymbolActive: { color: '#FFD66B' },
  listen: { fontSize: 18 },
  page: {
    paddingTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  studyActions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.backgroundRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.muted,
    alignSelf: 'center',
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  grammarHeading: {
    fontSize: 21,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  grammarRow: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  flashcard: {
    minHeight: 430,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  pill: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  word: {
    alignSelf: 'flex-start',
    fontFamily: 'Georgia',
    fontSize: 56,
    lineHeight: 68,
    color: colors.text,
    marginTop: spacing.xxl,
  },
  pos: { color: colors.muted, marginTop: 4 },
  partOfSpeech: {
    alignSelf: 'flex-start',
    marginTop: 0,
    color: colors.muted,
    fontSize: 16,
  },
  definition: {
    borderLeftWidth: 3,
    borderLeftColor: '#315BFF',
    paddingLeft: spacing.md,
    color: colors.text,
    fontSize: 23,
    lineHeight: 33,
    marginTop: spacing.xl,
  },
  interview: {
    color: colors.mint,
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
    marginTop: spacing.xl,
  },
  example: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  tapHint: {
    marginTop: spacing.xl,
    color: colors.mint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  translation: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(8,29,90,.32)',
    alignItems: 'center',
  },
  translationRevealed: { backgroundColor: colors.selected },
  translationLabel: { color: colors.text, fontWeight: '600' },
  segmentRow: { flexDirection: 'row', gap: 5, marginTop: spacing.sm },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: 9,
    backgroundColor: colors.disabled,
  },
  segmentDone: { backgroundColor: colors.mint },
  segmentCurrent: { backgroundColor: '#7191FF' },
  skip: {
    alignSelf: 'center',
    color: colors.muted,
    marginVertical: spacing.sm,
  },
  button: {
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    padding: 17,
    alignItems: 'center',
  },
  buttonQuiet: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  buttonQuietText: { color: colors.text },
  complete: { flex: 1, justifyContent: 'center', gap: spacing.md },
  completeMark: { color: colors.mint, fontSize: 44 },
  display: {
    fontFamily: 'Georgia',
    fontSize: 44,
    lineHeight: 48,
    color: colors.text,
  },
  completeCopy: { color: colors.muted, fontSize: 17, marginBottom: spacing.lg },
  quizCard: { paddingTop: spacing.sm, minHeight: 230 },
  history: { marginTop: spacing.md, color: colors.muted, fontStyle: 'italic' },
  question: {
    fontSize: 17,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  answer: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#171B21',
  },
  answerCorrect: {
    backgroundColor: 'rgba(120,230,188,.35)',
    borderColor: colors.mint,
  },
  answerWrong: {
    backgroundColor: 'rgba(255,109,90,.28)',
    borderColor: colors.danger,
  },
  answerText: { color: colors.text, fontSize: 16 },
  search: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 17,
    backgroundColor: '#171B21',
  },
  searchRow: {
    minHeight: 72,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(202,239,255,.14)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  addToList: {fontSize: 13, fontWeight: '700', color: colors.mint},
  addedToList: {color: 'rgba(200,255,251,.54)'},
  searchEmpty: {paddingTop: spacing.xl, alignItems: 'center'},
  emptyTitle: {
    color: colors.text,
    fontFamily: 'Georgia',
    fontSize: 24,
  },
  emptyCopy: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardSub: { color: colors.muted, marginTop: 4 },
  chevron: { color: colors.mint, fontSize: 24 },
  count: { color: colors.mint, fontSize: 24, fontWeight: '700' },
  profileCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#171B21',
  },
  profileEmail: { color: colors.mint, marginTop: -spacing.sm },
  signOut: { alignSelf: 'center', marginTop: spacing.sm, color: colors.muted },
  listHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sort: { color: colors.mint, fontWeight: '700' },
  addPanel: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  addRow: {
    paddingTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  add: { color: colors.mint, fontWeight: '700' },
  wordRow: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  wordRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  levelBadge: {
    color: colors.primaryText,
    backgroundColor: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: '700',
  },
  wordDefinition: { color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  wordExample: { color: colors.muted, fontStyle: 'italic', marginTop: 6 },
  rowActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  action: { color: colors.mint, fontWeight: '700' },
  delete: { color: colors.danger, fontWeight: '700' },
  listActions: { flexDirection: 'row', gap: spacing.sm },
});
