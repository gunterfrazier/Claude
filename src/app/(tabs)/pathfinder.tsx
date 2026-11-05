import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScriptureSnippet } from "@/components/figure-bits";
import { ChevronDownIcon, SwapIcon } from "@/components/icons";
import { PersonPicker } from "@/components/person-picker";
import { Badge, BrandHeader, Button, Card, Chip, IconButton } from "@/components/ui";
import { describeRelationshipStep, findShortestPath, formatGenerations, getFigure, stepLink, summarizePath } from "@/lib/graph";
import { useAppState } from "@/state/app-state";
import { colors, fonts, radius, shadow } from "@/theme";

const PRESETS: [string, string][] = [
  ["adam", "jesus"],
  ["abraham", "david"],
  ["jacob", "moses"],
  ["ruth", "solomon"],
];

export default function PathfinderScreen() {
  const router = useRouter();
  const app = useAppState();
  const [startId, setStartId] = useState("abraham");
  const [endId, setEndId] = useState("jesus");
  const [picking, setPicking] = useState<"start" | "end" | null>(null);

  const path = useMemo(() => findShortestPath(startId, endId), [startId, endId]);
  const start = getFigure(startId)!;
  const end = getFigure(endId)!;

  const viewOnTree = () => {
    if (!path) return;
    const chain = path.map((id) => getFigure(id)?.name).join(" → ");
    app.highlightPath(path, `Highlighted path (${path.length - 1} steps): ${chain}`);
    router.navigate("/");
  };

  return (
    <View style={styles.screen}>
      <BrandHeader subtitle="Lineage Pathfinder" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: 14 }}>
          <View>
            <Text style={styles.h2} accessibilityRole="header">
              Biblical Lineage Pathfinder
            </Text>
            <Text style={styles.lead}>
              Pick any two people in the Bible to trace their genealogical connection and generational distance.
            </Text>
          </View>

          <View style={styles.presets}>
            {PRESETS.map(([a, b]) => (
              <Chip
                key={`${a}-${b}`}
                label={`${getFigure(a)?.name.replace(/^King /, "")} → ${getFigure(b)
                  ?.name.replace(/ of Nazareth \(Christ\)$/, "")
                  .replace(/^King /, "")}`}
                active={startId === a && endId === b}
                onPress={() => {
                  setStartId(a);
                  setEndId(b);
                }}
              />
            ))}
          </View>

          <PersonField label="Starting figure (ancestor / relative A)" name={start.name} onPress={() => setPicking("start")} />
          <View style={styles.swapRow}>
            <View style={styles.swapLine} />
            <IconButton
              label="Swap figures"
              onPress={() => {
                setStartId(endId);
                setEndId(startId);
              }}
            >
              <SwapIcon size={18} color={colors.amber800} />
            </IconButton>
            <View style={styles.swapLine} />
          </View>
          <PersonField label="Target figure (descendant / relative B)" name={end.name} onPress={() => setPicking("end")} />

          <Button tone="blue" label="View Highlighted on Tree" onPress={viewOnTree} disabled={!path || path.length < 2} />
        </Card>

        {!path ? (
          <View style={styles.notFound}>
            <Text style={styles.notFoundText}>
              No direct genealogical path was found between <Text style={styles.bold}>{start.name}</Text> and{" "}
              <Text style={styles.bold}>{end.name}</Text> in the recorded Biblical genealogies.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryEyebrow}>VERIFIED GENEALOGICAL CHAIN</Text>
              <Text style={styles.summaryTitle}>
                {start.name} → {end.name}
              </Text>
              <Text style={styles.summaryMeta}>
                {summarizePath(path).direct ? formatGenerations(summarizePath(path)) : `${path.length - 1} links`} · {path.length}{" "}
                figures in chain
              </Text>
              {summarizePath(path).traditional ? (
                <Text style={styles.summaryMeta}>Includes a link based on tradition rather than an explicit statement.</Text>
              ) : null}
            </View>

            {path.map((id, index) => {
              const p = getFigure(id)!;
              const nextId = path[index + 1];
              const verse = p.scriptures[0];
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`Step ${index + 1}: ${p.name}. ${nextId ? describeRelationshipStep(id, nextId) : "Target figure"}. Open dossier.`}
                  onPress={() => router.push({ pathname: "/person/[id]", params: { id } })}
                  style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.amber50 }]}
                >
                  <View style={styles.stepRail}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    {nextId ? <View style={styles.stepConnector} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.stepHead}>
                      <Text style={styles.stepName}>{p.name}</Text>
                      <Badge
                        label={nextId ? describeRelationshipStep(id, nextId) : "Target reached"}
                        tone={nextId ? "amber" : "blue"}
                      />
                    </View>
                    <Text style={styles.stepTitle}>{p.title}</Text>
                    <View style={styles.badgeRow}>
                      <Badge label={p.era} />
                      {p.messianic ? <Badge label="★ Messianic Line" tone="messianic" /> : null}
                    </View>
                    {nextId && stepLink(id, nextId)?.via ? (
                      <Text style={styles.via}>Generations between: {stepLink(id, nextId)!.via!.join(" → ")}</Text>
                    ) : null}
                    {verse ? <ScriptureSnippet refText={verse.ref} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      <PersonPicker
        visible={picking !== null}
        title={picking === "start" ? "Starting Figure" : "Target Figure"}
        selectedId={picking === "start" ? startId : endId}
        onClose={() => setPicking(null)}
        onSelect={(id) => {
          if (picking === "start") setStartId(id);
          else setEndId(id);
          setPicking(null);
        }}
      />
    </View>
  );
}

function PersonField({ label, name, onPress }: { label: string; name: string; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${name}. Change.`}
        onPress={onPress}
        style={({ pressed }) => [styles.field, pressed && { backgroundColor: colors.parchment100 }]}
      >
        <Text style={styles.fieldValue} numberOfLines={1}>
          {name}
        </Text>
        <ChevronDownIcon size={16} color={colors.amber700} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment50 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  h2: { fontFamily: fonts.display, fontSize: 19, color: colors.amber950 },
  lead: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.stone600, marginTop: 4 },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fieldLabel: {
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.stone700,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.parchment300,
    backgroundColor: colors.parchment50,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  fieldValue: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.stone900, flexShrink: 1 },
  swapRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: -4 },
  swapLine: { flex: 1, height: 1, backgroundColor: colors.parchment200 },
  notFound: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber300,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
  },
  notFoundText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.amber950 },
  bold: { fontFamily: fonts.sansBold },
  summary: { backgroundColor: colors.amber900, borderRadius: radius.lg, padding: 16, gap: 3, ...shadow.card },
  summaryEyebrow: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.6, color: colors.amber300 },
  summaryTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.amber50 },
  summaryMeta: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.amber200 },
  step: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
  stepRail: { alignItems: "center" },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.amber700,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontFamily: fonts.display, fontSize: 12, color: colors.white },
  stepConnector: { flex: 1, width: 2, backgroundColor: colors.parchment300, marginTop: 4 },
  stepHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  stepName: { fontFamily: fonts.display, fontSize: 15.5, color: colors.amber950, flexShrink: 1 },
  stepTitle: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17, color: colors.stone600 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  via: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.stone600 },
  verse: {
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
});
