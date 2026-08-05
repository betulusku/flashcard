/** Shared stack transition timing — keep in sync with navigator screenOptions. */
export const STACK_FADE_MS = 360;

type HomeNav = {
  reset: (state: {index: number; routes: Array<{name: 'Home'}>}) => void;
};

/**
 * Jump to Home as the sole root route.
 * Avoid navigate→delayed-reset: recreating Home mid-stack briefly flashes the
 * paywall/onboarding screen underneath.
 */
export function goHomeFaded(navigation: HomeNav) {
  navigation.reset({index: 0, routes: [{name: 'Home'}]});
}
