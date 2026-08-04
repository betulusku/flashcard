import {getWordBank} from '../src/data/vocabularyBank';
import {collectWords} from '../src/logic/wordCollections';

const [first, second, third] = getWordBank();

describe('word collections', () => {
  it('keeps the saved list to words the learner added by hand', () => {
    const progress = {[second.id]: {known: 3, unknown: 0, favorite: false}};
    const saved = collectWords('saved', [first.en], progress);
    expect(saved.map(word => word.id)).toEqual([first.id]);
  });

  it('derives learning and memorized from practice history alone', () => {
    const progress = {
      [first.id]: {known: 0, unknown: 2, favorite: false},
      [second.id]: {known: 1, unknown: 4, favorite: false},
      [third.id]: {known: 0, unknown: 0, favorite: true},
    };
    expect(collectWords('learning', [], progress).map(word => word.id)).toEqual([first.id]);
    expect(collectWords('memorized', [], progress).map(word => word.id)).toEqual([second.id]);
    expect(collectWords('favorites', [], progress).map(word => word.id)).toEqual([third.id]);
  });

  it('merges progress recorded under the word id and under its spelling', () => {
    const progress = {
      [first.id]: {known: 0, unknown: 1, favorite: false},
      [first.en]: {known: 1, unknown: 0, favorite: false},
    };
    expect(collectWords('memorized', [], progress).map(word => word.id)).toEqual([first.id]);
    expect(collectWords('learning', [], progress)).toEqual([]);
  });

  it('ignores saved tokens that no longer exist in the word bank', () => {
    expect(collectWords('saved', ['not-a-word'], {})).toEqual([]);
  });
});

describe('vocabulary data', () => {
  it('gives every word a real definition', () => {
    const missing = getWordBank().filter(word => !word.definition || word.definition.length < 12);
    expect(missing.map(word => word.en)).toEqual([]);
  });

  it('has no placeholder definitions left', () => {
    const placeholders = getWordBank().filter(word => /shown through the example|see the example for how/i.test(word.definition));
    expect(placeholders.map(word => word.en)).toEqual([]);
  });
});
