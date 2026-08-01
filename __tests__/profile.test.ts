jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

import {displayName, greetingName, type UserProfile} from '../src/logic/profile';

describe('profile greeting', () => {
  it('uses the learner name when set', () => {
    const profile: UserProfile = {name: 'Ayşe', photoUri: null};
    expect(displayName(profile)).toBe('Ayşe');
    expect(greetingName(profile)).toBe('Ayşe.');
  });

  it('falls back when name is missing', () => {
    expect(greetingName({name: '  ', photoUri: null})).toBe('learner.');
    expect(greetingName({name: '', photoUri: null})).toBe('learner.');
  });
});
