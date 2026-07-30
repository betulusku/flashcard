import {classifyOccupation} from '../src/logic/occupationClassifier';
import {getSurveySteps, needsOccupation} from '../src/logic/surveyFlow';
import {SurveyAnswers} from '../src/types/onboarding';

const answers: SurveyAnswers = {level: null, goals: [], occupation: null, occupationText: null, daily: null, weekly: null};

describe('occupation classifier', () => {
  it.each([
    ['Product Manager', 'tech'],
    ['backend developer at a startup', 'tech'],
    ['high school teacher', 'education'],
    ['Beekeeper', 'other'],
    ['', null],
  ])('classifies %s as %s', (input, expected) => expect(classifyOccupation(input)).toBe(expected));
});

describe('conditional survey flow', () => {
  it('adds occupation only when work or interview is selected', () => {
    expect(getSurveySteps({...answers, goals: ['travel']})).toEqual(['level', 'goals', 'daily', 'weekly']);
    expect(getSurveySteps({...answers, goals: ['work']})).toEqual(['level', 'goals', 'occupation', 'daily', 'weekly']);
    expect(needsOccupation(['interview'])).toBe(true);
  });
});
