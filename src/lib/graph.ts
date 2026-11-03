import { FIGURES } from "@/data/figures";
import type { Figure } from "@/data/types";

/**
 * The genealogy graph. Relationship lists in the source data are one-sided in places
 * (a parent may list a child the child does not list back), so links are made
 * bidirectional once at startup, exactly like the web prototype's rebuildGraphLinks().
 */
function buildGraph(source: Figure[]): { list: Figure[]; map: Map<string, Figure> } {
  const list: Figure[] = source.map((f) => ({
    ...f,
    parents: [...f.parents],
    spouses: [...f.spouses],
    children: [...f.children],
    associates: [...(f.associates ?? [])],
  }));
  const map = new Map(list.map((f) => [f.id, f]));

  for (const person of list) {
    for (const parentId of person.parents) {
      const parent = map.get(parentId);
      if (parent && !parent.children.includes(person.id)) parent.children.push(person.id);
    }
    for (const childId of person.children) {
      const child = map.get(childId);
      if (child && !child.parents.includes(person.id)) child.parents.push(person.id);
    }
    for (const spouseId of person.spouses) {
      const spouse = map.get(spouseId);
      if (spouse && !spouse.spouses.includes(person.id)) spouse.spouses.push(person.id);
    }
    for (const assocId of person.associates ?? []) {
      const assoc = map.get(assocId);
      if (assoc && !assoc.associates?.includes(person.id)) assoc.associates?.push(person.id);
    }
  }
  return { list, map };
}

const graph = buildGraph(FIGURES);

/** All figures in their original (chronological) order. */
export const allFigures: readonly Figure[] = graph.list;

/** Figures sorted by name, for pickers. */
export const figuresByName: readonly Figure[] = [...graph.list].sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_FIGURE_ID = "david";

export function getFigure(id: string | undefined | null): Figure | undefined {
  return id ? graph.map.get(id) : undefined;
}

export function hasFigure(id: string): boolean {
  return graph.map.has(id);
}

/** Resolves ids to figures, silently skipping ids with no record (e.g. "theophilus"). */
export function resolveFigures(ids: readonly string[] | undefined): Figure[] {
  return (ids ?? []).map((id) => graph.map.get(id)).filter((f): f is Figure => Boolean(f));
}

export function getSiblings(personId: string): string[] {
  const person = graph.map.get(personId);
  if (!person || person.parents.length === 0) return [];
  const siblings = new Set<string>();
  for (const parentId of person.parents) {
    for (const childId of graph.map.get(parentId)?.children ?? []) {
      if (childId !== personId) siblings.add(childId);
    }
  }
  return [...siblings];
}

const SPOUSE_STEP_COST = 3;
const OFF_MESSIANIC_LINE_COST = 3;

/**
 * Lowest-cost genealogical chain over child, parent and spouse links.
 *
 * Bloodline steps are preferred over marriages, and steps onto the Messianic line over
 * side branches, so that compressed links in the data (e.g. Moab → Ruth, Benjamin → Kish)
 * don't produce chains like Abraham → Saul → Michal → David instead of the royal line
 * through Judah. Among people off the Messianic line every step costs the same, so those
 * paths are still the shortest by generation count.
 */
export function findShortestPath(startId: string, endId: string): string[] | null {
  if (!graph.map.has(startId) || !graph.map.has(endId)) return null;
  if (startId === endId) return [startId];

  const cost = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, string>();
  const done = new Set<string>();
  const frontier = new Set([startId]);

  while (frontier.size > 0) {
    let currentId = "";
    let best = Infinity;
    for (const id of frontier) {
      const c = cost.get(id)!;
      if (c < best) {
        best = c;
        currentId = id;
      }
    }
    frontier.delete(currentId);
    if (currentId === endId) break;
    done.add(currentId);

    const current = graph.map.get(currentId)!;
    const steps: [string, boolean][] = [
      ...current.children.map((id): [string, boolean] => [id, false]),
      ...current.parents.map((id): [string, boolean] => [id, false]),
      ...current.spouses.map((id): [string, boolean] => [id, true]),
    ];
    for (const [nextId, viaMarriage] of steps) {
      const next = graph.map.get(nextId);
      if (!next || done.has(nextId)) continue;
      const stepCost = (viaMarriage ? SPOUSE_STEP_COST : 1) + (next.messianic ? 0 : OFF_MESSIANIC_LINE_COST);
      const candidate = best + stepCost;
      if (candidate < (cost.get(nextId) ?? Infinity)) {
        cost.set(nextId, candidate);
        previous.set(nextId, currentId);
        frontier.add(nextId);
      }
    }
  }

  if (!previous.has(endId)) return null;
  const path = [endId];
  while (path[0] !== startId) path.unshift(previous.get(path[0])!);
  return path;
}

const adamPathCache = new Map<string, string[] | null>();

/** Shortest genealogical chain from Adam to this person (memoised: the graph never changes). */
export function lineageFromAdam(personId: string): string[] | null {
  if (!adamPathCache.has(personId)) adamPathCache.set(personId, findShortestPath("adam", personId));
  return adamPathCache.get(personId) ?? null;
}

export type RelationStep = "parent" | "child" | "spouse" | "relative";

export function relationBetween(fromId: string, toId: string): RelationStep {
  const from = graph.map.get(fromId);
  if (!from) return "relative";
  if (from.children.includes(toId)) return "parent";
  if (from.parents.includes(toId)) return "child";
  if (from.spouses.includes(toId)) return "spouse";
  return "relative";
}

export function describeRelationshipStep(fromId: string, toId: string): string {
  switch (relationBetween(fromId, toId)) {
    case "parent":
      return "Parent of ↓";
    case "child":
      return "Child of ↑";
    case "spouse":
      return "Spouse of ∞";
    default:
      return "Relative of";
  }
}

export interface SubgraphOptions {
  maxDepth: number;
  includeSpouses: boolean;
  includeSiblings: boolean;
  /** Ids of a highlighted lineage path that must appear in the tree. */
  highlightedPath?: readonly string[];
}

/**
 * Collects the people shown in a family tree centred on `focusId`, mapped to their
 * generation relative to the focus (0 = focus, negative = ancestors, positive = descendants).
 * Insertion order is meaningful: layout uses it as the tie-breaker within a row.
 */
export function buildSubgraph(focusId: string, options: SubgraphOptions): Map<string, number> {
  const { maxDepth, includeSpouses, includeSiblings, highlightedPath = [] } = options;
  const genMap = new Map<string, number>();
  const focus = graph.map.get(focusId);
  if (!focus) return genMap;
  genMap.set(focusId, 0);

  // 1. Ancestors (negative generations)
  const up = [{ id: focusId, gen: 0 }];
  while (up.length > 0) {
    const { id, gen } = up.shift()!;
    if (Math.abs(gen) >= maxDepth) continue;
    for (const parentId of graph.map.get(id)?.parents ?? []) {
      if (!genMap.has(parentId) && graph.map.has(parentId)) {
        genMap.set(parentId, gen - 1);
        up.push({ id: parentId, gen: gen - 1 });
      }
    }
  }

  // 2. Descendants (positive generations)
  const down = [{ id: focusId, gen: 0 }];
  while (down.length > 0) {
    const { id, gen } = down.shift()!;
    if (gen >= maxDepth) continue;
    for (const childId of graph.map.get(id)?.children ?? []) {
      if (!genMap.has(childId) && graph.map.has(childId)) {
        genMap.set(childId, gen + 1);
        down.push({ id: childId, gen: gen + 1 });
      }
    }
  }

  // 3. Siblings of the focus person
  if (includeSiblings) {
    for (const siblingId of getSiblings(focusId)) {
      if (!genMap.has(siblingId)) genMap.set(siblingId, 0);
    }
  }

  // 4. Spouses of everyone already in the tree
  if (includeSpouses) {
    for (const id of [...genMap.keys()]) {
      const gen = genMap.get(id) ?? 0;
      for (const spouseId of graph.map.get(id)?.spouses ?? []) {
        if (!genMap.has(spouseId) && graph.map.has(spouseId)) genMap.set(spouseId, gen);
      }
    }
  }

  // 5. Figures with no recorded genealogy (or a tiny tree) show their contemporaries
  const associates = focus.associates ?? [];
  if (focus.unrecordedGenealogy || (associates.length > 0 && genMap.size <= 3)) {
    for (const assocId of associates) {
      if (!genMap.has(assocId) && graph.map.has(assocId)) genMap.set(assocId, 1);
    }
  }

  // 6. Highlighted path members not reached above, placed relative to their path neighbours
  placePathNodes(highlightedPath, genMap);

  return genMap;
}

function placePathNodes(path: readonly string[], genMap: Map<string, number>) {
  const ids = path.filter((id) => graph.map.has(id));
  if (ids.length === 0 || ids.every((id) => genMap.has(id))) return;
  if (!ids.some((id) => genMap.has(id))) {
    ids.forEach((id, i) => genMap.set(id, i));
    return;
  }
  const offset = (from: string, to: string) => {
    const rel = relationBetween(from, to);
    return rel === "parent" ? 1 : rel === "child" ? -1 : 0;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < ids.length; i++) {
      const gen = genMap.get(ids[i]);
      if (gen === undefined) continue;
      const prev = ids[i - 1];
      const next = ids[i + 1];
      if (next && !genMap.has(next)) {
        genMap.set(next, gen + offset(ids[i], next));
        changed = true;
      }
      if (prev && !genMap.has(prev)) {
        genMap.set(prev, gen - offset(prev, ids[i]));
        changed = true;
      }
    }
  }
}
