export type VocabularyWord = {id: string; en: string; tr: string; example: string; pos: string; level: string};
// Keep this module's basename distinct from the JSON asset: Metro otherwise
// resolves `vocabulary` to the JSON file before this typed wrapper.
const vocabulary = require('./vocabulary.json') as VocabularyWord[];
export const wordBank = vocabulary;

export function findWords(query: string, level?: string) {
  const normalized = query.trim().toLocaleLowerCase('en');
  return wordBank.filter(word => (!level || word.level === level) && (!normalized || word.en.toLocaleLowerCase('en').includes(normalized) || word.tr.toLocaleLowerCase('tr').includes(normalized)));
}
