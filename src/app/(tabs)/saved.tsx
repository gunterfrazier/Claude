import { useRouter } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { FigureBadges } from "@/components/figure-bits";
import { BrandHeader, Button, IconButton } from "@/components/ui";
import { getFigure } from "@/lib/graph";
import { useAppState } from "@/state/app-state";
import { useUserData } from "@/state/user-data";
import { colors, fonts, radius, shadow } from "@/theme";

export default function SavedScreen() {
  const router = useRouter();
  const app = useAppState();
  const { saved, notes, toggleSaved, ready } = useUserData();

  const items = useMemo(() => {
    const ids = [...saved];
    // Figures with notes but not saved come after saved ones, newest note first.
    const noted = Object.entries(notes)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .map(([id]) => id)
      .filter((id) => !ids.includes(id));
    return [...ids, ...noted].map((id) => getFigure(id)).filter((f) => f !== undefined);
  }, [saved, notes]);

  return (
    <View style={styles.screen}>
      <BrandHeader
        subtitle="Saved Figures & Study Notes"
        right={
          <IconButton dark label="Settings" onPress={() => router.push("/settings")}>
            <Text style={styles.gear}>⚙</Text>
          </IconButton>
        }
      />
      <FlatList
        data={items}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          ready ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyText}>
                Tap ☆ on any dossier to save a figure, or write in its “My Notes” box. Saved figures and notes stay on this
                device.
              </Text>
              <Button label="Browse Figures" onPress={() => router.navigate("/figures")} />
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          const note = notes[item.id];
          const isSaved = saved.includes(item.id);
          return (
            <View style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}. Open dossier.`}
                onPress={() => router.push({ pathname: "/person/[id]", params: { id: item.id } })}
                style={({ pressed }) => [{ gap: 6 }, pressed && { opacity: 0.75 }]}
              >
                <View style={styles.head}>
                  <Text style={styles.name}>{item.name}</Text>
                  {isSaved ? <Text style={styles.star}>★</Text> : null}
                </View>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <FigureBadges figure={item} />
                {note ? (
                  <View style={styles.note}>
                    <Text style={styles.noteLabel}>MY NOTE · {new Date(note.updatedAt).toLocaleDateString()}</Text>
                    <Text style={styles.noteText} numberOfLines={4}>
                      {note.text}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.actions}>
                <Button
                  small
                  tone="secondary"
                  label="Tree"
                  onPress={() => {
                    app.focusOn(item.id);
                    router.navigate("/");
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  small
                  tone="secondary"
                  label={isSaved ? "Unsave" : "Save"}
                  onPress={() => toggleSaved(item.id)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment50 },
  gear: { fontSize: 18, color: colors.amber300 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: {
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 20,
    gap: 10,
    alignItems: "stretch",
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.amber950 },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.stone600 },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
    ...shadow.card,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontFamily: fonts.display, fontSize: 17, color: colors.stone900, flexShrink: 1 },
  star: { fontSize: 18, color: colors.amber600 },
  title: { fontFamily: fonts.sansMedium, fontSize: 12.5, lineHeight: 17, color: colors.amber900 },
  note: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber200,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    gap: 4,
  },
  noteLabel: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 0.8, color: colors.amber800 },
  noteText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: colors.stone800 },
  actions: { flexDirection: "row", gap: 8, borderTopColor: colors.parchment200, borderTopWidth: 1, paddingTop: 10 },
});
