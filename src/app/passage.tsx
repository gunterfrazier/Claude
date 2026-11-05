import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TranslationPicker } from "@/components/figure-bits";
import { CopyIcon } from "@/components/icons";
import { Button, Chip, SectionLabel, Segmented } from "@/components/ui";
import { chapterCount, chapterLabel, passagePlainText, translationInfo, usePassage, type PassageSection } from "@/lib/bible";
import { allFigures } from "@/lib/graph";
import { bookName, parseReference, type RefSegment } from "@/lib/references";
import { useUserData } from "@/state/user-data";
import { colors, fonts, radius } from "@/theme";

type Mode = "PASSAGE" | "CHAPTER";

/** Figures whose cited passages overlap a book/chapter range. */
const REF_INDEX = allFigures.flatMap((f) =>
  f.scriptures.flatMap((s) => (parseReference(s.ref) ?? []).map((seg) => ({ id: f.id, name: f.name, seg }))),
);

function overlaps(a: RefSegment, b: RefSegment): boolean {
  if (a.book !== b.book) return false;
  const aStart = a.chapter * 1000 + (a.verseStart ?? 0);
  const aEnd = a.chapterEnd * 1000 + (a.verseEnd ?? 999);
  const bStart = b.chapter * 1000 + (b.verseStart ?? 0);
  const bEnd = b.chapterEnd * 1000 + (b.verseEnd ?? 999);
  return aStart <= bEnd && bStart <= aEnd;
}

export default function PassageScreen() {
  const { ref = "" } = useLocalSearchParams<{ ref: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { translation, setTranslation } = useUserData();
  const segments = useMemo(() => parseReference(ref) ?? [], [ref]);
  const first = segments[0];

  const [mode, setMode] = useState<Mode>("PASSAGE");
  const [position, setPosition] = useState(() => ({ book: first?.book ?? 1, chapter: first?.chapter ?? 1 }));
  const [copied, setCopied] = useState(false);

  const shownRef = mode === "PASSAGE" ? ref : chapterLabel(position.book, position.chapter);
  const passage = usePassage(shownRef || null, translation);
  const viewSegments = useMemo<RefSegment[]>(
    () => (mode === "PASSAGE" ? segments : [{ book: position.book, chapter: position.chapter, chapterEnd: position.chapter }]),
    [mode, segments, position],
  );

  const isCited = (chapter: number, verse: number) =>
    mode === "CHAPTER" &&
    segments.some((s) => overlaps(s, { book: position.book, chapter, verseStart: verse, chapterEnd: chapter, verseEnd: verse }));

  const people = useMemo(() => {
    const seen = new Map<string, string>();
    for (const entry of REF_INDEX) if (viewSegments.some((v) => overlaps(v, entry.seg))) seen.set(entry.id, entry.name);
    return [...seen.entries()].slice(0, 16);
  }, [viewSegments]);

  const step = (delta: number) => {
    setPosition((p) => {
      let { book, chapter } = p;
      chapter += delta;
      if (chapter < 1 && book > 1) {
        book -= 1;
        chapter = chapterCount(book);
      } else if (chapter > chapterCount(book) && book < 66) {
        book += 1;
        chapter = 1;
      }
      return { book, chapter: Math.max(1, Math.min(chapter, chapterCount(book))) };
    });
  };

  const copy = async (sections: PassageSection[]) => {
    await Clipboard.setStringAsync(`${shownRef} (${translation})\n${passagePlainText(sections)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!first) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Passage" }} />
        <Text style={styles.muted}>Couldn’t understand the reference “{ref}”.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: shownRef.length > 24 ? bookName(first.book) : shownRef }} />
      <View style={styles.toolbar}>
        <TranslationPicker value={translation} onChange={setTranslation} />
        <Segmented<Mode>
          accessibilityLabel="Show the cited verses or the whole chapter"
          options={[
            { value: "PASSAGE", label: "Cited verses" },
            { value: "CHAPTER", label: "Whole chapter" },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setPosition({ book: first.book, chapter: first.chapter });
          }}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">
            {shownRef}
          </Text>
          {passage.status === "ready" ? (
            <Pressable accessibilityRole="button" onPress={() => copy(passage.sections)} style={styles.copyBtn}>
              <CopyIcon size={13} color={colors.amber800} />
              <Text style={styles.copyText}>{copied ? "Copied!" : "Copy"}</Text>
            </Pressable>
          ) : null}
        </View>

        {passage.status === "loading" ? <ActivityIndicator color={colors.amber700} style={{ marginTop: 24 }} /> : null}
        {passage.status === "error" ? <Text style={styles.error}>{passage.message}</Text> : null}
        {passage.status === "ready"
          ? passage.sections.map((section) => (
              <View key={section.label} style={styles.section}>
                {mode === "PASSAGE" && passage.sections.length > 1 ? (
                  <Text style={styles.sectionLabel}>{section.label}</Text>
                ) : null}
                <Text style={styles.body}>
                  {section.verses.map((v) => (
                    <Text key={`${v.chapter}:${v.verse}`} style={isCited(v.chapter, v.verse) ? styles.cited : undefined}>
                      <Text style={styles.verseNum}>
                        {v.verse === 1 && mode === "PASSAGE" && section.segment.chapterEnd !== section.segment.chapter
                          ? `${v.chapter}:${v.verse}`
                          : v.verse}{" "}
                      </Text>
                      {v.text}{" "}
                    </Text>
                  ))}
                </Text>
                {section.verses.length === 0 ? <Text style={styles.muted}>No verses found for {section.label}.</Text> : null}
              </View>
            ))
          : null}

        {mode === "CHAPTER" ? (
          <View style={styles.navRow}>
            <Button
              small
              tone="secondary"
              label="‹ Previous"
              disabled={position.book === 1 && position.chapter === 1}
              onPress={() => step(-1)}
              style={{ flex: 1 }}
            />
            <Button
              small
              tone="secondary"
              label="Next ›"
              disabled={position.book === 66 && position.chapter === chapterCount(66)}
              onPress={() => step(1)}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}

        {people.length > 0 ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <SectionLabel>People cited from these verses</SectionLabel>
            <View style={styles.chips}>
              {people.map(([id, name]) => (
                <Chip
                  key={id}
                  label={name}
                  trailing="→"
                  onPress={() => router.push({ pathname: "/person/[id]", params: { id } })}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.notice}>{translationInfo(translation).notice}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.canvas },
  toolbar: {
    gap: 10,
    padding: 12,
    backgroundColor: colors.parchment100,
    borderBottomColor: colors.parchment300,
    borderBottomWidth: 1,
  },
  content: { padding: 18, gap: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.amber950, flexShrink: 1 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyText: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.amber800 },
  section: { gap: 6 },
  sectionLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.amber800,
    textTransform: "uppercase",
  },
  body: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 29, color: colors.stone900 },
  verseNum: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.amber700 },
  cited: { backgroundColor: colors.amber100 },
  navRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.stone500 },
  error: { fontFamily: fonts.sans, fontSize: 14, color: colors.rose700 },
  notice: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.stone500,
    marginTop: 12,
    borderTopColor: colors.parchment200,
    borderTopWidth: 1,
    paddingTop: 10,
    borderRadius: radius.sm,
  },
});
