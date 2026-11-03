# BibliaTree (mobile)

An interactive Biblical genealogy and scripture explorer for iOS and Android, built with
[Expo](https://expo.dev) (SDK 58), React Native and TypeScript. It is the mobile version of the
BibliaTree web prototype kept in [`reference/bibliatree-web.html`](reference/bibliatree-web.html),
and uses the same 212 figures.

## Features

- **Interactive family tree.** Pinch to zoom and drag to pan. Tap a card to inspect it;
  long-press it to rebuild the tree around that person. Choose ±2, ±3 or ±5 generations or the
  full connected lineage, show or hide spouses and siblings, and jump to featured figures
  (Adam, Noah, Abraham, Jacob, Moses, Ruth, David, Solomon, Jesus) or to figures with no recorded
  genealogy (Melchizedek, Elijah, Job, Daniel, Esther, Paul, Mary Magdalene).
- **Trace the line from Adam.** Highlights the genealogical chain from Adam to any figure.
- **Lineage Pathfinder.** Finds the connection between any two figures, with every step,
  the relationship and a key verse, and can highlight the chain on the tree.
- **Figures & scripture concordance.** Search every name, meaning, tribe, biography and verse,
  and filter by era, by the Messianic line, or by figures with no recorded genealogy.
- **Dossiers.** Biography, name meaning, lifespan, immediate family (tap to navigate),
  contemporaries, every scripture passage, key facts, and the line from Adam.
- **Save, share and print.** Export a dossier as PDF, Word (.doc), HTML, Markdown, plain text,
  CSV, SVG tree chart or JSON, then share it through the system share sheet, print it, or copy
  the text.

## Run it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On your computer (Node.js 20+):

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
  (tabs)/figures.tsx     Figures & scripture concordance
  person/[id].tsx        Dossier for one figure
  export/[id].tsx        Save / share / print
src/components/          Tree canvas, person picker, shared UI and icons
src/lib/graph.ts         Genealogy graph, tree subgraph and path finding
src/lib/tree-layout.ts   Generation-row layout for the tree and the exported SVG
src/lib/export.ts        PDF/HTML, Word, Markdown, text, CSV, SVG and JSON generators
src/data/figures.ts      The 212 figures (generated, see below)
reference/               The original web prototype
```

## Updating the figures

`src/data/figures.ts` is generated from the web prototype so the two stay in sync. Edit the
`INITIAL_BIBLE_FIGURES` array in `reference/bibliatree-web.html`, then run:

```bash
npm run data:extract
```

The script reports duplicate ids and relatives that point to a figure that doesn't exist.
Currently that is one reference, `theophilus` among Luke's associates, which the app skips.

## Differences from the web prototype

- **Pathfinder and "trace from Adam".** These prefer bloodline steps over marriages and the
  Messianic line over side branches. With plain breadth-first search (as in the prototype),
  compressed links in the data made Abraham → David run through Saul's daughter Michal, and
  Adam → Jesus through Lot and Moab. They now follow the royal line through Judah.
- **Tree layout.** Places each person beneath their parents and keeps the focus person directly
  under theirs, so lines stay short on a small screen.
- **Exports.** PDF replaces the PNG poster: phones print and share PDFs natively, and the SVG
  export still gives a scalable image of the tree.

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
```

## Adding packages

Use `npx expo install <package>` rather than `npm install` so you get versions compatible with the Expo SDK.

## Building with EAS

Builds run on Expo's servers with [EAS Build](https://docs.expo.dev/build/introduction/), using the
profiles in `eas.json`. The project is linked to the Expo project
[`@gunterfrazier/bibliatree`](https://expo.dev/accounts/gunterfrazier/projects/bibliatree)
(`owner` and `extra.eas.projectId` in `app.json`).

Sign in with `npx eas-cli@latest login`, or, for CI and other non-interactive use, set an Expo
access token in the `EXPO_TOKEN` environment variable. Keep the token in your CI's secret store;
never commit it.

| Command | Builds |
| --- | --- |
| `npx eas-cli@latest build --platform android --profile preview` | An Android `.apk` you can install on any phone from the link EAS gives you |
| `npx eas-cli@latest build --platform ios --profile preview` | An iPhone build for devices you register (needs an Apple Developer account) |
| `npx eas-cli@latest build --platform all --profile production` | Store builds (Android App Bundle and iOS), with build numbers incremented automatically |

The app ID is `com.gunterfrazier.bibliatree` (`android.package` and `ios.bundleIdentifier` in
`app.json`). It can still be changed freely until the app is first published to a store.
