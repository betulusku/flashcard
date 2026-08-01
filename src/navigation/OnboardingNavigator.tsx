import React, {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {NotificationPermissionScreen} from '../screens/onboarding/NotificationPermissionScreen';
import {PaywallScreen} from '../screens/onboarding/PaywallScreen';
import {SurveyScreen} from '../screens/onboarding/SurveyScreen';
import {WelcomeScreen} from '../screens/onboarding/WelcomeScreen';
import {HomeScreen} from '../screens/home/HomeScreen';
import {AppTabs} from './AppTabs';
import {AccountScreen, GrammarScreen, MyCardsScreen, ProfileScreen, SearchScreen, StudyCompleteScreen, StudyScreen, TestCompleteScreen, TestScreen} from '../screens/app/AppScreens';
import {SurveyAnswers} from '../types/onboarding';

export type OnboardingStackParamList = {Welcome: undefined; Survey: undefined; Notifications: undefined; Paywall: undefined; Home: undefined; Study: {pool?: 'myWords'} | undefined; StudyComplete: {known: number; total: number}; Test: {pool?: 'myWords'} | undefined; TestComplete: {score: number; total: number}; Search: undefined; MyCards: undefined; Profile: undefined; Account: undefined; Grammar: {lesson: 'gerund' | 'prepositions'}};
const Stack = createNativeStackNavigator<OnboardingStackParamList>();
const emptyAnswers: SurveyAnswers = {level: null, goals: [], occupation: null, occupationText: null, daily: null, weekly: null};

export function OnboardingNavigator() {
  const [answers, setAnswers] = useState<SurveyAnswers>(emptyAnswers);
  useEffect(() => { AsyncStorage.getItem('fluent:survey').then(value => { if (value) setAnswers(JSON.parse(value) as SurveyAnswers); }).catch(() => undefined); }, []);
  useEffect(() => { AsyncStorage.setItem('fluent:survey', JSON.stringify(answers)).catch(() => undefined); }, [answers]);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Survey">{props => <SurveyScreen {...props} answers={answers} onChange={setAnswers} />}</Stack.Screen>
        <Stack.Screen name="Notifications" component={NotificationPermissionScreen} />
        <Stack.Screen name="Paywall">{props => <PaywallScreen {...props} answers={answers} />}</Stack.Screen>
        <Stack.Screen name="Home">{() => <AppTabs answers={answers} />}</Stack.Screen>
        <Stack.Screen name="Study" component={StudyScreen} />
        <Stack.Screen name="StudyComplete" component={StudyCompleteScreen} />
        <Stack.Screen name="Test" component={TestScreen} />
        <Stack.Screen name="TestComplete" component={TestCompleteScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="MyCards" component={MyCardsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="Grammar" component={GrammarScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
