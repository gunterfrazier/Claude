import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";

import { TranslationPicker } from "@/components/figure-bits";
import { ChevronDownIcon, CopyIcon, PrintIcon, ShareIcon } from "@/components/icons";
import { PersonPicker } from "@/components/person-picker";
import { Button, Chip, SectionLabel, Segmented } from "@/components/ui";
import {
  EXPORT_FORMATS,
  buildExportBundle,
  exportFileName,
  generateExport,
  generateHtmlReport,
  generateTreeSvg,
  type ExportFormat,
  type ExportSections,
} from "@/lib/export";
import { preloadReferences } from "@/lib/bible";
import { DEFAULT_FIGURE_ID, buildSubgraph, getFigure, resolveFigures } from "@/lib/graph";
import { printHtml, sharePdf, shareTextFile } from "@/lib/share-file";
import { DEPTH_OPTIONS, type Depth } from "@/state/app-state";
import { useUserData } from "@/state/user-data";
import { colors, fonts, radius } from "@/theme";

const FORMAT_ORDER: ExportFormat[] = ["PDF", "DOC", "HTML", "MD", "TXT", "CSV", "SVG", "JSON"];

const SECTION_OPTIONS: { key: keyof ExportSections; label: string }[] = [
  { key: "tree", label: "Family Tree & Relatives" },
  { key: "bio", label: "Biography & Metadata" },
  { key: "scriptures", label: "Scriptures & Quotes" },
  { key: "facts", label: "Key Facts & Adam Lineage" },
];

export default function ExportScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [personId, setPersonId] = useState(getFigure(params.id) ? params.id : DEFAULT_FIGURE_ID);
  const [depth, setDepth] = useState<Depth>(3);
  const [sections, setSections] = useState<ExportSections>({ tree: true, bio: true, scriptures: true, facts: true });
  const [format, setFormat] = useState<ExportFormat>("PDF");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<"share" | "print" | null>(null);
  const [copied, setCopied] = useState(false);

  const { translation, setTranslation } = useUserData();
  // Load the verse text the document will quote before building it.
  const [textKey, setTextKey] = useState("");
  const wantedKey = `${personId}|${depth}|${translation}`;
  useEffect(() => {
    let cancelled = false;
    const tree = buildSubgraph(personId, { maxDepth: depth, includeSpouses: true, includeSiblings: true });
    const refs = [
      ...(getFigure(personId)?.scriptures.map((s) => s.ref) ?? []),
      ...resolveFigures([...tree.keys()]).flatMap((f) => (f.scriptures[0] ? [f.scriptures[0].ref] : [])),
    ];
    preloadReferences(refs, translation)
      .catch(() => {})
      .finally(() => !cancelled && setTextKey(wantedKey));
    return () => {
      cancelled = true;
    };
  }, [personId, depth, translation, wantedKey]);
  const textReady = textKey === wantedKey;

  // Verse text is read when a document is generated, so the bundle needn't wait for loading.
  const bundle = useMemo(() => buildExportBundle(personId, depth, translation), [personId, depth, translation]);
  const meta = EXPORT_FORMATS[format];
  const fileName = exportFileName(bundle, format);

  const preview = useMemo(() => {
    if (meta.textual)
      return {
        kind: "text" as const,
        text: textReady ? generateExport(format as Exclude<ExportFormat, "PDF">, bundle, sections) : "Loading verses…",
      };
    const svg = generateTreeSvg(bundle);
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) ?? [];
    return { kind: "svg" as const, svg, ratio: Number(h) / Number(w) || 0.5 };
  }, [bundle, sections, format, meta.textual, textReady]);

  const run = async (kind: "share" | "print", task: () => Promise<void>) => {
    setBusy(kind);
    try {
      await task();
    } catch (e) {
      Alert.alert("Couldn't complete that", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const share = () =>
    run("share", () =>
      format === "PDF"
        ? sharePdf(generateHtmlReport(bundle, sections, "print"), fileName)
        : shareTextFile(generateExport(format, bundle, sections), fileName, format),
    );

  const print = () => run("print", () => printHtml(generateHtmlReport(bundle, sections, "print")));

  const copy = async () => {
    if (preview.kind !== "text") return;
    await Clipboard.setStringAsync(preview.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const previewWidth = Math.max(240, Math.min(windowWidth, 720) - 32 - 2);
  const noSections = !Object.values(sections).some(Boolean);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}>
        <Text style={styles.lead}>
          Export a family tree diagram, biography and scripture concordance, then share it, print it or save it as a PDF.
        </Text>

        <View style={styles.block}>
          <SectionLabel>1. Biblical figure</SectionLabel>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Figure: ${bundle.person.name}. Change.`}
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.field, pressed && { backgroundColor: colors.parchment100 }]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.fieldValue} numberOfLines={1}>
                {bundle.person.name}
              </Text>
              <Text style={styles.fieldSub} numberOfLines={1}>
                {bundle.person.era}
                {bundle.person.unrecordedGenealogy ? " · No recorded genealogy" : ""}
              </Text>
            </View>
            <ChevronDownIcon size={16} color={colors.amber700} />
          </Pressable>
        </View>

        <View style={styles.block}>
          <SectionLabel>Bible translation for quotations</SectionLabel>
          <TranslationPicker value={translation} onChange={setTranslation} />
        </View>

        <View style={styles.block}>
          <SectionLabel>2. Tree generations</SectionLabel>
          <Segmented<Depth>
            accessibilityLabel="Tree generations"
            options={DEPTH_OPTIONS.map((o) => ({ value: o.value, label: o.short }))}
            value={depth}
            onChange={setDepth}
          />
          <Text style={styles.helper}>{DEPTH_OPTIONS.find((o) => o.value === depth)?.label}</Text>
        </View>

        <View style={styles.block}>
          <SectionLabel>3. Sections to include</SectionLabel>
          <View style={styles.wrap}>
            {SECTION_OPTIONS.map((s) => (
              <Chip
                key={s.key}
                label={`${sections[s.key] ? "✓ " : ""}${s.label}`}
                active={sections[s.key]}
                onPress={() => setSections((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
              />
            ))}
          </View>
          {noSections ? <Text style={styles.warning}>Choose at least one section for document formats.</Text> : null}
        </View>

        <View style={styles.block}>
          <SectionLabel>4. Format</SectionLabel>
          <View style={styles.formatGrid}>
            {FORMAT_ORDER.map((f) => {
              const m = EXPORT_FORMATS[f];
              const active = f === format;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${m.label}, ${m.badge}`}
                  onPress={() => setFormat(f)}
                  style={[styles.formatCard, active && styles.formatCardActive]}
                >
                  <View style={styles.formatHead}>
                    <Text style={styles.formatBadge}>{m.badge}</Text>
                    {active ? <Text style={styles.formatCheck}>✓</Text> : null}
                  </View>
                  <Text style={styles.formatLabel}>{m.label}</Text>
                  <Text style={styles.formatBlurb} numberOfLines={3}>
                    {m.blurb}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <SectionLabel
            right={
              preview.kind === "text" ? (
                <Pressable accessibilityRole="button" onPress={copy} style={styles.copyBtn}>
                  <CopyIcon size={13} color={colors.amber800} />
                  <Text style={styles.copyText}>{copied ? "Copied!" : "Copy text"}</Text>
                </Pressable>
              ) : undefined
            }
          >
            Preview · {fileName}
          </SectionLabel>
          <View style={styles.preview}>
            {preview.kind === "text" ? (
              <ScrollView nestedScrollEnabled style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 12 }}>
                <Text style={styles.mono} selectable>
                  {preview.text.length > 12000 ? `${preview.text.slice(0, 12000)}\n…` : preview.text}
                </Text>
              </ScrollView>
            ) : (
              <ScrollView horizontal nestedScrollEnabled>
                <SvgXml xml={preview.svg} width={previewWidth} height={previewWidth * preview.ratio} />
              </ScrollView>
            )}
          </View>
          {preview.kind === "svg" && format !== "SVG" ? (
            <Text style={styles.helper}>
              The document includes this tree diagram
              {sections.bio ? ", the biography" : ""}
              {sections.scriptures ? `, ${bundle.person.scriptures.length} scripture passages` : ""}
              {sections.facts ? " and key facts" : ""}.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          tone="dark"
          label={busy === "print" ? "Preparing…" : "Print"}
          icon={
            busy === "print" ? (
              <ActivityIndicator color={colors.amber50} size="small" />
            ) : (
              <PrintIcon size={16} color={colors.amber50} />
            )
          }
          onPress={print}
          disabled={busy !== null || !textReady}
          style={{ flex: 1 }}
        />
        <Button
          label={busy === "share" ? "Preparing…" : `Share ${meta.badge}`}
          icon={
            busy === "share" ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <ShareIcon size={16} color={colors.white} />
            )
          }
          onPress={share}
          disabled={busy !== null || !textReady}
          style={{ flex: 1.4 }}
        />
      </View>

      <PersonPicker
        visible={pickerOpen}
        title="Select Biblical Figure"
        selectedId={personId}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => {
          setPersonId(id);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, gap: 20 },
  lead: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.stone600 },
  block: { gap: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.parchment300,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 54,
  },
  fieldValue: { fontFamily: fonts.displaySemi, fontSize: 15.5, color: colors.stone900 },
  fieldSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.stone500, marginTop: 2 },
  helper: { fontFamily: fonts.sans, fontSize: 12, color: colors.stone500, marginTop: 6, lineHeight: 17 },
  warning: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.rose700, marginTop: 6 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  formatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formatCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: 10,
    gap: 3,
  },
  formatCardActive: { borderColor: colors.amber600, backgroundColor: colors.amber50 },
  formatHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  formatBadge: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.6, color: colors.amber900 },
  formatCheck: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.amber700 },
  formatLabel: { fontFamily: fonts.display, fontSize: 13.5, color: colors.stone900 },
  formatBlurb: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 15.5, color: colors.stone600 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyText: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.amber800 },
  preview: {
    backgroundColor: colors.parchment50,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 11,
    lineHeight: 15,
    color: colors.stone800,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.parchment100,
    borderTopColor: colors.parchment300,
    borderTopWidth: 1,
  },
});
