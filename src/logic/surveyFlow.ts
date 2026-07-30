import {Goal, SurveyAnswers} from '../types/onboarding';

export type SurveyStepKey = 'level' | 'goals' | 'occupation' | 'daily' | 'weekly';
export const needsOccupation = (goals: Goal[]) => goals.includes('work') || goals.includes('interview');
export const getSurveySteps = (answers: SurveyAnswers): SurveyStepKey[] =>
  needsOccupation(answers.goals) ? ['level', 'goals', 'occupation', 'daily', 'weekly'] : ['level', 'goals', 'daily', 'weekly'];

export const isStepValid = (step: SurveyStepKey, answers: SurveyAnswers) => {
  if (step === 'level') return answers.level !== null;
  if (step === 'goals') return answers.goals.length > 0;
  if (step === 'occupation') return answers.occupation !== null;
  if (step === 'daily') return answers.daily !== null;
  return answers.weekly !== null;
};
