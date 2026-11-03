import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { BIBLE_ASSETS, CHAPTER_COUNTS } from "@/data/bible-assets";
import { bookName, formatSegment, parseReference, type RefSegment } from "@/lib/references";

export type TranslationId = keyof typeof BIBLE_ASSETS;

export interface TranslationInfo {
  id: TranslationId;
  name: string;
  short: string;
  description: string;
  /** Attribution shown with quotations and in exports. */
  notice: string;
}

export const TRANSLATIONS: readonly TranslationInfo[] = [
  {
    id: "BSB",
    name: "Berean Standard Bible",
    short: "BSB",
    description: "A modern, accurate and readable translation (2022). The default.",
    notice: "Berean Standard Bible (BSB), dedicated to the public domain (CC0).",
  },
  {
    id: "NHEB",
    name: "New Heart English Bible",
    short: "NHEB",
    description: "A modern-English update of the World English Bible.",
    notice: "New Heart English Bible (NHEB), public domain.",
  },
  {
    id: "KJV",
    name: "King James Version",
    short: "KJV",
    description: "The 1769 text of the 1611 translation (Pure Cambridge Edition).",
    notice: "King James Version (KJV), public domain outside the United Kingdom.",
  },
  {
    id: "ASV",
    name: "American Standard Version",
    short: "ASV",
    description: "The literal 1901 revision of the King James Version.",
    notice: "American Standard Version (ASV, 1901), public domain.",
  },
];

export const DEFAULT_TRANSLATION: TranslationId = "BSB";

export function translationInfo(id: TranslationId): TranslationInfo {
  return TRANSLATIONS.find((t) => t.id === id) ?? TRANSLATIONS[0];
}

export function isTranslationId(value: unknown): value is TranslationId {
  return typeof value === "string" && value in BIBLE_ASSETS;
}

export function chapterCount(book: number): number {
  return CHAPTER_COUNTS[book - 1] ?? 0;
}

/** A book is an array of chapters, each an array of verses (index 0 = verse 1). */
type BookText = string[][];

const pending = new Map<string, Promise<BookText>>();
const loaded = new Map<string, BookText>();
const key = (t: TranslationId, book: number) => `${t}:${book}`;

async function readAsset(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  if (Platform.OS === "web") {
    const res = await fetch(asset.uri);
    if (!res.ok) throw new Error(`Could not load Bible text (HTTP ${res.status})`);
    return res.text();
  }
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error("Bible text is not available on this device");
  return new File(asset.localUri).text();
}

export function loadBook(t: TranslationId, book: number): Promise<BookText> {
  const k = key(t, book);
  const done = loaded.get(k);
  if (done) return Promise.resolve(done);
  let p = pending.get(k);
  if (!p) {
    const moduleId = (BIBLE_ASSETS[t] as readonly number[])[book - 1];
    p = readAsset(moduleId).then((text) => {
      const parsed = JSON.parse(text) as BookText;
      loaded.set(k, parsed);
      pending.delete(k);
      return parsed;
    });
    p.catch(() => pending.delete(k));
    pending.set(k, p);
  }
  return p;
}

export interface PassageVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface PassageSection {
  segment: RefSegment;
  label: string;
  verses: PassageVerse[];
}

function sliceSegment(text: BookText, seg: RefSegment): PassageVerse[] {
  const verses: PassageVerse[] = [];
  for (let c = seg.chapter; c <= seg.chapterEnd; c++) {
    const chapter = text[c - 1];
    if (!chapter) break;
    const from = c === seg.chapter && seg.verseStart ? seg.verseStart : 1;
    const to = c === seg.chapterEnd && seg.verseEnd ? seg.verseEnd : chapter.length;
    for (let v = from; v <= Math.min(to, chapter.length); v++) {
      if (chapter[v - 1]) verses.push({ chapter: c, verse: v, text: chapter[v - 1] });
    }
  }
  return verses;
}

function sectionsFrom(segments: RefSegment[], t: TranslationId): PassageSection[] | null {
  const out: PassageSection[] = [];
  for (const seg of segments) {
    const text = loaded.get(key(t, seg.book));
    if (!text) return null;
    out.push({ segment: seg, label: formatSegment(seg), verses: sliceSegment(text, seg) });
  }
  return out;
}

/** Synchronous lookup that succeeds once the books involved are loaded (see `preloadReferences`). */
export function passageSync(ref: string, t: TranslationId): PassageSection[] | null {
  const segments = parseReference(ref);
  return segments ? sectionsFrom(segments, t) : null;
}

export async function loadPassage(ref: string, t: TranslationId): Promise<PassageSection[] | null> {
  const segments = parseReference(ref);
  if (!segments) return null;
  await Promise.all([...new Set(segments.map((s) => s.book))].map((b) => loadBook(t, b)));
  return sectionsFrom(segments, t);
}

export async function preloadReferences(refs: readonly string[], t: TranslationId): Promise<void> {
  const books = new Set<number>();
  for (const ref of refs) for (const s of parseReference(ref) ?? []) books.add(s.book);
  await Promise.all([...books].map((b) => loadBook(t, b)));
}

/** Plain text of a passage, with verse numbers when it spans more than one verse. */
export function passagePlainText(sections: PassageSection[], withNumbers = true): string {
  const verses = sections.flatMap((s) => s.verses);
  if (verses.length === 1 || !withNumbers) return verses.map((v) => v.text).join(" ");
  return sections.map((s) => s.verses.map((v) => `[${v.chapter}:${v.verse}] ${v.text}`).join(" ")).join(" … ");
}

type PassageState =
  | { status: "loading"; sections: null }
  | { status: "ready"; sections: PassageSection[] }
  | { status: "error"; sections: null; message: string };

/** Loads a reference in a translation. Already-loaded books resolve on the first render. */
export function usePassage(ref: string | null, t: TranslationId): PassageState {
  const initial = (): PassageState => {
    const sync = ref ? passageSync(ref, t) : null;
    return sync ? { status: "ready", sections: sync } : { status: "loading", sections: null };
  };
  const [state, setState] = useState<PassageState>(initial);
  const [lastKey, setLastKey] = useState(`${t}|${ref}`);
  if (lastKey !== `${t}|${ref}`) {
    setLastKey(`${t}|${ref}`);
    setState(initial());
  }

  useEffect(() => {
    if (!ref) return;
    let cancelled = false;
    loadPassage(ref, t)
      .then((sections) => {
        if (cancelled) return;
        setState(
          sections ? { status: "ready", sections } : { status: "error", sections: null, message: `Couldn't read "${ref}"` },
        );
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: "error", sections: null, message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [ref, t]);

  return state;
}

export function chapterLabel(book: number, chapter: number): string {
  return `${bookName(book)} ${chapter}`;
}
