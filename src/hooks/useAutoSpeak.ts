import {useCallback, useEffect, useState} from 'react';
import {loadAutoSpeak, saveAutoSpeak} from '../logic/settings';
import {haptic, stopSpeaking, warmUpSpeech} from '../services/feedback';

/** Shared by study and test so the preference follows the learner everywhere. */
export function useAutoSpeak() {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    warmUpSpeech();
    loadAutoSpeak().then(stored => {
      setEnabled(stored);
      setLoaded(true);
    });
  }, []);
  useEffect(() => () => {stopSpeaking();}, []);
  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    haptic('selection');
    if (!next) stopSpeaking();
    saveAutoSpeak(next);
  }, [enabled]);
  // Nothing is spoken until the stored preference is known, so a learner who
  // turned audio off never hears a word while the value is still loading.
  return {enabled: enabled && loaded, toggle, on: enabled};
}
