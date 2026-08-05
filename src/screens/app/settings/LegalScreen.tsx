import React, {useEffect} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {openLegalDoc} from '../../../logic/legalLinks';
import type {OnboardingStackParamList} from '../../../navigation/OnboardingNavigator';
import {logEvent} from '../../../services/mixpanel';
import {colors} from '../../../theme';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Legal'>;

/** Legacy in-app route — opens the hosted legal page and returns. */
export function LegalScreen({navigation, route}: Props) {
  useEffect(() => {
    void logEvent('legal_view', {doc: route.params.doc});
    void openLegalDoc(route.params.doc).finally(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    });
  }, [navigation, route.params.doc]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.mint} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
