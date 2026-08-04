/** Shared stack transition timing — keep in sync with navigator screenOptions. */
export const STACK_FADE_MS = 360;

type HomeNav = {
  navigate: (screen: 'Home') => void;
};

/**
 * Fade into Home. Stack pruning happens in the Home screen focus listener
 * after the fade completes (`reset` itself has no animation).
 */
export function goHomeFaded(navigation: HomeNav) {
  navigation.navigate('Home');
}
