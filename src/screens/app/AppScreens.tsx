import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { colors, radius, spacing, tabBarSpace } from '../../theme';
import { ScreenShell } from '../onboarding/ScreenShell';
import { haptic, speak } from '../../services/feedback';
import { playSound, stopSound } from '../../services/sounds';
import { useAutoSpeak } from '../../hooks/useAutoSpeak';
import { AppBar, AppBarButton } from '../../components/AppBar';
import { Icon } from '../../components/Icon';
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
import {findWordsByTokens, savedWordsKey} from '../../logic/wordCollections';

const words = [
  {
    id: 'stakeholder',
    en: 'Stakeholder',
    tr: 'Paydaş',
    pos: 'Noun',
    track: 'Interview',
    definition: 'A person with an interest in a project.',
    example: 'In my last role, I aligned every stakeholder before we launched.',
    definitionTr: 'Bir projede çıkarı olan kişi.',
    exampleTr: 'Önceki görevimde, lansmandan önce her paydaşı aynı çizgiye getirdim.',
  },
  {
    id: 'ahead',
    en: 'Ahead',
    tr: 'Önde, ileride',
    pos: 'Preposition',
    track: 'Core',
    definition: 'Earlier than expected, or further forward.',
    example: 'The train is ahead of schedule.',
    definitionTr: 'Beklenenden erken ya da daha ileride.',
    exampleTr: 'Tren programın önünde gidiyor.',
  },
  {
    id: 'wander',
    en: 'Wander',
    tr: 'Dolaşmak',
    pos: 'Verb',
    track: 'Core',
    definition: 'To move around without a fixed plan.',
    example: 'We wandered through the city after dinner.',
    definitionTr: 'Belirli bir plan olmadan dolaşmak.',
    exampleTr: 'Akşam yemeğinden sonra şehirde dolaştık.',
  },
  {
    id: 'reliable',
    en: 'Reliable',
    tr: 'Güvenilir',
    pos: 'Adjective',
    track: 'Core',
    definition: 'Able to be trusted to work well or behave well.',
    example: 'She is a reliable member of the team.',
    definitionTr: 'İyi çalışacağına ya da doğru davranacağına güvenilebilen.',
    exampleTr: 'O, ekibin güvenilir bir üyesidir.',
  },
  {
    id: 'clearly',
    en: 'Clearly',
    tr: 'Açıkça',
    pos: 'Adverb',
    track: 'Core',
    definition: 'In a way that is easy to understand.',
    example: 'Please explain the plan clearly.',
    definitionTr: 'Anlaşılması kolay bir biçimde.',
    exampleTr: 'Lütfen planı açıkça anlat.',
  },
];
const library = wordBank.map(word => ({...word, track: 'Core'}));
type LibraryWord = (typeof library)[number];
const libraryById = new Map(library.map(word => [word.id, word]));

function poolFromTokens(tokens: string[]): LibraryWord[] {
  return findWordsByTokens(tokens)
    .map(word => libraryById.get(word.id))
    .filter((word): word is LibraryWord => Boolean(word));
}

function toCard(word: LibraryWord) {
  return {
    id: word.id,
    en: word.en,
    tr: word.tr,
    pos: word.pos,
    track: 'Core',
    definition: word.definition,
    example: word.example,
    definitionTr: word.definitionTr,
    exampleTr: word.exampleTr,
  };
}

// Entries range from "hope" to "ARPPU (Average Revenue Per Paying User)", and
// Turkish glosses are longer still, so headline type steps down with length.
function headwordType(text: string) {
  if (text.length <= 10) return {fontSize: 56, lineHeight: 68};
  if (text.length <= 16) return {fontSize: 44, lineHeight: 54};
  if (text.length <= 26) return {fontSize: 36, lineHeight: 45};
  if (text.length <= 40) return {fontSize: 29, lineHeight: 37};
  return {fontSize: 24, lineHeight: 31};
}

// Definitions run from three words to a full sentence, so the display type has
// to step down or the longest ones push the answers off the screen.
function promptType(text: string) {
  if (text.length <= 16) return {fontSize: 42, lineHeight: 50};
  if (text.length <= 30) return {fontSize: 34, lineHeight: 42};
  if (text.length <= 52) return {fontSize: 27, lineHeight: 35};
  if (text.length <= 80) return {fontSize: 23, lineHeight: 31};
  return {fontSize: 20, lineHeight: 27};
}

function definitionType(text: string) {
  if (text.length <= 48) return {fontSize: 23, lineHeight: 33};
  if (text.length <= 84) return {fontSize: 20, lineHeight: 29};
  return {fontSize: 17, lineHeight: 25};
}

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Study'>;
/** Blocks swipe/hardware back until the learner confirms leaving a session. */
function useConfirmLeave(
  navigation: NativeStackNavigationProp<OnboardingStackParamList>,
  message: string,
) {
  const allowLeave = useRef(false);
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', e => {
      if (allowLeave.current) return;
      const type = e.data.action.type;
      if (type !== 'GO_BACK' && type !== 'POP' && type !== 'POP_TO_TOP') return;
      e.preventDefault();
      Alert.alert('Emin misin?', message, [
        {text: 'Kal', style: 'cancel'},
        {
          text: 'Çık',
          style: 'destructive',
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return sub;
  }, [message, navigation]);
  const leaveNow = () => {
    allowLeave.current = true;
    navigation.goBack();
  };
  return {leaveNow};
}

const BackButton = ({onPress}: {onPress: () => void}) => (
  <AppBarButton onPress={onPress} accessibilityLabel="Back">
    <Icon.ChevronLeft />
  </AppBarButton>
);
const SpeakButton = ({onPress}: {onPress: () => void}) => (
  <AppBarButton onPress={onPress} accessibilityLabel="Read aloud">
    <Icon.Volume2 />
  </AppBarButton>
);
/** Feather `type` — reads the example sentence, not just the headword. */
const SentenceSpeakButton = ({onPress}: {onPress: () => void}) => (
  <AppBarButton onPress={onPress} accessibilityLabel="Read example sentence">
    <Icon.Type size={20} />
  </AppBarButton>
);
const ExampleLine = ({
  text,
  onSpeak,
}: {
  text: string;
  onSpeak: () => void;
}) => (
  // Capture the touch so reading the sentence never flips the flashcard.
  <View style={styles.exampleRow} onStartShouldSetResponder={() => true}>
    <Text style={[styles.example, styles.exampleText]}>“{text}”</Text>
    <SentenceSpeakButton onPress={onSpeak} />
  </View>
);
/** Text chip instead of a second speaker — the bar already has volume-2 for play. */
const AutoSpeakToggle = ({on, onPress}: {on: boolean; onPress: () => void}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="switch"
    accessibilityState={{checked: on}}
    accessibilityLabel="Speak every new word"
    style={[styles.autoPill, !on && styles.autoPillOff]}
  >
    <Text style={[styles.autoPillText, !on && styles.autoPillTextOff]}>{on ? 'AUTO' : 'MUTE'}</Text>
  </Pressable>
);
const BarCount = ({label}: {label: string}) => (
  <Text style={styles.barCount}>{label}</Text>
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
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState(words.map(word => word.en));
  const [reviewed, setReviewed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const transition = useRef(new Animated.Value(0)).current;
  const knownIdsRef = useRef<string[]>([]);
  const unknownIdsRef = useRef<string[]>([]);
  const autoSpeak = useAutoSpeak();
  useConfirmLeave(
    navigation,
    'Bu pratikten çıkmak istediğine emin misin? İlerlemen kaydedildi.',
  );
  const word = activeWords.find(item => item.en === queue[0]) ?? activeWords[0];
  const requestedIds = route.params?.ids;
  useEffect(() => {
    const start = (next: ReturnType<typeof toCard>[]) => {
      if (next.length) {
        setActiveWords(next);
        setQueue(next.map(item => item.en));
      }
      setReady(true);
    };
    if (requestedIds?.length) {
      start(poolFromTokens(requestedIds).map(toCard));
      return;
    }
    if (route.params?.pool === 'myWords')
      AsyncStorage.getItem(savedWordsKey)
        .then(value => start(poolFromTokens(value ? JSON.parse(value) : []).map(toCard)))
        .catch(() => setReady(true));
    else
      Promise.all([AsyncStorage.getItem('fluent:survey'), loadLearningState()])
        .then(([survey, learning]) => {
          const answers = survey
            ? (JSON.parse(survey) as { level?: string; daily?: string })
            : {};
          start(
            dailyPool(answers.level ?? null, dailyTarget(answers.daily), learning).map(item =>
              toCard(libraryById.get(item.id) ?? {...item, track: 'Core'}),
            ),
          );
        })
        .catch(() => setReady(true));
  }, [requestedIds, route.params?.pool]);
  // Each card that arrives is pronounced once, so the learner hears the word
  // before deciding whether they know it.
  useEffect(() => {
    if (ready && autoSpeak.enabled) speak(word.en);
  }, [autoSpeak.enabled, ready, word.en]);
  useEffect(() => {
    loadLearningState()
      .then(learning =>
        setIsFavorite(Boolean(learning.progress[word.id]?.favorite || learning.progress[word.en]?.favorite)),
      )
      .catch(() => undefined);
  }, [word.en, word.id]);
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
    if (isKnown) {
      knownIdsRef.current = [...knownIdsRef.current, word.id];
      setKnown(value => value + 1);
    } else {
      unknownIdsRef.current = [...unknownIdsRef.current, word.id];
    }
    setQueue(nextQueue);
    setReviewed(value => value + 1);
    setRevealed(false);
    transition.setValue(0);
    if (!nextQueue.length) {
      const knownIds = knownIdsRef.current;
      const unknownIds = unknownIdsRef.current;
      navigation.replace('StudyComplete', {
        known: isKnown ? known + 1 : known,
        total: reviewed + 1,
        knownIds,
        unknownIds,
        sessionIds: [...knownIds, ...unknownIds],
      });
    }
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
      <AppBar
        left={
          <>
            <BackButton onPress={() => navigation.goBack()} />
            <BarCount label={`${reviewed + 1}/${Math.max(activeWords.length, reviewed + queue.length)}`} />
          </>
        }
        right={
          <>
            <AppBarButton
              onPress={favorite}
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              active={isFavorite}
            >
              <Icon.Star
                color={isFavorite ? '#FFD66B' : colors.mint}
                fill={isFavorite ? '#FFD66B' : 'none'}
              />
            </AppBarButton>
            <SpeakButton onPress={() => speak(word.en)} />
            <AutoSpeakToggle on={autoSpeak.on} onPress={autoSpeak.toggle} />
          </>
        }
      />
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
                <Text style={[styles.word, headwordType(word.tr)]}>{word.tr}</Text>
                <Text style={styles.partOfSpeech}>{word.en}</Text>
                <Text style={[styles.definition, definitionType(word.definitionTr ?? word.definition)]}>
                  {word.definitionTr ?? word.definition}
                </Text>
                <ExampleLine
                  text={word.exampleTr ?? word.example}
                  onSpeak={() => speak(word.example)}
                />
                <Text style={styles.tapHint}>
                  Tap again to return to English
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.word, headwordType(word.en)]}>{word.en}</Text>
                <Text style={styles.partOfSpeech}>{word.pos}</Text>
                <Text style={[styles.definition, definitionType(word.definition)]}>
                  {word.definition}
                </Text>
                {word.track === 'Interview' && (
                  <Text style={styles.interview}>
                    SAY IT LIKE THIS IN AN INTERVIEW
                  </Text>
                )}
                <ExampleLine text={word.example} onSpeak={() => speak(word.example)} />
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
  const {known, total, sessionIds} = route.params;
  const [askTest, setAskTest] = useState(true);

  useEffect(() => {
    playSound('success');
    return () => stopSound();
  }, []);

  const goHome = () => {
    stopSound();
    setAskTest(false);
    navigation.navigate('Home');
  };

  const goTest = () => {
    stopSound();
    setAskTest(false);
    navigation.replace('Test', sessionIds.length ? {ids: sessionIds} : undefined);
  };

  return (
    <ScreenShell>
      <View style={styles.complete}>
        <Icon.Award size={44} color={colors.mint} />
        <Text style={styles.display}>Tebrikler!</Text>
        <Text style={styles.completeCopy}>
          {known} words known · {total} reviewed
        </Text>
        <Button title="Back to Home" quiet onPress={goHome} />
      </View>
      <Modal visible={askTest} transparent animationType="fade" onRequestClose={goHome}>
        <View style={styles.guideBackdrop}>
          <View style={styles.guideCard}>
            <Text style={styles.guideEyebrow}>NICE WORK</Text>
            <Text style={styles.guideTitle}>Pekiştirelim mi?</Text>
            <Text style={styles.guideCopy}>
              Öğrendiklerini (bildiklerin ve bilmediklerin) kısa bir testle
              pekiştirmek ister misin?
            </Text>
            <Button title="Evet, teste geç" onPress={goTest} />
            <Button title="Hayır, sonra" quiet onPress={goHome} />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

type TestOption = {id: string; label: string};
type TestKind = 'word' | 'turkish' | 'definition';
type TestQuestion = {
  word: LibraryWord;
  kind: TestKind;
  prompt: string;
  instruction: string;
  questionLabel: string;
  options: TestOption[];
};

// A definition that spells out its own headword would answer the question for
// the learner, so any form of it is blanked before the prompt is shown. Only
// the meaningful parts are masked: blanking "out" or "your" in a phrase like
// "phase out" would damage the sentence without hiding anything.
const maskExceptions = new Set(['and', 'any', 'are', 'for', 'from', 'has', 'have', 'into', 'its', 'not', 'off', 'our', 'out', 'over', 'the', 'their', 'this', 'that', 'was', 'were', 'with', 'you', 'your']);
function maskHeadword(text: string, headword: string) {
  const parts = headword
    .split(/[^\p{L}]+/u)
    .filter(part => part.length > 2 && !maskExceptions.has(part.toLocaleLowerCase('en')));
  return parts.reduce((masked, part) => {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return masked.replace(new RegExp(`\\b${escaped}\\p{L}*`, 'giu'), '___');
  }, text);
}

function shuffleTest<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let position = shuffled.length - 1; position > 0; position -= 1) {
    const swapWith = Math.floor(Math.random() * (position + 1));
    [shuffled[position], shuffled[swapWith]] = [
      shuffled[swapWith],
      shuffled[position],
    ];
  }
  return shuffled;
}

function createTestQuestions(
  testWords: LibraryWord[],
  source: LibraryWord[],
): TestQuestion[] {
  const questionKinds = shuffleTest(['word', 'turkish', 'definition'] as const);
  return testWords.map((word, questionIndex) => {
    const kind = word.definition
      ? questionKinds[questionIndex % questionKinds.length]
      : questionKinds.filter(item => item !== 'definition')[questionIndex % 2];
    const labelFor = (candidate: LibraryWord) =>
      kind === 'word' ? candidate.tr : candidate.en;
    // Different words can share a Turkish gloss or a definition. Such a
    // distractor would be a second right answer, so it never gets offered.
    const answer = labelFor(word);
    const distractors = shuffleTest(
      source.filter(
        candidate =>
          candidate.id !== word.id &&
          labelFor(candidate) !== answer &&
          (kind !== 'definition' || candidate.definition !== word.definition),
      ),
    ).slice(0, 3);
    const options = shuffleTest([
      {id: word.id, label: labelFor(word)},
      ...distractors.map(candidate => ({
        id: candidate.id,
        label: labelFor(candidate),
      })),
    ]);
    if (kind === 'word') {
      return {
        word,
        kind,
        prompt: word.en,
        instruction: 'Choose the Turkish meaning.',
        questionLabel: 'What does this word mean?',
        options,
      };
    }
    if (kind === 'turkish') {
      return {
        word,
        kind,
        prompt: word.tr,
        instruction: 'Choose the English word.',
        questionLabel: 'Which word matches?',
        options,
      };
    }
    return {
      word,
      kind: 'definition' as const,
      prompt: maskHeadword(word.definition, word.en),
      instruction: 'Choose the English word.',
      questionLabel: 'Which word matches this definition?',
      options,
    };
  });
}

const testLength = 10;
const checkpointAt = 6;
// A wrong answer shakes, then the right one is played in and held long enough
// to read before the next question replaces it.
const revealDelay = 380;
const correctAdvanceDelay = 780;
const wrongAdvanceDelay = 2200;

export function TestScreen({
  navigation,
  route,
}: NativeStackScreenProps<OnboardingStackParamList, 'Test'>) {
  const requestedIds = route.params?.ids;
  const requestedPool = route.params?.pool;
  const [pool, setPool] = useState<LibraryWord[] | null>(() =>
    requestedIds?.length
      ? poolFromTokens(requestedIds)
      : requestedPool === 'myWords'
      ? null
      : shuffleTest(library),
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [checkpoint, setCheckpoint] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showExample, setShowExample] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wrongIdsRef = useRef<string[]>([]);
  const autoSpeak = useAutoSpeak();
  const {leaveNow} = useConfirmLeave(
    navigation,
    'Testten çıkmak istediğine emin misin? Bu tur kaybolur.',
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (requestedIds?.length || requestedPool !== 'myWords') return;
    AsyncStorage.getItem(savedWordsKey)
      .then(value => {
        const saved = poolFromTokens(value ? JSON.parse(value) : []);
        setPool(saved.length ? saved : shuffleTest(library));
      })
      .catch(() => setPool(shuffleTest(library)));
  }, [requestedIds, requestedPool]);

  const testWords = useMemo(
    () => (pool ? shuffleTest(pool).slice(0, testLength) : []),
    [pool],
  );
  const questions = useMemo(
    () => createTestQuestions(testWords, library),
    [testWords],
  );
  const currentQuestion = questions[Math.min(index, questions.length - 1)];
  // The English word is only spoken up front when it is already on screen.
  // For the other question types it would read out the answer, so those are
  // pronounced at the reveal instead.
  const promptIsWord = currentQuestion?.kind === 'word';
  const promptWord = promptIsWord ? currentQuestion.word.en : null;
  useEffect(() => {
    if (autoSpeak.enabled && promptWord) speak(promptWord);
  }, [autoSpeak.enabled, promptWord, index]);

  const finish = (finalScore: number) =>
    navigation.replace('TestComplete', {
      score: finalScore,
      total: testWords.length,
      wrongIds: wrongIdsRef.current,
      sessionIds: testWords.map(item => item.id),
    });

  const after = (run: () => void, delay: number) => {
    timers.current.push(setTimeout(run, delay));
  };

  const advance = (nextScore: number) => {
    shake.setValue(0);
    reveal.setValue(0);
    setRevealed(false);
    setSelected(null);
    setShowExample(false);
    const nextIndex = index + 1;
    if (nextIndex >= testWords.length) {
      finish(nextScore);
      return;
    }
    setIndex(nextIndex);
    if (nextIndex === checkpointAt && testWords.length > checkpointAt)
      setCheckpoint(true);
  };

  const select = async (answer: TestOption) => {
    if (!currentQuestion || selected || checkpoint) return;
    const {word: current} = currentQuestion;
    const correct = answer.id === current.id;
    setSelected(answer.id);
    playSound(correct ? 'correct' : 'wrong');
    haptic(correct ? 'success' : 'impact');
    if (!correct) wrongIdsRef.current = [...wrongIdsRef.current, current.id];
    const learning = await loadLearningState();
    await saveLearningState(recordPractice(learning, current.id, correct));
    const nextScore = score + (correct ? 1 : 0);
    if (correct) setScore(nextScore);

    const playReveal = () => {
      reveal.setValue(0);
      setRevealed(true);
      if (autoSpeak.enabled && !promptIsWord) speak(current.en);
      Animated.spring(reveal, {
        toValue: 1,
        friction: 6,
        tension: 110,
        useNativeDriver: true,
      }).start();
    };

    if (correct) {
      playReveal();
      after(() => advance(nextScore), correctAdvanceDelay);
      return;
    }
    Animated.sequence([
      Animated.timing(shake, {toValue: 1, duration: 66, useNativeDriver: true}),
      Animated.timing(shake, {toValue: -1, duration: 66, useNativeDriver: true}),
      Animated.timing(shake, {toValue: 0.5, duration: 58, useNativeDriver: true}),
      Animated.timing(shake, {toValue: 0, duration: 58, useNativeDriver: true}),
    ]).start();
    after(() => {
      haptic('selection');
      playReveal();
    }, revealDelay);
    after(() => advance(nextScore), wrongAdvanceDelay);
  };

  const continueAfterCheckpoint = () => {
    setCheckpoint(false);
    if (index >= testWords.length) finish(score);
  };

  if (!currentQuestion)
    return (
      <ScreenShell>
        <AppBar
          title="Test"
          left={<BackButton onPress={() => navigation.goBack()} />}
        />
        <View style={styles.complete}>
          <Text style={styles.display}>
            {pool ? 'No words yet.' : 'Getting ready…'}
          </Text>
          {Boolean(pool) && (
            <Text style={styles.completeCopy}>
              Add a few words to this list, then come back for a test.
            </Text>
          )}
        </View>
      </ScreenShell>
    );

  const {word} = currentQuestion;
  const correctLabel =
    currentQuestion.options.find(option => option.id === word.id)?.label ?? word.en;
  const answeredWrong = Boolean(selected) && selected !== word.id;

  return (
    <ScreenShell>
      <AppBar
        left={
          <>
            <BackButton onPress={() => navigation.goBack()} />
            <BarCount label={`${Math.min(index + 1, testWords.length)}/${testWords.length}`} />
          </>
        }
        right={
          <>
            <SpeakButton onPress={() => speak(word.en)} />
            <AutoSpeakToggle on={autoSpeak.on} onPress={autoSpeak.toggle} />
          </>
        }
      />
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.quizCard}>
          <Pressable
            onPress={() => setShowExample(value => !value)}
            accessibilityRole="button"
            accessibilityLabel="Show example sentence"
          >
            <Text style={styles.cardMeta}>
              {word.level ?? 'B1'} · {word.track}
            </Text>
            <Text style={[styles.testPrompt, promptType(currentQuestion.prompt)]}>
              {currentQuestion.prompt}
            </Text>
            <Text style={styles.history}>{currentQuestion.instruction}</Text>
            {!showExample && (
              <Text style={styles.testTapHint}>Tap the question to see it in context</Text>
            )}
          </Pressable>
          {showExample && (
            <View style={styles.exampleRow}>
              <Text style={[styles.testTapHint, styles.exampleText]}>“{word.example}”</Text>
              <SentenceSpeakButton onPress={() => speak(word.example)} />
            </View>
          )}
        </View>
        <Text style={styles.question}>{currentQuestion.questionLabel}</Text>
        {currentQuestion.options.map((answer, answerIndex) => {
          const isCorrect = answer.id === word.id;
          const showCorrect = revealed && isCorrect;
          const showWrong = selected === answer.id && !isCorrect;
          return (
            <Animated.View
              key={`${answer.id}-${answerIndex}`}
              style={[
                showWrong && {
                  transform: [
                    {
                      translateX: shake.interpolate({
                        inputRange: [-1, 1],
                        outputRange: [-11, 11],
                      }),
                    },
                  ],
                },
                showCorrect && {
                  transform: [
                    {
                      scale: reveal.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                style={[
                  styles.answer,
                  showWrong && styles.answerWrong,
                  showCorrect && styles.answerCorrect,
                ]}
                disabled={Boolean(selected)}
                onPress={() => select(answer)}
              >
                <Text style={styles.answerLabel}>
                  {String.fromCharCode(65 + answerIndex)}
                </Text>
                <Text style={styles.answerText}>{answer.label}</Text>
                {showCorrect && (
                  <Animated.View style={[styles.answerMark, {opacity: reveal}]}>
                    <Icon.Check size={20} color={colors.mint} />
                  </Animated.View>
                )}
                {showWrong && (
                  <View style={styles.answerMarkWrong}>
                    <Icon.Close size={18} color="#FF8B8B" />
                  </View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
        {revealed && answeredWrong && (
          <Animated.Text style={[styles.feedback, {opacity: reveal}]}>
            Correct answer: {correctLabel}
          </Animated.Text>
        )}
      </ScrollView>
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
            <Button title="Exit test" quiet onPress={leaveNow} />
            <Button title="Keep going" onPress={continueAfterCheckpoint} />
          </View>
        </View>
      )}
      <Modal
        visible={showGuide}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuide(false)}
      >
        <View style={styles.guideBackdrop}>
          <View style={styles.guideCard}>
            <Text style={styles.guideEyebrow}>A QUICK GUIDE</Text>
            <Text style={styles.guideTitle}>Three ways to recall.</Text>
            <Text style={styles.guideCopy}>
              Questions rotate between an English word, its Turkish meaning,
              and an English definition. Answers are shuffled every time.
            </Text>
            <Text style={styles.guideCopy}>
              Tap the question whenever you want to see the word used in a
              sentence.
            </Text>
            <Button title="Start test" onPress={() => setShowGuide(false)} />
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}
export function TestCompleteScreen({
  navigation,
  route,
}: NativeStackScreenProps<OnboardingStackParamList, 'TestComplete'>) {
  const {score, total, wrongIds, sessionIds} = route.params;
  const cheered = total > 0 && score / total >= 0.7;
  const [askNext, setAskNext] = useState(true);

  useEffect(() => {
    playSound(cheered ? 'success' : 'sad');
    return () => stopSound();
  }, [cheered]);

  const goHome = () => {
    stopSound();
    setAskNext(false);
    navigation.navigate('Home');
  };

  const retake = () => {
    stopSound();
    setAskNext(false);
    navigation.replace('Test', sessionIds.length ? {ids: sessionIds} : undefined);
  };

  const learnMissed = () => {
    stopSound();
    setAskNext(false);
    navigation.replace('Study', {ids: wrongIds});
  };

  return (
    <ScreenShell>
      <View style={[styles.complete, cheered ? styles.completeHappy : styles.completeSad]}>
        {cheered ? (
          <Icon.Award size={52} color={colors.mint} />
        ) : (
          <Icon.CloudRain size={52} color={colors.danger} />
        )}
        <Text style={[styles.display, !cheered && styles.displaySad]}>
          {cheered ? 'Harika!' : 'Üzülme.'}
        </Text>
        <Text style={styles.completeCopy}>
          {score} / {total} correct
          {wrongIds.length
            ? ` · ${wrongIds.length} to review`
            : ' · clean run'}
        </Text>
        <Text style={cheered ? styles.moodCopyHappy : styles.moodCopySad}>
          {cheered
            ? 'You crushed that set. Keep the momentum going.'
            : 'Mistakes are the map. Let’s learn the ones that slipped.'}
        </Text>
        <Button title="Back to Home" quiet onPress={goHome} />
      </View>
      <Modal visible={askNext} transparent animationType="fade" onRequestClose={goHome}>
        <View style={styles.guideBackdrop}>
          <View style={[styles.guideCard, !cheered && styles.guideCardSad]}>
            <Text style={[styles.guideEyebrow, !cheered && styles.guideEyebrowSad]}>
              {cheered ? 'WHAT NEXT' : 'LET’S FIX IT'}
            </Text>
            <Text style={styles.guideTitle}>
              {wrongIds.length ? 'Öğren veya tekrar dene' : 'Tekrar teste ne dersin?'}
            </Text>
            <Text style={styles.guideCopy}>
              {wrongIds.length
                ? 'Bilemediğin kelimeleri flashcard ile öğren, ya da aynı sete yeniden gir.'
                : 'Hepsi doğru. İstersen aynı kelimelerle bir tur daha at.'}
            </Text>
            {wrongIds.length > 0 && (
              <Button title="Öğren (bilinemeyenler)" onPress={learnMissed} />
            )}
            <Button
              title="Tekrar test"
              quiet={wrongIds.length > 0}
              onPress={retake}
            />
            <Button title="Ana sayfa" quiet onPress={goHome} />
          </View>
        </View>
      </Modal>
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
    AsyncStorage.getItem(savedWordsKey)
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
  const toggleSaved = (word: LibraryWord) => {
    const next = saved.includes(word.en)
      ? saved.filter(item => item !== word.en)
      : [word.en, ...saved];
    setSaved(next);
    AsyncStorage.setItem(savedWordsKey, JSON.stringify(next)).catch(
      () => undefined,
    );
    haptic('selection');
  };
  return (
    <ScreenShell>
      <View style={styles.searchPage}>
        <View style={styles.searchBar}>
          <Icon.Search size={18} color={colors.muted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              accessibilityLabel="Clear search"
            >
              <Icon.Close size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.searchHint}>
          Anything you add here lands in your My words tab.
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.searchList}
        >
          {list.map(word => {
            const isSaved = saved.includes(word.en);
            return (
              <Pressable
                key={word.id}
                style={styles.searchRow}
                onPress={() => toggleSaved(word)}
              >
                <View style={styles.searchCopy}>
                  <Text style={styles.cardTitle}>{word.en}</Text>
                  <Text style={styles.cardSub}>{word.tr}</Text>
                  {Boolean(word.definition) && (
                    <Text style={styles.searchDefinition} numberOfLines={2}>
                      {word.definition}
                    </Text>
                  )}
                </View>
                <View style={[styles.addPill, isSaved && styles.addPillSaved]}>
                  {isSaved ? <Icon.Check size={14} color={colors.mint} /> : null}
                  <Text style={[styles.addPillText, isSaved && styles.addPillTextSaved]}>
                    {isSaved ? 'Added' : 'Add'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {normalizedQuery.length > 0 && !list.length && <View style={styles.searchEmpty}><Text style={styles.emptyTitle}>No matching words.</Text><Text style={styles.emptyCopy}>Try English, Turkish, or a word type.</Text></View>}
        </ScrollView>
      </View>
    </ScreenShell>
  );
}
export {ProfileScreen} from './ProfileScreen';

export function AccountScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'Account'>) {
  const [name, setName] = useState('');
  return (
    <ScreenShell>
      <AppBar
        title="Account"
        left={<BackButton onPress={() => navigation.goBack()} />}
      />
      <View style={styles.page}>
        <Text style={styles.display}>Your name.</Text>
        <Text style={styles.completeCopy}>
          This is how Fluent will greet you every day. Sign-in sync comes later —
          for now your progress stays on this device.
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="First name"
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <Button title="Save" onPress={() => navigation.goBack()} />
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
      <AppBar
        title={lesson.title}
        left={<BackButton onPress={() => navigation.goBack()} />}
      />
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
  barCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 2,
  },
  autoPill: {
    minWidth: 54,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mint,
  },
  autoPillOff: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.20)',
  },
  autoPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.primaryText,
  },
  autoPillTextOff: {
    color: colors.muted,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  exampleText: {
    flex: 1,
  },
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
    color: colors.text,
    marginTop: spacing.xl,
  },
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
    marginTop: spacing.lg,
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
  },
  tapHint: {
    marginTop: spacing.xl,
    color: colors.mint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
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
  completeHappy: {
    backgroundColor: 'rgba(120,230,188,.08)',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  completeSad: {
    backgroundColor: 'rgba(255,109,90,.08)',
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
  },
  display: {
    fontFamily: 'Georgia',
    fontSize: 44,
    lineHeight: 48,
    color: colors.text,
  },
  displaySad: { color: '#FFB4A8' },
  completeCopy: { color: colors.muted, fontSize: 17, marginBottom: spacing.sm },
  moodCopyHappy: {
    color: colors.mint,
    fontSize: 16,
    lineHeight: 23,
    marginBottom: spacing.lg,
  },
  moodCopySad: {
    color: '#FFB4A8',
    fontSize: 16,
    lineHeight: 23,
    marginBottom: spacing.lg,
  },
  guideCardSad: {
    borderColor: 'rgba(255,109,90,.35)',
  },
  guideEyebrowSad: {
    color: colors.danger,
  },
  quizCard: { paddingTop: spacing.sm, minHeight: 190 },
  testPrompt: {
    alignSelf: 'flex-start',
    fontFamily: 'Georgia',
    color: colors.text,
    marginTop: spacing.lg,
  },
  testTapHint: {
    color: colors.mint,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.lg,
  },
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
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
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
  answerLabel: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  answerText: { color: colors.text, fontSize: 16, flex: 1 },
  answerMark: { marginLeft: 4 },
  answerMarkWrong: { marginLeft: 4 },
  feedback: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    color: colors.mint,
    fontSize: 14,
    fontWeight: '700',
  },
  guideBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,.64)',
    padding: spacing.lg,
  },
  guideCard: {
    backgroundColor: colors.backgroundRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  guideEyebrow: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  guideTitle: {
    color: colors.text,
    fontFamily: 'Georgia',
    fontSize: 34,
    lineHeight: 39,
  },
  guideCopy: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  search: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 0,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 17,
    backgroundColor: colors.surface,
  },
  searchPage: {flex: 1, gap: spacing.sm},
  searchBar: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  searchHint: {color: colors.muted, fontSize: 12, marginBottom: 2},
  searchList: {paddingBottom: tabBarSpace + spacing.md, gap: 8},
  searchCopy: {flex: 1, paddingRight: spacing.sm},
  searchDefinition: {color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5},
  searchRow: {
    minHeight: 76,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
  },
  addPill: {
    minWidth: 72,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.mint,
  },
  addPillSaved: {
    backgroundColor: 'rgba(200,255,251,.12)',
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryText,
  },
  addPillTextSaved: {
    color: colors.mint,
  },
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
  profileCard: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#171B21',
  },
  profileEmail: { color: colors.mint, marginTop: -spacing.sm },
  signOut: { alignSelf: 'center', marginTop: spacing.sm, color: colors.muted },
  wordExample: { color: colors.muted, fontStyle: 'italic', marginTop: 6 },
  listActions: { flexDirection: 'row', gap: spacing.sm },
});
