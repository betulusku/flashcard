import {wordBank} from '../src/data/vocabularyBank';

function duplicates(pick: (word: (typeof wordBank)[number]) => string) {
  const seen = new Map<string, string[]>();
  wordBank.forEach(word => {
    const key = pick(word).toLocaleLowerCase('en');
    seen.set(key, [...(seen.get(key) ?? []), word.en]);
  });
  return [...seen.values()].filter(group => group.length > 1);
}

describe('vocabulary data', () => {
  it('keeps definitions short enough for the quiz card', () => {
    const tooLong = wordBank.filter(word => word.definition.length > 110);
    expect(tooLong.map(word => word.en)).toEqual([]);
  });

  it('writes definitions as a single finished sentence', () => {
    const malformed = wordBank.filter(word => !/^[A-Z0-9].*\.$/.test(word.definition) || /["“”]/.test(word.definition));
    expect(malformed.map(word => word.en)).toEqual([]);
  });

  it('translates every definition and example for the Turkish card', () => {
    const untranslated = wordBank.filter(word => !word.definitionTr?.trim() || !word.exampleTr?.trim());
    expect(untranslated.map(word => word.en)).toEqual([]);
  });

  it('writes Turkish translations as finished sentences, not copies of the English', () => {
    const malformed = wordBank.filter(word =>
      !/\.$/.test(word.definitionTr) ||
      /["“”]/.test(word.definitionTr) ||
      /["“”]/.test(word.exampleTr) ||
      word.definitionTr === word.definition ||
      word.exampleTr === word.example,
    );
    expect(malformed.map(word => word.en)).toEqual([]);
  });

  it('keeps Turkish definitions short enough for the flashcard', () => {
    const tooLong = wordBank.filter(word => word.definitionTr.length > 130);
    expect(tooLong.map(word => word.en)).toEqual([]);
  });

  it('never repeats an English spelling, so answers stay unambiguous', () => {
    expect(duplicates(word => word.en)).toEqual([]);
  });

  it('has only a handful of shared definitions, which the quiz filters out', () => {
    expect(duplicates(word => word.definition).length).toBeLessThan(10);
  });
});
