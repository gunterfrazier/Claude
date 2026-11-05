import type { Figure } from "@/data/types";
import { passagePlainText, passageSync, translationInfo, type TranslationId } from "@/lib/bible";
import {
  buildSubgraph,
  formatGenerations,
  getFigure,
  getSiblings,
  lineageFromAdam,
  resolveFigures,
  summarizePath,
} from "@/lib/graph";
import { layoutTree, type LayoutDims } from "@/lib/tree-layout";

export type ExportFormat = "PDF" | "DOC" | "HTML" | "MD" | "TXT" | "CSV" | "SVG" | "JSON";

export const EXPORT_FORMATS: Record<
  ExportFormat,
  { label: string; badge: string; blurb: string; ext: string; mime: string; uti: string; textual: boolean }
> = {
  PDF: {
    label: "PDF Dossier",
    badge: ".PDF",
    blurb: "Print-ready document with the family tree diagram, biography, scriptures and facts.",
    ext: "pdf",
    mime: "application/pdf",
    uti: "com.adobe.pdf",
    textual: false,
  },
  DOC: {
    label: "Word Document",
    badge: ".DOC",
    blurb: "Formatted study document for Microsoft Word, Pages or Google Docs.",
    ext: "doc",
    mime: "application/msword",
    uti: "com.microsoft.word.doc",
    textual: false,
  },
  HTML: {
    label: "Web Dossier",
    badge: ".HTML",
    blurb: "Standalone page with the vector family tree, parchment styling and a print button.",
    ext: "html",
    mime: "text/html",
    uti: "public.html",
    textual: false,
  },
  MD: {
    label: "Markdown Notes",
    badge: ".MD",
    blurb: "Tables, tree hierarchy and quoted verses for Notion, Obsidian or Logos.",
    ext: "md",
    mime: "text/markdown",
    uti: "net.daringfireball.markdown",
    textual: true,
  },
  TXT: {
    label: "Plain Text",
    badge: ".TXT",
    blurb: "Universal text report with a generational hierarchy, facts and citations.",
    ext: "txt",
    mime: "text/plain",
    uti: "public.plain-text",
    textual: true,
  },
  CSV: {
    label: "Lineage Spreadsheet",
    badge: ".CSV",
    blurb: "Every relative in the tree with generation offsets, meanings and scriptures.",
    ext: "csv",
    mime: "text/csv",
    uti: "public.comma-separated-values-text",
    textual: true,
  },
  SVG: {
    label: "Vector Tree Chart",
    badge: ".SVG",
    blurb: "Infinitely scalable family tree diagram for printing or presentations.",
    ext: "svg",
    mime: "image/svg+xml",
    uti: "public.svg-image",
    textual: false,
  },
  JSON: {
    label: "JSON Data",
    badge: ".JSON",
    blurb: "Machine-readable dossier, relatives, scriptures and tree graph.",
    ext: "json",
    mime: "application/json",
    uti: "public.json",
    textual: true,
  },
};

export interface ExportSections {
  tree: boolean;
  bio: boolean;
  scriptures: boolean;
  facts: boolean;
}

export interface GenerationRow {
  gen: number;
  label: string;
  members: Figure[];
}

export interface ExportBundle {
  person: Figure;
  depth: number;
  genMap: Map<string, number>;
  parents: string[];
  spouses: string[];
  children: string[];
  siblings: string[];
  associates: string[];
  adamChainNames: string[];
  /** e.g. "32 generations" for the chain from Adam. */
  lineageLabel: string;
  generationRows: GenerationRow[];
  translation: TranslationId;
  /** Verse text for a reference in the chosen translation ("" if its book isn't loaded). */
  verse: (ref: string) => string;
}

const names = (figs: Figure[]) => figs.map((f) => f.name);

/**
 * Gathers everything an export needs. Load the books for the person's references first
 * (`preloadReferences`) so verse text is available synchronously.
 */
export function buildExportBundle(personId: string, depth: number, translation: TranslationId = "BSB"): ExportBundle {
  const person = getFigure(personId) ?? getFigure("david")!;
  const genMap = buildSubgraph(person.id, { maxDepth: depth, includeSpouses: true, includeSiblings: true });
  const layout = layoutTree(genMap, person.id);
  const chain = lineageFromAdam(person.id);

  return {
    person,
    depth,
    genMap,
    parents: names(resolveFigures(person.parents)),
    spouses: names(resolveFigures(person.spouses)),
    children: names(resolveFigures(person.children)),
    siblings: names(resolveFigures(getSiblings(person.id))),
    associates: names(resolveFigures(person.associates)),
    adamChainNames: chain ? names(resolveFigures(chain)) : [],
    lineageLabel: chain ? formatGenerations(summarizePath(chain)) : "",
    translation,
    verse: (ref: string) => {
      const sections = passageSync(ref, translation);
      return sections ? passagePlainText(sections) : "";
    },
    generationRows: layout.rows.map(({ gen, ids }) => ({
      gen,
      label:
        gen === 0 ? "Focus Generation (0)" : gen < 0 ? `Ancestors (${gen} Gen)` : `Descendants / Contemporaries (+${gen} Gen)`,
      members: resolveFigures(ids),
    })),
  };
}

export function exportFileName(bundle: ExportBundle, format: ExportFormat): string {
  const slug = bundle.person.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${slug}_family_tree_dossier.${EXPORT_FORMATS[format].ext}`;
}

export function escapeXml(unsafe: unknown): string {
  return String(unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= maxChars) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxChars - 1)}…`;
    return kept;
  }
  return lines;
}

const SVG_DIMS: LayoutDims = {
  nodeW: 216,
  nodeH: 96,
  hGap: 32,
  vGap: 142,
  padX: 70,
  padTop: 136,
  padBottom: 46,
};
const SVG_HEADER_H = 112;

/** Self-contained SVG diagram of the person's family tree. */
export function generateTreeSvg(bundle: ExportBundle): string {
  const { person, genMap } = bundle;
  const layout = layoutTree(genMap, person.id, SVG_DIMS);
  const { nodeW, nodeH } = SVG_DIMS;
  const width = Math.max(920, layout.width);
  const height = Math.max(460, layout.height);
  const shiftX = (width - layout.width) / 2;
  const pos = (id: string) => {
    const p = layout.positions.get(id)!;
    return { ...p, x: p.x + shiftX, cx: p.cx + shiftX };
  };

  let edges = "";
  const drawnSpouses = new Set<string>();
  for (const id of layout.positions.keys()) {
    const a = pos(id);
    const fig = getFigure(id);
    if (!fig) continue;
    for (const spouseId of fig.spouses) {
      if (!layout.positions.has(spouseId)) continue;
      const key = [id, spouseId].sort().join("--");
      if (drawnSpouses.has(key)) continue;
      drawnSpouses.add(key);
      const b = pos(spouseId);
      if (Math.abs(a.y - b.y) < 10) {
        edges += `<line x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}" stroke="#d97706" stroke-width="2.2" stroke-dasharray="5,4" />`;
      }
    }
    for (const childId of fig.children) {
      if (!layout.positions.has(childId)) continue;
      const b = pos(childId);
      const y1 = a.y + nodeH;
      const midY = (y1 + b.y) / 2;
      const focusLink = id === person.id || childId === person.id;
      edges += `<path d="M ${a.cx} ${y1} C ${a.cx} ${midY}, ${b.cx} ${midY}, ${b.cx} ${b.y}" fill="none" stroke="${focusLink ? "#b45309" : "#c1975b"}" stroke-width="${focusLink ? "2.6" : "1.8"}" />`;
    }
    if (id === person.id) {
      for (const assocId of fig.associates ?? []) {
        if (!layout.positions.has(assocId)) continue;
        if (fig.parents.includes(assocId) || fig.children.includes(assocId) || fig.spouses.includes(assocId)) continue;
        const b = pos(assocId);
        const y1 = a.y + nodeH;
        const midY = (y1 + b.y) / 2;
        edges += `<path d="M ${a.cx} ${y1} C ${a.cx} ${midY}, ${b.cx} ${midY}, ${b.cx} ${b.y}" fill="none" stroke="#7e22ce" stroke-width="2" stroke-dasharray="6,4" />`;
      }
    }
  }

  let nodes = "";
  for (const id of layout.positions.keys()) {
    const fig = getFigure(id);
    if (!fig) continue;
    const p = pos(id);
    const isFocus = id === person.id;
    const stroke = isFocus ? "#b45309" : fig.messianic ? "#e11d48" : fig.unrecordedGenealogy ? "#a855f7" : "#d4b483";
    const badge = p.gen === 0 ? (isFocus ? "FOCUS FIGURE" : "SAME GEN") : p.gen < 0 ? `${p.gen} GEN` : `+${p.gen} GEN`;
    const [t1 = "", t2 = ""] = wrapLines(fig.title, 32, 2);
    const ref = fig.scriptures[0]?.ref ?? fig.era;
    nodes += `
      <g transform="translate(${p.x}, ${p.y})">
        <rect width="${nodeW}" height="${nodeH}" rx="10" fill="${isFocus ? "#fffbeb" : "#ffffff"}" stroke="${stroke}" stroke-width="${isFocus ? "2.8" : "1.6"}" />
        <rect x="8" y="8" width="78" height="16" rx="4" fill="${isFocus ? "#b45309" : "#f1e6d3"}" />
        <text x="47" y="19" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="9" font-weight="bold" fill="${isFocus ? "#ffffff" : "#5a3f27"}">${escapeXml(badge)}</text>
        <text x="${nodeW - 10}" y="19" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="9" font-weight="bold" fill="#92400e">${escapeXml(ref.slice(0, 18))}</text>
        <text x="10" y="39" font-family="Georgia, serif" font-size="13" font-weight="bold" fill="#1c1917">${escapeXml(fig.name.slice(0, 26))}</text>
        <text x="10" y="55" font-family="Inter, Arial, sans-serif" font-size="10" fill="#57534e">${escapeXml(t1)}</text>
        <text x="10" y="68" font-family="Inter, Arial, sans-serif" font-size="10" fill="#57534e">${escapeXml(t2)}</text>
        <line x1="10" y1="76" x2="${nodeW - 10}" y2="76" stroke="#e5d1b0" stroke-width="1" />
        <text x="10" y="88" font-family="Inter, Arial, sans-serif" font-size="9" fill="#78716c">${escapeXml(fig.era)}</text>
      </g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#fcf9f2" rx="12" />
  <rect width="${width}" height="${SVG_HEADER_H}" fill="#261d14" rx="12" />
  <text x="28" y="40" font-family="Georgia, serif" font-size="22" font-weight="bold" fill="#fef3c7">BIBLIATREE — Family Tree of ${escapeXml(person.name)}</text>
  <text x="28" y="64" font-family="Inter, Arial, sans-serif" font-size="13" fill="#fde68a">${escapeXml(person.title)} • ${escapeXml(person.era)} (${escapeXml(person.tribe || "Biblical Lineage")})</text>
  <text x="28" y="88" font-family="Inter, Arial, sans-serif" font-size="11" fill="#e5d1b0">Name Meaning: "${escapeXml(person.meaning || "—")}" | Lifespan/Period: ${escapeXml(person.lifespan || person.era)} | Also Known As: ${escapeXml(person.altNames || person.name)}</text>
  ${edges}
  ${nodes}
</svg>`;
}

const TD_LABEL =
  'style="padding:8px 10px;border:1px solid #d4b483;background:#f9f4eb;font-weight:bold;width:28%;vertical-align:top;"';
const TD_VALUE = 'style="padding:8px 10px;border:1px solid #d4b483;vertical-align:top;"';
const H2 =
  'style="font-family:Georgia,serif;font-size:17px;color:#5a3f27;border-bottom:2px solid #c1975b;padding-bottom:4px;margin:0 0 10px 0;"';

const row = (label: string, value: string) => `<tr><td ${TD_LABEL}>${label}</td><td ${TD_VALUE}>${value}</td></tr>`;

export type HtmlMode = "fragment" | "standalone" | "print";

/** Dossier as HTML. Used for printing, PDF, the .html download and the Word (.doc) export. */
export function generateHtmlReport(bundle: ExportBundle, sections: ExportSections, mode: HtmlMode): string {
  const { person, parents, spouses, children, siblings, associates, adamChainNames, generationRows } = bundle;
  const e = escapeXml;

  const family = `
    <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:13px;">
      ${row("Parents", e(parents.length ? parents.join(", ") : person.unrecordedGenealogy ? "Unrecorded in Scripture (No genealogy given)" : "None recorded"))}
      ${row("Spouses / Consorts", e(spouses.length ? spouses.join(", ") : "Not specified in Scripture"))}
      ${row("Children", e(children.length ? children.join(", ") : "No descendants recorded in Scripture"))}
      ${row("Known Siblings", e(siblings.length ? siblings.join(", ") : "None recorded in current tree"))}
      ${associates.length ? row("Contemporaries &amp; Associates", e(associates.join(", "))) : ""}
    </table>`;

  const treeSection = sections.tree
    ? `
    <div style="margin-top:22px;">
      <h2 ${H2}>Family Tree Diagram &amp; Generational Breakdown (±${bundle.depth >= 99 ? "Full" : bundle.depth} Generations)</h2>
      <div style="margin-bottom:14px;overflow-x:auto;" class="tree-svg print-page-break">${generateTreeSvg(bundle)}</div>
      ${family}
      <div style="margin-top:14px;">
        ${generationRows
          .map(
            (r) => `
          <div style="margin-bottom:8px;padding:8px 12px;background:#fdfbf7;border:1px solid #e5d1b0;border-radius:8px;">
            <strong style="color:#875e34;font-size:12px;text-transform:uppercase;">${e(r.label)}:</strong>
            <span style="font-size:13px;color:#2c2219;margin-left:6px;">${r.members.map((m) => `${e(m.name)} (${e(m.title)})`).join(" • ")}</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>`
    : "";

  const bioSection = sections.bio
    ? `
    <div style="margin-top:20px;">
      <h2 ${H2}>Biblical Biography &amp; Identity Metadata</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:13px;">
        ${row("Full Name", `<strong>${e(person.name)}</strong>`)}
        ${row("Role / Title", e(person.title))}
        ${row(
          "Biblical Era &amp; Tribe",
          `${e(person.era)} • ${e(person.tribe || "Biblical Lineage")}${person.messianic ? " ★ Messianic Lineage" : ""}${person.unrecordedGenealogy ? " 📜 No Recorded Genealogy" : ""}`,
        )}
        ${row("Name Meaning", e(person.meaning || "—"))}
        ${row("Lifespan / Period", e(person.lifespan || person.era))}
        ${row("Also Known As", e(person.altNames || person.name))}
      </table>
      <p style="font-family:Georgia,serif;font-size:14px;line-height:1.65;color:#1c1917;background:#fdfbf7;padding:12px 14px;border:1px solid #e5d1b0;border-radius:8px;">${e(person.bio)}</p>
      ${
        person.unrecordedGenealogy && person.genealogyNote
          ? `<p style="font-size:12.5px;color:#581c87;background:#faf5ff;padding:10px 12px;border:1px solid #d8b4fe;border-radius:8px;margin-top:8px;"><strong>Genealogy Note:</strong> ${e(person.genealogyNote)}</p>`
          : ""
      }
      ${sections.tree ? "" : family}
    </div>`
    : "";

  const scriptureSection = sections.scriptures
    ? `
    <div style="margin-top:22px;">
      <h2 ${H2}>Scripture Concordance &amp; Key Passages (${person.scriptures.length} Citations)</h2>
      ${person.scriptures
        .map(
          (sc) => `
        <div style="margin-bottom:10px;padding:10px 14px;background:#fdfbf7;border-left:4px solid #b45309;border-top:1px solid #e5d1b0;border-right:1px solid #e5d1b0;border-bottom:1px solid #e5d1b0;border-radius:6px;page-break-inside:avoid;">
          <div style="font-weight:bold;color:#78350f;font-size:13px;">📖 ${e(sc.ref)} — <span style="font-weight:normal;color:#57534e;">${e(sc.note || "Biblical Record")}</span></div>
          <blockquote style="margin:6px 0 0 0;font-family:Georgia,serif;font-style:italic;font-size:13.5px;color:#1c1917;line-height:1.55;">"${e(bundle.verse(sc.ref))}"</blockquote>
        </div>`,
        )
        .join("")}
    </div>`
    : "";

  const factsSection = sections.facts
    ? `
    <div style="margin-top:22px;">
      <h2 ${H2}>Known Biblical Facts &amp; Genealogical Significance</h2>
      <ul style="margin:0 0 12px 18px;padding:0;font-size:13.5px;line-height:1.6;color:#1c1917;">
        ${person.facts.map((f) => `<li style="margin-bottom:6px;">${e(f)}</li>`).join("")}
      </ul>
      ${
        adamChainNames.length > 1
          ? `<div style="padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:12.5px;color:#1e3a8a;"><strong>Genealogical Chain from Adam (${e(bundle.lineageLabel)}):</strong><br/>${e(adamChainNames.join(" → "))}</div>`
          : ""
      }
    </div>`
    : "";

  const body = `
    <div style="max-width:960px;margin:0 auto;padding:24px;font-family:Inter,Helvetica,Arial,sans-serif;color:#1c1917;">
      <div style="border-bottom:3px double #b45309;padding-bottom:14px;margin-bottom:16px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#b45309;font-weight:bold;">BIBLIATREE • GENEALOGY &amp; SCRIPTURE DOSSIER</div>
        <h1 style="font-family:Georgia,serif;font-size:28px;margin:4px 0 2px 0;color:#1c1917;">${e(person.name)}</h1>
        <div style="font-size:14px;color:#57534e;font-weight:600;">${e(person.title)}</div>
        <div style="font-size:12px;color:#78716c;margin-top:6px;"><strong>Era:</strong> ${e(person.era)} &nbsp;•&nbsp; <strong>Tribe / House:</strong> ${e(person.tribe || "Biblical Lineage")}</div>
      </div>
      ${bioSection}
      ${treeSection}
      ${scriptureSection}
      ${factsSection}
      <div style="margin-top:28px;padding-top:10px;border-top:1px solid #d4b483;font-size:11px;color:#78716c;text-align:center;">Generated by BibliaTree — Interactive Biblical Genealogy &amp; Scripture Concordance<br/>Scripture quotations: ${e(translationInfo(bundle.translation).notice)} Dates and some relationships are approximate or traditional.</div>
    </div>`;

  if (mode === "fragment") return body;

  const printBar =
    mode === "standalone"
      ? `<div class="no-print-bar"><span><strong>BibliaTree Dossier:</strong> ${e(person.name)}</span><button class="no-print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button></div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${e(person.name)} — Biblical Family Tree &amp; Dossier</title>
  <style>
    body { background: ${mode === "print" ? "#ffffff" : "#fcf9f2"}; margin: 0; padding: ${mode === "print" ? "0" : "20px"}; }
    .tree-svg svg { max-width: 100%; height: auto; }
    .print-page-break { page-break-inside: avoid; break-inside: avoid; }
    .no-print-bar { max-width: 960px; margin: 0 auto 16px auto; padding: 10px 16px; background: #261d14; color: #fef3c7; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-family: sans-serif; font-size: 13px; }
    .no-print-btn { background: #d97706; color: #fff; border: none; padding: 7px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; }
    @media print { .no-print-bar { display: none !important; } body { background: #fff; padding: 0; } }
  </style>
</head>
<body>
  ${printBar}
  ${body}
</body>
</html>`;
}

export function generateWordDocument(bundle: ExportBundle, sections: ExportSections): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeXml(bundle.person.name)} Dossier</title></head><body>${generateHtmlReport(bundle, sections, "fragment")}</body></html>`;
}

export function generateMarkdown(bundle: ExportBundle, sections: ExportSections): string {
  const { person, parents, spouses, children, siblings, associates, adamChainNames, generationRows } = bundle;
  const lines: string[] = [`# ${person.name}`, `**${person.title}**`, ""];

  if (sections.bio) {
    lines.push(
      "## Identity & Biblical Metadata",
      "| Attribute | Details |",
      "| :--- | :--- |",
      `| **Biblical Era** | ${person.era} |`,
      `| **Tribe / House** | ${person.tribe || "Biblical Lineage"} |`,
      `| **Name Meaning** | ${person.meaning || "—"} |`,
      `| **Lifespan / Period** | ${person.lifespan || person.era} |`,
      `| **Also Known As** | ${person.altNames || person.name} |`,
      `| **Lineage Status** | ${person.messianic ? "★ Messianic Lineage" : person.unrecordedGenealogy ? "📜 No Recorded Genealogy" : "Recorded Biblical Genealogy"} |`,
      "",
      "## Biblical Biography",
      person.bio,
    );
    if (person.unrecordedGenealogy && person.genealogyNote) lines.push("", `> **Genealogy Note:** ${person.genealogyNote}`);
    lines.push("");
  }

  if (sections.tree) {
    lines.push(
      "## Immediate Family Connections",
      `- **Parents:** ${parents.length ? parents.join(", ") : "Unrecorded in Scripture"}`,
      `- **Spouses / Consorts:** ${spouses.length ? spouses.join(", ") : "Not specified in Scripture"}`,
      `- **Children:** ${children.length ? children.join(", ") : "No descendants recorded in Scripture"}`,
      `- **Known Siblings:** ${siblings.length ? siblings.join(", ") : "None recorded in current tree"}`,
    );
    if (associates.length) lines.push(`- **Biblical Contemporaries & Associates:** ${associates.join(", ")}`);
    lines.push("", "## Family Tree Generational Breakdown");
    for (const r of generationRows) {
      lines.push(`### ${r.label}`);
      for (const m of r.members) {
        const refs = m.scriptures.map((s) => s.ref).join("; ");
        lines.push(`- **${m.name}** — *${m.title}* (${m.era})${refs ? ` [${refs}]` : ""}`);
      }
      lines.push("");
    }
  }

  if (sections.scriptures) {
    lines.push("## Scripture Concordance & Verbatim Passages");
    for (const sc of person.scriptures)
      lines.push(`### 📖 ${sc.ref} — ${sc.note || "Scripture Record"}`, `> "${bundle.verse(sc.ref)}"`, "");
  }

  if (sections.facts) {
    lines.push("## Known Biblical Facts & Legacy");
    for (const f of person.facts) lines.push(`- ${f}`);
    if (adamChainNames.length > 1) {
      lines.push("", `**Lineage from Adam (${bundle.lineageLabel}):**`, adamChainNames.join(" → "));
    }
    lines.push("");
  }
  lines.push("---", `*Scripture quotations: ${translationInfo(bundle.translation).notice}*`);
  return lines.join("\n");
}

export function generatePlainText(bundle: ExportBundle, sections: ExportSections): string {
  const { person, parents, spouses, children, siblings, associates, adamChainNames, generationRows } = bundle;
  const hr = "=".repeat(72);
  const sub = "-".repeat(72);
  const lines: string[] = [hr, `BIBLIATREE — FAMILY TREE & BIBLICAL DOSSIER: ${person.name.toUpperCase()}`, person.title, hr, ""];

  if (sections.bio) {
    lines.push(
      "IDENTITY & METADATA",
      sub,
      `Name:              ${person.name}`,
      `Also Known As:     ${person.altNames || person.name}`,
      `Name Meaning:      ${person.meaning || "—"}`,
      `Lifespan / Period: ${person.lifespan || person.era}`,
      `Biblical Era:      ${person.era}`,
      `Tribe / House:     ${person.tribe || "Biblical Lineage"}`,
      "",
      "BIBLICAL BIOGRAPHY",
      sub,
      person.bio,
    );
    if (person.unrecordedGenealogy && person.genealogyNote) lines.push("", `Note: ${person.genealogyNote}`);
    lines.push("");
  }

  if (sections.tree) {
    lines.push(
      "IMMEDIATE FAMILY CONNECTIONS",
      sub,
      `Parents:    ${parents.length ? parents.join(", ") : "Unrecorded in Scripture"}`,
      `Spouses:    ${spouses.length ? spouses.join(", ") : "Not specified in Scripture"}`,
      `Children:   ${children.length ? children.join(", ") : "No descendants recorded"}`,
      `Siblings:   ${siblings.length ? siblings.join(", ") : "None recorded in current tree"}`,
    );
    if (associates.length) lines.push(`Associates: ${associates.join(", ")}`);
    lines.push("", "FAMILY TREE GENERATIONAL HIERARCHY", sub);
    for (const r of generationRows) {
      lines.push(`[${r.label}]`);
      for (const m of r.members) lines.push(`${m.id === person.id ? " ★ " : "   - "}${m.name} (${m.title}) [${m.era}]`);
      lines.push("");
    }
  }

  if (sections.scriptures) {
    lines.push("SCRIPTURE CONCORDANCE & PASSAGES", sub);
    for (const sc of person.scriptures)
      lines.push(`* ${sc.ref} (${sc.note || "Scripture Record"})`, `  "${bundle.verse(sc.ref)}"`, "");
  }

  if (sections.facts) {
    lines.push("KNOWN BIBLICAL FACTS & SIGNIFICANCE", sub);
    for (const f of person.facts) lines.push(`• ${f}`);
    if (adamChainNames.length > 1) {
      lines.push("", `Lineage from Adam (${bundle.lineageLabel}):`, adamChainNames.join(" -> "));
    }
    lines.push("");
  }
  lines.push(sub, `Scripture quotations: ${translationInfo(bundle.translation).notice}`);
  return lines.join("\n");
}

export function generateCsv(bundle: ExportBundle): string {
  const { person, generationRows } = bundle;
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Focus Person",
    "Relative Name",
    "Relationship / Generation Offset",
    "Role / Title",
    "Biblical Era",
    "Tribe / House",
    "Name Meaning",
    "Lifespan / Period",
    "Also Known As",
    "Messianic Line",
    "Parents",
    "Spouses",
    "Children",
    "Scripture Citations",
    "Primary Scripture Quote",
    "Biography",
  ];
  const out = [header.map(cell).join(",")];
  for (const r of generationRows) {
    for (const m of r.members) {
      const top = m.scriptures[0];
      out.push(
        [
          person.name,
          m.name,
          m.id === person.id ? "Focus Person (0 Gen)" : r.label,
          m.title,
          m.era,
          m.tribe || "Biblical Lineage",
          m.meaning || "",
          m.lifespan || m.era,
          m.altNames || m.name,
          m.messianic ? "Yes" : "No",
          names(resolveFigures(m.parents)).join("; "),
          names(resolveFigures(m.spouses)).join("; "),
          names(resolveFigures(m.children)).join("; "),
          m.scriptures.map((s) => s.ref).join("; "),
          top ? `${top.ref}: ${bundle.verse(top.ref)}` : "",
          m.bio,
        ]
          .map(cell)
          .join(","),
      );
    }
  }
  return out.join("\n");
}

export function generateJson(bundle: ExportBundle): string {
  const { person, parents, spouses, children, siblings, associates, adamChainNames, generationRows } = bundle;
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      focusFigure: {
        id: person.id,
        name: person.name,
        alsoKnownAs: person.altNames || person.name,
        title: person.title,
        era: person.era,
        tribe: person.tribe,
        nameMeaning: person.meaning,
        lifespan: person.lifespan,
        messianicLineage: person.messianic,
        unrecordedGenealogy: Boolean(person.unrecordedGenealogy),
        genealogyNote: person.genealogyNote ?? null,
        biography: person.bio,
        knownFacts: person.facts,
        scriptures: person.scriptures.map((sc) => ({ ...sc, text: bundle.verse(sc.ref) })),
      },
      translation: translationInfo(bundle.translation).notice,
      immediateFamily: { parents, spouses, children, siblings, associates },
      lineageFromAdam: adamChainNames,
      familyTreeGenerations: generationRows.map((r) => ({
        generationOffset: r.gen,
        label: r.label,
        figures: r.members.map((m) => ({
          id: m.id,
          name: m.name,
          title: m.title,
          era: m.era,
          tribe: m.tribe,
          meaning: m.meaning,
          scriptureRefs: m.scriptures.map((s) => s.ref),
        })),
      })),
    },
    null,
    2,
  );
}

/** File contents for a format. PDF is rendered from the "print" HTML by expo-print. */
export function generateExport(format: Exclude<ExportFormat, "PDF">, bundle: ExportBundle, sections: ExportSections): string {
  switch (format) {
    case "DOC":
      return generateWordDocument(bundle, sections);
    case "HTML":
      return generateHtmlReport(bundle, sections, "standalone");
    case "MD":
      return generateMarkdown(bundle, sections);
    case "TXT":
      return generatePlainText(bundle, sections);
    case "CSV":
      return generateCsv(bundle);
    case "SVG":
      return generateTreeSvg(bundle);
    case "JSON":
      return generateJson(bundle);
  }
}
