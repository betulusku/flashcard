import {getOccKeywords, getOccupationsList} from '../data/contentStore';
import {OccupationCategory} from '../types/onboarding';

export function classifyOccupation(input: string): OccupationCategory | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  const occupations = getOccupationsList();
  const exact = occupations.find(item => item.title.toLowerCase() === text);
  if (exact) return exact.category;
  const partial = occupations.find(
    item =>
      item.title.toLowerCase().includes(text) ||
      text.includes(item.title.toLowerCase()),
  );
  if (partial) return partial.category;
  for (const [category, keywords] of Object.entries(getOccKeywords()) as [
    OccupationCategory,
    string[],
  ][]) {
    if (keywords.some(keyword => text.includes(keyword))) return category;
  }
  return 'other';
}
