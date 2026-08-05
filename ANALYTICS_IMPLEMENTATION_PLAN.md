# FlashVocab — Analytics Implementation Plan (80 event)

Bu dosya, Airtable "Fluent Events (Kod Denetimi)" tablosundaki 80 event'in **tam olarak nereye, hangi parametrelerle** ekleneceğini gösterir. Cursor'a bu dosyayı verip "bu planı uygula" diyebilirsin.

Bölüm 1-17: tıklama + Splash view/complete. Bölüm 18: her ekran için ayrı "sayfa görüntülendi" (`_view`) eventi (13 event) — Home dahil hiçbir ekranda bu yoktu.

**Paywall kuralı:** paywall ile ilgili tüm eventler tekildir, ayrı `profile_paywall_click` / `home_paywall_click` gibi ekrana özel event'ler YOK. Hangi ekrandan geldiği tek bir `location` parametresiyle (`onboarding | profile | splash`), hangi paywall varyantı gösterildiği tek bir `type` parametresiyle (`onboarding | common`) taşınıyor — bkz. Bölüm 6.

> **Bu dosya tek geçerli sürümdür.** Varsa elindeki önceki taslak/notlar bunun yerine bu dosyayı kullan — aşağıda o sürüme göre neyin eklendiği/kaldırıldığı/değiştiği listeleniyor.

## Bu sürümde eklenenler / kaldırılanlar

**Yeni eklenen (15 event):**
- Splash: `splash_view`, `splash_complete`
- Ekran view'leri: `home_view`, `onb_welcome_view`, `onb_notification_view`, `onb_helpus_view`, `search_view`, `mywords_view`, `profile_view`, `inbox_view`, `prefs_view`, `language_view`, `contact_view`, `legal_view`, `grammar_view`

**Kaldırılan (1 event):**
- `profile_paywall_click` — ayrı event olarak silindi, artık `paywall_view` içinde `location:'profile'` olarak taşınıyor (Bölüm 6, 10)

**Parametresi yeniden adlandırılan (isim aynı kaldı, sadece parametreler):**
- `paywall_view`, `paywall_close_click`, `paywall_purchase_click`, `paywall_purchase_success`, `paywall_purchase_fail`, `paywall_purchase_cancel`, `paywall_restore_click`, `paywall_restore_result` → `source`/`variant` parametreleri `location`/`type` oldu (Bölüm 6)

## Kurulum

Analytics fonksiyonu zaten var: `src/services/mixpanel.ts`

```ts
export async function logEvent(
  eventName: string,
  properties?: MixpanelProperties, // Record<string, string | number | boolean | null>
): Promise<void>
```

Şu an bu fonksiyon kod tabanında **yalnızca 1 yerde** çağrılıyor (`sendTestEvent()` — smoke test). Aşağıdaki 68 event hiçbiri gerçekte gönderilmiyor. Her dosyaya import eklemen gerekecek:

```ts
import {logEvent} from '<göreli-yol>/services/mixpanel';
```

Göreli yol dosyaya göre değişir (aşağıda her bölümde belirtildi). `logEvent` async ama `await` etmeye gerek yok — fire-and-forget olarak çağırabilirsin (kod tabanındaki `saveSurvey(...).catch(() => undefined)` deseniyle tutarlı olması için istersen `void logEvent(...)` de yazılabilir).

---

## 1. `src/screens/onboarding/WelcomeScreen.tsx`

Import: `import {logEvent} from '../../services/mixpanel';`

**onb_welcome_click** — parametre yok

```tsx
<Pressable style={styles.button} onPress={() => { logEvent('onb_welcome_click'); navigation.navigate('Survey'); }}>
  <Text style={styles.buttonText}>Get started</Text>
</Pressable>
```

---

## 2. `src/screens/onboarding/SurveyScreen.tsx`

Import: `import {logEvent} from '../../services/mixpanel';`

**onb_survey_view** — `step`, `step_index`, `step_count` — `const step = steps[index];` satırından hemen sonra yeni bir `useEffect` ekle:

```tsx
const step = steps[index];
useEffect(() => {
  logEvent('onb_survey_view', {step, step_index: index, step_count: steps.length});
}, [step]);
```

**onb_survey_selected** — `step`, `value` — her `Options`/`OccupationPicker` `onPress`/`onSelect` çağrısını sarmala:

```tsx
{step === 'level' && <Options options={levels} selected={answers.level} onPress={key => { logEvent('onb_survey_selected', {step: 'level', value: key}); set({level: key as Level}); }} />}
{step === 'goals' && <Options options={goals} selected={answers.goals} onPress={key => { logEvent('onb_survey_selected', {step: 'goals', value: key}); toggleGoal(key as Goal); }} />}
{step === 'occupation' && <OccupationPicker value={answers.occupationText} onSelect={(occupation, occupationText) => { logEvent('onb_survey_selected', {step: 'occupation', value: occupationText ?? occupation ?? ''}); set({occupation, occupationText}); }} onClear={() => set({occupation: null, occupationText: null})} />}
{step === 'daily' && <Options options={daily} selected={answers.daily} onPress={key => { logEvent('onb_survey_selected', {step: 'daily', value: key}); set({daily: key as DailyCommitment}); }} />}
{step === 'weekly' && <Options options={weekly} selected={answers.weekly} onPress={key => { logEvent('onb_survey_selected', {step: 'weekly', value: key}); set({weekly: key as WeeklyGoal}); }} />}
```

**onb_survey_click** (`step`, `step_index`, `is_last_step`) ve **onb_survey_complete** (`level`, `goals`, `occupation`, `occupationText`, `daily`, `weekly`) — `next()` fonksiyonunun başına ekle:

```tsx
const next = () => {
  const isLast = index === steps.length - 1;
  logEvent('onb_survey_click', {step, step_index: index, is_last_step: isLast});
  if (isLast) {
    logEvent('onb_survey_complete', {
      level: answers.level,
      goals: answers.goals.join(','),
      occupation: answers.occupation,
      occupationText: answers.occupationText,
      daily: answers.daily,
      weekly: answers.weekly,
    });
  }
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
```

> Not: `goals` bir dizi olduğu için `MixpanelProperties` tipine uysun diye `.join(',')` ile string'e çevrildi.

---

## 3. `src/screens/onboarding/NotificationPermissionScreen.tsx`

Import: `import {logEvent} from '../../services/mixpanel';`

**onb_notification_skip** — parametre yok — "Not Now" butonu:

```tsx
<Pressable style={styles.secondary} onPress={() => { logEvent('onb_notification_skip'); next(); }}>
  <Text style={styles.secondaryText}>Not Now</Text>
</Pressable>
```

**onb_notification_click** (`result: granted|blocked|unavailable`) — `requestPermission` içine:

```tsx
const requestPermission = async () => {
  setRequesting(true);
  try {
    const {status} = await requestNotifications(['alert', 'badge', 'sound']);
    logEvent('onb_notification_click', {
      result: status === RESULTS.GRANTED ? 'granted' : status === RESULTS.BLOCKED ? 'blocked' : 'unavailable',
    });
    if (status === RESULTS.BLOCKED) Alert.alert('Reminders are off', 'You can enable them later in Settings.');
  } catch {
    logEvent('onb_notification_click', {result: 'unavailable'});
    Alert.alert('Permission unavailable', 'You can enable reminders later in Settings.');
  } finally {
    setRequesting(false);
    log.info('Notification step complete');
    await next();
  }
};
```

**onb_review_prompt_view** — parametre yok — `next()` içinde review prompt kontrolünde:

```tsx
const next = async () => {
  if (inReview) { markOnboardingComplete().catch(() => undefined); goHomeFaded(navigation); return; }
  if (openingReview.current) return;
  openingReview.current = true;
  try {
    if (InAppReview.isAvailable()) {
      logEvent('onb_review_prompt_view');
      await InAppReview.RequestInAppReview();
    }
  } catch {
    // Apple may decline or suppress the prompt; onboarding must still continue.
  } finally {
    navigation.replace('HelpUsGrow');
  }
};
```

---

## 4. `src/screens/onboarding/HelpUsGrowScreen.tsx`

Import: `import {logEvent} from '../../services/mixpanel';`

**onb_helpus_click** — parametre yok:

```tsx
const continueToTrial = () => { logEvent('onb_helpus_click'); navigation.replace('TrialIntro', {destination: 'OnboardingPaywall'}); };
```

---

## 5. `src/screens/onboarding/TrialIntroScreen.tsx`

Import: `import {logEvent} from '../../services/mixpanel';`

**onb_trial_view** — `destination` — bileşenin en üstüne, diğer `useEffect`lerin yanına yeni bir `useEffect` ekle:

```tsx
useEffect(() => {
  logEvent('onb_trial_view', {
    destination: route.params?.destination === 'OnboardingPaywall' ? 'OnboardingPaywall' : 'Paywall',
  });
}, []);
```

---

## 6. `src/screens/onboarding/PaywallScreen.tsx` (10 event — en yoğun ekran)

Import: `import {logEvent} from '../../services/mixpanel';`

**Tekillik kuralı:** Paywall'a nereden gelindiği ve hangi varyantın gösterildiği her event'te aynı iki isimle taşınır: `location` (`onboarding | profile | splash`) ve `type` (`onboarding | common`). Ayrı `profile_paywall_click` gibi ekrana özel event YOK — Profile'daki banner tıklaması sadece navigasyonu tetikler, iz `paywall_view`'de `location:'profile'` olarak görünür. Tekrar tekrar hesaplamamak için bu iki değeri component'in başında bir kere türet:

```tsx
const location = fromProfile ? 'profile' : route.params?.source === 'gate' ? 'splash' : 'onboarding';
const type = isOnboardingPaywall ? 'onboarding' : 'common';
```

Bu satırları `fromProfile`/`isOnboardingPaywall` tanımlarının hemen altına ekle, sonra aşağıdaki her `logEvent` çağrısında `location`/`type` değişkenlerini kullan.

> Not: `location:'home'` şu an kodda bağlı değil — Home'dan Paywall'a giden hiçbir navigasyon yok. İleride Home'a bir paywall girişi eklenirse bu üçlü ternary'e üçüncü bir dal eklenir.

**paywall_view** (`type`, `location`) — mount effect'i, `dispatch(setSelectedPlan('weekly'))` effect'inin hemen altına:

```tsx
useEffect(() => {
  logEvent('paywall_view', {type, location});
}, []);
```

**paywall_close_click** (`location`, `in_review`) — `onClose`:

```tsx
const onClose = () => {
  log.info('Close pressed', {fromProfile, inReview});
  logEvent('paywall_close_click', {location, in_review: inReview});
  if (fromProfile) { navigation.goBack(); return; }
  finish();
};
```

**paywall_help_click** — parametre yok — info ikonu:

```tsx
<AppBarButton onPress={() => { logEvent('paywall_help_click'); setInfoVisible(true); }} accessibilityLabel="Subscription information"><InfoIcon /></AppBarButton>
```

**paywall_purchase_click / paywall_purchase_success / paywall_purchase_fail / paywall_purchase_cancel** — `onPurchase` fonksiyonu:

```tsx
const onPurchase = async () => {
  logEvent('paywall_purchase_click', {
    plan: activePlan,
    product_id: selected?.productId ?? null,
    package_identifier: selected?.packageIdentifier ?? null,
    location,
    already_premium: isPremium,
  });
  log.info('CTA pressed', {selectedPlan: activePlan, isPremium, productId: selected?.productId, packageIdentifier: selected?.packageIdentifier, planCount: plans.length});
  if (isPremium) { log.info('Already premium — finishing'); finish(); return; }
  if (!selected) {
    log.warn('No RC package for selected plan');
    Alert.alert('Products unavailable', 'Subscription options could not be loaded. You can continue and try again later.', [
      {text: 'Try again', style: 'cancel'},
      {text: 'Continue', onPress: finish},
    ]);
    return;
  }

  const result = await dispatch(purchaseSelectedPlan(selected.packageIdentifier));
  if (purchaseSelectedPlan.fulfilled.match(result)) {
    if (result.payload.isPremium) {
      log.success('Purchase unlocked Pro');
      logEvent('paywall_purchase_success', {plan: activePlan, product_id: selected.productId ?? null, location});
      finish();
      return;
    }
    log.warn('Purchase succeeded but entitlement inactive');
    Alert.alert('Almost there', 'Purchase completed but Pro access is not active yet.');
    return;
  }

  const payload = result.payload as {cancelled?: boolean; message?: string} | undefined;
  if (payload?.cancelled) {
    log.warn('User cancelled purchase sheet');
    logEvent('paywall_purchase_cancel', {plan: activePlan, location});
    return;
  }
  log.error('Purchase UI failed', payload);
  logEvent('paywall_purchase_fail', {error_message: payload?.message ?? 'unknown', plan: activePlan, location});
  Alert.alert('Purchase failed', payload?.message ?? 'Please try again.');
};
```

**paywall_restore_click / paywall_restore_result** — `onRestore`:

```tsx
const onRestore = async () => {
  logEvent('paywall_restore_click', {location});
  log.info('Restore pressed');
  const result = await dispatch(restorePurchases());
  if (restorePurchases.fulfilled.match(result)) {
    if (result.payload.isPremium) {
      log.success('Restore unlocked Pro');
      logEvent('paywall_restore_result', {result: 'success', location});
      Alert.alert('Restored', 'Your FlashVocab Pro access has been restored.', [{text: 'OK', onPress: finish}]);
      return;
    }
    log.warn('Restore found no active entitlement');
    logEvent('paywall_restore_result', {result: 'no_entitlement', location});
    Alert.alert('No purchases found', 'We could not find an active subscription for this Apple ID.');
    return;
  }
  log.error('Restore UI failed', result.payload);
  logEvent('paywall_restore_result', {result: 'error', location});
  Alert.alert('Restore failed', (result.payload as string) ?? 'Please try again.');
};
```

**paywall_plan_click** (`plan`, `price_string`) — plan seçim kartları:

```tsx
<Pressable style={[styles.planOption, activePlan === 'weekly' && styles.planOptionSelected]} onPress={() => { logEvent('paywall_plan_click', {plan: 'weekly', price_string: selected?.priceString ?? null}); dispatch(setSelectedPlan('weekly')); }}>
  ...
</Pressable>
<Pressable style={[styles.planOption, activePlan === 'yearly' && styles.planOptionSelected]} onPress={() => { logEvent('paywall_plan_click', {plan: 'yearly', price_string: yearly?.priceString ?? null}); dispatch(setSelectedPlan('yearly')); }}>
  ...
</Pressable>
```

**paywall_legal_click** (`doc: terms|privacy`) — info modal içindeki iki link:

```tsx
<Pressable style={styles.infoAction} onPress={() => { logEvent('paywall_legal_click', {doc: 'terms'}); setInfoVisible(false); navigation.navigate('Legal', {doc: 'terms'}); }}><Text style={styles.infoActionText}>Terms of Use</Text></Pressable>
<Pressable style={styles.infoAction} onPress={() => { logEvent('paywall_legal_click', {doc: 'privacy'}); setInfoVisible(false); navigation.navigate('Legal', {doc: 'privacy'}); }}><Text style={styles.infoActionText}>Privacy Policy</Text></Pressable>
```

---

## 7. `src/screens/home/HomeScreen.tsx`

Import: `import {logEvent} from '../../services/mixpanel';`

**home_bell_click** — parametre yok:

```tsx
<AppBarButton glass onPress={() => { logEvent('home_bell_click'); navigation.navigate('Inbox'); }} accessibilityLabel="Notifications">
```

**home_practice_click** — parametre yok:

```tsx
<Pressable style={styles.practiceButton} onPress={() => { logEvent('home_practice_click'); navigation.navigate('Study'); }}>
```

**home_lesson_click** (`lesson: vocab|gerund|prepositions`):

```tsx
<LessonCard title={occupation?.lessonLabel ?? 'Tech vocabulary'} progress={`${Math.min(stats.today, dailyTarget)} of ${dailyTarget} words`} fill={dailyTarget ? stats.today / dailyTarget : 0} onPress={() => { logEvent('home_lesson_click', {lesson: 'vocab'}); navigation.navigate('Study'); }} />
<LessonCard title="Gerund & infinitive" progress="Grammar lesson" fill={.4} onPress={() => { logEvent('home_lesson_click', {lesson: 'gerund'}); navigation.navigate('Grammar', {lesson: 'gerund'}); }} />
<LessonCard title="Prepositions" progress="Grammar lesson" fill={.25} onPress={() => { logEvent('home_lesson_click', {lesson: 'prepositions'}); navigation.navigate('Grammar', {lesson: 'prepositions'}); }} />
```

**home_collection_click** (`collection`):

```tsx
const openCollection = (collection: CollectionId) => { logEvent('home_collection_click', {collection}); navigation.navigate('Collection', {collection}); };
```

---

## 8. `src/navigation/AppTabs.tsx`

Import: `import {logEvent} from '../services/mixpanel';`

**tab_click** (`tab: home|search|words|profile`) — native bottom tab olduğu için `Pressable` yok, her `Tab.Screen`'e `listeners` prop'u ekle:

```tsx
<Tab.Screen
  name="HomeTab"
  options={{title: 'Home', tabBarIcon: sfIcon('house', 'house.fill')}}
  listeners={{tabPress: () => logEvent('tab_click', {tab: 'home'})}}>
  {props => <HomeScreen {...(props as any)} answers={answers} />}
</Tab.Screen>
<Tab.Screen
  name="SearchTab"
  component={SearchScreen as any}
  options={{title: 'Search', tabBarIcon: sfIcon('magnifyingglass', 'magnifyingglass')}}
  listeners={{tabPress: () => logEvent('tab_click', {tab: 'search'})}}
/>
<Tab.Screen
  name="WordsTab"
  component={MyWordListScreen as any}
  options={{title: 'My words', tabBarIcon: sfIcon('bookmark', 'bookmark.fill')}}
  listeners={{tabPress: () => logEvent('tab_click', {tab: 'words'})}}
/>
<Tab.Screen
  name="ProfileTab"
  component={ProfileScreen as any}
  options={{title: 'Profile', tabBarIcon: sfIcon('person', 'person.fill')}}
  listeners={{tabPress: () => logEvent('tab_click', {tab: 'profile'})}}
/>
```

---

## 9. `src/screens/app/AppScreens.tsx` (Study, StudyComplete, Test, TestComplete, Search — 18 event)

Import: `import {logEvent} from '../../services/mixpanel';`

### StudyScreen

**study_start** (`source: myWords|wordIds|daily`, `pool_size`) — `useEffect`'in içindeki `start` fonksiyonu:

```tsx
const start = (next: ReturnType<typeof toCard>[]) => {
  if (next.length) {
    setActiveWords(next);
    setQueue(next.map(item => item.en));
  }
  setReady(true);
  logEvent('study_start', {
    source: requestedIds?.length ? 'wordIds' : route.params?.pool === 'myWords' ? 'myWords' : 'daily',
    pool_size: next.length,
  });
};
```

**study_card_click** (`word_id`) — `flip()`:

```tsx
const flip = () => {
  haptic('impact');
  logEvent('study_card_click', {word_id: word.id});
  Animated.sequence([...]).start();
  setRevealed(value => !value);
};
```

**study_word_click** (`word_id`, `known`, `reviewed_count`) — `next(isKnown)` fonksiyonunun başı:

```tsx
const next = async (isKnown: boolean) => {
  await syncPractice(word.id, isKnown);
  logEvent('study_word_click', {word_id: word.id, known: isKnown, reviewed_count: reviewed});
  const nextQueue = applyAnswer(queue);
  ...
```

**study_complete** (`known`, `total`, `known_ids_count`, `unknown_ids_count`) — aynı `next()` fonksiyonunun sonundaki `if (!nextQueue.length)` bloğu:

```tsx
if (!nextQueue.length) {
  const knownIds = knownIdsRef.current;
  const unknownIds = unknownIdsRef.current;
  logEvent('study_complete', {
    known: isKnown ? known + 1 : known,
    total: reviewed + 1,
    known_ids_count: knownIds.length,
    unknown_ids_count: unknownIds.length,
  });
  navigation.replace('StudyComplete', {known: isKnown ? known + 1 : known, total: reviewed + 1, knownIds, unknownIds, sessionIds: [...knownIds, ...unknownIds]});
}
```

**study_favorite_click** (`word_id`, `favorite`) — `favorite()`:

```tsx
const favorite = async () => {
  const nextState = await syncToggleFavorite(word.id);
  const nextFavorite = nextState.progress[word.id].favorite;
  setIsFavorite(nextFavorite);
  logEvent('study_favorite_click', {word_id: word.id, favorite: nextFavorite});
  haptic('selection');
};
```

**study_exit_click** (`reviewed_count`, `remaining_count`) — `useConfirmLeave` hook'una üçüncü bir `onLeave` parametresi ekle (bu hook Test ekranında da kullanılıyor, ortak):

```tsx
function useConfirmLeave(
  navigation: NativeStackNavigationProp<OnboardingStackParamList>,
  message: string,
  onLeave?: () => void,
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
        {text: 'Çık', style: 'destructive', onPress: () => { onLeave?.(); allowLeave.current = true; navigation.dispatch(e.data.action); }},
      ]);
    });
    return sub;
  }, [message, navigation, onLeave]);
  const leaveNow = () => { onLeave?.(); allowLeave.current = true; navigation.goBack(); };
  return {leaveNow};
}
```

StudyScreen içinde çağrısı:

```tsx
useConfirmLeave(
  navigation,
  'Bu pratikten çıkmak istediğine emin misin? İlerlemen kaydedildi.',
  () => logEvent('study_exit_click', {reviewed_count: reviewed, remaining_count: queue.length}),
);
```

**speak_click** (`screen: study`, `type: word|sentence`) ve **autospeak_toggle_click** (`screen: study`, `state: on|off`) — StudyScreen'in `AppBar` `right` bloğu:

```tsx
right={
  <>
    <AppBarButton onPress={favorite} accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'} active={isFavorite}>
      <Icon.Star color={isFavorite ? '#FFD66B' : colors.mint} fill={isFavorite ? '#FFD66B' : 'none'} />
    </AppBarButton>
    <SpeakButton onPress={() => { logEvent('speak_click', {screen: 'study', type: 'word'}); speak(word.en); }} />
    <AutoSpeakToggle on={autoSpeak.on} onPress={() => { logEvent('autospeak_toggle_click', {screen: 'study', state: autoSpeak.on ? 'off' : 'on'}); autoSpeak.toggle(); }} />
  </>
}
```

Ve iki `ExampleLine` kullanımında (`revealed` true/false dallarının ikisinde de):

```tsx
<ExampleLine text={word.exampleTr ?? word.example} onSpeak={() => { logEvent('speak_click', {screen: 'study', type: 'sentence'}); speak(word.example); }} />
...
<ExampleLine text={word.example} onSpeak={() => { logEvent('speak_click', {screen: 'study', type: 'sentence'}); speak(word.example); }} />
```

### StudyCompleteScreen

**study_test_prompt_click** (`accepted`) — `goTest`/`goHome`:

```tsx
const goHome = () => {
  stopSound();
  setAskTest(false);
  logEvent('study_test_prompt_click', {accepted: false});
  navigation.navigate('Home');
};

const goTest = () => {
  stopSound();
  setAskTest(false);
  logEvent('study_test_prompt_click', {accepted: true});
  navigation.replace('Test', sessionIds.length ? {ids: sessionIds} : undefined);
};
```

### TestScreen

**test_start** (`source: wordIds|myWords|fullLibrary`, `pool_size`) — `pool` state'i dolduğunda tetiklenen yeni bir `useEffect`:

```tsx
useEffect(() => {
  if (!pool) return;
  logEvent('test_start', {
    source: requestedIds?.length ? 'wordIds' : requestedPool === 'myWords' ? 'myWords' : 'fullLibrary',
    pool_size: pool.length,
  });
}, [pool]);
```

> Not: Airtable'daki `test_start` Parametreler alanında `daily` seçeneği var ama TestScreen'de "daily" diye bir kaynak yok (sadece wordIds/myWords/fullLibrary). Airtable'ı da düzeltmek istersen haber ver.

**test_answer_click** (`word_id`, `kind`, `correct`, `score_so_far`) — `select(answer)`:

```tsx
const select = async (answer: TestOption) => {
  if (!currentQuestion || selected || checkpoint) return;
  const {word: current} = currentQuestion;
  const correct = answer.id === current.id;
  setSelected(answer.id);
  playSound(correct ? 'correct' : 'wrong');
  haptic(correct ? 'success' : 'impact');
  if (!correct) wrongIdsRef.current = [...wrongIdsRef.current, current.id];
  await syncPractice(current.id, correct);
  const nextScore = score + (correct ? 1 : 0);
  pendingScoreRef.current = nextScore;
  if (correct) setScore(nextScore);
  logEvent('test_answer_click', {word_id: current.id, kind: currentQuestion.kind, correct, score_so_far: nextScore});
  ...
```

**test_checkpoint_view** (`score_so_far`, `total_so_far`) — `advance()`:

```tsx
const advance = (nextScore: number) => {
  clearTimers();
  shake.setValue(0);
  reveal.setValue(0);
  setRevealed(false);
  setSelected(null);
  setPaused(false);
  setShowExample(false);
  const nextIndex = index + 1;
  if (nextIndex >= testWords.length) { finish(nextScore); return; }
  setIndex(nextIndex);
  if (nextIndex === checkpointAt && testWords.length > checkpointAt) {
    setCheckpoint(true);
    logEvent('test_checkpoint_view', {score_so_far: nextScore, total_so_far: nextIndex});
  }
};
```

**test_checkpoint_click** (`continued`) — checkpoint sheet butonları:

```tsx
<Button title="Exit test" quiet onPress={() => { logEvent('test_checkpoint_click', {continued: false}); leaveNow(); }} />
<Button title="Keep going" onPress={() => { logEvent('test_checkpoint_click', {continued: true}); continueAfterCheckpoint(); }} />
```

**test_complete** (`score`, `total`, `wrong_count`) — `finish`:

```tsx
const finish = (finalScore: number) => {
  logEvent('test_complete', {score: finalScore, total: testWords.length, wrong_count: wrongIdsRef.current.length});
  navigation.replace('TestComplete', {score: finalScore, total: testWords.length, wrongIds: wrongIdsRef.current, sessionIds: testWords.map(item => item.id)});
};
```

**test_guide_start_click** — parametre yok — rehber modal butonu:

```tsx
<Button title="Start test" onPress={() => { logEvent('test_guide_start_click'); setShowGuide(false); }} />
```

**test_example_toggle_click** — parametre yok — soru kartı `Pressable`:

```tsx
<Pressable
  onPress={() => { pauseAutoAdvance(); setShowExample(value => !value); logEvent('test_example_toggle_click'); }}
  accessibilityRole="button"
  accessibilityLabel="Show example sentence">
```

**test_resume_click** — parametre yok — "Devam" butonu:

```tsx
<Button title="Devam" onPress={() => { logEvent('test_resume_click'); advance(pendingScoreRef.current); }} />
```

**speak_click** / **autospeak_toggle_click** (`screen: test`) — TestScreen `AppBar` `right`:

```tsx
right={
  <>
    <SpeakButton onPress={() => { logEvent('speak_click', {screen: 'test', type: 'word'}); speak(word.en); }} />
    <AutoSpeakToggle on={autoSpeak.on} onPress={() => { logEvent('autospeak_toggle_click', {screen: 'test', state: autoSpeak.on ? 'off' : 'on'}); autoSpeak.toggle(); }} />
  </>
}
```

Ve `showExample` bloğundaki `SentenceSpeakButton`:

```tsx
<SentenceSpeakButton onPress={() => { logEvent('speak_click', {screen: 'test', type: 'sentence'}); speak(word.example); }} />
```

### TestCompleteScreen

**test_complete_click** (`action: learn_missed|retake|go_home`, `score`, `total`, `wrong_count`):

```tsx
const goHome = () => {
  stopSound();
  setAskNext(false);
  logEvent('test_complete_click', {action: 'go_home', score, total, wrong_count: wrongIds.length});
  navigation.navigate('Home');
};

const retake = () => {
  stopSound();
  setAskNext(false);
  logEvent('test_complete_click', {action: 'retake', score, total, wrong_count: wrongIds.length});
  navigation.replace('Test', sessionIds.length ? {ids: sessionIds} : undefined);
};

const learnMissed = () => {
  stopSound();
  setAskNext(false);
  logEvent('test_complete_click', {action: 'learn_missed', score, total, wrong_count: wrongIds.length});
  navigation.replace('Study', {ids: wrongIds});
};
```

### SearchScreen

**search_started** (`query_text`, `result_count`) — yazarken her tuşta değil, 400ms debounce ile — `list` hesaplandıktan sonra yeni bir `useEffect`:

```tsx
useEffect(() => {
  if (!query.trim()) return;
  const timer = setTimeout(() => {
    logEvent('search_started', {query_text: query.trim(), result_count: list.length});
  }, 400);
  return () => clearTimeout(timer);
}, [query]);
```

**search_save_click** (`word_id`, `saved`) — `toggleSaved`:

```tsx
const toggleSaved = async (word: LibraryWord) => {
  const willSave = !wordIsSaved(word);
  const next = willSave ? await addSavedWordToken(word) : await removeSavedWordToken(word);
  setSaved(next);
  logEvent('search_save_click', {word_id: word.id, saved: willSave});
  haptic('selection');
};
```

---

## 10. `src/screens/app/ProfileScreen.tsx` (7 event)

Import: `import {logEvent} from '../../services/mixpanel';`

> `paywallCard` (Pro banner) tıklaması için burada **ayrı bir event yok** — paywall tekillik kuralı gereği (bkz. Bölüm 6) bu geçiş `PaywallScreen`'deki `paywall_view` event'inde `location:'profile'` olarak zaten görünür. Kodda değişiklik gerekmiyor, `onPress={() => open('TrialIntro', {source: 'profile'})}` olduğu gibi kalır.

**profile_settings_click** (`item`) — beş `SettingsRow` (Restore Purchase hariç, o kendi event'ini kullanıyor):

```tsx
<SettingsRow icon="Users" label="Preferences" onPress={() => { logEvent('profile_settings_click', {item: 'preferences'}); open('Preferences'); }} />
<SettingsRow icon="Globe" label="Language" value={language} onPress={() => { logEvent('profile_settings_click', {item: 'language'}); open('Language'); }} />
<SettingsRow icon="Mail" label="Contact Us" onPress={() => { logEvent('profile_settings_click', {item: 'contact'}); open('Contact'); }} />
<SettingsRow icon="Shield" label="Privacy Policy" onPress={() => { logEvent('profile_settings_click', {item: 'privacy'}); open('Legal', {doc: 'privacy'}); }} />
<SettingsRow icon="RefreshCw" label="Restore Purchase" onPress={onRestorePurchases} />
<SettingsRow icon="FileText" label="Terms of Use" last onPress={() => { logEvent('profile_settings_click', {item: 'terms'}); open('Legal', {doc: 'terms'}); }} />
```

**profile_restore_click** — parametre yok — `onRestorePurchases` başı:

```tsx
const onRestorePurchases = async () => {
  logEvent('profile_restore_click');
  log.info('Restore pressed from profile');
  ...
```

**profile_photo_click** (`action: choose|remove`) — `pickPhoto` içindeki Alert seçenekleri:

```tsx
const pickPhoto = () => {
  Alert.alert('Profile photo', undefined, [
    {
      text: 'Choose from library',
      onPress: () => {
        logEvent('profile_photo_click', {action: 'choose'});
        launchImageLibrary({mediaType: 'photo', quality: 0.8, selectionLimit: 1}, async response => {
          if (response.didCancel || response.errorCode) return;
          const uri = response.assets?.[0]?.uri;
          if (!uri) return;
          await persist({...profile, photoUri: uri});
        });
      },
    },
    profile.photoUri
      ? {text: 'Remove photo', style: 'destructive', onPress: () => { logEvent('profile_photo_click', {action: 'remove'}); persist({...profile, photoUri: null}); }}
      : undefined,
    {text: 'Cancel', style: 'cancel'},
  ].filter(Boolean) as {text: string; style?: 'cancel' | 'destructive'; onPress?: () => void}[]);
};
```

**profile_name_click** — parametre yok — `saveName`:

```tsx
const saveName = async () => {
  Keyboard.dismiss();
  await persist({...profile, name: draftName});
  logEvent('profile_name_click');
  setEditingName(false);
};
```

**rate_us_click** — parametre yok — `rateUs`:

```tsx
const rateUs = () => {
  logEvent('rate_us_click');
  Alert.alert('Rate FlashVocab', 'Thanks for learning with us. Rating opens after App Store listing is live.');
};
```

**share_app_clicked** — parametre yok — `shareApp`:

```tsx
const shareApp = async () => {
  logEvent('share_app_clicked');
  try {
    await Share.share({message: 'I’m practising English with FlashVocab — short daily words that stick.'});
  } catch {
    // dismissed
  }
};
```

**profile_copyid_click** — parametre yok — `copyId`:

```tsx
const copyId = () => {
  if (!userId) return;
  Clipboard.setString(userId);
  logEvent('profile_copyid_click');
  haptic('success');
  setCopied(true);
  setTimeout(() => setCopied(false), 1600);
};
```

---

## 11. `src/screens/app/MyWordListScreen.tsx` (5 event)

Import: `import {logEvent} from '../../services/mixpanel';`

**mywords_add_click** (`source: header|empty`):

```tsx
<AppBarButton onPress={() => { logEvent('mywords_add_click', {source: 'header'}); navigation.navigate('SearchTab'); }} accessibilityLabel="Add words"><Icon.Plus /></AppBarButton>
...
{!hasWords && <Pressable style={styles.emptyAction} onPress={() => { logEvent('mywords_add_click', {source: 'empty'}); navigation.navigate('SearchTab'); }}><Text style={styles.emptyActionText}>Browse words</Text></Pressable>}
```

**mywords_sort_click** (`sort`) — sort menüsü:

```tsx
{(Object.keys(sortLabels) as Sort[]).map(item => <Pressable key={item} onPress={() => { logEvent('mywords_sort_click', {sort: item}); setSort(item); setShowSort(false); }} style={styles.sortOption}>...</Pressable>)}
```

> Not: Airtable Parametreler alanı bu event için boştu; `sort` param'ını ekledim, gerçek değeri olmadan event neredeyse anlamsız olurdu. Airtable'a da bu param'ı ekleyebilirim, söyle yeter.

**mywords_remove_click** (`word_id`) — `remove`:

```tsx
const remove = async (word: VocabularyWord) => {
  const next = await removeSavedWordToken(word);
  setTokens(next);
  setExpanded(null);
  logEvent('mywords_remove_click', {word_id: word.id});
  haptic('selection');
};
```

**mywords_action_click** (`action: test|flashcards`, `word_count`) — alt bar:

```tsx
<Pressable style={[styles.action, styles.actionQuiet]} onPress={() => { logEvent('mywords_action_click', {action: 'test', word_count: ids.length}); navigation.navigate('Test', {ids}); }}><Text style={styles.actionQuietText}>Take test</Text></Pressable>
<Pressable style={styles.action} onPress={() => { logEvent('mywords_action_click', {action: 'flashcards', word_count: ids.length}); navigation.navigate('Study', {ids}); }}><Text style={styles.actionText}>Flashcards</Text></Pressable>
```

**word_row_click** (`screen: mywords`, `word_id`, `action: listen|sentence|practice`) — genişletilmiş satır aksiyonları:

```tsx
<Pressable style={styles.rowActionBtn} onPress={() => { logEvent('word_row_click', {screen: 'mywords', word_id: word.id, action: 'listen'}); speak(word.en); }} accessibilityLabel="Read aloud"><Icon.Volume2 size={18} /><Text style={styles.rowAction}>Listen</Text></Pressable>
<Pressable style={styles.rowActionBtn} onPress={() => { logEvent('word_row_click', {screen: 'mywords', word_id: word.id, action: 'sentence'}); speak(word.example); }} accessibilityLabel="Read example sentence"><Icon.Type size={18} /><Text style={styles.rowAction}>Sentence</Text></Pressable>
<Pressable onPress={() => { logEvent('word_row_click', {screen: 'mywords', word_id: word.id, action: 'practice'}); navigation.navigate('Study', {ids: [word.id]}); }}><Text style={styles.rowAction}>Practise</Text></Pressable>
```

---

## 12. `src/screens/app/WordCollectionScreen.tsx` (3 event)

Import: `import {logEvent} from '../../services/mixpanel';`

**collection_view** (`collection`, `count`) — `load()` callback'inin sonunda:

```tsx
const load = useCallback(async () => {
  const [saved, state] = await Promise.all([loadSavedWordTokens(), loadLearningState()]);
  const nextWords = collectWords(collection, saved, state.progress);
  setWords(nextWords);
  logEvent('collection_view', {collection, count: nextWords.length});
}, [collection]);
```

**collection_action_click** (`collection`, `action: test|flashcards`, `word_count`):

```tsx
<Pressable style={[styles.action, styles.actionQuiet]} onPress={() => { logEvent('collection_action_click', {collection, action: 'test', word_count: ids.length}); navigation.navigate('Test', {ids}); }}><Text style={styles.actionQuietText}>Start test</Text></Pressable>
<Pressable style={styles.action} onPress={() => { logEvent('collection_action_click', {collection, action: 'flashcards', word_count: ids.length}); navigation.navigate('Study', {ids}); }}><Text style={styles.actionText}>Flashcards</Text></Pressable>
```

**word_row_click** (`screen: collection`, `word_id`, `action`):

```tsx
<Pressable style={styles.rowActionBtn} onPress={() => { logEvent('word_row_click', {screen: 'collection', word_id: word.id, action: 'listen'}); speak(word.en); }} accessibilityLabel="Read aloud"><Icon.Volume2 size={18} /><Text style={styles.rowAction}>Listen</Text></Pressable>
<Pressable style={styles.rowActionBtn} onPress={() => { logEvent('word_row_click', {screen: 'collection', word_id: word.id, action: 'sentence'}); speak(word.example); }} accessibilityLabel="Read example sentence"><Icon.Type size={18} /><Text style={styles.rowAction}>Sentence</Text></Pressable>
<Pressable onPress={() => { logEvent('word_row_click', {screen: 'collection', word_id: word.id, action: 'practice'}); navigation.navigate('Study', {ids: [word.id]}); }}><Text style={styles.rowAction}>Practise this word</Text></Pressable>
```

---

## 13. `src/screens/app/InboxScreen.tsx` (2 event)

Import: `import {logEvent} from '../../services/mixpanel';`

**inbox_mark_click** — parametre yok:

```tsx
const markAll = () => {
  setNotes(list => list.map(n => ({...n, unread: false})));
  logEvent('inbox_mark_click');
  haptic('selection');
};
```

**inbox_note_click** (`note_id`):

```tsx
const openNote = (id: string) => {
  setNotes(list => list.map(n => (n.id === id ? {...n, unread: false} : n)));
  logEvent('inbox_note_click', {note_id: id});
  haptic('selection');
};
```

---

## 14. `src/screens/app/settings/PreferencesScreen.tsx` (1 event)

Import: `import {logEvent} from '../../../services/mixpanel';`

**prefs_survey_update** (`field: level|daily|weekly`, `old_value`, `new_value`) — `patch`:

```tsx
const patch = async (next: SurveyAnswers) => {
  const field = answers.level !== next.level ? 'level' : answers.daily !== next.daily ? 'daily' : 'weekly';
  const oldValue = answers[field as 'level' | 'daily' | 'weekly'];
  const newValue = next[field as 'level' | 'daily' | 'weekly'];
  setAnswers(next);
  haptic('selection');
  logEvent('prefs_survey_update', {field, old_value: oldValue ?? null, new_value: newValue ?? null});
  await saveSurvey(next);
};
```

---

## 15. `src/screens/app/settings/LanguageScreen.tsx` (1 event)

Import: `import {logEvent} from '../../../services/mixpanel';`

**language_click** (`language: en|tr`):

```tsx
const select = async (next: AppLanguage) => {
  setLanguage(next);
  haptic('selection');
  logEvent('language_click', {language: next});
  await saveAppLanguage(next);
};
```

---

## 16. `src/screens/app/settings/ContactScreen.tsx` (1 event)

Import: `import {logEvent} from '../../../services/mixpanel';`

**contact_sent** (`outcome: sent|blocked_short|no_mail_app|error`, `message_length`):

```tsx
const send = async () => {
  const body = message.trim();
  if (body.length < 8) {
    logEvent('contact_sent', {outcome: 'blocked_short', message_length: body.length});
    Alert.alert('Almost there', 'Tell us a little more so we can help.');
    return;
  }
  setSending(true);
  try {
    const userId = await loadUserId();
    const url = `mailto:hello@fluent.app?subject=${encodeURIComponent('FlashVocab support')}&body=${encodeURIComponent(`${body}\n\n—\nUser ID: ${userId}`)}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      logEvent('contact_sent', {outcome: 'no_mail_app', message_length: body.length});
      Alert.alert('No mail app', 'Email us at hello@fluent.app');
      return;
    }
    await Linking.openURL(url);
    logEvent('contact_sent', {outcome: 'sent', message_length: body.length});
  } catch {
    logEvent('contact_sent', {outcome: 'error', message_length: body.length});
    Alert.alert('Couldn’t open mail', 'Email us at hello@fluent.app');
  } finally {
    setSending(false);
  }
};
```

---

## 17. `src/components/AppSplash.tsx` (2 event — Splash, hiç tıklama yok)

Splash'te buton/Pressable hiç yok, bu yüzden bu ikisi **view/complete** çifti (click değil).

Import satırını güncelle (dosya zaten `initMixpanel`, `sendTestEvent`'i aynı yerden import ediyor):

```tsx
import {initMixpanel, logEvent, sendTestEvent} from '../services/mixpanel';
```

**splash_view** — parametre yok — mount anında, `loader` animasyon efektinin yanına yeni bir `useEffect` ve süre ölçümü için bir ref ekle:

```tsx
export function AppSplash({children}: Props) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const loader = useRef(new Animated.Value(0)).current;
  const splashStartedAt = useRef(Date.now()).current;

  useEffect(() => {
    logEvent('splash_view');
  }, []);

  useEffect(() => {
    const anim = Animated.loop(...);
    ...
```

**splash_complete** (`content_source`, `onboarding_complete`, `is_new_user`, `fallback_used`, `duration_ms`) — iki yerde, çünkü iki farklı yoldan `setBootstrap` çağrılıyor:

Normal yol (`if (!cancelled) { ... setBootstrap(state); }`):

```tsx
if (!cancelled) {
  log.success('Splash complete — revealing app', {deviceId: state.deviceId, onboardingComplete: state.onboardingComplete});
  logEvent('splash_complete', {
    content_source: state.contentSource,
    onboarding_complete: state.onboardingComplete,
    is_new_user: state.isNewUser,
    fallback_used: false,
    duration_ms: Date.now() - splashStartedAt,
  });
  setBootstrap(state);
}
```

Fallback yolu (dış `.catch(async error => { ... })` bloğunun sonu):

```tsx
if (!cancelled) {
  logEvent('splash_complete', {
    content_source: 'local',
    onboarding_complete: onboardingComplete,
    is_new_user: false,
    fallback_used: true,
    duration_ms: Date.now() - splashStartedAt,
  });
  setBootstrap({
    deviceId,
    user: null,
    isNewUser: false,
    onboardingComplete,
    contentSource: 'local',
  });
}
```

---

## 18. Ekran view eventleri (13 event) — "her ekranın view'i eksik" bulgusu

Aşağıdaki 13 ekranın **hiçbirinde** "sayfa görüntülendi" eventi yoktu — Home dahil, ki en sık görülen ekran o. Not: Study/Test/StudyComplete/TestComplete/Paywall/TrialIntro/WordCollection/Splash için ayrı `_view` eklemedim çünkü zaten `study_start`/`test_start`/`study_complete`/`test_complete`/`paywall_view`/`onb_trial_view`/`collection_view`/`splash_view` ekran açılış anını tam olarak karşılıyor — ayrı bir view eklemek yinelenen veri üretirdi.

### `src/screens/home/HomeScreen.tsx` — **home_view** (parametre yok)

Mevcut `refresh` + focus-listener `useEffect`'ine ekle:

```tsx
useEffect(() => {
  refresh();
  logEvent('home_view');
  return navigation.addListener('focus', () => {
    refresh();
    logEvent('home_view');
  });
}, [navigation]);
```

### `src/screens/onboarding/WelcomeScreen.tsx` — **onb_welcome_view** (parametre yok)

`React` import'una `useEffect` ekle, bileşenin başına yeni effect:

```tsx
import React, {useEffect} from 'react';
...
export function WelcomeScreen({navigation}: Props) {
  const {width} = useWindowDimensions();
  useEffect(() => { logEvent('onb_welcome_view'); }, []);
  return ...
```

### `src/screens/onboarding/NotificationPermissionScreen.tsx` — **onb_notification_view** (parametre yok)

`React` import'una `useEffect` ekle:

```tsx
import React, {useEffect, useRef, useState} from 'react';
...
export function NotificationPermissionScreen({navigation}: Props) {
  const inReview = useAppSelector(s => s.purchases.inReview);
  const [requesting, setRequesting] = useState(false);
  const openingReview = useRef(false);
  useEffect(() => { logEvent('onb_notification_view'); }, []);
  ...
```

### `src/screens/onboarding/HelpUsGrowScreen.tsx` — **onb_helpus_view** (parametre yok)

```tsx
import React, {useEffect} from 'react';
...
export function HelpUsGrowScreen({navigation}: Props) {
  useEffect(() => { logEvent('onb_helpus_view'); }, []);
  const continueToTrial = () => { logEvent('onb_helpus_click'); navigation.replace('TrialIntro', {destination: 'OnboardingPaywall'}); };
  ...
```

### `src/screens/app/AppScreens.tsx` → SearchScreen — **search_view** (parametre yok)

Mevcut `useFocusEffect` bloğuna ekle:

```tsx
useFocusEffect(
  React.useCallback(() => {
    logEvent('search_view');
    const timer = setTimeout(() => inputRef.current?.focus(), 220);
    return () => {
      clearTimeout(timer);
      Keyboard.dismiss();
    };
  }, []),
);
```

### `src/screens/app/AppScreens.tsx` → GrammarScreen — **grammar_view** (`lesson: gerund|prepositions`)

Bu ekranda hiç event yoktu, yeni ekle:

```tsx
export function GrammarScreen({navigation, route}: NativeStackScreenProps<OnboardingStackParamList, 'Grammar'>) {
  const lesson = getGrammarLesson(route.params.lesson);
  useEffect(() => { logEvent('grammar_view', {lesson: route.params.lesson}); }, [route.params.lesson]);
  return (
    <ScreenShell>
      ...
```

(`useEffect` zaten dosyanın en üstünde `React`'tan import ediliyor.)

### `src/screens/app/MyWordListScreen.tsx` — **mywords_view** (`word_count`)

`load` callback'inin sonuna, gerçek sayı elde edildikten sonra ekle:

```tsx
const load = useCallback(async () => {
  const [nextTokens, state] = await Promise.all([loadSavedWordTokens(), loadLearningState()]);
  let migrated = state;
  let changed = false;
  findWordsByTokens(nextTokens).forEach((word, index) => {
    const key = state.progress[word.id] ? word.id : word.en;
    const current = state.progress[key] ?? {known: 0, unknown: 0, favorite: false};
    if (current.addedAt) return;
    migrated = {...migrated, progress: {...migrated.progress, [key]: {...current, addedAt: Date.now() - index}}};
    changed = true;
  });
  if (changed) await saveLearningState(migrated);
  setTokens(nextTokens);
  setLearning(migrated);
  logEvent('mywords_view', {word_count: nextTokens.length});
}, []);
```

### `src/screens/app/ProfileScreen.tsx` — **profile_view** (parametre yok)

`refresh` callback'inin başına ekle:

```tsx
const refresh = useCallback(() => {
  logEvent('profile_view');
  loadProfile().then(setProfile).catch(() => undefined);
  ...
```

### `src/screens/app/InboxScreen.tsx` — **inbox_view** (`unread_count`)

```tsx
import React, {useEffect, useMemo, useState} from 'react';
...
export function InboxScreen({navigation}: Props) {
  const [notes, setNotes] = useState(() => getInboxSeed());
  const unread = useMemo(() => notes.filter(n => n.unread).length, [notes]);

  useEffect(() => { logEvent('inbox_view', {unread_count: unread}); }, []);
  ...
```

### `src/screens/app/settings/PreferencesScreen.tsx` — **prefs_view** (parametre yok)

Mevcut yükleme `useEffect`'ine ekle:

```tsx
useEffect(() => {
  logEvent('prefs_view');
  loadSurvey().then(setAnswers).catch(() => undefined);
}, []);
```

### `src/screens/app/settings/LanguageScreen.tsx` — **language_view** (parametre yok)

```tsx
useEffect(() => {
  logEvent('language_view');
  loadAppLanguage().then(setLanguage).catch(() => undefined);
}, []);
```

### `src/screens/app/settings/ContactScreen.tsx` — **contact_view** (parametre yok)

```tsx
import React, {useEffect, useState} from 'react';
...
export function ContactScreen({navigation}: Props) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { logEvent('contact_view'); }, []);
  ...
```

### `src/screens/app/settings/LegalScreen.tsx` — **legal_view** (`doc: privacy|terms`)

Bu dosyaya hiç dokunulmamıştı, import ekle:

```tsx
import React, {useEffect} from 'react';
...
import {logEvent} from '../../../services/mixpanel';

export function LegalScreen({navigation, route}: Props) {
  const legal = getLegalContent();
  const doc = legal[route.params.doc];
  const updated = legal.updatedAt ? `Last updated · ${legal.updatedAt}` : 'Last updated · August 2026';

  useEffect(() => { logEvent('legal_view', {doc: route.params.doc}); }, [route.params.doc]);

  return (
    <SettingsScreen title={doc.title} onBack={() => navigation.goBack()}>
      ...
```

---

## Kapsam dışı not (81'e dahil değil, bilgi amaçlı)

Bu planı yazarken fark ettim: `TestScreen` de `useConfirmLeave` kullanıyor (checkpoint'ten önce geri çıkma onayı) ama Airtable'da buna karşılık gelen bir `test_exit_click` event'i yok — sadece Study tarafında var. İstersen bunu da 82. event olarak ekleyebilirim; şimdilik plana dahil etmedim çünkü sen "66 event" (şimdi 81) dedin.

## Airtable'da küçük düzeltme önerileri (opsiyonel)

- `test_start` → Parametreler alanındaki `daily` seçeneğini kaldır (Test ekranında böyle bir kaynak yok).
- `mywords_sort_click` → Parametreler alanına `sort:{newest,oldest,az,za}` eklensin (şu an boştu, yukarıda param'lı yazdım).

Bunları istersen Airtable'da da güncelleyeyim.
