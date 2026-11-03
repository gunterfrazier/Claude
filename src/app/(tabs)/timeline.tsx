import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { CloseIcon } from "@/components/icons";
import { BrandHeader, Button, Chip, HorizontalChips, IconButton, Segmented } from "@/components/ui";
import type { Figure } from "@/data/types";
import { allFigures, getFigure } from "@/lib/graph";
import { GROUP_FILTERS, matchesGroup, type GroupFilter } from "@/lib/search";
import { colors, fonts, radius, shadow } from "@/theme";

type Scale = "AM" | "HISTORY";

interface Row {
  figure: Figure;
  from: number;
  to: number;
  kind: string;
  /** Shown instead of the dates, for a figure placed at a point rather than over a span. */
  note?: string;
}

/**
 * Converts years after creation (Genesis 5 & 11) to BC on the chronology of the dated figures.
 * Abraham was born in year 1948 and c. 2166 BC, putting creation c. 4114 BC.
 */
const AM_TO_BC = (() => {
  const abraham = getFigure("abraham");
  return abraham?.am && abraham.dates ? abraham.dates.from - abraham.am.from : -4114;
})();

/** Figures with no recorded lifespan, placed where Scripture puts them (years after creation). */
const MARKERS: { id: string; am: number; note: string }[] = [
  { id: "eve", am: 0, note: "Made with Adam (Genesis 1:27; 2:22) · lifespan not recorded" },
];

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
    min: Math.floor(AM_TO_BC / 100) * 100,
    max: 100,
    step: 100,
    events: [
      { year: AM_TO_BC, label: "Creation" },
      { year: 1656 + AM_TO_BC, label: "The Flood" },
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
const ROW_H = 40;
const PAD = 24;
/** Height of the year labels at the top of the axis; event labels go in lanes below them. */
const TICKS_H = 24;
const EVENT_LANE_H = 15;
/** Space the chart leaves to the left of the first row in view. */
const FOLLOW_LEAD = 24;
/** Fastest the chart slides sideways, in points per point scrolled down, so big gaps in dates glide. */
const FOLLOW_MAX_SLOPE = 3;
/** Scrolling this far down or up eases a sideways scroll of the user's back into the follow. */
const FOLLOW_RELAX = 600;

/** Rough rendered width of a line of text, to lay labels out before they are measured. */
const textWidth = (chars: number, perChar: number) => chars * perChar;

interface FollowPath {
  /** Chart x of each row's start (rows are in date order, so these never decrease). */
  starts: number[];
  /** Lowest `starts[j] - FOLLOW_MAX_SLOPE * top of row j` over rows j up to each row. */
  floors: number[];
}

function followPath(starts: number[]): FollowPath {
  const floors: number[] = [];
  starts.forEach((s, i) => floors.push(Math.min(floors[i - 1] ?? Infinity, s - FOLLOW_MAX_SLOPE * i * ROW_H)));
  return { starts, floors };
}

/**
 * Sideways scroll position that keeps the rows in view on screen. Rows are in date order, so the
 * first row in view starts earliest: show its start with a small lead. It follows the start
 * continuously as the list scrolls (between rows too), and where the dates jump it slides no faster
 * than FOLLOW_MAX_SLOPE, catching up over the next few rows instead of lurching.
 */
function followX({ starts, floors }: FollowPath, y: number, maxX: number): number {
  "worklet";
  const n = starts.length;
  if (n === 0) return 0;
  const f = Math.min(Math.max(y / ROW_H, 0), n - 1);
  const i = Math.floor(f);
  const j = Math.min(n - 1, i + 1);
  const start = starts[i] + (starts[j] - starts[i]) * (f - i);
  // The highest path at or below `start` whose slope never exceeds FOLLOW_MAX_SLOPE.
  const limited = Math.min(start, floors[i] + FOLLOW_MAX_SLOPE * f * ROW_H);
  return Math.min(maxX, Math.max(0, limited - FOLLOW_LEAD));
}

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
  if (row.note) return row.note;
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
    const markers = new Map(MARKERS.map((m) => [m.id, m]));
    const offset = scale === "HISTORY" ? AM_TO_BC : 0;
    for (const f of allFigures) {
      if (messianicOnly && !f.messianic) continue;
      if (!matchesGroup(f, group)) continue;
      const marker = markers.get(f.id);
      if (scale === "HISTORY" && f.dates) out.push({ figure: f, from: f.dates.from, to: f.dates.to, kind: f.dates.kind });
      // Before Abraham, dates come from the ages in Genesis 5 & 11.
      else if (f.am) out.push({ figure: f, from: f.am.from + offset, to: f.am.to + offset, kind: "life" });
      else if (marker) out.push({ figure: f, from: marker.am + offset, to: marker.am + offset, kind: "life", note: marker.note });
    }
    // A figure placed at a point sorts after the figures whose lives begin there (Eve after Adam).
    return out.sort((a, b) => a.from - b.from || Number(Boolean(a.note)) - Number(Boolean(b.note)) || a.to - b.to);
  }, [scale, group, messianicOnly]);

  const selected = rows.find((r) => r.figure.id === selectedId) ?? null;
  const contemporaries = selected
    ? rows.filter((r) => r !== selected && r.from <= selected.to && r.to >= selected.from).length
    : 0;
  const isContemporary = (r: Row) => !selected || (r.from <= selected.to && r.to >= selected.from);

  // As the list scrolls, the chart slides sideways so the people in view stay on screen. This runs
  // on the UI thread with the scroll, so the chart glides with it rather than jumping behind it.
  const chartRef = useAnimatedRef<Animated.ScrollView>();
  const listRef = useRef<FlatList<Row>>(null);
  const [chartW, setChartW] = useState(0);
  const maxX = Math.max(0, width - chartW);
  const path = useMemo(() => followPath(rows.map((r) => PAD + (r.from - cfg.min) * ppy)), [rows, cfg.min, ppy]);
  const listY = useSharedValue(0);
  const chartX = useSharedValue(0);
  /** How far the user has scrolled the chart sideways from where the follow would put it. */
  const userOffset = useSharedValue(0);

  const onListScroll = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        const y = e.contentOffset.y;
        const offset = userOffset.get() * Math.exp(-Math.abs(y - listY.get()) / FOLLOW_RELAX);
        userOffset.set(Math.abs(offset) < 0.5 ? 0 : offset);
        listY.set(y);
        const target = Math.min(maxX, Math.max(0, followX(path, y, maxX) + userOffset.get()));
        scrollTo(chartRef, target, 0, false);
      },
    },
    [path, maxX],
  );
  const rememberUserOffset = (x: number) => {
    "worklet";
    userOffset.set(x - followX(path, listY.get(), maxX));
  };
  const onChartScroll = useAnimatedScrollHandler(
    {
      onScroll: (e) => chartX.set(e.contentOffset.x),
      onEndDrag: (e) => rememberUserOffset(e.contentOffset.x),
      onMomentumEnd: (e) => rememberUserOffset(e.contentOffset.x),
    },
    [path, maxX],
  );

  // New rows or zoom: back to the top, with the chart on the first rows.
  useEffect(() => {
    userOffset.set(0);
    listY.set(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    chartRef.current?.scrollTo({ x: followX(path, 0, maxX), animated: false });
  }, [path, maxX, chartRef, listY, userOffset]);

  const ticks = useMemo(() => {
    const every = ppy < 0.5 ? cfg.step * 2 : ppy > 2 ? cfg.step / 2 : cfg.step;
    const out: number[] = [];
    for (let y = Math.ceil(cfg.min / every) * every; y <= cfg.max; y += every) out.push(y);
    return out;
  }, [cfg, ppy]);

  // Event labels go in lanes so they never overlap; one that would run off the end of the chart
  // is drawn to the left of its line instead.
  const events = useMemo(() => {
    const laneEnds: number[] = [];
    const placed = [...cfg.events]
      .sort((a, b) => a.year - b.year)
      .map((e) => {
        const at = PAD + (e.year - cfg.min) * ppy;
        const w = textWidth(e.label.length, 6) + 12;
        const flip = at + w > width - 4;
        const [from, to] = flip ? [at - w, at] : [at, at + w];
        let lane = laneEnds.findIndex((end) => end + 6 <= from);
        if (lane < 0) lane = laneEnds.push(to) - 1;
        else laneEnds[lane] = to;
        return { ...e, at, flip, lane };
      });
    return { placed, lanes: Math.max(1, laneEnds.length) };
  }, [cfg, ppy, width]);
  const axisH = TICKS_H + events.lanes * EVENT_LANE_H + 6;
  const eventXs = useMemo(() => events.placed.map((e) => e.at), [events]);
  const toggleSelected = useCallback((id: string) => setSelectedId((cur) => (cur === id ? null : id)), []);

  const axis = (
    <View style={[styles.axis, { width, height: axisH }]}>
      {ticks.map((y) => (
        <View key={y} style={[styles.tick, { left: x(y) }]}>
          <Text style={styles.tickLabel}>{scale === "AM" ? y : y <= 0 ? `${y === 0 ? 1 : -y} BC` : `AD ${y}`}</Text>
        </View>
      ))}
      {events.placed.map((e) => (
        <View
          key={e.label}
          style={[
            styles.eventFlag,
            { top: TICKS_H + e.lane * EVENT_LANE_H },
            e.flip ? [styles.eventFlagFlipped, { right: width - e.at }] : { left: e.at },
          ]}
        >
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
            { value: "HISTORY", label: "Adam → Apostles" },
            { value: "AM", label: "Genesis years" },
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
          {scale === "AM" ? "Years after creation (Genesis 5 & 11)" : "Approximate dates; before Abraham from Genesis 5 & 11"}
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

      <Animated.ScrollView
        ref={chartRef}
        horizontal
        onScroll={onChartScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
        style={{ flex: 1 }}
        contentContainerStyle={{ width }}
      >
        {/* The axis sits above the list (not in it), so it stays put while the rows scroll. */}
        <View style={{ width }}>
          {axis}
          <Animated.FlatList
            ref={listRef}
            onScroll={onListScroll}
            scrollEventThrottle={16}
            style={{ flex: 1, width }}
            data={rows}
            keyExtractor={(r) => r.figure.id}
            contentContainerStyle={{ paddingBottom: selected ? 180 : 60 }}
            initialNumToRender={25}
            windowSize={7}
            getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
            ListEmptyComponent={<Text style={[styles.empty, { marginLeft: 16 }]}>No dated figures match these filters.</Text>}
            renderItem={({ item }) => (
              <TimelineRow
                row={item}
                scale={scale}
                left={x(item.from)}
                barW={Math.max(6, (item.to - item.from) * ppy)}
                width={width}
                eventXs={eventXs}
                active={item.figure.id === selectedId}
                dim={!isContemporary(item)}
                chartX={chartX}
                onToggle={toggleSelected}
              />
            )}
          />
        </View>
      </Animated.ScrollView>

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
                {selected.note ??
                  `${KIND_LABELS[selected.kind]}: ${formatRange(selected, scale)}${scale === "AM" ? " after creation" : ""}`}
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

interface TimelineRowProps {
  row: Row;
  scale: Scale;
  /** Where the bar starts and how long it is, in chart points. */
  left: number;
  barW: number;
  /** Width of the whole chart. */
  width: number;
  eventXs: readonly number[];
  active: boolean;
  dim: boolean;
  /** The chart's sideways scroll position. */
  chartX: SharedValue<number>;
  onToggle: (id: string) => void;
}

const TimelineRow = memo(function TimelineRow({
  row,
  scale,
  left,
  barW,
  width,
  eventXs,
  active,
  dim,
  chartX,
  onToggle,
}: TimelineRowProps) {
  const { figure } = row;
  const range = formatRange(row, scale);
  const labelW = textWidth(figure.name.length + (figure.messianic ? 2 : 0), 7) + textWidth(range.length + 1, 5.8);
  // A label that would run past the end of the chart is drawn against the end instead.
  const pinEnd = left + labelW > width - 8;
  // Otherwise it slides along its bar to stay on screen while the bar is scrolled partly off the left.
  const maxSlide = pinEnd ? 0 : Math.max(0, Math.min(barW - 28, width - 8 - labelW - left));
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.min(maxSlide, Math.max(0, chartX.get() + 8 - left)) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${figure.name}, ${row.note ? "" : `${KIND_LABELS[row.kind] ?? ""} `}${range}`}
      onPress={() => onToggle(figure.id)}
      style={[styles.row, { width }]}
    >
      {eventXs.map((at) => (
        <View key={at} style={[styles.eventLine, { left: at }]} />
      ))}
      <Animated.View
        style={[styles.rowLabelBox, pinEnd ? { right: 8 } : { left }, pinEnd ? null : labelStyle, { opacity: dim ? 0.3 : 1 }]}
      >
        <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
          {figure.messianic ? "★ " : ""}
          {figure.name} <Text style={styles.rowYears}>{range}</Text>
        </Text>
      </Animated.View>
      <View
        style={[
          styles.bar,
          { left, width: barW, backgroundColor: KIND_COLORS[row.kind] ?? colors.amber600, opacity: dim ? 0.25 : 1 },
          active && styles.barActive,
        ]}
      />
    </Pressable>
  );
});

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
  axis: { backgroundColor: colors.canvas, borderBottomColor: colors.parchment300, borderBottomWidth: 1 },
  tick: { position: "absolute", top: 0, bottom: 0, borderLeftColor: colors.parchment300, borderLeftWidth: 1, paddingLeft: 3 },
  tickLabel: { fontFamily: fonts.sansSemi, fontSize: 10, lineHeight: 14, color: colors.stone500, marginTop: 5 },
  eventFlag: { position: "absolute", height: EVENT_LANE_H - 2, borderLeftColor: colors.rose600, borderLeftWidth: 2, paddingLeft: 3 },
  eventFlagFlipped: { borderLeftWidth: 0, paddingLeft: 0, borderRightColor: colors.rose600, borderRightWidth: 2, paddingRight: 3 },
  eventLabel: { fontFamily: fonts.sansBold, fontSize: 9.5, lineHeight: EVENT_LANE_H - 2, color: colors.rose700 },
  row: { height: ROW_H },
  eventLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(225,29,72,0.18)" },
  rowLabelBox: { position: "absolute", top: 4 },
  rowLabel: { fontFamily: fonts.sansSemi, fontSize: 11.5, lineHeight: 16, color: colors.stone800 },
  rowLabelActive: { color: colors.amber900, fontFamily: fonts.sansBold },
  rowYears: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.stone500 },
  bar: { position: "absolute", top: 24, height: 9, borderRadius: 5 },
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
