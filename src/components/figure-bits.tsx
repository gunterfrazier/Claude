import { StyleSheet, Text, View } from "react-native";

import { Badge, Chip } from "@/components/ui";
import type { Figure, Scripture } from "@/data/types";
import { resolveFigures } from "@/lib/graph";
import { colors, fonts, radius } from "@/theme";

export function FigureBadges({ figure, showEra = true }: { figure: Figure; showEra?: boolean }) {
  return (
    <View style={styles.badgeRow}>
      {showEra ? <Badge label={figure.era} /> : null}
      {figure.messianic ? <Badge label="★ Messianic Line" tone="messianic" /> : null}
      {figure.unrecordedGenealogy ? <Badge label="📜 No Recorded Genealogy" tone="unrecorded" /> : null}
    </View>
  );
}

export function ScriptureCard({ scripture }: { scripture: Scripture }) {
  return (
    <View style={styles.scripture}>
      <View style={styles.scriptureHead}>
        <View style={styles.refPill}>
          <Text style={styles.refText}>📖 {scripture.ref}</Text>
        </View>
        <Text style={styles.scriptureNote} numberOfLines={2}>
          {scripture.note || "Scripture Record"}
        </Text>
      </View>
      <View style={styles.quote}>
        <Text style={styles.quoteText}>“{scripture.text}”</Text>
      </View>
    </View>
  );
}

export function RelativeChips({
  ids,
  empty,
  onPress,
}: {
  ids: string[] | undefined;
  empty: string;
  onPress: (id: string) => void;
}) {
  const people = resolveFigures(ids);
  if (people.length === 0) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={styles.chipWrap}>
      {people.map((p) => (
        <Chip key={p.id} label={p.name} trailing="→" onPress={() => onPress(p.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
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
  quote: { borderLeftWidth: 2, borderLeftColor: colors.amber600, paddingLeft: 10 },
  quoteText: { fontFamily: fonts.serifItalic, fontSize: 14, lineHeight: 21, color: colors.stone800 },
  empty: { fontFamily: fonts.serifItalic, fontSize: 13, color: colors.stone400 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
