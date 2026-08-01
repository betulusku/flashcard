import React, {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme';

type ButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  /** Stronger glass fill — used when a toggle is on. */
  active?: boolean;
  /**
   * Translucent chip for bright canvases (Home). Default is the solid dark
   * surface used on Study / lists.
   */
  glass?: boolean;
  accessibilityRole?: 'button' | 'switch';
  accessibilityState?: {checked?: boolean; selected?: boolean};
};

/**
 * The circular glass control from Home. Every app-bar action uses this so the
 * chrome stays one language across Study, Test, Search and the rest.
 */
export function AppBarButton({
  onPress,
  accessibilityLabel,
  children,
  active,
  glass,
  accessibilityRole = 'button',
  accessibilityState,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={[
        styles.button,
        glass && styles.buttonGlass,
        active && styles.buttonActive,
        glass && active && styles.buttonGlassActive,
      ]}
    >
      {children}
    </Pressable>
  );
}

type BarProps = {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
};

/**
 * Home-style app bar: glass circle actions on the sides, title locked to the
 * center so multi-button right clusters never shove the label aside.
 */
export function AppBar({title, left, right}: BarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>{left ?? <View style={styles.slot} />}</View>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.side, styles.sideRight]}>{right ?? <View style={styles.slot} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
    minWidth: 44,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  slot: {
    width: 44,
    height: 44,
  },
  title: {
    ...StyleSheet.absoluteFill,
    textAlign: 'center',
    lineHeight: 52,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 96,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: '#000A32',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
  buttonGlass: {
    backgroundColor: 'rgba(255,255,255,.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,.28)',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  buttonActive: {
    backgroundColor: 'rgba(200,255,251,.22)',
  },
  buttonGlassActive: {
    backgroundColor: 'rgba(200,255,251,.28)',
  },
});
