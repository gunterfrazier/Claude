import { allFigures } from "@/lib/graph";
import type { Era, Figure } from "@/data/types";

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
      ...p.scriptures.map((s) => `${s.ref} ${s.note ?? ""} ${s.text}`),
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);

/** Matches names, meanings, tribes, biographies and scripture references / text. */
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
  { key: "Kings of Judah & Exile", label: "Kings of Judah & Exile" },
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

export function searchFigures(query: string, filter: EraFilter = "ALL", source: readonly Figure[] = allFigures): Figure[] {
  return source.filter((f) => matchesEra(f, filter) && matchesQuery(f, query));
}
