import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';
import {colors, spacing} from '../../theme';

type Props = React.PropsWithChildren<{tone?: 'dark' | 'blue' | 'welcome'; padded?: boolean}>;

export function ScreenShell({children, tone = 'dark', padded = true}: Props) {
  // Home deliberately paints behind the status area. It supplies its own
  // top inset so the atmospheric canvas continues through the Dynamic Island.
  const edges: readonly Edge[] = tone === 'welcome' ? ['top'] : tone === 'blue' ? ['bottom'] : ['top', 'bottom'];
  return <SafeAreaView style={[styles.safe, tone === 'blue' && styles.blueSafe, tone === 'welcome' && styles.welcomeSafe]} edges={edges}><View style={[styles.content, !padded && styles.unpadded]}>{children}</View></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background, overflow: 'hidden'},
  blueSafe: {backgroundColor: '#2A4BCB'},
  welcomeSafe: {backgroundColor: '#2444E5'},
  content: {flex: 1, paddingHorizontal: spacing.lg},
  unpadded: {paddingHorizontal: 0},
});
