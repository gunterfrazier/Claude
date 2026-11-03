import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LinkedText, RelativeChips, ROLE_LABELS, ScriptureCard, TranslationPicker } from "@/components/figure-bits";
import { FocusIcon, PrintIcon } from "@/components/icons";
import { Badge, Button, Card, SectionLabel, Segmented } from "@/components/ui";
import type { Figure, ParentLink } from "@/data/types";
import {
  formatGenerations,
  getFigure,
  getSiblings,
  lineageFromAdam,
  parentLink,
  resolveFigures,
  summarizePath,
} from "@/lib/graph";
import { useAppState } from "@/state/app-state";
import { useUserData } from "@/state/user-data";
import { colors, fonts, radius } from "@/theme";

type Pane = "BIO" | "SCRIPTURES" | "FACTS";

function linkAnnotation(link: ParentLink | undefined): string | undefined {
  if (!link) return undefined;
  if (link.kind === "descendant") return link.generations ? `${link.generations} gen.` : "descendant";
  if (link.kind === "legal") return "legal";
  if (link.tradition) return "tradition";
  return undefined;
}

function formatDates(f: Figure): string | null {
  if (!f.dates) return null;
  const { from, to, kind } = f.dates;
  const year = (y: number) => (y < 0 ? `${-y} BC` : `AD ${y}`);
  const range =
    from === to
      ? year(from)
      : from < 0 && to < 0
        ? `${-from}–${-to} BC`
        : from > 0
          ? `AD ${from}–${to}`
          : `${year(from)} – ${year(to)}`;
  const label = { life: "Lived", reign: "Reigned", ministry: "Ministry", active: "Active" }[kind];
  return `${label} c. ${range}`;
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const app = useAppState();
  const user = useUserData();
  const insets = useSafeAreaInsets();
  const [pane, setPane] = useState<Pane>("BIO");
  const person = getFigure(id);

  if (!person) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.missingText}>That figure is not in the BibliaTree database.</Text>
        <Button label="Back to Figures" onPress={() => router.navigate("/figures")} />
      </View>
    );
  }

  const saved = user.isSaved(person.id);
  const openPerson = (otherId: string) => router.push({ pathname: "/person/[id]", params: { id: otherId } });
  const focusTree = () => {
    app.focusOn(person.id);
    router.dismissTo("/");
  };
  const trace = () => {
    if (app.traceFromAdam(person.id)) router.dismissTo("/");
    else Alert.alert("No connected line", `${person.name} has no recorded genealogical path back to Adam.`);
  };

  const pathFromAdam = lineageFromAdam(person.id);
  const adamSummary = pathFromAdam ? summarizePath(pathFromAdam) : null;
  const siblings = getSiblings(person.id);
  const dates = formatDates(person);
  const sourceLinks = person.parents
    .map((pid) => ({ parent: getFigure(pid), link: parentLink(person.id, pid) }))
    .filter((x) => x.parent);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{
          title: person.name.length > 22 ? "Dossier" : person.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? `Remove ${person.name} from saved` : `Save ${person.name}`}
              hitSlop={10}
              onPress={() => user.toggleSaved(person.id)}
              style={{ paddingHorizontal: 6 }}
            >
              <Text style={{ fontSize: 22, color: saved ? colors.amber400 : colors.amber200 }}>{saved ? "★" : "☆"}</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.hero}>
        <View style={styles.badgeRow}>
          <Badge label={person.era} tone="darkAmber" />
          <Badge label={person.tribe || "Biblical Lineage"} tone="darkStone" />
          {person.messianic ? <Badge label="★ Messianic Line" tone="solidRose" /> : null}
          {person.unrecordedGenealogy ? <Badge label="📜 No Recorded Genealogy" tone="solidPurple" /> : null}
          {(person.roles ?? []).map((r) => (
            <Badge key={r} label={ROLE_LABELS[r]} tone="darkStone" />
          ))}
        </View>
        <Text style={styles.name} accessibilityRole="header">
          {person.name}
        </Text>
        <Text style={styles.title}>{person.title}</Text>

        <View style={styles.metaGrid}>
          <MetaTile label="Name Meaning" value={person.meaning || "Not recorded"} wide />
          <MetaTile label="Lifespan / Period" value={person.lifespan || person.era} />
          <MetaTile label="Also Known As" value={person.altNames || person.name} />
          {dates ? <MetaTile label="Approximate Dates" value={dates} wide /> : null}
        </View>

        <View style={styles.actions}>
          <Button
            small
            label="Focus Tree Here"
            icon={<FocusIcon size={15} color={colors.white} />}
            onPress={focusTree}
            style={styles.actionBtn}
          />
          <Button
            small
            tone="outlineDark"
            label="Save / Print"
            icon={<PrintIcon size={15} color={colors.amber100} />}
            onPress={() => router.push({ pathname: "/export/[id]", params: { id: person.id } })}
            style={styles.actionBtn}
          />
        </View>
        {!person.unrecordedGenealogy && pathFromAdam && pathFromAdam.length > 1 ? (
          <Button small tone="blue" label={`✨ Trace Line from Adam (${formatGenerations(adamSummary!)})`} onPress={trace} />
        ) : null}
      </View>

      <View style={styles.tabs}>
        <Segmented<Pane>
          accessibilityLabel="Dossier sections"
          options={[
            { value: "BIO", label: "Overview" },
            { value: "SCRIPTURES", label: `Scriptures (${person.scriptures.length})` },
            { value: "FACTS", label: "Facts & Sources" },
          ]}
          value={pane}
          onChange={setPane}
        />
      </View>

      <View style={styles.body}>
        {pane === "BIO" ? (
          <>
            <View>
              <SectionLabel>Biblical Biography</SectionLabel>
              <LinkedText text={person.bio} style={styles.bio} />
            </View>

            {person.places?.length ? (
              <View>
                <SectionLabel>Places</SectionLabel>
                <View style={styles.places}>
                  {person.places.map((p) => (
                    <View key={p} style={styles.place}>
                      <Text style={styles.placeText}>📍 {p}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View>
              <SectionLabel right={<Text style={styles.hint}>Tap a name to open</Text>}>Immediate Family</SectionLabel>
              <Card style={styles.familyCard}>
                <FamilyRow label="Parents & Ancestors">
                  <RelativeChips
                    ids={person.parents}
                    empty={
                      person.unrecordedGenealogy
                        ? "Unrecorded in Scripture (no genealogy given)"
                        : "No earlier human parent recorded"
                    }
                    onPress={openPerson}
                    annotate={(pid) => linkAnnotation(parentLink(person.id, pid))}
                  />
                </FamilyRow>
                <FamilyRow label="Spouses / Consorts">
                  <RelativeChips ids={person.spouses} empty="Not specified in Scripture" onPress={openPerson} />
                </FamilyRow>
                <FamilyRow label="Children & Descendants">
                  <RelativeChips
                    ids={person.children}
                    empty="No descendants recorded in Scripture"
                    onPress={openPerson}
                    annotate={(cid) => linkAnnotation(parentLink(cid, person.id))}
                  />
                </FamilyRow>
                <FamilyRow label="Known Siblings">
                  <RelativeChips ids={siblings} empty="No siblings recorded" onPress={openPerson} />
                </FamilyRow>
                {resolveFigures(person.associates).length > 0 ? (
                  <FamilyRow label="Contemporaries & Associates" color={colors.purple800} last>
                    <RelativeChips ids={person.associates} empty="None" onPress={openPerson} />
                  </FamilyRow>
                ) : null}
              </Card>
              {person.genealogyNote ? (
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>📜 GENEALOGY NOTE</Text>
                  <LinkedText text={person.genealogyNote} style={styles.calloutText} />
                </View>
              ) : null}
            </View>

            {person.scriptures.length > 0 ? (
              <View style={{ gap: 8 }}>
                <SectionLabel
                  right={
                    person.scriptures.length > 2 ? (
                      <Text style={styles.link} onPress={() => setPane("SCRIPTURES")} accessibilityRole="link">
                        See all {person.scriptures.length} →
                      </Text>
                    ) : undefined
                  }
                >
                  Primary Scripture Mentions
                </SectionLabel>
                {person.scriptures.slice(0, 2).map((s) => (
                  <ScriptureCard key={s.ref} scripture={s} maxVerses={3} />
                ))}
              </View>
            ) : null}

            <NotesEditor id={person.id} name={person.name} />
          </>
        ) : null}

        {pane === "SCRIPTURES" ? (
          <View style={{ gap: 10 }}>
            <View style={styles.scriptureIntro}>
              <Text style={styles.scriptureIntroText}>
                Passages where <Text style={{ fontFamily: fonts.sansBold }}>{person.name}</Text> is named or chronicled. Tap one
                to read it in context.
              </Text>
              <TranslationPicker value={user.translation} onChange={user.setTranslation} />
            </View>
            {person.scriptures.map((s) => (
              <ScriptureCard key={s.ref} scripture={s} />
            ))}
          </View>
        ) : null}

        {pane === "FACTS" ? (
          <View style={{ gap: 16 }}>
            {person.facts.length > 0 ? (
              <View style={{ gap: 8 }}>
                <SectionLabel>Known Biblical Facts & Milestones</SectionLabel>
                {person.facts.map((fact) => (
                  <View key={fact} style={styles.fact}>
                    <Text style={styles.factBullet}>•</Text>
                    <LinkedText text={fact} style={styles.factText} />
                  </View>
                ))}
              </View>
            ) : null}

            {sourceLinks.length > 0 ? (
              <View style={{ gap: 8 }}>
                <SectionLabel>Genealogy Sources</SectionLabel>
                {sourceLinks.map(({ parent, link }) => (
                  <View key={parent!.id} style={styles.source}>
                    <View style={styles.sourceHead}>
                      <Text style={styles.sourceKind}>
                        {link?.kind === "descendant"
                          ? link.generations
                            ? `Ancestor · ${link.generations} generations`
                            : "Ancestor · generations unrecorded"
                          : link?.kind === "legal"
                            ? "Legal parent"
                            : "Parent"}
                      </Text>
                      {link?.tradition ? <Badge label="Tradition" tone="unrecorded" /> : null}
                    </View>
                    <Text style={styles.sourceName} onPress={() => openPerson(parent!.id)} accessibilityRole="link">
                      {parent!.name} →
                    </Text>
                    {link?.refs?.length ? <LinkedText text={link.refs.join("; ")} style={styles.sourceRefs} /> : null}
                    {link?.via?.length ? <Text style={styles.sourceVia}>Between them: {link.via.join(" → ")}</Text> : null}
                    {link?.note ? <LinkedText text={link.note} style={styles.sourceNote} /> : null}
                    {!link ? <Text style={styles.sourceNote}>Recorded as a direct parent.</Text> : null}
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.significance}>
              <Text style={styles.significanceTitle}>GENEALOGICAL SIGNIFICANCE</Text>
              {person.unrecordedGenealogy && person.genealogyNote ? (
                <LinkedText text={person.genealogyNote} style={styles.significanceText} />
              ) : pathFromAdam && pathFromAdam.length > 1 && adamSummary ? (
                <>
                  <Text style={styles.significanceText}>
                    <Text style={{ fontFamily: fonts.sansBold }}>{person.name}</Text> is{" "}
                    <Text style={{ fontFamily: fonts.sansBold }}>{formatGenerations(adamSummary)}</Text> from Adam
                    {adamSummary.traditional ? " (the chain includes a link based on tradition)" : ""}:
                  </Text>
                  <Text style={styles.chain}>
                    {resolveFigures(pathFromAdam)
                      .map((f) => f.name)
                      .join(" → ")}
                  </Text>
                </>
              ) : (
                <Text style={styles.significanceText}>
                  {person.name} is chronicled within the {person.era} era ({person.tribe}). Use “Focus Tree Here” to see every
                  connected relative.
                </Text>
              )}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function NotesEditor({ id, name }: { id: string; name: string }) {
  const { notes, setNote } = useUserData();
  const [text, setText] = useState(notes[id]?.text ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onChange = (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNote(id, value), 500);
  };

  return (
    <View style={{ gap: 6 }}>
      <SectionLabel right={notes[id] ? <Text style={styles.hint}>Saved on this device</Text> : undefined}>My Notes</SectionLabel>
      <TextInput
        value={text}
        onChangeText={onChange}
        onBlur={() => setNote(id, text)}
        multiline
        placeholder={`Your study notes on ${name}…`}
        placeholderTextColor={colors.stone400}
        style={styles.notes}
        textAlignVertical="top"
        accessibilityLabel={`My notes on ${name}`}
      />
    </View>
  );
}

function MetaTile({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide]}>
      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function FamilyRow({ label, children, color, last }: { label: string; children: ReactNode; color?: string; last?: boolean }) {
  return (
    <View style={[styles.familyRow, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.familyLabel, color ? { color } : null]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: colors.canvas },
  missingText: { fontFamily: fonts.sans, fontSize: 15, color: colors.stone700, textAlign: "center" },
  hero: {
    backgroundColor: colors.headerMid,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(180,83,9,0.5)",
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  name: { fontFamily: fonts.display, fontSize: 27, letterSpacing: 0.5, color: colors.amber100, marginTop: 2 },
  title: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, color: "rgba(252,211,77,0.9)" },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopColor: "rgba(146,64,14,0.6)",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 2,
  },
  tile: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderColor: "rgba(217,119,6,0.2)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  tileWide: { flexBasis: "100%" },
  tileLabel: { fontFamily: fonts.sansSemi, fontSize: 9.5, letterSpacing: 0.9, color: colors.parchment400 },
  tileValue: { fontFamily: fonts.sansSemi, fontSize: 13, lineHeight: 18, color: colors.amber100 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flex: 1 },
  tabs: {
    backgroundColor: colors.parchment100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomColor: colors.parchment300,
    borderBottomWidth: 1,
  },
  body: { padding: 16, gap: 20 },
  bio: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    color: colors.stone800,
    backgroundColor: colors.parchment50,
    borderColor: colors.parchment200,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
  },
  places: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  place: {
    backgroundColor: colors.parchment100,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  placeText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.stone700 },
  hint: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.amber800 },
  link: { fontFamily: fonts.sansSemi, fontSize: 12.5, color: colors.amber800 },
  familyCard: { backgroundColor: colors.parchment50, padding: 12, gap: 0, shadowOpacity: 0, elevation: 0 },
  familyRow: { gap: 7, paddingVertical: 10, borderBottomColor: colors.parchment200, borderBottomWidth: 1 },
  familyLabel: { fontFamily: fonts.sansSemi, fontSize: 10.5, letterSpacing: 0.9, color: colors.stone500 },
  callout: {
    marginTop: 10,
    backgroundColor: colors.purple50,
    borderColor: colors.purple200,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  calloutTitle: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 0.9, color: colors.purple800 },
  calloutText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.purple900 },
  scriptureIntro: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber200,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    gap: 10,
  },
  scriptureIntroText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.amber950 },
  fact: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.parchment50,
    borderColor: colors.parchment200,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 11,
  },
  factBullet: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.amber700, lineHeight: 20 },
  factText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.stone800 },
  source: {
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  sourceHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sourceKind: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: colors.stone500,
    textTransform: "uppercase",
  },
  sourceName: { fontFamily: fonts.display, fontSize: 15, color: colors.amber900 },
  sourceRefs: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.stone700 },
  sourceVia: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 18, color: colors.stone600 },
  sourceNote: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 19, color: colors.stone600 },
  significance: {
    backgroundColor: colors.parchment100,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
  },
  significanceTitle: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1, color: colors.amber900 },
  significanceText: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20, color: colors.stone700 },
  chain: { fontFamily: fonts.sansMedium, fontSize: 12.5, lineHeight: 19, color: colors.amber950 },
  notes: {
    minHeight: 110,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    color: colors.stone900,
    backgroundColor: colors.amber50,
    borderColor: colors.amber200,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
  },
});
