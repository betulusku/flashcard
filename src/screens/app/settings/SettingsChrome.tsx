import React, {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppBar, AppBarButton} from '../../../components/AppBar';
import {Icon, type FeatherIconName} from '../../../components/Icon';
import {colors, radius, spacing, tabBarSpace} from '../../../theme';
import {ScreenShell} from '../../onboarding/ScreenShell';

export function SettingsScreen({
  title,
  onBack,
  children,
  footerPad,
}: {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  footerPad?: boolean;
}) {
  return (
    <ScreenShell>
      <AppBar
        title={title}
        left={
          onBack ? (
            <AppBarButton onPress={onBack} accessibilityLabel="Back">
              <Icon.ChevronLeft />
            </AppBarButton>
          ) : undefined
        }
      />
      <View style={[styles.body, footerPad && styles.bodyTab]}>{children}</View>
    </ScreenShell>
  );
}

export function SettingsGroup({children}: {children: ReactNode}) {
  return <View style={styles.group}>{children}</View>;
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: FeatherIconName;
  label: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  const Glyph = Icon[icon];
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, last && styles.rowLast]}
      accessibilityRole="button"
    >
      <View style={styles.rowIcon}>
        <Glyph size={20} color={colors.mint} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Icon.ChevronRight size={18} color="rgba(242,248,255,.35)" />
    </Pressable>
  );
}

export function SettingsAction({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
  accent?: boolean;
}) {
  const Glyph = Icon[icon];
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, accent && styles.actionAccent]}
      accessibilityRole="button"
    >
      <Glyph size={18} color={accent ? '#FFB4A8' : colors.mint} />
      <Text style={[styles.actionLabel, accent && styles.actionLabelAccent]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {flex: 1, paddingTop: spacing.sm, gap: spacing.md},
  bodyTab: {paddingBottom: tabBarSpace + spacing.md},
  group: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    gap: 2,
    paddingVertical: 4,
  },
  row: {
    minHeight: 54,
    marginHorizontal: 4,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLast: {},
  rowIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rowValue: {
    fontSize: 14,
    color: colors.muted,
    marginRight: 4,
  },
  action: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionAccent: {
    backgroundColor: 'rgba(255,109,90,.14)',
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  actionLabelAccent: {
    color: '#FFD0C8',
  },
});
