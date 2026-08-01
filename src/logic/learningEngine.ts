import {VocabularyWord, wordBank} from '../data/vocabularyBank';

export type WordProgress = {known: number; unknown: number; favorite: boolean; addedAt?: number};
export type DailyActivity = {reviewed: number; learned: number};
export type LearningState = {
  progress: Record<string, WordProgress>;
  practicedDays: string[];
  dailyIds: string[];
  dailyDate: string;
  // Kept separately from total word progress so Home can truthfully show
  // today and this week's learning rather than a fixed placeholder.
  activity: Record<string, DailyActivity>;
};
export const emptyLearningState: LearningState = {progress: {}, practicedDays: [], dailyIds: [], dailyDate: '', activity: {}};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function dailyPool(level: string | null, target: number, state: LearningState): VocabularyWord[] {
  const eligible = wordBank.filter(word => !level || word.level.toLowerCase() === level.toLowerCase());
  const progressFor = (word: VocabularyWord) => state.progress[word.id] ?? state.progress[word.en];
  const fresh = eligible.filter(word => {
    const progress = progressFor(word);
    return !progress || (progress.known === 0 && progress.unknown === 0);
  });
  const candidates = fresh.length ? fresh : eligible.filter(word => (progressFor(word)?.known ?? 0) === 0);
  return shuffle(candidates).slice(0, target);
}

export function dailyTarget(key: string | null | undefined) {
  return key === 'casual' ? 5 : key === 'serious' ? 15 : key === 'intense' ? 20 : 10;
}
export function applyAnswer(queue: string[]) {
  // Every answer completes the current card. Unknown words are retained in
  // Learning, but are deliberately not reinserted into this same session.
  return queue.slice(1);
}

export function needsCheckpoint(reviewedCount: number) {
  return reviewedCount > 0 && reviewedCount % 6 === 0;
}
