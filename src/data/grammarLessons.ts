export type GrammarItem = {pattern: string; rule: string; example: string};

export const gerundAndInfinitive = {
  title: 'Gerund & Infinitive',
  sections: [
    {title: 'Verb + gerund', items: [
      {pattern: 'enjoy / avoid / finish + -ing', rule: 'Use -ing after these verbs.', example: 'I enjoy learning new words.'},
      {pattern: 'suggest / consider / practise + -ing', rule: 'Do not use to + infinitive here.', example: 'She suggested taking the train.'},
      {pattern: 'preposition + -ing', rule: 'A verb after a preposition takes -ing.', example: 'He is good at explaining ideas.'},
    ]},
    {title: 'Verb + to-infinitive', items: [
      {pattern: 'decide / plan / hope + to + verb', rule: 'Use to-infinitive for intentions and plans.', example: 'We decided to apply early.'},
      {pattern: 'want / need / learn + to + verb', rule: 'Use to-infinitive after these common verbs.', example: 'I need to finish this report.'},
      {pattern: 'ask / tell + object + to + verb', rule: 'Put the person before the infinitive.', example: 'She asked me to send the file.'},
    ]},
    {title: 'Meaning changes', items: [
      {pattern: 'stop + -ing', rule: 'End an activity.', example: 'He stopped smoking.'},
      {pattern: 'stop + to + verb', rule: 'Pause in order to do something.', example: 'He stopped to buy coffee.'},
      {pattern: 'remember + -ing / to + verb', rule: '-ing recalls the past; to + verb is a future task.', example: 'Remember to lock the door.'},
    ]},
  ] as {title: string; items: GrammarItem[]}[],
};

export const prepositions = {
  title: 'Prepositions',
  sections: [
    {title: 'Time', items: [
      {pattern: 'at', rule: 'Precise time and expressions.', example: 'The call starts at 9:30.'},
      {pattern: 'on', rule: 'Days and dates.', example: 'We met on Monday.'},
      {pattern: 'in', rule: 'Months, years and longer periods.', example: 'She moved here in 2024.'},
    ]},
    {title: 'Place & movement', items: [
      {pattern: 'at / in', rule: 'At = point; in = inside an area.', example: 'I am at the station, in the café.'},
      {pattern: 'to / into', rule: 'To = destination; into = movement inside.', example: 'They walked into the room.'},
      {pattern: 'on / onto', rule: 'On = position; onto = movement to a surface.', example: 'Put the book on the table.'},
    ]},
    {title: 'Verb combinations', items: [
      {pattern: 'depend on / focus on', rule: 'Learn the verb and preposition together.', example: 'Success depends on clear communication.'},
      {pattern: 'apply for / wait for', rule: 'For often marks a target or purpose.', example: 'I applied for the role.'},
      {pattern: 'agree with / listen to', rule: 'These combinations are fixed.', example: 'I agree with the proposal.'},
    ]},
  ] as {title: string; items: GrammarItem[]}[],
};
