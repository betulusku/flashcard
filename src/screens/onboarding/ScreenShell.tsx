import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors, spacing} from '../../theme';

type Props = React.PropsWithChildren<{tone?: 'dark' | 'blue' | 'welcome'; padded?: boolean}>;

export function ScreenShell({children, tone = 'dark', padded = true}: Props) {
  return (
    <View
      style={[styles.safe, tone === 'blue' && styles.blueSafe, tone === 'welcome' && styles.welcomeSafe]}
    >
      <View style={[styles.content, tone !== 'blue' && styles.statusContent, !padded && styles.unpadded]}>{children}</View>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background, overflow: 'hidden'},
  // Match the deepest Home gradient stop so nothing seams at the home indicator.
  blueSafe: {backgroundColor: '#061549', overflow: 'visible'},
  welcomeSafe: {backgroundColor: '#2444E5'},
  content: {flex: 1, paddingHorizontal: spacing.md},
  statusContent: {paddingTop: 54},
  unpadded: {paddingHorizontal: 0},
});
