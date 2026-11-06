import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, SectionLabel } from "@/components/ui";
import { TRANSLATIONS } from "@/lib/bible";
import { allFigures } from "@/lib/graph";
import { useUserData } from "@/state/user-data";
import { colors, fonts, radius } from "@/theme";

const REF_COUNT = allFigures.reduce((n, f) => n + f.scriptures.length, 0);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { translation, setTranslation, saved, notes, clearAll } = useUserData();
  const noteCount = Object.keys(notes).length;

  const confirmClear = () => {
    const run = () => {
      clearAll().catch(() => {});
    };
    const message = `This removes ${saved.length} saved ${saved.length === 1 ? "figure" : "figures"} and ${noteCount} ${noteCount === 1 ? "note" : "notes"} from this device.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) run();
      return;
    }
    Alert.alert("Delete saved figures and notes?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={{ gap: 8 }}>
        <SectionLabel>Bible translation</SectionLabel>
        <Text style={styles.lead}>
          Used for every verse in the app and in exported documents. All four are bundled, so they work offline.
        </Text>
        {TRANSLATIONS.map((t) => {
          const active = t.id === translation;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${t.name}. ${t.description}`}
              onPress={() => setTranslation(t.id)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.optionTitle}>
                  {t.name} <Text style={styles.optionShort}>({t.short})</Text>
                </Text>
                <Text style={styles.optionText}>{t.description}</Text>
                <Text style={styles.optionNotice}>{t.notice}</Text>
              </View>
            </Pressable>
          );
        })}
        <Text style={styles.small}>
          Copyrighted translations such as the ESV, NIV and NLT can’t be bundled without a license from their publishers.
        </Text>
      </View>

      <Card style={{ gap: 8 }}>
        <SectionLabel>About the data</SectionLabel>
        <Text style={styles.body}>
          {allFigures.length} people. Every family claim from the sources below was tested against the tagged Hebrew and Greek text, and the Bible decides: what it states is kept with its verse, what it contradicts is dropped, and what it doesn’t address is kept only if open sources support it, and is marked as not stated word for word. Where Scripture itself names two fathers, as with Joseph in Matthew 1 and Luke 3, both are shown.
        </Text>
        <Text style={styles.body}>
          Scripture gives no calendar dates, so BC and AD dates are approximate and follow one chronology (Floyd Nolen Jones, via Theographic). Scholars date many events differently. Years from creation come from the ages Scripture gives, through BibleData’s reckoning. Summaries are written by STEPBible and are secondary to the verses.
        </Text>
        <Text style={styles.small}>People and summaries: TIPNR by STEPBible.org, based on work at Tyndale House Cambridge (CC BY 4.0). More people and family claims: BibleData by Brady Stephenson (CC BY 4.0). Cross-checks and dates: Theographic Bible Metadata by Robert Rouse (CC BY-SA 4.0). Cross-checks: ACAI by Mission Mutual (CC BY-SA 4.0). The people data is shared under CC BY-SA 4.0.</Text>
        <Text style={styles.small}>Bible texts: scrollmapper/bible_databases on GitHub.</Text>
      </Card>

      <Card style={{ gap: 10 }}>
        <SectionLabel>Saved figures and notes</SectionLabel>
        <Text style={styles.body}>
          {saved.length} saved {saved.length === 1 ? "figure" : "figures"} · {noteCount} {noteCount === 1 ? "note" : "notes"}.
          These stay on this device.
        </Text>
        <Button
          tone="secondary"
          label="Delete saved figures and notes"
          onPress={confirmClear}
          disabled={saved.length === 0 && noteCount === 0}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, gap: 18 },
  lead: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 19, color: colors.stone600 },
  option: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: 12,
  },
  optionActive: { borderColor: colors.amber600, backgroundColor: colors.amber50 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.parchment500,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioActive: { borderColor: colors.amber700 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber700 },
  optionTitle: { fontFamily: fonts.display, fontSize: 14.5, color: colors.stone900 },
  optionShort: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.amber800 },
  optionText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.stone700 },
  optionNotice: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.stone500 },
  body: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20, color: colors.stone700 },
  small: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.stone500 },
});
