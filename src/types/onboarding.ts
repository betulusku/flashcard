export type Level = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'unsure';
export type Goal = 'work' | 'interview' | 'travel' | 'daily' | 'exam' | 'academic';
export type OccupationCategory =
  | 'tech' | 'marketing' | 'business' | 'finance' | 'health' | 'law'
  | 'education' | 'engineering' | 'design' | 'tourism' | 'science' | 'media' | 'other';
export type DailyCommitment = 'casual' | 'regular' | 'serious' | 'intense';
export type WeeklyGoal = 'easy' | 'steady' | 'challenge' | 'ambitious';

export type SurveyAnswers = {
  level: Level | null;
  goals: Goal[];
  occupation: OccupationCategory | null;
  occupationText: string | null;
  daily: DailyCommitment | null;
  weekly: WeeklyGoal | null;
};

export type Occupation = {title: string; category: OccupationCategory};
