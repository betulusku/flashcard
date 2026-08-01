import React from 'react';
import {createNativeBottomTabNavigator} from '@react-navigation/bottom-tabs/unstable';

import type {SurveyAnswers} from '../types/onboarding';
import {HomeScreen} from '../screens/home/HomeScreen';
import {SearchScreen} from '../screens/app/AppScreens';
import {MyWordListScreen} from '../screens/app/MyWordListScreen';
import {ProfileScreen} from '../screens/app/ProfileScreen';
import {colors} from '../theme';

export type AppTabParamList = {
  HomeTab: undefined;
  SearchTab: undefined;
  WordsTab: undefined;
  ProfileTab: undefined;
};

const Tab = createNativeBottomTabNavigator<AppTabParamList>();

const sfIcon = (outline: string, filled: string) => ({focused}: {focused: boolean}) => ({
  type: 'sfSymbol' as const,
  name: (focused ? filled : outline) as any,
});

/**
 * iOS owns this control: on iOS 26 it becomes the system Liquid Glass tab bar
 * instead of an imitation rendered in JavaScript.
 */
export function AppTabs({answers}: {answers: SurveyAnswers}) {
  return <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarControllerMode: 'tabBar',
      tabBarMinimizeBehavior: 'none',
      tabBarActiveTintColor: colors.mint,
      tabBarInactiveTintColor: 'rgba(210, 228, 255, 0.78)',
      // Don’t set backgroundColor — on iOS 26 it fights Liquid Glass and flashes.
    }}>
    <Tab.Screen
      name="HomeTab"
      options={{title: 'Home', tabBarIcon: sfIcon('house', 'house.fill')}}>
      {props => <HomeScreen {...(props as any)} answers={answers} />}
    </Tab.Screen>
    <Tab.Screen
      name="SearchTab"
      component={SearchScreen as any}
      options={{title: 'Search', tabBarIcon: sfIcon('magnifyingglass', 'magnifyingglass')}}
    />
    <Tab.Screen
      name="WordsTab"
      component={MyWordListScreen as any}
      options={{title: 'My words', tabBarIcon: sfIcon('bookmark', 'bookmark.fill')}}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen as any}
      options={{title: 'Profile', tabBarIcon: sfIcon('person', 'person.fill')}}
    />
  </Tab.Navigator>;
}
