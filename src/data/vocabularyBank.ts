import {getWordBank} from './contentStore';

export type VocabularyWord = {
  id: string;
  en: string;
  tr: string;
  example: string;
  pos: string;
  level: string;
  definition: string;
  definitionTr: string;
  exampleTr: string;
};

export {getWordBank};

export function findWords(query: string, level?: string) {
  const normalized = query.trim().toLocaleLowerCase('en');
  return getWordBank().filter(
    word =>
      (!level || word.level === level) &&
      (!normalized ||
        word.en.toLocaleLowerCase('en').includes(normalized) ||
        word.tr.toLocaleLowerCase('tr').includes(normalized)),
  );
}
