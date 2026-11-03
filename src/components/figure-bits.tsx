import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { Badge, Chip } from "@/components/ui";
import type { Figure, Role, Scripture } from "@/data/types";
import { TRANSLATIONS, usePassage, type TranslationId } from "@/lib/bible";
import { resolveFigures } from "@/lib/graph";
import { findReferences } from "@/lib/references";
import { useUserData } from "@/state/user-data";
import { colors, fonts, radius } from "@/theme";

export const ROLE_LABELS: Record<Role, string> = {
  patriarch: "Patriarch",
  matriarch: "Matriarch",
  king: "King",
  queen: "Queen",
  prophet: "Prophet",
  priest: "Priest",
  judge: "Judge",
  apostle: "Apostle",
  ruler: "Ruler / Official",
};

export function FigureBadges({ figure, showEra = true }: { figure: Figure; showEra?: boolean }) {
  return (
    <View style={styles.badgeRow}>
      {showEra ? <Badge label={figure.era} /> : null}
      {figure.messianic ? <Badge label="★ Messianic Line" tone="messianic" /> : null}
      {figure.unrecordedGenealogy ? <Badge label="📜 No Recorded Genealogy" tone="unrecorded" /> : null}
    </View>
  );
}

/** Opens the passage reader for a reference. */
export function useOpenPassage() {
  const router = useRouter();
  return (ref: string) => router.push({ pathname: "/passage", params: { ref } });
}

/** Text in which scripture references (e.g. "Genesis 5:5") are tappable. */
export function LinkedText({
  text,
  style,
  linkStyle,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
}) {
  const open = useOpenPassage();
  const parts = findReferences(text);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.ref ? (
          <Text
            key={i}
            style={[styles.inlineRef, linkStyle]}
            onPress={() => open(p.ref!)}
            accessibilityRole="link"
            accessibilityHint="Opens the passage"
          >
            {p.text}
          </Text>
        ) : (
          p.text
        ),
      )}
    </Text>
  );
}

/** A scripture citation with its text in the reader's chosen translation. */
export function ScriptureCard({ scripture, maxVerses = 6 }: { scripture: Scripture; maxVerses?: number }) {
  const { translation } = useUserData();
  const open = useOpenPassage();
  const passage = usePassage(scripture.ref, translation);
  const verses = passage.sections?.flatMap((s) => s.verses) ?? [];
  const multi = verses.length > 1;
  const shown = verses.slice(0, maxVerses);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${scripture.ref}${scripture.note ? `, ${scripture.note}` : ""}. Read the passage.`}
      onPress={() => open(scripture.ref)}
      style={({ pressed }) => [styles.scripture, pressed && { borderColor: colors.amber500 }]}
    >
      <View style={styles.scriptureHead}>
        <View style={styles.refPill}>
          <Text style={styles.refText}>📖 {scripture.ref}</Text>
        </View>
        {scripture.note ? (
          <Text style={styles.scriptureNote} numberOfLines={2}>
            {scripture.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.quote}>
        {passage.status === "loading" ? (
          <ActivityIndicator size="small" color={colors.amber700} style={{ alignSelf: "flex-start" }} />
        ) : passage.status === "error" ? (
          <Text style={styles.error}>{passage.message}</Text>
        ) : (
          <Text style={styles.quoteText}>
            {shown.map((v, i) => (
              <Text key={`${v.chapter}:${v.verse}`}>
                {multi ? <Text style={styles.verseNum}>{v.verse} </Text> : null}
                {v.text}
                {i < shown.length - 1 ? " " : ""}
              </Text>
            ))}
            {verses.length > shown.length ? <Text style={styles.more}> … ({verses.length - shown.length} more)</Text> : null}
          </Text>
        )}
      </View>
      <View style={styles.cardFoot}>
        <Text style={styles.translationTag}>{translation}</Text>
        <Text style={styles.readLink}>Read in context ›</Text>
      </View>
    </Pressable>
  );
}

/** Compact one-line verse preview used in lists. */
export function ScriptureSnippet({ refText, numberOfLines = 3 }: { refText: string; numberOfLines?: number }) {
  const { translation } = useUserData();
  const passage = usePassage(refText, translation);
  const text = passage.sections?.flatMap((s) => s.verses.map((v) => v.text)).join(" ");
  return (
    <Text style={styles.snippet} numberOfLines={numberOfLines}>
      <Text style={styles.snippetRef}>{refText} — </Text>
      {text ? `“${text}”` : "…"}
    </Text>
  );
}

export function RelativeChips({
  ids,
  empty,
  onPress,
  annotate,
}: {
  ids: string[] | undefined;
  empty: string;
  onPress: (id: string) => void;
  /** Short qualifier shown after the name, e.g. "19 gen." */
  annotate?: (id: string) => string | undefined;
}) {
  const people = resolveFigures(ids);
  if (people.length === 0) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={styles.chipWrap}>
      {people.map((p) => {
        const note = annotate?.(p.id);
        return <Chip key={p.id} label={note ? `${p.name} · ${note}` : p.name} trailing="→" onPress={() => onPress(p.id)} />;
      })}
    </View>
  );
}

export function TranslationPicker({
  value,
  onChange,
  compact,
}: {
  value: TranslationId;
  onChange: (t: TranslationId) => void;
  compact?: boolean;
}) {
  return (
    <View
      style={[styles.translationRow, compact && { gap: 4 }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Bible translation"
    >
      {TRANSLATIONS.map((t) => {
        const active = t.id === value;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={t.name}
            onPress={() => onChange(t.id)}
            style={[styles.translationChip, active && styles.translationChipActive]}
          >
            <Text style={[styles.translationChipText, active && styles.translationChipTextActive]}>{t.short}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  inlineRef: { color: colors.amber800, fontFamily: fonts.sansSemi, textDecorationLine: "underline" },
  scripture: {
    backgroundColor: colors.parchment50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.parchment200,
    padding: 12,
    gap: 8,
  },
  scriptureHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  refPill: {
    backgroundColor: colors.amber100,
    borderColor: "rgba(252,211,77,0.6)",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  refText: { fontFamily: fonts.display, fontSize: 12, color: colors.amber900 },
  scriptureNote: { fontFamily: fonts.sansSemi, fontSize: 11.5, color: colors.stone600, flexShrink: 1, textAlign: "right" },
  quote: { borderLeftWidth: 2, borderLeftColor: colors.amber600, paddingLeft: 10, minHeight: 20, justifyContent: "center" },
  quoteText: { fontFamily: fonts.serif, fontSize: 14.5, lineHeight: 22, color: colors.stone800 },
  verseNum: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.amber700 },
  more: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.stone500 },
  error: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.rose700 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  translationTag: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 0.8, color: colors.stone400 },
  readLink: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.amber800 },
  snippet: {
    fontFamily: fonts.serifItalic,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.stone700,
    backgroundColor: colors.parchment50,
    borderColor: colors.parchment200,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  snippetRef: { fontFamily: fonts.sansSemi, fontStyle: "normal", color: colors.amber900 },
  empty: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.stone400 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  translationRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  translationChip: {
    minWidth: 52,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.parchment300,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  translationChipActive: { backgroundColor: colors.amber700, borderColor: colors.amber700 },
  translationChipText: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.6, color: colors.stone700 },
  translationChipTextActive: { color: colors.white },
});
