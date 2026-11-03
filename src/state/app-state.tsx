import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { DEFAULT_FIGURE_ID, getFigure, hasFigure, lineageFromAdam } from "@/lib/graph";

export const DEPTH_OPTIONS = [
  { value: 2, short: "±2", label: "±2 Generations (Focused)" },
  { value: 3, short: "±3", label: "±3 Generations (Extended)" },
  { value: 5, short: "±5", label: "±5 Generations (Deep Lineage)" },
  { value: 99, short: "All", label: "Full Connected Lineage" },
] as const;

export type Depth = (typeof DEPTH_OPTIONS)[number]["value"];

export interface Highlight {
  path: string[];
  label: string;
}

interface AppState {
  focusId: string;
  selectedId: string | null;
  depth: Depth;
  showSpouses: boolean;
  showSiblings: boolean;
  highlight: Highlight | null;
  /** Increments whenever the tree should re-centre on the focus person. */
  recenterToken: number;
  focusOn: (id: string, options?: { keepHighlight?: boolean }) => void;
  select: (id: string | null) => void;
  setDepth: (depth: Depth) => void;
  setShowSpouses: (value: boolean) => void;
  setShowSiblings: (value: boolean) => void;
  /** Highlights the line from Adam to `id`. Returns false when no connected path exists. */
  traceFromAdam: (id: string) => boolean;
  highlightPath: (path: string[], label: string) => void;
  clearHighlight: () => void;
  recenter: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [focusId, setFocusId] = useState(DEFAULT_FIGURE_ID);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [depth, setDepthState] = useState<Depth>(3);
  const [showSpouses, setShowSpouses] = useState(true);
  const [showSiblings, setShowSiblings] = useState(true);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);

  const recenter = useCallback(() => setRecenterToken((t) => t + 1), []);

  const focusOn = useCallback(
    (id: string, options?: { keepHighlight?: boolean }) => {
      if (!hasFigure(id)) return;
      setFocusId(id);
      setSelectedId(null);
      if (!options?.keepHighlight) setHighlight(null);
      recenter();
    },
    [recenter],
  );

  const setDepth = useCallback(
    (value: Depth) => {
      setDepthState(value);
      recenter();
    },
    [recenter],
  );

  const highlightPath = useCallback(
    (path: string[], label: string) => {
      const target = path[path.length - 1];
      setHighlight({ path, label });
      setDepthState(99);
      if (target) {
        setFocusId(target);
        setSelectedId(null);
      }
      recenter();
    },
    [recenter],
  );

  const traceFromAdam = useCallback(
    (id: string) => {
      const path = lineageFromAdam(id);
      if (!path || path.length < 2) return false;
      const chain = path.map((p) => getFigure(p)?.name).join(" → ");
      highlightPath(path, `Direct lineage (${path.length} generations): ${chain}`);
      return true;
    },
    [highlightPath],
  );

  const clearHighlight = useCallback(() => {
    setHighlight(null);
    setDepthState(3);
    recenter();
  }, [recenter]);

  const value = useMemo<AppState>(
    () => ({
      focusId,
      selectedId,
      depth,
      showSpouses,
      showSiblings,
      highlight,
      recenterToken,
      focusOn,
      select: setSelectedId,
      setDepth,
      setShowSpouses,
      setShowSiblings,
      traceFromAdam,
      highlightPath,
      clearHighlight,
      recenter,
    }),
    [
      focusId,
      selectedId,
      depth,
      showSpouses,
      showSiblings,
      highlight,
      recenterToken,
      focusOn,
      setDepth,
      traceFromAdam,
      highlightPath,
      clearHighlight,
      recenter,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
