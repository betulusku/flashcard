import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {OnboardingNavigator} from './src/navigation/OnboardingNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <OnboardingNavigator />
    </SafeAreaProvider>
  );
}

export default App;
