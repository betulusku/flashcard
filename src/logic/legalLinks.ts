import {Linking} from 'react-native';

export const LEGAL_URLS = {
  privacy: 'https://flashvocab.online/privacy',
  terms: 'https://flashvocab.online/terms',
} as const;

export type LegalDocId = keyof typeof LEGAL_URLS;

/** Open Privacy / Terms in the system browser. */
export function openLegalDoc(doc: LegalDocId) {
  return Linking.openURL(LEGAL_URLS[doc]).catch(() => undefined);
}
