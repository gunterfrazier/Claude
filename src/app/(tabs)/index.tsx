import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { FigureBadges } from "@/components/figure-bits";
import { ChevronDownIcon, CloseIcon, SearchIcon } from "@/components/icons";
import { PersonPicker } from "@/components/person-picker";
import { TreeCanvas } from "@/components/tree-canvas";
import { BrandHeader, Button, Chip, HorizontalChips, IconButton, Segmented } from "@/components/ui";
import { buildSubgraph, getFigure } from "@/lib/graph";
import { layoutTree } from "@/lib/tree-layout";
import { DEPTH_OPTIONS, useAppState, type Depth } from "@/state/app-state";
import { colors, fonts, radius, shadow } from "@/theme";

const FEATURED = [
  { id: "adam", label: "Adam" },
  { id: "noah", label: "Noah" },
  { id: "abraham", label: "Abraham" },
  { id: "jacob", label: "Jacob (Israel)" },
  { id: "moses", label: "Moses" },
  { id: "ruth", label: "Ruth" },
  { id: "david", label: "King David" },
  { id: "solomon", label: "Solomon" },
  { id: "jesus", label: "Jesus" },
];

const STANDALONE = [
  { id: "melchizedek", label: "Melchizedek" },
  { id: "elijah", label: "Elijah" },
  { id: "job", label: "Job" },
  { id: "daniel", label: "Daniel" },
  { id: "esther", label: "Esther" },
  { id: "paul", label: "Paul" },
  { id: "mary_magdalene", label: "Mary Magdalene" },
];

const LEGEND = [
  { color: colors.amber600, label: "Selected" },
  { color: colors.blue600, label: "Highlighted lineage" },
  { color: colors.rose600, label: "Messianic line" },
  { color: colors.purple600, label: "No recorded genealogy / contemporary" },
];

export default function TreeScreen() {
  const router = useRouter();
  const app = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);

  const highlightedSet = useMemo(() => new Set(app.highlight?.path ?? []), [app.highlight]);
  const genMap = useMemo(
    () =>
      buildSubgraph(app.focusId, {
        maxDepth: app.depth,
        includeSpouses: app.showSpouses,
        includeSiblings: app.showSiblings,
        highlightedPath: app.highlight?.path,
      }),
    [app.focusId, app.depth, app.showSpouses, app.showSiblings, app.highlight],
  );
  const layout = useMemo(() => layoutTree(genMap, app.focusId), [genMap, app.focusId]);

  const focus = getFigure(app.focusId)!;
  const selected = getFigure(app.selectedId);

  const trace = (id: string) => {
    if (!app.traceFromAdam(id)) {
      Alert.alert("No connected line", `${getFigure(id)?.name ?? "This figure"} has no recorded genealogical path back to Adam.`);
    }
  };

  return (
    <View style={styles.screen}>
      <BrandHeader
        subtitle="Interactive Family Tree"
        right={
          <IconButton dark label="Find a figure to build the tree for" onPress={() => setPickerOpen(true)}>
            <SearchIcon size={18} color={colors.amber300} />
          </IconButton>
        }
      >
        <HorizontalChips>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Building tree for ${focus.name}. Change person.`}
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.focusPill, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.focusPillLabel}>TREE FOR</Text>
            <Text style={styles.focusPillName} numberOfLines={1}>
              {focus.name}
            </Text>
            <ChevronDownIcon size={14} color={colors.amber300} />
          </Pressable>
          {FEATURED.map((f) => (
            <Chip key={f.id} tone="dark" label={f.label} active={f.id === app.focusId} onPress={() => app.focusOn(f.id)} />
          ))}
          <Text style={styles.chipDivider}>No recorded lineage:</Text>
          {STANDALONE.map((f) => (
            <Chip key={f.id} tone="darkPurple" label={f.label} active={f.id === app.focusId} onPress={() => app.focusOn(f.id)} />
          ))}
        </HorizontalChips>

        <HorizontalChips>
          <View style={{ width: 200 }}>
            <Segmented<Depth>
              dark
              accessibilityLabel="Generations shown"
              options={DEPTH_OPTIONS.map((o) => ({ value: o.value, label: o.short }))}
              value={app.depth}
              onChange={app.setDepth}
            />
          </View>
          <Chip
            tone="dark"
            label={`${app.showSpouses ? "✓ " : ""}Spouses`}
            active={app.showSpouses}
            onPress={() => app.setShowSpouses(!app.showSpouses)}
          />
          <Chip
            tone="dark"
            label={`${app.showSiblings ? "✓ " : ""}Siblings`}
            active={app.showSiblings}
            onPress={() => app.setShowSiblings(!app.showSiblings)}
          />
          <Chip tone="darkPurple" label="✨ Trace line from Adam" onPress={() => trace(app.selectedId ?? app.focusId)} />
        </HorizontalChips>
      </BrandHeader>

      <View style={{ flex: 1 }}>
        <TreeCanvas
          layout={layout}
          focusId={app.focusId}
          selectedId={app.selectedId}
          highlighted={highlightedSet}
          recenterToken={app.recenterToken}
          onSelect={app.select}
          onLongPress={(id) => app.focusOn(id, { keepHighlight: true })}
          bottomInset={selected ? sheetHeight : 0}
        />

        <View style={styles.overlayTop} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Centered on ${focus.name}, ${layout.positions.size} figures shown. ${legendOpen ? "Hide" : "Show"} legend.`}
            onPress={() => setLegendOpen((v) => !v)}
            style={styles.infoPill}
          >
            <Text style={styles.infoText} numberOfLines={1}>
              <Text style={styles.infoMuted}>Centered on </Text>
              <Text style={styles.infoName}>{focus.name}</Text>
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{layout.positions.size} in view</Text>
            </View>
            <Text style={styles.legendToggle}>{legendOpen ? "▴" : "Legend ▾"}</Text>
          </Pressable>
          {legendOpen ? (
            <View style={styles.legend}>
              {LEGEND.map((l) => (
                <View key={l.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                  <Text style={styles.legendText}>{l.label}</Text>
                </View>
              ))}
              <View style={styles.legendRow}>
                <View style={[styles.legendLine, { backgroundColor: colors.amber700 }]} />
                <Text style={styles.legendText}>Parent → child · ∞ marriage</Text>
              </View>
              <Text style={styles.legendHint}>
                Tap a card to inspect it. Long-press a card to rebuild the tree around that person. Pinch to zoom.
              </Text>
            </View>
          ) : null}

          {app.highlight ? (
            <View style={styles.lineageBanner}>
              <Text style={styles.lineageText} numberOfLines={3}>
                {app.highlight.label}
              </Text>
              <Pressable accessibilityRole="button" onPress={app.clearHighlight} style={styles.lineageClear}>
                <Text style={styles.lineageClearText}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {selected ? (
          <View style={styles.sheet} onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height + 16)}>
            <View style={styles.sheetHead}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.sheetName}>{selected.name}</Text>
                <Text style={styles.sheetTitle} numberOfLines={2}>
                  {selected.title}
                </Text>
              </View>
              <IconButton label="Close" onPress={() => app.select(null)}>
                <CloseIcon size={16} color={colors.stone600} />
              </IconButton>
            </View>
            <FigureBadges figure={selected} />
            <View style={styles.sheetActions}>
              <Button
                small
                label="Open Dossier"
                onPress={() => router.push({ pathname: "/person/[id]", params: { id: selected.id } })}
                style={{ flex: 1 }}
              />
              {selected.id !== app.focusId ? (
                <Button
                  small
                  tone="secondary"
                  label="Focus Tree Here"
                  onPress={() => app.focusOn(selected.id, { keepHighlight: true })}
                  style={{ flex: 1 }}
                />
              ) : (
                <Button small tone="blue" label="Trace from Adam" onPress={() => trace(selected.id)} style={{ flex: 1 }} />
              )}
            </View>
          </View>
        ) : null}
      </View>

      <PersonPicker
        visible={pickerOpen}
        title="Build Tree For…"
        selectedId={app.focusId}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => {
          setPickerOpen(false);
          app.focusOn(id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  focusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.headerField,
    borderColor: "rgba(217,119,6,0.6)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 34,
    maxWidth: 230,
  },
  focusPillLabel: { fontFamily: fonts.sansBold, fontSize: 9.5, letterSpacing: 1, color: colors.amber400 },
  focusPillName: { fontFamily: fonts.displaySemi, fontSize: 13, color: colors.amber50, flexShrink: 1 },
  chipDivider: { fontFamily: fonts.sans, fontSize: 11, color: colors.parchment400, marginLeft: 6 },
  overlayTop: { position: "absolute", top: 10, left: 10, right: 10, gap: 8, alignItems: "flex-start" },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "100%",
    ...shadow.card,
  },
  infoText: { flexShrink: 1 },
  infoMuted: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.stone500 },
  infoName: { fontFamily: fonts.display, fontSize: 13, color: colors.amber900 },
  countBadge: { backgroundColor: colors.amber100, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { fontFamily: fonts.sansSemi, fontSize: 11, color: colors.amber900 },
  legendToggle: { fontFamily: fonts.sansSemi, fontSize: 11, color: colors.amber800 },
  legend: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
    maxWidth: 320,
    ...shadow.card,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLine: { width: 14, height: 2.5, borderRadius: 2 },
  legendText: { fontFamily: fonts.sans, fontSize: 12, color: colors.stone700 },
  legendHint: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.stone500, marginTop: 4, lineHeight: 16 },
  lineageBanner: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(23,37,84,0.95)",
    borderColor: "rgba(96,165,250,0.4)",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...shadow.raised,
  },
  lineageText: { flex: 1, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.blue50 },
  lineageClear: { backgroundColor: colors.blue800, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  lineageClearText: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.white },
  sheet: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.parchment300,
    padding: 14,
    gap: 10,
    ...shadow.raised,
  },
  sheetHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  sheetName: { fontFamily: fonts.display, fontSize: 18, color: colors.amber950 },
  sheetTitle: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 17, color: colors.stone600 },
  sheetActions: { flexDirection: "row", gap: 8 },
});
