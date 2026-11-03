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

export interface Scripture {
  ref: string;
  note?: string;
  text: string;
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
  messianic: boolean;
  /** Scripture gives no (or only a minimal) genealogy for this figure. */
  unrecordedGenealogy?: boolean;
  genealogyNote?: string;
  parents: string[];
  spouses: string[];
  children: string[];
  /** Contemporaries and ministry associates, for figures outside the bloodline graph. */
  associates?: string[];
  bio: string;
  facts: string[];
  scriptures: Scripture[];
}
