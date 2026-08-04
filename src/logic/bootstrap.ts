import {Platform} from 'react-native';

import {
  getContentSource,
  hydrateContent,
  type ContentSource,
} from '../data/contentStore';
import {
  checkUser,
  getAppContent,
  getLearningState,
  type FluentUser,
} from '../services/api';
import {hydrateLearningState} from './learningStorage';
import {hydrateOnboardingComplete} from './onboarding';
import {hydrateProfile} from './profile';
import {hydrateSavedWords} from './savedWords';
import {hydrateSurvey, surveyFromUser} from './survey';
import {createLogger} from '../utils/logger';
import {loadUserId} from './userId';

const log = createLogger('Bootstrap');

export type BootstrapState = {
  deviceId: string;
  user: FluentUser | null;
  isNewUser: boolean;
  onboardingComplete: boolean;
  contentSource: ContentSource;
};

function deviceDetails() {
  return {
    platform: Platform.OS,
    version: String(Platform.Version),
  };
}

/**
 * Splash bootstrap: auth, remote content, and user learning/profile/survey hydrate.
 */
export async function bootstrapApp(): Promise<BootstrapState> {
  log.info('Bootstrap start');
  const deviceId = await loadUserId();
  log.info('deviceId ready', {deviceId});

  const details = deviceDetails();
  const userResult = await checkUser(deviceId, details).catch(error => {
    log.warn('checkUser failed', {
      deviceId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  const user =
    userResult?.success && userResult.data ? userResult.data : null;

  if (user) {
    log.success('checkUser ok', {
      deviceId,
      isNew: user.isNew,
      isPremium: user.isPremium,
      onboardingComplete: user.onboardingComplete,
      authUid: user.authUid,
      authProvider: user.authProvider,
    });
  } else {
    log.warn('checkUser returned no user', {
      deviceId,
      success: userResult?.success,
      message: userResult?.message,
    });
  }

  const [contentResult, learningResult, onboardingComplete] = await Promise.all([
    getAppContent(true).catch(error => {
      log.warn('getAppContent failed', {
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }),
    user
      ? getLearningState(deviceId).catch(error => {
          log.warn('getLearningState failed', {
            message: error instanceof Error ? error.message : String(error),
          });
          return null;
        })
      : Promise.resolve(null),
    hydrateOnboardingComplete(user?.onboardingComplete),
  ]);

  if (contentResult?.success && contentResult.data) {
    hydrateContent({
      vocabulary: contentResult.data.vocabulary,
      grammarLessons: contentResult.data.grammarLessons,
      occupations: contentResult.data.occupations,
      legal: contentResult.data.legal,
      inboxSeed: contentResult.data.inboxSeed,
      meta: contentResult.data.meta,
    });
    log.info('Content hydrated from remote');
  } else {
    log.warn('Using local content fallback');
  }

  if (learningResult?.success && learningResult.data) {
    await Promise.all([
      hydrateLearningState(learningResult.data),
      hydrateSavedWords(learningResult.data.savedWordIds ?? []),
    ]);
    log.info('Learning state hydrated');
  }

  if (user) {
    await Promise.all([
      hydrateProfile({
        name: user.name,
        profilePicture: user.profilePicture,
      }),
      hydrateSurvey(surveyFromUser(user)),
    ]);
    log.info('Profile + survey hydrated');
  }

  const state: BootstrapState = {
    deviceId,
    user,
    isNewUser: Boolean(user?.isNew),
    onboardingComplete,
    contentSource: getContentSource(),
  };
  log.success('Bootstrap done', {
    deviceId: state.deviceId,
    isNewUser: state.isNewUser,
    onboardingComplete: state.onboardingComplete,
    contentSource: state.contentSource,
    isPremium: state.user?.isPremium ?? false,
  });
  return state;
}
