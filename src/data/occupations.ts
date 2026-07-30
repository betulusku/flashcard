import {Occupation, OccupationCategory} from '../types/onboarding';

export const OCC_CATS: Record<OccupationCategory, {label: string; lessonLabel: string}> = {
  tech: {label: 'Tech & Software', lessonLabel: 'Tech Vocabulary'}, marketing: {label: 'Marketing & Growth', lessonLabel: 'Marketing Words'},
  business: {label: 'Business & Sales', lessonLabel: 'Business English'}, finance: {label: 'Finance', lessonLabel: 'Finance Vocabulary'},
  health: {label: 'Healthcare', lessonLabel: 'Medical English'}, law: {label: 'Law', lessonLabel: 'Legal English'},
  education: {label: 'Education', lessonLabel: 'Academic English'}, engineering: {label: 'Engineering', lessonLabel: 'Engineering Terms'},
  design: {label: 'Design & Creative', lessonLabel: 'Design Vocabulary'}, tourism: {label: 'Tourism & Hospitality', lessonLabel: 'Hospitality English'},
  science: {label: 'Science & Research', lessonLabel: 'Scientific English'}, media: {label: 'Media & Writing', lessonLabel: 'Media & Writing'},
  other: {label: 'Other', lessonLabel: 'General Vocabulary'},
};

const titles: Record<OccupationCategory, string[]> = {
  tech: ['Software Engineer', 'Data Scientist', 'Product Manager', 'UX/UI Designer', 'DevOps Engineer', 'QA Engineer', 'IT Support Specialist', 'Cybersecurity Analyst', 'Mobile Developer'],
  marketing: ['Marketing Manager', 'Growth Marketer', 'SEO Specialist', 'Content Creator', 'Social Media Manager', 'Brand Manager'],
  business: ['Sales Representative', 'Account Executive', 'Business Development', 'Entrepreneur/Founder', 'Management Consultant', 'Operations Manager', 'HR Specialist'],
  finance: ['Accountant', 'Financial Analyst', 'Investment Banker', 'Auditor', 'Insurance Agent'],
  health: ['Doctor', 'Nurse', 'Dentist', 'Pharmacist', 'Physiotherapist', 'Psychologist', 'Veterinarian'],
  law: ['Lawyer', 'Paralegal', 'Legal Consultant'],
  education: ['Teacher', 'University Professor', 'Private Tutor', 'School Administrator'],
  engineering: ['Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Architect'],
  design: ['Graphic Designer', 'Interior Designer', 'Fashion Designer', 'Photographer', 'Video Editor'],
  tourism: ['Hotel Manager', 'Tour Guide', 'Flight Attendant', 'Chef', 'Event Planner'],
  science: ['Research Scientist', 'Lab Technician', 'Biologist', 'Chemist'],
  media: ['Journalist', 'Author/Writer', 'Musician', 'Actor', 'Translator'],
  other: ['Student', 'Homemaker', 'Retired'],
};

export const OCCUPATIONS: Occupation[] = (Object.keys(titles) as OccupationCategory[]).flatMap(category =>
  titles[category].map(title => ({title, category})),
);

export const OCC_KEYWORDS: Record<OccupationCategory, string[]> = {
  tech: ['software', 'developer', 'engineer', 'program', 'code', 'data', 'it ', 'tech', 'devops', 'cyber', 'product manager', 'app dev', 'frontend', 'backend', 'full stack'],
  marketing: ['market', 'growth', 'seo', 'content', 'social media', 'brand', 'advertis', 'digital'],
  business: ['sales', 'business', 'consult', 'entrepreneur', 'founder', 'ceo', 'operations', 'account exec', 'hr ', 'human resources', 'manager'],
  finance: ['account', 'financ', 'bank', 'audit', 'insur', 'invest', 'bookkeep', 'tax', 'economist'],
  health: ['doctor', 'nurse', 'dentist', 'pharma', 'physio', 'psycholog', 'veterinar', 'health', 'medical', 'surgeon', 'therapist'],
  law: ['lawyer', 'legal', 'paralegal', 'judge', 'attorney'], education: ['teach', 'professor', 'tutor', 'school', 'academ', 'lecturer', 'instructor'],
  engineering: ['civil', 'mechanical', 'electrical', 'architect', 'engineer'], design: ['design', 'photograph', 'video edit', 'fashion', 'interior', 'creative'],
  tourism: ['hotel', 'tour', 'flight', 'chef', 'cook', 'event plan', 'hospitality', 'travel', 'airline'],
  science: ['scientist', 'lab ', 'biolog', 'chemist', 'physicist', 'researcher'], media: ['journal', 'writer', 'author', 'music', 'actor', 'film', 'media', 'translat'],
  other: [],
};
