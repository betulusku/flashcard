import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AppSplash} from './src/components/AppSplash';
import {OnboardingNavigator} from './src/navigation/OnboardingNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppSplash>
        <OnboardingNavigator />
      </AppSplash>
    </SafeAreaProvider>
  );
}

export default App;
