# Claude mobile app

A cross-platform (iOS + Android) mobile app built with [Expo](https://expo.dev) (SDK 58),
React Native and TypeScript. Navigation uses [Expo Router](https://docs.expo.dev/router/introduction/):
every file in `src/app/` is a screen.

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
src/app/        Screens and layouts (file-based routes)
assets/images/  App icon, splash screen and adaptive Android icons
app.json        App name, icons, splash screen and native config
```

Keep non-screen code (components, hooks, utilities) in `src/` outside `src/app/`.

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint (sets itself up on first run)
```

## Adding packages

Use `npx expo install <package>` rather than `npm install` so you get versions compatible with the Expo SDK.

## Building for the app stores

Use [EAS Build](https://docs.expo.dev/build/introduction/): `npx eas-cli@latest build --platform all`.
You need a free Expo account; App Store builds also need an Apple Developer account.
