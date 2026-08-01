import SoundPlayer from 'react-native-sound-player';

const assets = {
  correct: require('../../assets/sounds/correct.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  success: require('../../assets/sounds/success.wav'),
  sad: require('../../assets/sounds/sad.wav'),
} as const;

export type AppSound = keyof typeof assets;

export function playSound(name: AppSound) {
  try {
    SoundPlayer.playAsset(assets[name]);
  } catch {
    // SFX is nice-to-have; never block the flow.
  }
}

export function stopSound() {
  try {
    SoundPlayer.stop();
  } catch {
    // ignore
  }
}
