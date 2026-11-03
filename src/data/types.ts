export const ERAS = [
  "Creation & Flood",
  "Patriarchs",
  "Twelve Tribes",
  "Exodus & Levites",
  "Judges & Royal Roots",
  "United Monarchy",
  "Kings of Judah & Exile",
  "New Testament",
] as const;

export type Era = (typeof ERAS)[number];

export const ROLES = ["patriarch", "matriarch", "king", "queen", "prophet", "priest", "judge", "apostle", "ruler"] as const;
export type Role = (typeof ROLES)[number];

/** A scripture reference. The verse text comes from the reader's chosen translation. */
export interface Scripture {
  ref: string;
  note?: string;
}

/**
 * How a parent link should be read. Without one, a link is a direct parent.
 * - descendant: generations are skipped or unrecorded (a tribe, a nation, or a list such as Luke 3)
 * - legal: a legal or adoptive parent (Joseph → Jesus)
 */
export interface ParentLink {
  kind?: "descendant" | "legal";
  refs?: string[];
  /** Number of generations the link spans, when Scripture records them. */
  generations?: number;
  /** Names of the generations in between, oldest first. */
  via?: string[];
  note?: string;
  /** The link rests on tradition or interpretation rather than an explicit statement. */
  tradition?: boolean;
}

export interface FigureDates {
  /** Year; negative = BC. */
  from: number;
  to: number;
  kind: "life" | "reign" | "ministry" | "active";
  approx?: boolean;
}

export interface Figure {
  id: string;
  name: string;
  altNames?: string;
  title: string;
  era: Era;
  tribe?: string;
  lifespan?: string;
  meaning?: string;
  gender?: "male" | "female";
  roles?: Role[];
  messianic: boolean;
  /** Scripture gives no (or only a minimal) genealogy for this figure. */
  unrecordedGenealogy?: boolean;
  genealogyNote?: string;
  /** Approximate dates on a traditional chronology. */
  dates?: FigureDates;
  /** Years after creation, from the ages in Genesis 5 and 11. */
  am?: { from: number; to: number };
  places?: string[];
  parents: string[];
  /** Details for entries in `parents`, keyed by parent id. */
  parentLinks?: Record<string, ParentLink>;
  spouses: string[];
  children: string[];
  /** Siblings recorded without shared parents in the dataset (e.g. Martha, Mary and Lazarus). */
  siblings?: string[];
  /** Contemporaries and ministry associates, for figures outside the bloodline graph. */
  associates?: string[];
  bio: string;
  facts: string[];
  scriptures: Scripture[];
}
