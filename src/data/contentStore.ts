import type {FeatherIconName} from '../components/Icon';
import type {Occupation, OccupationCategory} from '../types/onboarding';
import type {VocabularyWord} from './vocabularyBank';
import {
  gerundAndInfinitive as localGerund,
  prepositions as localPrepositions,
  type GrammarItem,
} from './grammarLessons';
import {
  OCC_CATS as localOccCats,
  OCC_KEYWORDS as localOccKeywords,
  OCCUPATIONS as localOccupations,
} from './occupations';

export type GrammarLesson = {
  id: string;
  title: string;
  sections: {title: string; items: GrammarItem[]}[];
};

export type OccupationsContent = {
  categories: Record<OccupationCategory, {label: string; lessonLabel: string}>;
  titles: Record<string, string[]>;
  keywords: Record<OccupationCategory, string[]>;
  occupations: Occupation[];
};

export type LegalDoc = {
  title: string;
  sections: {heading: string; body: string}[];
};

export type LegalContent = {
  updatedAt?: string;
  privacy: LegalDoc;
  terms: LegalDoc;
};

export type InboxNote = {
  id: string;
  icon: FeatherIconName;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  tone?: 'mint' | 'warm' | 'soft';
};

export type ContentSource = 'remote' | 'local';

type ContentState = {
  vocabulary: VocabularyWord[];
  grammarLessons: GrammarLesson[];
  occupations: OccupationsContent;
  legal: LegalContent;
  inboxSeed: InboxNote[];
  source: ContentSource;
  hydrated: boolean;
};

const localVocabulary = require('./vocabulary.json') as VocabularyWord[];

const localLegal: LegalContent = {
  updatedAt: '2026-08-01',
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'What we store on your device',
        body: 'Fluent keeps your practice history, saved words, survey answers, and settings in local storage on this phone. That data stays with you unless you choose to share it.',
      },
      {
        heading: 'Speech',
        body: 'Pronunciation uses the device speech engine. Utterances are not uploaded by Fluent for advertising or profiling.',
      },
      {
        heading: 'Support',
        body: 'If you contact us, your message and anonymous User ID help us debug. We don’t sell personal information.',
      },
      {
        heading: 'Changes',
        body: 'We’ll update this page when our practices change. Continued use of Fluent after an update means you accept the revised policy.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    sections: [
      {
        heading: 'The product',
        body: 'Fluent is a vocabulary practice app. Content is for learning; it’s not professional advice, and results vary with how often you practise.',
      },
      {
        heading: 'Your account & purchases',
        body: 'Subscriptions and one-time purchases are handled by the App Store. Restore Purchase recovers entitlements tied to your Apple ID on this device.',
      },
      {
        heading: 'Acceptable use',
        body: 'Don’t abuse the service, reverse engineer it for competing products, or use it in a way that harms other learners.',
      },
      {
        heading: 'Contact',
        body: 'Questions about these terms: hello@fluent.app.',
      },
    ],
  },
};

const localInbox: InboxNote[] = [
  {
    id: '1',
    icon: 'Award',
    title: 'Streak on deck',
    body: 'You’re one short practice away from keeping today’s streak alive.',
    time: 'Just now',
    unread: true,
    tone: 'mint',
  },
  {
    id: '2',
    icon: 'BookOpen',
    title: 'Words waiting for you',
    body: '15 learning words are ready for a quick flashcard pass.',
    time: '2h ago',
    unread: true,
    tone: 'soft',
  },
  {
    id: '3',
    icon: 'Star',
    title: 'Nice run yesterday',
    body: 'You hit your daily target. Keep the same pace this week.',
    time: 'Yesterday',
    tone: 'warm',
  },
  {
    id: '4',
    icon: 'Bell',
    title: 'Evening reminder',
    body: 'A 5-minute review before bed sticks better than a long cram.',
    time: 'Yesterday',
    tone: 'soft',
  },
  {
    id: '5',
    icon: 'CheckCircle',
    title: 'Test unlocked',
    body: 'You’ve practised enough words to take a reinforce test.',
    time: 'Mon',
    tone: 'mint',
  },
];

function localGrammar(): GrammarLesson[] {
  return [
    {id: 'gerund', ...localGerund},
    {id: 'prepositions', ...localPrepositions},
  ];
}

function localOccupationsContent(): OccupationsContent {
  return {
    categories: localOccCats,
    titles: {},
    keywords: localOccKeywords,
    occupations: localOccupations,
  };
}

let state: ContentState = {
  vocabulary: localVocabulary,
  grammarLessons: localGrammar(),
  occupations: localOccupationsContent(),
  legal: localLegal,
  inboxSeed: localInbox,
  source: 'local',
  hydrated: false,
};

function asOccupationCategory(value: string): OccupationCategory {
  return value as OccupationCategory;
}

function normalizeOccupations(raw: any): OccupationsContent {
  const categories = (raw?.categories ?? localOccCats) as OccupationsContent['categories'];
  const keywords = (raw?.keywords ?? localOccKeywords) as OccupationsContent['keywords'];
  const occupations = (
    Array.isArray(raw?.occupations)
      ? raw.occupations.map((item: {title: string; category: string}) => ({
          title: item.title,
          category: asOccupationCategory(item.category),
        }))
      : localOccupations
  ) as Occupation[];
  return {
    categories,
    titles: raw?.titles ?? {},
    keywords,
    occupations,
  };
}

function normalizeGrammar(raw: unknown): GrammarLesson[] {
  if (!Array.isArray(raw) || !raw.length) return localGrammar();
  return raw.map((lesson: any) => ({
    id: String(lesson.id),
    title: String(lesson.title ?? ''),
    sections: Array.isArray(lesson.sections) ? lesson.sections : [],
  }));
}

function normalizeLegal(raw: any): LegalContent {
  if (!raw?.privacy || !raw?.terms) return localLegal;
  return {
    updatedAt: raw.updatedAt,
    privacy: raw.privacy,
    terms: raw.terms,
  };
}

function normalizeInbox(raw: any): InboxNote[] {
  const notes = Array.isArray(raw?.notes) ? raw.notes : Array.isArray(raw) ? raw : null;
  if (!notes?.length) return localInbox;
  return notes as InboxNote[];
}

export type RemoteAppContent = {
  vocabulary: VocabularyWord[] | null;
  grammarLessons: unknown;
  occupations: unknown;
  legal: unknown;
  inboxSeed: unknown;
  meta?: unknown;
};

/** Replace in-memory content with a successful backend payload. */
export function hydrateContent(remote: RemoteAppContent) {
  const vocabulary =
    Array.isArray(remote.vocabulary) && remote.vocabulary.length > 0
      ? remote.vocabulary
      : state.vocabulary;

  state = {
    vocabulary,
    grammarLessons: normalizeGrammar(remote.grammarLessons),
    occupations: normalizeOccupations(remote.occupations),
    legal: normalizeLegal(remote.legal),
    inboxSeed: normalizeInbox(remote.inboxSeed),
    source: 'remote',
    hydrated: true,
  };
}

export function getContentSource() {
  return state.source;
}

export function isContentHydrated() {
  return state.hydrated;
}

export function getWordBank() {
  return state.vocabulary;
}

export function getGrammarLessons() {
  return state.grammarLessons;
}

export function getGrammarLesson(id: 'gerund' | 'prepositions') {
  return (
    state.grammarLessons.find(lesson => lesson.id === id) ??
    localGrammar().find(lesson => lesson.id === id)!
  );
}

export function getOccCats() {
  return state.occupations.categories;
}

export function getOccupationsList() {
  return state.occupations.occupations;
}

export function getOccKeywords() {
  return state.occupations.keywords;
}

export function getLegalContent() {
  return state.legal;
}

export function getInboxSeed() {
  return state.inboxSeed;
}
