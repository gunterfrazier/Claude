import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, Line, Path, Pattern, Rect, Text as SvgText } from "react-native-svg";

import type { Figure } from "@/data/types";
import { getFigure } from "@/lib/graph";
import { generationLabel, type NodePosition, type TreeLayout } from "@/lib/tree-layout";
import { colors, fonts, shadow } from "@/theme";

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;

interface TreeCanvasProps {
  layout: TreeLayout;
  focusId: string;
  selectedId: string | null;
  highlighted: ReadonlySet<string>;
  recenterToken: number;
  onSelect: (id: string | null) => void;
  onLongPress: (id: string) => void;
  /** Extra space reserved at the bottom of the viewport (for overlays) when centring. */
  bottomInset?: number;
}

interface EdgeShape {
  key: string;
  kind: "parent" | "spouse" | "associate";
  d?: string;
  line?: { x1: number; x2: number; y: number; mid: number };
  stroke: string;
  width: number;
  opacity: number;
  arrow?: string;
}

function buildEdges(
  layout: TreeLayout,
  focusId: string,
  selectedId: string | null,
  highlighted: ReadonlySet<string>,
): EdgeShape[] {
  const { positions, dims } = layout;
  const edges: EdgeShape[] = [];
  const hasHighlight = highlighted.size > 0;
  const curve = (a: NodePosition, b: NodePosition) => {
    const y1 = a.y + dims.nodeH;
    const y2 = b.y - 5;
    const midY = (y1 + y2) / 2;
    return `M ${a.cx} ${y1} C ${a.cx} ${midY}, ${b.cx} ${midY}, ${b.cx} ${y2}`;
  };
  const arrowAt = (b: NodePosition) => `M ${b.cx - 4.5} ${b.y - 9} L ${b.cx + 4.5} ${b.y - 9} L ${b.cx} ${b.y - 2} Z`;

  // Contemporaries / associates (only around the focus or selected figure, to keep the tree readable)
  const drawnAssoc = new Set<string>();
  for (const [id, a] of positions) {
    const p = getFigure(id);
    for (const assocId of p?.associates ?? []) {
      const b = positions.get(assocId);
      if (!p || !b) continue;
      if (![id, assocId].some((x) => x === focusId || x === selectedId)) continue;
      const key = [id, assocId].sort().join("::");
      if (drawnAssoc.has(key)) continue;
      drawnAssoc.add(key);
      if (p.parents.includes(assocId) || p.children.includes(assocId) || p.spouses.includes(assocId)) continue;
      edges.push({
        key: `a-${key}`,
        kind: "associate",
        d: curve(a, b),
        stroke: colors.purple700,
        width: 2,
        opacity: 0.75,
        arrow: arrowAt(b),
      });
    }
  }

  // Marriages: dashed connector with the ∞ medallion
  const drawnSpouse = new Set<string>();
  for (const [id, a] of positions) {
    for (const spouseId of getFigure(id)?.spouses ?? []) {
      const b = positions.get(spouseId);
      if (!b) continue;
      const key = [id, spouseId].sort().join("--");
      if (drawnSpouse.has(key) || Math.abs(a.y - b.y) > 10) continue;
      drawnSpouse.add(key);
      const x1 = Math.min(a.cx, b.cx);
      const x2 = Math.max(a.cx, b.cx);
      // Medallion sits in the gap next to the left card.
      const mid = Math.min(x1 + dims.nodeW / 2 + dims.hGap / 2, (x1 + x2) / 2);
      edges.push({
        key: `s-${key}`,
        kind: "spouse",
        line: { x1, x2, y: a.cy, mid },
        stroke: colors.amber600,
        width: 2.2,
        opacity: 1,
      });
    }
  }

  // Parent → child
  for (const [parentId, a] of positions) {
    for (const childId of getFigure(parentId)?.children ?? []) {
      const b = positions.get(childId);
      if (!b) continue;
      const onPath = highlighted.has(parentId) && highlighted.has(childId);
      const selected =
        parentId === selectedId || childId === selectedId || (!selectedId && (parentId === focusId || childId === focusId));
      edges.push({
        key: `p-${parentId}-${childId}`,
        kind: "parent",
        d: curve(a, b),
        stroke: onPath ? colors.blue700 : selected ? colors.amber700 : colors.parchment500,
        width: onPath ? 3.5 : selected ? 2.6 : 1.8,
        opacity: hasHighlight && !onPath ? 0.35 : 0.9,
        arrow: arrowAt(b),
      });
    }
  }
  return edges;
}

export function TreeCanvas({
  layout,
  focusId,
  selectedId,
  highlighted,
  recenterToken,
  onSelect,
  onLongPress,
  bottomInset = 0,
}: TreeCanvasProps) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const hasCentered = useRef(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport((v) => (v.width === width && v.height === height ? v : { width, height }));
  }, []);

  const centerOn = useCallback(
    (id: string, animate: boolean) => {
      const pos = layout.positions.get(id) ?? layout.positions.values().next().value;
      if (!pos || viewport.width === 0) return;
      const s = scale.get();
      const visibleH = Math.max(200, viewport.height - bottomInset);
      const nextX = viewport.width / 2 - pos.cx * s;
      const nextY = visibleH * 0.45 - pos.cy * s;
      tx.set(animate ? withTiming(nextX, { duration: 320 }) : nextX);
      ty.set(animate ? withTiming(nextY, { duration: 320 }) : nextY);
    },
    [layout, viewport, bottomInset, scale, tx, ty],
  );

  // Latest centerOn for effects that should only fire on explicit recenter requests,
  // not when the bottom sheet height (bottomInset) changes.
  const centerOnRef = useRef(centerOn);
  useEffect(() => {
    centerOnRef.current = centerOn;
  });

  // Initial zoom: fit two to three cards across a phone screen.
  useEffect(() => {
    if (viewport.width === 0 || hasCentered.current) return;
    scale.set(viewport.width < 500 ? 0.82 : 1);
    centerOnRef.current(focusId, false);
    hasCentered.current = true;
  }, [viewport.width, focusId, scale]);

  // Re-centre whenever the app asks (new focus, depth change, lineage highlight).
  useEffect(() => {
    if (hasCentered.current) centerOnRef.current(focusId, true);
  }, [recenterToken, layout, focusId]);

  const zoomBy = useCallback(
    (factor: number) => {
      const current = scale.get();
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor));
      const k = next / current;
      const cx = viewport.width / 2;
      const cy = viewport.height / 2;
      tx.set(withTiming(cx - (cx - tx.get()) * k, { duration: 180 }));
      ty.set(withTiming(cy - (cy - ty.get()) * k, { duration: 180 }));
      scale.set(withTiming(next, { duration: 180 }));
    },
    [scale, tx, ty, viewport],
  );

  const pan = usePanGesture({
    onUpdate: (e) => {
      "worklet";
      tx.set(tx.get() + e.changeX);
      ty.set(ty.get() + e.changeY);
    },
  });

  const pinch = usePinchGesture({
    onUpdate: (e) => {
      "worklet";
      const current = scale.get();
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * e.scaleChange));
      const k = next / current;
      tx.set(e.focalX - (e.focalX - tx.get()) * k);
      ty.set(e.focalY - (e.focalY - ty.get()) * k);
      scale.set(next);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  const edges = useMemo(() => buildEdges(layout, focusId, selectedId, highlighted), [layout, focusId, selectedId, highlighted]);
  const focus = getFigure(focusId);

  return (
    <View style={styles.viewport} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <Pattern id="dots" width={32} height={32} patternUnits="userSpaceOnUse">
                <Circle cx={2} cy={2} r={0.9} fill={colors.parchment400} />
                <Circle cx={18} cy={18} r={0.9} fill={colors.parchment300} />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dots)" />
          </Svg>

          <Pressable style={StyleSheet.absoluteFill} onPress={() => onSelect(null)} accessible={false} />

          <Animated.View style={[styles.canvas, { width: layout.width, height: layout.height }, animatedStyle]}>
            <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill} pointerEvents="none">
              {edges.map((e) =>
                e.kind === "spouse" && e.line ? <SpouseConnector key={e.key} {...e.line} /> : <EdgePath key={e.key} edge={e} />,
              )}
            </Svg>
            {[...layout.positions.values()].map((pos) => {
              const figure = getFigure(pos.id);
              if (!figure) return null;
              const isAssociate =
                Boolean(focus?.associates?.includes(pos.id)) &&
                !focus?.children.includes(pos.id) &&
                !focus?.parents.includes(pos.id);
              return (
                <TreeNodeCard
                  key={pos.id}
                  figure={figure}
                  pos={pos}
                  width={layout.dims.nodeW}
                  height={layout.dims.nodeH}
                  isFocus={pos.id === focusId}
                  isSelected={pos.id === selectedId}
                  isOnPath={highlighted.has(pos.id)}
                  label={generationLabel(pos.gen, pos.id === focusId, isAssociate, Boolean(figure.unrecordedGenealogy))}
                  onSelect={onSelect}
                  onLongPress={onLongPress}
                />
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={[styles.zoomBar, { bottom: bottomInset + 12 }]}>
        <ZoomButton label="−" a11y="Zoom out" onPress={() => zoomBy(1 / 1.25)} />
        <ZoomButton label="+" a11y="Zoom in" onPress={() => zoomBy(1.25)} />
        <ZoomButton label="◎" a11y="Center the tree on the focus person" onPress={() => centerOn(focusId, true)} />
      </View>
    </View>
  );
}

function EdgePath({ edge }: { edge: EdgeShape }) {
  return (
    <>
      <Path
        d={edge.d}
        fill="none"
        stroke={edge.stroke}
        strokeWidth={edge.width}
        strokeOpacity={edge.opacity}
        strokeDasharray={edge.kind === "associate" ? "6,4" : undefined}
      />
      {edge.arrow ? <Path d={edge.arrow} fill={edge.stroke} fillOpacity={edge.opacity} /> : null}
    </>
  );
}

function SpouseConnector({ x1, x2, y, mid }: { x1: number; x2: number; y: number; mid: number }) {
  return (
    <>
      <Line x1={x1} y1={y} x2={x2} y2={y} stroke={colors.amber600} strokeWidth={2.2} strokeDasharray="5,4" />
      <Circle cx={mid} cy={y} r={8} fill={colors.amber100} stroke={colors.amber600} strokeWidth={1.5} />
      <SvgText x={mid} y={y + 3.5} textAnchor="middle" fontSize={10} fontWeight="bold" fill={colors.amber800}>
        ∞
      </SvgText>
    </>
  );
}

function ZoomButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={({ pressed }) => [styles.zoomButton, pressed && { backgroundColor: colors.parchment100 }]}
    >
      <Text style={styles.zoomText}>{label}</Text>
    </Pressable>
  );
}

interface NodeCardProps {
  figure: Figure;
  pos: NodePosition;
  width: number;
  height: number;
  isFocus: boolean;
  isSelected: boolean;
  isOnPath: boolean;
  label: string;
  onSelect: (id: string) => void;
  onLongPress: (id: string) => void;
}

const TreeNodeCard = memo(function TreeNodeCard({
  figure,
  pos,
  width,
  height,
  isFocus,
  isSelected,
  isOnPath,
  label,
  onSelect,
  onLongPress,
}: NodeCardProps) {
  const border = isSelected
    ? colors.amber600
    : isOnPath
      ? colors.blue600
      : figure.messianic
        ? colors.rose300
        : figure.unrecordedGenealogy
          ? colors.purple300
          : colors.parchment300;
  const background = isSelected ? colors.amber50 : isOnPath ? colors.blue50 : colors.white;
  const chipBg = isFocus ? colors.amber700 : isOnPath ? colors.blue700 : colors.parchment100;
  const chipFg = isFocus || isOnPath ? colors.white : colors.stone600;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${figure.name}, ${figure.title}. ${label}.`}
      accessibilityHint="Tap to inspect. Long-press to rebuild the tree around this person."
      onPress={() => onSelect(figure.id)}
      onLongPress={() => onLongPress(figure.id)}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.node,
        {
          left: pos.x,
          top: pos.y,
          width,
          height,
          borderColor: border,
          backgroundColor: background,
          transform: [{ translateY: pressed ? -2 : 0 }],
        },
        (isSelected || isOnPath) && styles.nodeRing,
        isSelected && { shadowColor: colors.amber700 },
        isOnPath && !isSelected && { shadowColor: colors.blue700 },
      ]}
    >
      <View style={styles.nodeTop}>
        <View style={[styles.genChip, { backgroundColor: chipBg }]}>
          <Text style={[styles.genChipText, { color: chipFg }]}>{label}</Text>
        </View>
        <View style={styles.nodeMeta}>
          {figure.messianic ? <Text style={styles.star}>★</Text> : null}
          <View style={styles.countPill}>
            <Text style={styles.countText}>📜 {figure.scriptures.length}</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={styles.nodeName} numberOfLines={2}>
          {figure.name}
        </Text>
        <Text style={styles.nodeTitle} numberOfLines={2}>
          {figure.title}
        </Text>
      </View>
      <View style={styles.nodeFooter}>
        <Text style={styles.nodeEra} numberOfLines={1}>
          {figure.era}
        </Text>
        <Text style={styles.inspect}>Inspect →</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  viewport: { flex: 1, backgroundColor: colors.canvas, overflow: "hidden" },
  canvas: { position: "absolute", left: 0, top: 0, transformOrigin: "left top", pointerEvents: "box-none" },
  node: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 7,
    ...shadow.card,
  },
  nodeRing: { borderWidth: 3, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  nodeTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  genChip: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5 },
  genChipText: { fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 0.6, textTransform: "uppercase" },
  nodeMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  star: { fontSize: 10, color: colors.rose700, fontFamily: fonts.sansBold },
  countPill: { backgroundColor: "rgba(254,243,199,0.85)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  countText: { fontFamily: fonts.sansSemi, fontSize: 9.5, color: colors.amber800 },
  nodeName: { fontFamily: fonts.display, fontSize: 12.5, lineHeight: 15, color: colors.stone900 },
  nodeTitle: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 12.5, color: colors.stone600, marginTop: 2 },
  nodeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.parchment200,
    paddingTop: 3,
  },
  nodeEra: { fontFamily: fonts.sans, fontSize: 9, color: colors.stone500, flexShrink: 1 },
  inspect: { fontFamily: fonts.sansSemi, fontSize: 9, color: colors.amber800 },
  zoomBar: {
    position: "absolute",
    right: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.parchment300,
    padding: 4,
    gap: 4,
    ...shadow.card,
  },
  zoomButton: { width: 40, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  zoomText: { fontFamily: fonts.sansBold, fontSize: 19, color: colors.stone700 },
});
