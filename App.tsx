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
import {prefetchReviewEnabled} from './src/services/remoteConfig';
import {store} from './src/store';
import {useAppDispatch, useAppSelector} from './src/store/hooks';
import {setInReview} from './src/store/purchasesSlice';
import {createLogger} from './src/utils/logger';

const log = createLogger('App');

// Start Remote Config as early as the JS bundle loads.
prefetchReviewEnabled();

function resolveInitialRoute(
  bootstrap: BootstrapState,
  isPremium: boolean,
): keyof OnboardingStackParamList {
  // Prefer bootstrap.inReview (set atomically on splash reveal) over Redux timing.
  if (!bootstrap.onboardingComplete) return 'Welcome';
  if (!isPremium && !bootstrap.inReview) return 'TrialIntro';
  return 'Home';
}

function RootApp({bootstrap}: {bootstrap: BootstrapState}) {
  const dispatch = useAppDispatch();
  const isPremium = useAppSelector(s => s.purchases.isPremium);
  const reduxInReview = useAppSelector(s => s.purchases.inReview);

  // Keep Redux aligned with the bootstrap snapshot used for routing.
  useEffect(() => {
    if (reduxInReview !== bootstrap.inReview) {
      dispatch(setInReview(bootstrap.inReview));
    }
  }, [bootstrap.inReview, dispatch, reduxInReview]);

  const initialRouteName = useMemo(
    () => resolveInitialRoute(bootstrap, isPremium),
    [bootstrap, isPremium],
  );

  useEffect(() => {
    log.info('Initial route', {
      initialRouteName,
      onboardingComplete: bootstrap.onboardingComplete,
      isPremium,
      bootstrapInReview: bootstrap.inReview,
      reduxInReview,
    });
  }, [
    bootstrap.inReview,
    bootstrap.onboardingComplete,
    initialRouteName,
    isPremium,
    reduxInReview,
  ]);

  return (
    <SessionProvider value={bootstrap}>
      <OnboardingNavigator
        initialRouteName={initialRouteName}
        paywallSource={initialRouteName === 'TrialIntro' ? 'gate' : undefined}
      />
    </SessionProvider>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <AppSplash>{bootstrap => <RootApp bootstrap={bootstrap} />}</AppSplash>
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;
