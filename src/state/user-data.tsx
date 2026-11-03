import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { DEFAULT_TRANSLATION, isTranslationId, type TranslationId } from "@/lib/bible";
import { hasFigure } from "@/lib/graph";

const KEYS = {
  translation: "bibliatree:translation",
  saved: "bibliatree:saved",
  notes: "bibliatree:notes",
} as const;

export interface Note {
  text: string;
  updatedAt: number;
}

interface UserData {
  /** False until stored preferences have been read. */
  ready: boolean;
  translation: TranslationId;
  setTranslation: (t: TranslationId) => void;
  saved: string[];
  isSaved: (id: string) => boolean;
  toggleSaved: (id: string) => void;
  notes: Record<string, Note>;
  setNote: (id: string, text: string) => void;
  clearAll: () => Promise<void>;
}

const UserDataContext = createContext<UserData | null>(null);

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Saved figures, personal notes and the preferred translation, stored on the device. */
export function UserDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [translation, setTranslationState] = useState<TranslationId>(DEFAULT_TRANSLATION);
  const [saved, setSaved] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet([KEYS.translation, KEYS.saved, KEYS.notes])
      .then((entries) => {
        if (cancelled) return;
        const map = Object.fromEntries(entries);
        const t = map[KEYS.translation];
        if (isTranslationId(t)) setTranslationState(t);
        setSaved(parseJson<string[]>(map[KEYS.saved], []).filter(hasFigure));
        setNotes(parseJson<Record<string, Note>>(map[KEYS.notes], {}));
      })
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const setTranslation = useCallback((t: TranslationId) => {
    setTranslationState(t);
    AsyncStorage.setItem(KEYS.translation, t).catch(() => {});
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      AsyncStorage.setItem(KEYS.saved, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setNote = useCallback((id: string, text: string) => {
    setNotes((prev) => {
      const next = { ...prev };
      if (text.trim()) next[id] = { text, updatedAt: Date.now() };
      else delete next[id];
      // Debounce writes while typing.
      if (noteTimer.current) clearTimeout(noteTimer.current);
      noteTimer.current = setTimeout(() => {
        AsyncStorage.setItem(KEYS.notes, JSON.stringify(next)).catch(() => {});
      }, 400);
      return next;
    });
  }, []);

  const clearAll = useCallback(async () => {
    setSaved([]);
    setNotes({});
    await AsyncStorage.multiRemove([KEYS.saved, KEYS.notes]);
  }, []);

  const value = useMemo<UserData>(
    () => ({
      ready,
      translation,
      setTranslation,
      saved,
      isSaved: (id: string) => saved.includes(id),
      toggleSaved,
      notes,
      setNote,
      clearAll,
    }),
    [ready, translation, setTranslation, saved, toggleSaved, notes, setNote, clearAll],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserData {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside <UserDataProvider>");
  return ctx;
}
