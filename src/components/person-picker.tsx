import { useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FigureBadges } from "@/components/figure-bits";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { Chip, IconButton } from "@/components/ui";
import { figuresByName } from "@/lib/graph";
import { searchFigures, type EraFilter } from "@/lib/search";
import { colors, fonts, radius } from "@/theme";

interface PersonPickerProps {
  visible: boolean;
  title: string;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const QUICK_FILTERS: { key: EraFilter; label: string; tone?: "messianic" | "unrecorded" }[] = [
  { key: "ALL", label: "Everyone" },
  { key: "MESSIANIC", label: "★ Messianic line", tone: "messianic" },
  { key: "UNRECORDED", label: "📜 No genealogy", tone: "unrecorded" },
];

/** Full-screen searchable list of every figure. */
export function PersonPicker({ visible, title, selectedId, onSelect, onClose }: PersonPickerProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EraFilter>("ALL");

  // Start each visit to the picker with a fresh search.
  const reset = () => {
    setQuery("");
    setFilter("ALL");
  };
  const close = () => {
    reset();
    onClose();
  };
  const choose = (id: string) => {
    reset();
    onSelect(id);
  };

  const results = useMemo(() => searchFigures(query, filter, figuresByName), [query, filter]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={close}
    >
      <View style={[styles.container, { paddingTop: Platform.OS === "ios" ? 14 : insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <IconButton label="Close" onPress={close}>
            <CloseIcon size={18} color={colors.stone700} />
          </IconButton>
        </View>

        <View style={styles.searchBox}>
          <SearchIcon size={17} color={colors.amber700} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus={Platform.OS !== "web"}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
            placeholder="Name, meaning, tribe or verse (e.g. Ruth, Genesis 12)"
            placeholderTextColor={colors.stone400}
            style={styles.searchInput}
            accessibilityLabel="Search Biblical figures"
          />
        </View>

        <View style={styles.filters}>
          {QUICK_FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              tone={f.tone ?? "light"}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </View>

        <Text style={styles.count}>
          {results.length} {results.length === 1 ? "figure" : "figures"}
        </Text>

        <FlatList
          data={results}
          keyExtractor={(f) => f.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          initialNumToRender={20}
          ListEmptyComponent={
            <Text style={styles.empty}>No figure or scripture matches “{query}”. Try a name, tribe, or book and chapter.</Text>
          }
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.title}`}
                onPress={() => choose(item.id)}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  pressed && { backgroundColor: colors.amber50 },
                ]}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <FigureBadges figure={item} />
                </View>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.amber950, flexShrink: 1 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.parchment400,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.stone900, paddingVertical: 10 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  count: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.stone500, marginTop: 10, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.parchment200,
    borderRadius: 10,
  },
  rowSelected: { backgroundColor: colors.amber50 },
  name: { fontFamily: fonts.display, fontSize: 15, color: colors.stone900 },
  subtitle: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.stone600 },
  check: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.amber700 },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.stone600,
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 16,
  },
});
