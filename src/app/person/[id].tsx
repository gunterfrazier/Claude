import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RelativeChips, ScriptureCard } from "@/components/figure-bits";
import { FocusIcon, PrintIcon } from "@/components/icons";
import { Badge, Button, Card, SectionLabel, Segmented } from "@/components/ui";
import { getFigure, getSiblings, lineageFromAdam, resolveFigures } from "@/lib/graph";
import { useAppState } from "@/state/app-state";
import { colors, fonts, radius } from "@/theme";

type Pane = "BIO" | "SCRIPTURES" | "FACTS";

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const app = useAppState();
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
  const siblings = getSiblings(person.id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <Stack.Screen options={{ title: person.name.length > 22 ? "Dossier" : person.name }} />

      <View style={styles.hero}>
        <View style={styles.badgeRow}>
          <Badge label={person.era} tone="darkAmber" />
          <Badge label={person.tribe || "Biblical Lineage"} tone="darkStone" />
          {person.messianic ? <Badge label="★ Messianic Line" tone="solidRose" /> : null}
          {person.unrecordedGenealogy ? <Badge label="📜 No Recorded Genealogy" tone="solidPurple" /> : null}
        </View>
        <Text style={styles.name} accessibilityRole="header">
          {person.name}
        </Text>
        <Text style={styles.title}>{person.title}</Text>

        <View style={styles.metaGrid}>
          <MetaTile label="Name Meaning" value={person.meaning || "Recorded in Scripture"} wide />
          <MetaTile label="Lifespan / Period" value={person.lifespan || person.era} />
          <MetaTile label="Also Known As" value={person.altNames || person.name} />
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
          <Button small tone="blue" label="✨ Trace Line from Adam" onPress={trace} />
        ) : null}
      </View>

      <View style={styles.tabs}>
        <Segmented<Pane>
          accessibilityLabel="Dossier sections"
          options={[
            { value: "BIO", label: "Overview" },
            { value: "SCRIPTURES", label: `Scriptures (${person.scriptures.length})` },
            { value: "FACTS", label: "Key Facts" },
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
              <Text style={styles.bio}>{person.bio}</Text>
            </View>

            <View>
              <SectionLabel right={<Text style={styles.hint}>Tap a name to open</Text>}>Immediate Family</SectionLabel>
              <Card style={styles.familyCard}>
                <FamilyRow label="Parents">
                  <RelativeChips
                    ids={person.parents}
                    empty={
                      person.unrecordedGenealogy
                        ? "Unrecorded in Scripture (no genealogy given)"
                        : "No earlier human parent recorded"
                    }
                    onPress={openPerson}
                  />
                </FamilyRow>
                <FamilyRow label="Spouses / Consorts">
                  <RelativeChips ids={person.spouses} empty="Not specified in Scripture" onPress={openPerson} />
                </FamilyRow>
                <FamilyRow label="Children">
                  <RelativeChips ids={person.children} empty="No descendants recorded in Scripture" onPress={openPerson} />
                </FamilyRow>
                <FamilyRow label="Known Siblings">
                  <RelativeChips ids={siblings} empty="No siblings recorded" onPress={openPerson} />
                </FamilyRow>
                {resolveFigures(person.associates).length > 0 ? (
                  <FamilyRow label="Contemporaries & Associates" color={colors.purple800}>
                    <RelativeChips ids={person.associates} empty="None" onPress={openPerson} />
                  </FamilyRow>
                ) : null}
              </Card>
              {person.unrecordedGenealogy && person.genealogyNote ? (
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>📜 UNRECORDED / STANDALONE GENEALOGY</Text>
                  <Text style={styles.calloutText}>{person.genealogyNote}</Text>
                </View>
              ) : null}
            </View>

            {person.scriptures.length > 0 ? (
              <View style={{ gap: 8 }}>
                <SectionLabel
                  right={
                    person.scriptures.length > 3 ? (
                      <Text style={styles.link} onPress={() => setPane("SCRIPTURES")} accessibilityRole="link">
                        See all verses →
                      </Text>
                    ) : undefined
                  }
                >
                  Primary Scripture Mentions
                </SectionLabel>
                {person.scriptures.slice(0, 3).map((s) => (
                  <ScriptureCard key={s.ref + s.note} scripture={s} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {pane === "SCRIPTURES" ? (
          <View style={{ gap: 10 }}>
            <View style={styles.scriptureIntro}>
              <Text style={styles.scriptureIntroText}>
                Key passages where <Text style={{ fontFamily: fonts.sansBold }}>{person.name}</Text> is named or chronicled:
              </Text>
            </View>
            {person.scriptures.map((s) => (
              <ScriptureCard key={s.ref + s.note} scripture={s} />
            ))}
          </View>
        ) : null}

        {pane === "FACTS" ? (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 8 }}>
              <SectionLabel>Known Biblical Facts & Milestones</SectionLabel>
              {person.facts.map((fact) => (
                <View key={fact} style={styles.fact}>
                  <Text style={styles.factBullet}>•</Text>
                  <Text style={styles.factText}>{fact}</Text>
                </View>
              ))}
            </View>
            <View style={styles.significance}>
              <Text style={styles.significanceTitle}>GENEALOGICAL SIGNIFICANCE</Text>
              {person.unrecordedGenealogy && person.genealogyNote ? (
                <Text style={styles.significanceText}>
                  <Text style={{ fontFamily: fonts.sansBold }}>Unrecorded lineage in Scripture: </Text>
                  {person.genealogyNote}
                </Text>
              ) : pathFromAdam && pathFromAdam.length > 1 ? (
                <>
                  <Text style={styles.significanceText}>
                    <Text style={{ fontFamily: fonts.sansBold }}>{person.name}</Text> stands{" "}
                    <Text style={{ fontFamily: fonts.sansBold }}>{pathFromAdam.length - 1} genealogical steps</Text> from Adam in
                    this database:
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

function MetaTile({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide]}>
      <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function FamilyRow({ label, children, color }: { label: string; children: React.ReactNode; color?: string }) {
  return (
    <View style={styles.familyRow}>
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
  },
  scriptureIntroText: { fontFamily: fonts.sans, fontSize: 13, color: colors.amber950 },
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
});
