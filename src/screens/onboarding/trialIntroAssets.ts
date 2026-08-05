import {Image} from 'react-native';

/** Background only — keep confetti JSON out of this sync path. */
export const trialIntroBg = require('../../../assets/trial-intro-bg.png');

/** Warm image decode before TrialIntro mounts. */
export function preloadTrialIntroAssets() {
  const resolved = Image.resolveAssetSource(trialIntroBg);
  if (resolved?.uri) {
    Image.prefetch(resolved.uri).catch(() => undefined);
  }
}
