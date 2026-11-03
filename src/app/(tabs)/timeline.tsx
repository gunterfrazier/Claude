import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from "react-native";

import { CloseIcon } from "@/components/icons";
import { BrandHeader, Button, Chip, HorizontalChips, IconButton, Segmented } from "@/components/ui";
import type { Figure } from "@/data/types";
import { allFigures } from "@/lib/graph";
import { GROUP_FILTERS, matchesGroup, type GroupFilter } from "@/lib/search";
import { colors, fonts, radius, shadow } from "@/theme";

type Scale = "AM" | "HISTORY";

interface Row {
  figure: Figure;
  from: number;
  to: number;
  kind: string;
}

const SCALES: Record<Scale, { min: number; max: number; step: number; events: { year: number; label: string }[] }> = {
  AM: {
    min: 0,
    max: 2300,
    step: 100,
    events: [
      { year: 1656, label: "The Flood" },
      { year: 1948, label: "Abram born" },
    ],
  },
  HISTORY: {
    min: -2200,
    max: 100,
    step: 100,
    events: [
      { year: -1446, label: "Exodus" },
      { year: -966, label: "Temple begun" },
      { year: -931, label: "Kingdom divided" },
      { year: -722, label: "Fall of Samaria" },
      { year: -586, label: "Fall of Jerusalem" },
      { year: -538, label: "Return from exile" },
      { year: -4, label: "Birth of Jesus" },
      { year: 30, label: "Crucifixion" },
      { year: 70, label: "Temple destroyed" },
    ],
  },
};

const ZOOMS = [0.35, 0.7, 1.4, 2.8] as const;
const ROW_H = 38;
const AXIS_H = 56;
const PAD = 24;

const KIND_COLORS: Record<string, string> = {
  life: colors.amber600,
  reign: colors.blue700,
  ministry: colors.purple600,
  active: colors.parchment600,
};
const KIND_LABELS: Record<string, string> = { life: "Lifetime", reign: "Reign", ministry: "Ministry", active: "Active" };

function formatYear(year: number, scale: Scale): string {
  if (scale === "AM") return `Year ${year}`;
  if (year < 0) return `${-year} BC`;
  if (year === 0) return "1 BC";
  return `AD ${year}`;
}

function formatRange(row: Row, scale: Scale): string {
  const approx = scale === "HISTORY" ? "c. " : "";
  if (scale === "AM") return row.from === row.to ? `Year ${row.from}` : `Years ${row.from}–${row.to}`;
  if (row.from === row.to) return `${approx}${formatYear(row.from, scale)}`;
  if (scale === "HISTORY" && row.from < 0 && row.to < 0) return `${approx}${-row.from}–${-row.to} BC`;
  if (scale === "HISTORY" && row.from > 0) return `${approx}AD ${row.from}–${row.to}`;
  return `${approx}${formatYear(row.from, scale)} – ${formatYear(row.to, scale)}`;
}

export default function TimelineScreen() {
  const router = useRouter();
  const [scale, setScale] = useState<Scale>("HISTORY");
  const [zoom, setZoom] = useState(1);
  const [group, setGroup] = useState<GroupFilter>("ANY");
  const [messianicOnly, setMessianicOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cfg = SCALES[scale];
  const ppy = ZOOMS[zoom];
  const width = (cfg.max - cfg.min) * ppy + PAD * 2;
  const x = (year: number) => PAD + (year - cfg.min) * ppy;

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const f of allFigures) {
      if (messianicOnly && !f.messianic) continue;
      if (!matchesGroup(f, group)) continue;
      if (scale === "AM" && f.am) out.push({ figure: f, from: f.am.from, to: f.am.to, kind: "life" });
      if (scale === "HISTORY" && f.dates) out.push({ figure: f, from: f.dates.from, to: f.dates.to, kind: f.dates.kind });
    }
    return out.sort((a, b) => a.from - b.from || a.to - b.to);
  }, [scale, group, messianicOnly]);

  const selected = rows.find((r) => r.figure.id === selectedId) ?? null;
  const contemporaries = selected
    ? rows.filter((r) => r !== selected && r.from <= selected.to && r.to >= selected.from).length
    : 0;
  const isContemporary = (r: Row) => !selected || (r.from <= selected.to && r.to >= selected.from);

  // As the list scrolls down, slide the chart sideways so the people in view stay on screen.
  const hScroll = useRef<ScrollViewInstance>(null);
  const vList = useRef<FlatList<Row>>(null);
  const followRow = (index: number) => {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (row) hScroll.current?.scrollTo({ x: Math.max(0, x(row.from) - 32), animated: false });
  };
  const onVerticalScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    followRow(Math.floor((e.nativeEvent.contentOffset.y - AXIS_H + ROW_H) / ROW_H));
  };
  useEffect(() => {
    vList.current?.scrollToOffset({ offset: 0, animated: false });
    const first = rows[0];
    if (first) hScroll.current?.scrollTo({ x: Math.max(0, PAD + (first.from - cfg.min) * ppy - 32), animated: false });
  }, [rows, cfg.min, ppy]);

  const ticks = useMemo(() => {
    const every = ppy < 0.5 ? cfg.step * 2 : ppy > 2 ? cfg.step / 2 : cfg.step;
    const out: number[] = [];
    for (let y = Math.ceil(cfg.min / every) * every; y <= cfg.max; y += every) out.push(y);
    return out;
  }, [cfg, ppy]);

  const axis = (
    <View style={[styles.axis, { width }]}>
      {ticks.map((y) => (
        <View key={y} style={[styles.tick, { left: x(y) }]}>
          <Text style={styles.tickLabel}>{scale === "AM" ? y : y <= 0 ? `${y === 0 ? 1 : -y} BC` : `AD ${y}`}</Text>
        </View>
      ))}
      {cfg.events.map((e, i) => (
        <View key={e.label} style={[styles.eventFlag, { left: x(e.year), bottom: i % 2 ? 16 : 2 }]}>
          <Text style={styles.eventLabel} numberOfLines={1}>
            {e.label}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.screen}>
      <BrandHeader subtitle="Timeline of Biblical Figures">
        <Segmented<Scale>
          dark
          accessibilityLabel="Timeline scale"
          options={[
            { value: "AM", label: "Adam → Jacob" },
            { value: "HISTORY", label: "Abraham → Apostles" },
          ]}
          value={scale}
          onChange={(s) => {
            setScale(s);
            setSelectedId(null);
          }}
        />
        <HorizontalChips>
          <Chip
            tone="dark"
            label={`${messianicOnly ? "✓ " : ""}★ Messianic line`}
            active={messianicOnly}
            onPress={() => setMessianicOnly(!messianicOnly)}
          />
          {GROUP_FILTERS.map((g) => (
            <Chip key={g.key} tone="dark" label={g.label} active={group === g.key} onPress={() => setGroup(g.key)} />
          ))}
        </HorizontalChips>
      </BrandHeader>

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          {rows.length} {rows.length === 1 ? "figure" : "figures"} ·{" "}
          {scale === "AM" ? "Years after creation (Genesis 5 & 11)" : "Approximate dates"}
        </Text>
        <View style={styles.zoom}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            onPress={() => setZoom((z) => Math.max(0, z - 1))}
            style={styles.zoomBtn}
          >
            <Text style={styles.zoomText}>−</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            onPress={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
            style={styles.zoomBtn}
          >
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView ref={hScroll} horizontal style={{ flex: 1 }} contentContainerStyle={{ width }}>
        <FlatList
          ref={vList}
          onScroll={onVerticalScroll}
          scrollEventThrottle={32}
          style={{ width }}
          data={rows}
          keyExtractor={(r) => r.figure.id}
          ListHeaderComponent={axis}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: selected ? 180 : 60 }}
          initialNumToRender={25}
          windowSize={7}
          getItemLayout={(_, index) => ({ length: ROW_H, offset: AXIS_H + ROW_H * index, index })}
          ListEmptyComponent={<Text style={[styles.empty, { left: 16 }]}>No dated figures match these filters.</Text>}
          renderItem={({ item }) => {
            const left = x(item.from);
            const barW = Math.max(6, (item.to - item.from) * ppy);
            const active = item.figure.id === selectedId;
            const dim = !isContemporary(item);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.figure.name}, ${KIND_LABELS[item.kind] ?? ""} ${formatRange(item, scale)}`}
                onPress={() => setSelectedId(active ? null : item.figure.id)}
                style={[styles.row, { width }]}
              >
                {cfg.events.map((e) => (
                  <View key={e.label} style={[styles.eventLine, { left: x(e.year) }]} />
                ))}
                <View style={{ position: "absolute", left, top: 4, opacity: dim ? 0.3 : 1 }}>
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
                    {item.figure.messianic ? "★ " : ""}
                    {item.figure.name} <Text style={styles.rowYears}>{formatRange(item, scale)}</Text>
                  </Text>
                </View>
                <View
                  style={[
                    styles.bar,
                    { left, width: barW, backgroundColor: KIND_COLORS[item.kind] ?? colors.amber600, opacity: dim ? 0.25 : 1 },
                    active && styles.barActive,
                  ]}
                />
              </Pressable>
            );
          }}
        />
      </ScrollView>

      <View style={styles.legend} pointerEvents="none">
        {Object.entries(KIND_LABELS).map(([k, label]) =>
          scale === "AM" && k !== "life" ? null : (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: KIND_COLORS[k] }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ),
        )}
      </View>

      {selected ? (
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.sheetName}>{selected.figure.name}</Text>
              <Text style={styles.sheetMeta}>
                {KIND_LABELS[selected.kind]}: {formatRange(selected, scale)}
                {scale === "AM" ? " after creation" : ""}
              </Text>
              <Text style={styles.sheetMeta}>
                Overlaps {contemporaries} other {contemporaries === 1 ? "figure" : "figures"} shown here
              </Text>
            </View>
            <IconButton label="Close" onPress={() => setSelectedId(null)}>
              <CloseIcon size={16} color={colors.stone600} />
            </IconButton>
          </View>
          <Button
            small
            label="Open Dossier"
            onPress={() => router.push({ pathname: "/person/[id]", params: { id: selected.figure.id } })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.parchment100,
    borderBottomColor: colors.parchment300,
    borderBottomWidth: 1,
  },
  infoText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.stone600, flexShrink: 1 },
  zoom: { flexDirection: "row", gap: 6 },
  zoomBtn: {
    width: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.parchment300,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomText: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.stone700 },
  axis: { height: AXIS_H, backgroundColor: colors.canvas, borderBottomColor: colors.parchment300, borderBottomWidth: 1 },
  tick: { position: "absolute", top: 0, bottom: 0, borderLeftColor: colors.parchment300, borderLeftWidth: 1, paddingLeft: 3 },
  tickLabel: { fontFamily: fonts.sansSemi, fontSize: 10, color: colors.stone500, marginTop: 4 },
  eventFlag: { position: "absolute", borderLeftColor: colors.rose600, borderLeftWidth: 2, paddingLeft: 3 },
  eventLabel: { fontFamily: fonts.sansBold, fontSize: 9.5, color: colors.rose700 },
  row: { height: ROW_H },
  eventLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(225,29,72,0.18)" },
  rowLabel: { fontFamily: fonts.sansSemi, fontSize: 11.5, color: colors.stone800 },
  rowLabelActive: { color: colors.amber900, fontFamily: fonts.sansBold },
  rowYears: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.stone500 },
  bar: { position: "absolute", top: 22, height: 9, borderRadius: 5 },
  barActive: { borderWidth: 2, borderColor: colors.stone900 },
  empty: { fontFamily: fonts.sans, fontSize: 13, color: colors.stone500, marginTop: 24 },
  legend: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 12, height: 6, borderRadius: 3 },
  legendText: { fontFamily: fonts.sansMedium, fontSize: 10.5, color: colors.stone600 },
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
  sheetName: { fontFamily: fonts.display, fontSize: 17, color: colors.amber950 },
  sheetMeta: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.stone600 },
});
