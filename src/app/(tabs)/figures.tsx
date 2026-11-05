import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FigureBadges } from "@/components/figure-bits";
import { SearchIcon } from "@/components/icons";
import { BrandHeader, Button, Chip, HorizontalChips } from "@/components/ui";
import type { Figure } from "@/data/types";
import { allFigures } from "@/lib/graph";
import { ERA_FILTERS, GROUP_FILTERS, searchFigures, type EraFilter, type GroupFilter } from "@/lib/search";
import { useAppState } from "@/state/app-state";
import { colors, fonts, radius, shadow } from "@/theme";

export default function FiguresScreen() {
  const router = useRouter();
  const app = useAppState();
  const [query, setQuery] = useState("");
  const [era, setEra] = useState<EraFilter>("ALL");
  const [group, setGroup] = useState<GroupFilter>("ANY");
  const results = useMemo(() => searchFigures(query, era, undefined, group), [query, era, group]);

  const buildTree = (id: string) => {
    app.focusOn(id);
    router.navigate("/");
  };

  return (
    <View style={styles.screen}>
      <BrandHeader subtitle={`Figures & Scripture Concordance · ${allFigures.length} figures`}>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color={colors.amber300} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search a name, meaning, tribe or verse…"
            placeholderTextColor={colors.parchment400}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            returnKeyType="search"
            style={styles.searchInput}
            accessibilityLabel="Search figures and scriptures"
          />
        </View>
        <HorizontalChips>
          {ERA_FILTERS.map((f) => (
            <Chip
              key={f.key}
              tone={f.tone === "unrecorded" ? "darkPurple" : "dark"}
              label={f.label}
              active={era === f.key}
              onPress={() => setEra(f.key)}
            />
          ))}
        </HorizontalChips>
        <HorizontalChips>
          {GROUP_FILTERS.map((g) => (
            <Chip key={g.key} tone="dark" label={g.label} active={group === g.key} onPress={() => setGroup(g.key)} />
          ))}
        </HorizontalChips>
      </BrandHeader>

      <FlatList
        data={results}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        ListHeaderComponent={
          <Text style={styles.count}>
            {results.length} {results.length === 1 ? "figure" : "figures"}
            {query ? ` matching “${query.trim()}”` : ""}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No matching figures for “{query}” in this filter. Try “All Eras” or search a different name or verse.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <FigureCard
            figure={item}
            onOpen={() => router.push({ pathname: "/person/[id]", params: { id: item.id } })}
            onBuildTree={() => buildTree(item.id)}
          />
        )}
      />
    </View>
  );
}

function FigureCard({ figure, onOpen, onBuildTree }: { figure: Figure; onOpen: () => void; onBuildTree: () => void }) {
  const refs = figure.scriptures.map((s) => s.ref);
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${figure.name}, ${figure.title}. Open dossier.`}
        onPress={onOpen}
        style={({ pressed }) => [styles.cardBody, pressed && { opacity: 0.75 }]}
      >
        <FigureBadges figure={figure} />
        <View style={{ gap: 2 }}>
          <Text style={styles.name}>{figure.name}</Text>
          <Text style={styles.title}>{figure.title}</Text>
        </View>
        <View style={styles.meta}>
          <MetaRow label="Name meaning" value={figure.meaning || "—"} strong />
          <MetaRow label="Lifespan / period" value={figure.lifespan || figure.era} />
          <MetaRow label="Also known as" value={figure.altNames || figure.name} />
        </View>
        <Text style={styles.bio} numberOfLines={3}>
          {figure.bio}
        </Text>
        <View style={styles.refs}>
          {refs.slice(0, 4).map((r) => (
            <View key={r} style={styles.refPill}>
              <Text style={styles.refText}>📖 {r}</Text>
            </View>
          ))}
          {refs.length > 4 ? <Text style={styles.more}>+{refs.length - 4} more</Text> : null}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Button small tone="secondary" label="Open Dossier" onPress={onOpen} style={{ flex: 1 }} />
        <Button small label="Build Family Tree →" onPress={onBuildTree} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function MetaRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Text style={styles.metaText}>
      <Text style={styles.metaLabel}>{label.toUpperCase()}: </Text>
      <Text style={strong ? styles.metaStrong : undefined}>{value}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.parchment50 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.headerField,
    borderColor: "rgba(245,158,11,0.4)",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 14.5, color: colors.amber50, paddingVertical: 8 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  count: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.stone500 },
  empty: {
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 24,
  },
  emptyText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.stone600, textAlign: "center" },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.parchment300,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
    ...shadow.card,
  },
  cardBody: { gap: 10 },
  name: { fontFamily: fonts.display, fontSize: 17, color: colors.stone900 },
  title: { fontFamily: fonts.sansMedium, fontSize: 12.5, lineHeight: 17, color: colors.amber900 },
  meta: {
    backgroundColor: colors.parchment50,
    borderColor: colors.parchment200,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    gap: 5,
  },
  metaText: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.stone800 },
  metaLabel: { fontFamily: fonts.sansSemi, fontSize: 10, letterSpacing: 0.6, color: colors.stone500 },
  metaStrong: { fontFamily: fonts.sansBold, color: colors.stone900 },
  bio: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.stone600 },
  refs: { flexDirection: "row", flexWrap: "wrap", gap: 5, alignItems: "center" },
  refPill: {
    backgroundColor: colors.amber50,
    borderColor: colors.amber200,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  refText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.amber900 },
  more: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.stone500 },
  actions: { flexDirection: "row", gap: 8, borderTopColor: colors.parchment200, borderTopWidth: 1, paddingTop: 10 },
});
