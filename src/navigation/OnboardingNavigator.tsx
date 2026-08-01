import React, {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DarkTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
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

type PracticeParams = {pool?: 'myWords'; ids?: string[]} | undefined;
export type OnboardingStackParamList = {
  Welcome: undefined;
  Survey: undefined;
  Notifications: undefined;
  Paywall: undefined;
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
const emptyAnswers: SurveyAnswers = {level: null, goals: [], occupation: null, occupationText: null, daily: null, weekly: null};

export function OnboardingNavigator() {
  const [answers, setAnswers] = useState<SurveyAnswers>(emptyAnswers);
  useEffect(() => { AsyncStorage.getItem('fluent:survey').then(value => { if (value) setAnswers(JSON.parse(value) as SurveyAnswers); }).catch(() => undefined); }, []);
  useEffect(() => { AsyncStorage.setItem('fluent:survey', JSON.stringify(answers)).catch(() => undefined); }, [answers]);
  return (
    <NavigationContainer theme={fluentTheme}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Survey">{props => <SurveyScreen {...props} answers={answers} onChange={setAnswers} />}</Stack.Screen>
        <Stack.Screen name="Notifications" component={NotificationPermissionScreen} />
        <Stack.Screen name="Paywall">{props => <PaywallScreen {...props} answers={answers} />}</Stack.Screen>
        <Stack.Screen
          name="Home"
          options={{gestureEnabled: false, fullScreenGestureEnabled: false}}
          listeners={({navigation}) => ({
            beforeRemove: e => {
              // Home is the app root — never pop back into onboarding.
              if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
                e.preventDefault();
              }
            },
            focus: () => {
              const state = navigation.getState();
              if (state.index > 0 && state.routes[state.index]?.name === 'Home') {
                navigation.reset({index: 0, routes: [{name: 'Home'}]});
              }
            },
          })}
        >
          {() => <AppTabs answers={answers} />}
        </Stack.Screen>
        <Stack.Screen
          name="Study"
          component={StudyScreen}
          options={{gestureEnabled: false, fullScreenGestureEnabled: false}}
        />
        <Stack.Screen name="StudyComplete" component={StudyCompleteScreen} />
        <Stack.Screen
          name="Test"
          component={TestScreen}
          options={{gestureEnabled: false, fullScreenGestureEnabled: false}}
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
