import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LogoIcon } from "@/components/icons";
import { colors, fonts, radius, shadow } from "@/theme";

/* ---------- Badges ---------- */

export type BadgeTone =
  | "era"
  | "messianic"
  | "unrecorded"
  | "amber"
  | "blue"
  | "darkAmber"
  | "darkStone"
  | "solidRose"
  | "solidPurple";

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string; border?: string }> = {
  era: { bg: colors.parchment100, fg: colors.stone700 },
  messianic: { bg: colors.rose100, fg: colors.rose800 },
  unrecorded: { bg: colors.purple100, fg: colors.purple900 },
  amber: { bg: colors.amber100, fg: colors.amber900 },
  blue: { bg: colors.blue100, fg: colors.blue900 },
  darkAmber: { bg: "rgba(245,158,11,0.18)", fg: colors.amber300, border: "rgba(251,191,36,0.35)" },
  darkStone: { bg: "rgba(68,64,60,0.85)", fg: colors.parchment200 },
  solidRose: { bg: colors.rose600, fg: colors.white },
  solidPurple: { bg: colors.purple600, fg: colors.white },
};

export function Badge({ label, tone = "era", style }: { label: string; tone?: BadgeTone; style?: StyleProp<ViewStyle> }) {
  const t = BADGE_TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border ?? "transparent" }, style]}>
      <Text style={[styles.badgeText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ---------- Buttons ---------- */

export type ButtonTone = "primary" | "secondary" | "blue" | "dark" | "ghost" | "outlineDark";

const BUTTON_TONES: Record<ButtonTone, { bg: string; fg: string; border: string; pressed: string }> = {
  primary: { bg: colors.amber700, fg: colors.white, border: colors.amber700, pressed: colors.amber800 },
  secondary: { bg: colors.white, fg: colors.amber900, border: colors.parchment300, pressed: colors.parchment100 },
  blue: { bg: colors.blue700, fg: colors.white, border: colors.blue700, pressed: colors.blue800 },
  dark: { bg: colors.stone800, fg: colors.amber50, border: colors.stone800, pressed: colors.stone700 },
  ghost: { bg: "transparent", fg: colors.amber800, border: "transparent", pressed: colors.parchment100 },
  outlineDark: { bg: "rgba(74,55,38,0.9)", fg: colors.amber100, border: "rgba(245,158,11,0.4)", pressed: colors.amber700 },
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  icon?: ReactNode;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({ label, onPress, tone = "primary", icon, small, disabled, style, accessibilityHint }: ButtonProps) {
  const t = BUTTON_TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: pressed ? t.pressed : t.bg, borderColor: t.border, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------- Chips ---------- */

export function Chip({
  label,
  onPress,
  active,
  tone = "light",
  trailing,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  tone?: "light" | "dark" | "darkPurple" | "messianic" | "unrecorded";
  trailing?: string;
}) {
  const palette = {
    light: {
      bg: colors.white,
      fg: colors.stone800,
      border: colors.parchment300,
      activeBg: colors.amber700,
      activeFg: colors.white,
    },
    dark: {
      bg: "rgba(120,53,15,0.5)",
      fg: colors.amber100,
      border: "rgba(180,83,9,0.5)",
      activeBg: colors.amber600,
      activeFg: colors.white,
    },
    darkPurple: {
      bg: "rgba(88,28,135,0.6)",
      fg: colors.purple100,
      border: "rgba(168,85,247,0.5)",
      activeBg: colors.purple700,
      activeFg: colors.white,
    },
    messianic: {
      bg: colors.rose100,
      fg: colors.rose800,
      border: colors.rose300,
      activeBg: colors.rose700,
      activeFg: colors.white,
    },
    unrecorded: {
      bg: colors.purple100,
      fg: colors.purple900,
      border: colors.purple300,
      activeBg: colors.purple700,
      activeFg: colors.white,
    },
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? palette.activeBg : palette.bg,
          borderColor: active ? palette.activeBg : palette.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? palette.activeFg : palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
      {trailing ? (
        <Text style={[styles.chipTrailing, { color: active ? palette.activeFg : colors.amber700 }]}>{trailing}</Text>
      ) : null}
    </Pressable>
  );
}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  dark,
  accessibilityLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  dark?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segmented, dark && styles.segmentedDark]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && (dark ? styles.segmentActiveDark : styles.segmentActive)]}
          >
            <Text
              style={[
                styles.segmentText,
                dark && { color: colors.parchment200 },
                active && { color: dark ? colors.white : colors.amber900, fontFamily: fonts.sansBold },
              ]}
              numberOfLines={1}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Layout helpers ---------- */

export function SectionLabel({ children, right, color }: { children: ReactNode; right?: ReactNode; color?: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[styles.sectionLabel, color ? { color } : null]}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Dark leather app header used at the top of each tab. */
export function BrandHeader({ subtitle, right, children }: { subtitle?: string; right?: ReactNode; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <LogoIcon size={20} color={colors.amber50} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.brandTitle} accessibilityRole="header">
              BIBLIATREE
            </Text>
            {subtitle ? (
              <Text style={styles.brandSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function HorizontalChips({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.hChips, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function IconButton({
  onPress,
  children,
  label,
  dark,
  style,
}: {
  onPress: () => void;
  children: ReactNode;
  label: string;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        dark ? styles.iconButtonDark : styles.iconButtonLight,
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeText: { fontFamily: fonts.sansSemi, fontSize: 11 },
  button: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10 },
  buttonText: { fontFamily: fonts.sansSemi, fontSize: 14 },
  buttonTextSmall: { fontSize: 12.5 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 12.5 },
  chipTrailing: { fontFamily: fonts.sansBold, fontSize: 11 },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.parchment100,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.parchment300,
  },
  segmentedDark: { backgroundColor: colors.headerField, borderColor: "rgba(245,158,11,0.3)" },
  segment: { flex: 1, minHeight: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentActive: { backgroundColor: colors.white, ...shadow.card },
  segmentActiveDark: { backgroundColor: colors.amber600 },
  segmentText: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.stone600 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.stone500,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.parchment300,
    padding: 16,
    ...shadow.card,
  },
  header: {
    backgroundColor: colors.header,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(217,119,6,0.6)",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.amber600,
    borderWidth: 1,
    borderColor: "rgba(252,211,77,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 2, color: colors.amber100 },
  brandSubtitle: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.parchment300 },
  hChips: { gap: 6, paddingRight: 16, alignItems: "center" },
  iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  iconButtonDark: { backgroundColor: colors.headerField, borderColor: "rgba(245,158,11,0.4)" },
  iconButtonLight: { backgroundColor: colors.white, borderColor: colors.parchment300 },
});
