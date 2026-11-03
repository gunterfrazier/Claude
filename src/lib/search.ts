import type { Era, Figure, Role } from "@/data/types";
import { allFigures } from "@/lib/graph";

const haystacks = new Map<string, string>(
  allFigures.map((p) => [
    p.id,
    [
      p.name,
      p.altNames,
      p.title,
      p.era,
      p.tribe,
      p.meaning,
      p.bio,
      ...p.facts,
      ...(p.places ?? []),
      ...(p.roles ?? []),
      ...p.scriptures.map((s) => `${s.ref} ${s.note ?? ""}`),
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);

/** Matches names, meanings, tribes, roles, places, biographies, facts and scripture references. */
export function matchesQuery(figure: Figure, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.get(figure.id)?.includes(q) ?? false;
}

export type EraFilter = "ALL" | "MESSIANIC" | "UNRECORDED" | Era;

export const ERA_FILTERS: { key: EraFilter; label: string; tone?: "messianic" | "unrecorded" }[] = [
  { key: "ALL", label: "All Eras" },
  { key: "Creation & Flood", label: "Creation & Flood" },
  { key: "Patriarchs", label: "Patriarchs & Matriarchs" },
  { key: "Twelve Tribes", label: "Twelve Tribes" },
  { key: "Exodus & Levites", label: "Exodus & Priesthood" },
  { key: "Judges & Royal Roots", label: "Judges & Boaz/Ruth" },
  { key: "United Monarchy", label: "United Monarchy" },
  { key: "Kings of Judah & Exile", label: "Kings, Prophets & Exile" },
  { key: "New Testament", label: "New Testament" },
  { key: "MESSIANIC", label: "★ Messianic Lineage", tone: "messianic" },
  { key: "UNRECORDED", label: "📜 No Recorded Genealogy", tone: "unrecorded" },
];

export function matchesEra(figure: Figure, filter: EraFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "MESSIANIC") return figure.messianic;
  if (filter === "UNRECORDED") return Boolean(figure.unrecordedGenealogy);
  return figure.era === filter;
}

export type GroupFilter = "ANY" | "WOMEN" | "KINGS" | "PROPHETS" | "PRIESTS" | "JUDGES" | "APOSTLES" | "RULERS";

export const GROUP_FILTERS: { key: GroupFilter; label: string; roles?: Role[] }[] = [
  { key: "ANY", label: "Everyone" },
  { key: "WOMEN", label: "Women" },
  { key: "KINGS", label: "Kings & Queens", roles: ["king", "queen"] },
  { key: "PROPHETS", label: "Prophets", roles: ["prophet"] },
  { key: "PRIESTS", label: "Priests", roles: ["priest"] },
  { key: "JUDGES", label: "Judges", roles: ["judge"] },
  { key: "APOSTLES", label: "Apostles", roles: ["apostle"] },
  { key: "RULERS", label: "Rulers & Officials", roles: ["ruler"] },
];

export function matchesGroup(figure: Figure, filter: GroupFilter): boolean {
  if (filter === "ANY") return true;
  if (filter === "WOMEN") return figure.gender === "female";
  const roles = GROUP_FILTERS.find((g) => g.key === filter)?.roles ?? [];
  return (figure.roles ?? []).some((r) => roles.includes(r));
}

export function searchFigures(
  query: string,
  filter: EraFilter = "ALL",
  source: readonly Figure[] = allFigures,
  group: GroupFilter = "ANY",
): Figure[] {
  return source.filter((f) => matchesEra(f, filter) && matchesGroup(f, group) && matchesQuery(f, query));
}
