#!/usr/bin/env node
/**
 * Validates src/data/figures.json against itself and against the bundled Bible text.
 *
 *   npm run data:check            # errors fail the run; warnings are listed
 *   npm run data:check -- --quiet # summary only
 *
 * Errors: duplicate ids, links to missing figures, one-sided relationships, references that
 * don't parse or point past the end of a book or chapter.
 * Warnings: a cited passage that never mentions the figure (or, for a parent link, either
 * person), checked across all bundled translations to allow for spelling differences.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIGURES = JSON.parse(fs.readFileSync(path.join(root, "src/data/figures.json"), "utf8"));
const { parseReference, formatSegment } = await import(path.join(root, "src/lib/references.ts"));
const quiet = process.argv.includes("--quiet");

const TRANSLATIONS = fs.readdirSync(path.join(root, "assets/bible")).filter((d) => !d.startsWith("."));
const cache = new Map();
const book = (t, n) => {
  const key = `${t}/${n}`;
  if (!cache.has(key)) {
    cache.set(key, JSON.parse(fs.readFileSync(path.join(root, "assets/bible", t, `${String(n).padStart(2, "0")}.txt`), "utf8")));
  }
  return cache.get(key);
};

const errors = [];
const warnings = [];

/** Text of every verse in a reference for one translation, or an error string. */
function passageText(ref, t) {
  const segs = parseReference(ref);
  if (!segs) return { error: `unparseable reference "${ref}"` };
  let text = "";
  for (const s of segs) {
    const chapters = book(t, s.book);
    for (let c = s.chapter; c <= s.chapterEnd; c++) {
      const verses = chapters[c - 1];
      if (!verses) return { error: `${formatSegment(s)}: chapter ${c} does not exist` };
      const from = c === s.chapter && s.verseStart ? s.verseStart : 1;
      const to = c === s.chapterEnd && s.verseEnd ? s.verseEnd : verses.length;
      if (from > verses.length || to > verses.length) return { error: `${formatSegment(s)}: verse out of range` };
      text += " " + verses.slice(from - 1, to).join(" ");
    }
  }
  return { text };
}

const STOP = new Set(
  "king queen son sons daughter wife husband brother sister father mother the of and in on at to who prophet prophetess apostle high priest great seer scribe line house tribe first last elder younger evangelist temple".split(
    " ",
  ),
);
function nameTokens(f) {
  const raw = [f.name.replace(/\(.*?\)/g, " "), ...(f.altNames ?? "").split(/[,/]/)];
  // Names in parentheses like "Shadrach (Hananiah)" are real names too.
  for (const m of f.name.matchAll(/\(([^)]+)\)/g))
    if (!/\b(son|daughter|wife|of|brother|mother|father|sister)\b/i.test(m[1])) raw.push(m[1]);
  const tokens = new Set();
  for (const part of raw) {
    for (const w of part.split(/[\s\-–]+/)) {
      const clean = w.replace(/[^A-Za-z']/g, "");
      if (clean.length >= 2 && /^[A-Z]/.test(clean) && !STOP.has(clean.toLowerCase())) tokens.add(clean.replace(/'s$/, ""));
    }
  }
  return [...tokens];
}
const mentions = (text, tokens) => tokens.some((t) => new RegExp(`\\b${t}`, "i").test(text));

function checkRef(ref, where, tokens) {
  let found = false;
  let anyText = false;
  for (const t of TRANSLATIONS) {
    const r = passageText(ref, t);
    if (r.error) {
      if (t === TRANSLATIONS[0]) errors.push(`${where}: ${r.error}`);
      return;
    }
    anyText = true;
    if (!tokens || mentions(r.text, tokens)) found = true;
  }
  if (anyText && tokens && !found) warnings.push(`${where}: "${ref}" does not mention ${tokens.join("/")}`);
}

const ids = new Set();
for (const f of FIGURES) {
  if (ids.has(f.id)) errors.push(`duplicate id ${f.id}`);
  ids.add(f.id);
}
const byId = new Map(FIGURES.map((f) => [f.id, f]));

for (const f of FIGURES) {
  for (const rel of ["parents", "children", "spouses", "siblings", "associates"]) {
    for (const x of f[rel] ?? []) if (!ids.has(x)) errors.push(`${f.id}.${rel}: unknown id ${x}`);
  }
  for (const p of f.parents)
    if (byId.get(p) && !byId.get(p).children.includes(f.id)) errors.push(`${p} does not list child ${f.id}`);
  for (const c of f.children)
    if (byId.get(c) && !byId.get(c).parents.includes(f.id)) errors.push(`${c} does not list parent ${f.id}`);
  for (const s of f.spouses)
    if (byId.get(s) && !byId.get(s).spouses.includes(f.id)) errors.push(`${s} does not list spouse ${f.id}`);
  for (const p of Object.keys(f.parentLinks ?? {}))
    if (!f.parents.includes(p)) errors.push(`${f.id}.parentLinks.${p}: not a parent`);
  if (f.dates && !(f.dates.from <= f.dates.to)) errors.push(`${f.id}.dates: from after to`);

  const tokens = nameTokens(f);
  for (const s of f.scriptures) checkRef(s.ref, `${f.id} scripture`, tokens);

  for (const [p, link] of Object.entries(f.parentLinks ?? {})) {
    const parent = byId.get(p);
    if (!parent) continue;
    for (const ref of link.refs ?? []) {
      // A parent link's passage should name the child, unless the link is a tribe or nation tie.
      checkRef(ref, `${f.id} ← ${p} link`, link.kind === "descendant" && !link.via ? [...tokens, ...nameTokens(parent)] : tokens);
      if (link.via) {
        for (const name of new Set(link.via)) {
          const ok = TRANSLATIONS.some((t) => {
            const r = passageText(ref, t);
            return !r.error && mentions(r.text, [name]);
          });
          if (!ok) warnings.push(`${f.id} ← ${p} link: intermediate name ${name} not found in ${ref}`);
        }
      }
    }
  }
}

const refCount = FIGURES.reduce((n, f) => n + f.scriptures.length, 0);
console.log(`${FIGURES.length} figures, ${refCount} scripture references, translations: ${TRANSLATIONS.join(", ")}`);
if (warnings.length) {
  console.log(`${warnings.length} warning(s)${quiet ? "" : ":"}`);
  if (!quiet) for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.log(`${errors.length} error(s):`);
  for (const e of errors) console.log(`  ✖ ${e}`);
  process.exit(1);
}
console.log("No errors.");
