import React, {useEffect, useMemo} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider} from 'react-redux';

import {AppSplash} from './src/components/AppSplash';
import {SessionProvider} from './src/context/SessionContext';
import type {BootstrapState} from './src/logic/bootstrap';
import {
  OnboardingNavigator,
  type OnboardingStackParamList,
} from './src/navigation/OnboardingNavigator';
import {store} from './src/store';
import {useAppSelector} from './src/store/hooks';
import {createLogger} from './src/utils/logger';

const log = createLogger('App');

function resolveInitialRoute(
  bootstrap: BootstrapState,
  isPremium: boolean,
  inReview: boolean,
): keyof OnboardingStackParamList {
  if (!bootstrap.onboardingComplete) return 'Welcome';
  if (!isPremium && !inReview) return 'Paywall';
  return 'Home';
}

function RootApp({bootstrap}: {bootstrap: BootstrapState}) {
  const isPremium = useAppSelector(s => s.purchases.isPremium);
  const inReview = useAppSelector(s => s.purchases.inReview);

  const initialRouteName = useMemo(
    () => resolveInitialRoute(bootstrap, isPremium, inReview),
    [bootstrap, isPremium, inReview],
  );

  useEffect(() => {
    log.info('Initial route', {
      initialRouteName,
      onboardingComplete: bootstrap.onboardingComplete,
      isPremium,
      inReview,
    });
  }, [bootstrap.onboardingComplete, inReview, initialRouteName, isPremium]);

  return (
    <SessionProvider value={bootstrap}>
      <OnboardingNavigator
        initialRouteName={initialRouteName}
        paywallSource={initialRouteName === 'Paywall' ? 'gate' : undefined}
      />
    </SessionProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <AppSplash>{bootstrap => <RootApp bootstrap={bootstrap} />}</AppSplash>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
