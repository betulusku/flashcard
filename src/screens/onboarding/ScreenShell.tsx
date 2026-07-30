import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, spacing} from '../../theme';

export function ScreenShell({children}: React.PropsWithChildren) {
  return <SafeAreaView style={styles.safe}><View style={styles.content}>{children}</View></SafeAreaView>;
}
const styles = StyleSheet.create({safe: {flex: 1, backgroundColor: colors.background}, content: {flex: 1, padding: spacing.lg}});
