import React, {useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {NotificationPermissionScreen} from '../screens/onboarding/NotificationPermissionScreen';
import {PaywallScreen} from '../screens/onboarding/PaywallScreen';
import {SurveyScreen} from '../screens/onboarding/SurveyScreen';
import {WelcomeScreen} from '../screens/onboarding/WelcomeScreen';
import {SurveyAnswers} from '../types/onboarding';

export type OnboardingStackParamList = {Welcome: undefined; Survey: undefined; Notifications: undefined; Paywall: undefined};
const Stack = createNativeStackNavigator<OnboardingStackParamList>();
const emptyAnswers: SurveyAnswers = {level: null, goals: [], occupation: null, occupationText: null, daily: null, weekly: null};

export function OnboardingNavigator() {
  const [answers, setAnswers] = useState<SurveyAnswers>(emptyAnswers);
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Survey">{props => <SurveyScreen {...props} answers={answers} onChange={setAnswers} />}</Stack.Screen>
        <Stack.Screen name="Notifications" component={NotificationPermissionScreen} />
        <Stack.Screen name="Paywall">{props => <PaywallScreen {...props} answers={answers} />}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
