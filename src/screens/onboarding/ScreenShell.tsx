import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';
import {colors, spacing} from '../../theme';

type Props = React.PropsWithChildren<{tone?: 'dark' | 'blue' | 'welcome'; padded?: boolean}>;

export function ScreenShell({children, tone = 'dark', padded = true}: Props) {
  // Home paints edge-to-edge (including under the floating tab bar). It owns
  // its own top inset so the canvas continues through the Dynamic Island —
  // a bottom safe-area edge would leave a solid band under the gradient.
  const edges: readonly Edge[] =
    tone === 'welcome' ? ['top'] : tone === 'blue' ? [] : ['top', 'bottom'];
  return (
    <SafeAreaView
      style={[styles.safe, tone === 'blue' && styles.blueSafe, tone === 'welcome' && styles.welcomeSafe]}
      edges={edges}
    >
      <View style={[styles.content, !padded && styles.unpadded]}>{children}</View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background, overflow: 'hidden'},
  // Match the deepest Home gradient stop so nothing seams at the home indicator.
  blueSafe: {backgroundColor: '#061549', overflow: 'visible'},
  welcomeSafe: {backgroundColor: '#2444E5'},
  content: {flex: 1, paddingHorizontal: spacing.md},
  unpadded: {paddingHorizontal: 0},
});
