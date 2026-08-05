import React, {useEffect, useState} from 'react';
import {DarkTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {emptySurvey, loadSurvey, saveSurvey} from '../logic/survey';
import {colors} from '../theme';

/** Force dark so iOS 26 Liquid Glass doesn’t flash light on tab switches. */
const fluentTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.mint,
    background: colors.background,
    card: colors.backgroundRaised,
    text: colors.text,
    border: colors.border,
    notification: colors.mint,
  },
};

import {NotificationPermissionScreen} from '../screens/onboarding/NotificationPermissionScreen';
import {PaywallScreen} from '../screens/onboarding/PaywallScreen';
import {HelpUsGrowScreen} from '../screens/onboarding/HelpUsGrowScreen';
import {TrialIntroScreen} from '../screens/onboarding/TrialIntroScreen';
import {SurveyScreen} from '../screens/onboarding/SurveyScreen';
import {WelcomeScreen} from '../screens/onboarding/WelcomeScreen';
import {AppTabs} from './AppTabs';
import {AccountScreen, GrammarScreen, SearchScreen, StudyCompleteScreen, StudyScreen, TestCompleteScreen, TestScreen} from '../screens/app/AppScreens';
import {ProfileScreen} from '../screens/app/ProfileScreen';
import {PreferencesScreen} from '../screens/app/settings/PreferencesScreen';
import {LanguageScreen} from '../screens/app/settings/LanguageScreen';
import {ContactScreen} from '../screens/app/settings/ContactScreen';
import {LegalScreen} from '../screens/app/settings/LegalScreen';
import {InboxScreen} from '../screens/app/InboxScreen';
import {WordCollectionScreen} from '../screens/app/WordCollectionScreen';
import type {CollectionId} from '../logic/wordCollections';
import {SurveyAnswers} from '../types/onboarding';
import {STACK_FADE_MS} from './navTransitions';

type PracticeParams = {pool?: 'myWords'; ids?: string[]} | undefined;

const ONBOARDING_ROUTES = new Set<keyof OnboardingStackParamList>([
  'Welcome',
  'Survey',
  'Notifications',
  'HelpUsGrow',
  'TrialIntro',
  'OnboardingPaywall',
  'Paywall',
]);
export type OnboardingStackParamList = {
  Welcome: undefined;
  Survey: undefined;
  Notifications: undefined;
  HelpUsGrow: undefined;
  TrialIntro: {
    source?: 'profile' | 'gate';
    destination?: 'Paywall' | 'OnboardingPaywall';
  } | undefined;
  OnboardingPaywall: undefined;
  Paywall: {source?: 'profile' | 'gate'} | undefined;
  Home: undefined;
  Study: PracticeParams;
  StudyComplete: {
    known: number;
    total: number;
    knownIds: string[];
    unknownIds: string[];
    sessionIds: string[];
  };
  Test: PracticeParams;
  TestComplete: {
    score: number;
    total: number;
    wrongIds: string[];
    sessionIds: string[];
  };
  Search: undefined;
  Collection: {collection: CollectionId};
  Profile: undefined;
  Account: undefined;
  Preferences: undefined;
  Language: undefined;
  Contact: undefined;
  Legal: {doc: 'privacy' | 'terms'};
  Inbox: undefined;
  Grammar: {lesson: 'gerund' | 'prepositions'};
};
const Stack = createNativeStackNavigator<OnboardingStackParamList>();

type Props = {
  initialRouteName?: keyof OnboardingStackParamList;
  /** Used when cold-start opens Paywall for non-premium returning users. */
  paywallSource?: 'profile' | 'gate';
};

export function OnboardingNavigator({
  initialRouteName = 'Welcome',
  paywallSource,
}: Props) {
  const [answers, setAnswers] = useState<SurveyAnswers>(emptySurvey);
  const [surveyReady, setSurveyReady] = useState(false);

  useEffect(() => {
    loadSurvey()
      .then(value => {
        setAnswers(value);
        setSurveyReady(true);
      })
      .catch(() => setSurveyReady(true));
  }, []);

  useEffect(() => {
    if (!surveyReady) return;
    saveSurvey(answers).catch(() => undefined);
  }, [answers, surveyReady]);
  return (
    <NavigationContainer theme={fluentTheme}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: STACK_FADE_MS,
          animationTypeForReplace: 'push',
          contentStyle: {backgroundColor: colors.background},
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Survey">{props => <SurveyScreen {...props} answers={answers} onChange={setAnswers} />}</Stack.Screen>
        <Stack.Screen name="Notifications" component={NotificationPermissionScreen} />
        <Stack.Screen name="HelpUsGrow" component={HelpUsGrowScreen} />
        <Stack.Screen
          name="TrialIntro"
          component={TrialIntroScreen}
          options={{animation: 'none'}}
          initialParams={paywallSource ? {source: paywallSource} : undefined}
        />
        <Stack.Screen name="OnboardingPaywall" options={{animation: 'none'}}>
          {props => <PaywallScreen {...(props as any)} answers={answers} />}
        </Stack.Screen>
        <Stack.Screen
          name="Paywall"
          options={{animation: 'none'}}
          initialParams={paywallSource ? {source: paywallSource} : undefined}
        >
          {props => <PaywallScreen {...props} answers={answers} />}
        </Stack.Screen>
        <Stack.Screen
          name="Home"
          options={{
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
            animation: 'fade',
            animationDuration: STACK_FADE_MS,
          }}
          listeners={({navigation}) => ({
            beforeRemove: e => {
              // Home is the app root — never pop back into onboarding.
              if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
                e.preventDefault();
              }
            },
            // Safety net for navigate('Home') that left onboarding under the stack.
            transitionEnd: e => {
              if (e.data.closing) return;
              const state = navigation.getState();
              if (state.routes[state.index]?.name !== 'Home') return;
              const hasOnboardingUnder = state.routes.some(route =>
                ONBOARDING_ROUTES.has(route.name as keyof OnboardingStackParamList),
              );
              if (!hasOnboardingUnder && state.index === 0) return;
              navigation.reset({index: 0, routes: [{name: 'Home'}]});
            },
          })}
        >
          {() => <AppTabs answers={answers} />}
        </Stack.Screen>
        <Stack.Screen
          name="Study"
          component={StudyScreen}
          options={{
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
            animation: 'fade',
            animationDuration: STACK_FADE_MS,
          }}
        />
        <Stack.Screen name="StudyComplete" component={StudyCompleteScreen} />
        <Stack.Screen
          name="Test"
          component={TestScreen}
          options={{
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
            animation: 'fade',
            animationDuration: STACK_FADE_MS,
          }}
        />
        <Stack.Screen name="TestComplete" component={TestCompleteScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Collection" component={WordCollectionScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen as any} />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Contact" component={ContactScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="Inbox" component={InboxScreen} />
        <Stack.Screen name="Grammar" component={GrammarScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
