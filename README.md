# BibliaTree (mobile)

An interactive Biblical genealogy and scripture explorer for iOS and Android, built with
[Expo](https://expo.dev) (SDK 58), React Native and TypeScript. It grew out of the BibliaTree web
prototype kept in [`reference/bibliatree-web.html`](reference/bibliatree-web.html) and now covers
330 figures and 729 scripture references, with four complete Bible translations bundled for
offline reading.

## Features

- **Choose your Bible translation.** Berean Standard Bible (default), New Heart English Bible,
  King James Version or American Standard Version. Every verse in the app, and every exported
  document, uses the chosen translation. Change it in Settings, on a dossier's Scriptures tab or
  in the passage reader.
- **Interactive family tree.** Pinch to zoom and drag to pan. Tap a card to inspect it; long-press
  it to rebuild the tree around that person. Choose ±2, ±3 or ±5 generations or the full line,
  show or hide spouses and siblings, and jump to featured figures. Links that skip generations
  are dashed and labelled (e.g. "19 gen."), legal links are dotted, and links that rest on
  tradition are drawn fainter.
- **Trace the line from Adam.** Highlights the line of descent from Adam to any figure, with the
  number of generations it spans.
- **Lineage Pathfinder.** Finds the connection between any two figures, with every step, the
  relationship, the names Scripture lists in between, and a key verse.
- **Timeline.** Lifetimes, reigns and ministries on two scales: years after creation from the
  ages in Genesis 5 and 11 (Adam to Jacob), and approximate BC/AD dates (Abraham to the apostles)
  with markers for the Exodus, the temple, the exiles and the crucifixion. Tap a figure to see who
  lived at the same time.
- **Passage reader.** Tap any reference — in a dossier, a fact or a biography — to read it in
  context, switch to the whole chapter, page through chapters, copy the text, or jump to the
  people cited from those verses.
- **Figures & scripture concordance.** Search names, meanings, tribes, places, facts and
  references, and filter by era, the Messianic line, figures with no recorded genealogy, women,
  kings and queens, prophets, priests, judges, apostles, or rulers and officials.
- **Dossiers.** Biography, name meaning, approximate dates, roles, places, immediate family,
  contemporaries, every scripture passage, key facts, and **Genealogy Sources**: the references
  behind each parent link, the generations Scripture lists in between, and notes where a link is
  traditional or debated.
- **Saved figures and study notes.** Star any figure and keep your own notes on it. Both stay on
  the device; the Saved tab lists them.
- **Save, share and print.** Export a dossier as PDF, Word (.doc), HTML, Markdown, plain text,
  CSV, SVG tree chart or JSON, quoting the chosen translation with its notice.

## Run it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On your computer (Node.js 22.18+ for the data scripts; 20+ to run the app):

   ```bash
   npm install
   npm start
   ```

3. Scan the QR code shown in the terminal: with the Camera app on iOS, or from inside Expo Go on Android.

Other targets: `npm run android` (Android emulator), `npm run ios` (iOS simulator, macOS only),
`npm run web` (browser).

## Project layout

```
src/app/                 Screens (file-based routes, Expo Router)
  (tabs)/index.tsx       Family tree
  (tabs)/pathfinder.tsx  Lineage pathfinder
  (tabs)/timeline.tsx    Timeline
  (tabs)/figures.tsx     Figures & scripture concordance
  (tabs)/saved.tsx       Saved figures and notes
  person/[id].tsx        Dossier for one figure
  passage.tsx            Passage reader
  export/[id].tsx        Save / share / print
  settings.tsx           Translation and data settings
src/components/          Tree canvas, person picker, shared UI and icons
src/data/figures.ts      The dataset (edit this; see below)
src/data/bible-assets.ts Generated index of the bundled translations
src/lib/graph.ts         Genealogy graph, tree subgraph and path finding
src/lib/bible.ts         Translations, on-demand loading and passage lookup
src/lib/references.ts    Scripture reference parsing
src/lib/tree-layout.ts   Generation-row layout for the tree and the exported SVG
src/lib/export.ts        Document generators
src/state/               Tree state and on-device user data
assets/bible/            Bundled translations, one file per book
scripts/                 Data checking and Bible build scripts
reference/               The original web prototype
```

## The dataset

`src/data/figures.ts` is the source of truth. Each figure has a biography, facts, scripture
references (text comes from the chosen translation, not the data), roles, approximate dates,
places and family links. Parent links can carry details in `parentLinks`:

- `refs` — where Scripture states the relationship
- `kind: "descendant"` — generations are skipped or unrecorded (a tribe, a nation, or a list
  such as Luke 3), with `generations` and the names `via` when Scripture gives them
- `kind: "legal"` — a legal or adoptive parent (Joseph → Jesus)
- `tradition: true` — the link rests on interpretation rather than an explicit statement
  (e.g. Heli as Mary's father)

After editing, run:

```bash
npm run data:check
```

It fails on duplicate ids, one-sided or dangling links, and references that don't parse or point
past the end of a chapter. It also checks every cited passage against all four translations and
lists those that never name the person; most of these are expected (a prophecy, or "his
brothers"), but new ones are worth a look.

Dates are approximate and follow a traditional chronology (the Exodus c. 1446 BC; Edwin Thiele's
dates for the kings). Years before Abraham are counted from creation with the Masoretic ages in
Genesis 5 and 11.

## Bible texts

`npm run bible:build` downloads the four translations from
[scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases), cleans them, and
writes `assets/bible/<translation>/<book>.txt` plus `src/data/bible-assets.ts` (use
`-- --source-dir DIR` to build from files downloaded earlier). All four are public domain or
CC0: the Berean Standard Bible (CC0), New Heart English Bible, King James Version (Pure Cambridge
Edition; Crown rights apply in the UK) and American Standard Version (1901). Copyrighted
translations such as the ESV, NIV or NLT need a publisher's license before they can be bundled.

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run data:check  # dataset and references
```

## Adding packages

Use `npx expo install <package>` rather than `npm install` so you get versions compatible with the Expo SDK.

## Building with EAS

Builds run on Expo's servers with [EAS Build](https://docs.expo.dev/build/introduction/), using the
profiles in `eas.json`. You need a free Expo account. The first time, link the project to your
account (this adds its project ID to `app.json`):

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

| Command | Builds |
| --- | --- |
| `npx eas-cli@latest build --platform android --profile preview` | An Android `.apk` you can install on any phone from the link EAS gives you |
| `npx eas-cli@latest build --platform ios --profile preview` | An iPhone build for devices you register (needs an Apple Developer account) |
| `npx eas-cli@latest build --platform all --profile production` | Store builds (Android App Bundle and iOS), with build numbers incremented automatically |

The app ID is `com.gunterfrazier.bibliatree` (`android.package` and `ios.bundleIdentifier` in
`app.json`). It can still be changed freely until the app is first published to a store.
