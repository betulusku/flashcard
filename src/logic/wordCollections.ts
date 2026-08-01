import {VocabularyWord, wordBank} from '../data/vocabularyBank';
import type {FeatherIconName} from '../components/Icon';
import type {WordProgress} from './learningEngine';

/**
 * `saved` is the personal list the learner builds from Search and owns in the
 * My words tab. The other three are derived from practice history and are read
 * only, so Home opens them as their own screens instead of that tab.
 */
export type CollectionId = 'saved' | 'learning' | 'memorized' | 'favorites';

export const savedWordsKey = 'fluent:my-words';

export const collectionMeta: Record<CollectionId, {title: string; subtitle: string; icon: FeatherIconName; empty: string}> = {
  saved: {title: 'My words', subtitle: 'Words you added yourself', icon: 'Bookmark', empty: 'Find a word in Search and tap Add.'},
  learning: {title: 'Learning', subtitle: 'Words to practise again', icon: 'RefreshCw', empty: 'Words you miss in practice collect here.'},
  memorized: {title: 'Memorized', subtitle: 'Words you know well', icon: 'CheckCircle', empty: 'Answer a word correctly to move it here.'},
  favorites: {title: 'Favorites', subtitle: 'Words you starred', icon: 'Star', empty: 'Tap the star on a card to save it here.'},
};

const byToken = new Map<string, VocabularyWord>();
wordBank.forEach(word => {
  byToken.set(word.id, word);
  byToken.set(word.en, word);
});

export function findWordByToken(token: string) {
  return byToken.get(token);
}

export function findWordsByTokens(tokens: string[]) {
  const seen = new Set<string>();
  const words: VocabularyWord[] = [];
  tokens.forEach(token => {
    const word = findWordByToken(token);
    if (!word || seen.has(word.id)) return;
    seen.add(word.id);
    words.push(word);
  });
  return words;
}

/**
 * Saved words are stored by their English spelling while practice is recorded
 * by id, so a word can carry progress under either key.
 */
export function progressFor(word: VocabularyWord, progress: Record<string, WordProgress>): WordProgress {
  const byId = progress[word.id];
  const byName = progress[word.en];
  if (!byId && !byName) return {known: 0, unknown: 0, favorite: false};
  return {
    known: (byId?.known ?? 0) + (byName?.known ?? 0),
    unknown: (byId?.unknown ?? 0) + (byName?.unknown ?? 0),
    favorite: Boolean(byId?.favorite || byName?.favorite),
    addedAt: byId?.addedAt ?? byName?.addedAt,
  };
}

export function collectWords(
  collection: CollectionId,
  savedTokens: string[],
  progress: Record<string, WordProgress>,
): VocabularyWord[] {
  const tokens = collection === 'saved' ? savedTokens : Object.keys(progress);
  return findWordsByTokens(tokens).filter(word => {
    if (collection === 'saved') return true;
    const item = progressFor(word, progress);
    if (collection === 'learning') return item.unknown > 0 && item.known === 0;
    if (collection === 'memorized') return item.known > 0;
    return item.favorite;
  });
}
