/** BibliaTree palette, carried over from the web prototype's parchment / royal design. */
export const colors = {
  // Parchment scale
  parchment50: "#fdfbf7",
  parchment100: "#f9f4eb",
  parchment200: "#f1e6d3",
  parchment300: "#e5d1b0",
  parchment400: "#d4b483",
  parchment500: "#c1975b",
  parchment600: "#a67942",
  parchment700: "#875e34",
  parchment800: "#6e4d2e",
  parchment900: "#5a3f27",

  // Dark leather header tones
  header: "#1e1812",
  headerMid: "#2d2218",
  headerBar: "#261d14",
  headerField: "#34281d",
  headerFieldActive: "#3d2f22",

  // Amber accents
  amber50: "#fffbeb",
  amber100: "#fef3c7",
  amber200: "#fde68a",
  amber300: "#fcd34d",
  amber400: "#fbbf24",
  amber500: "#f59e0b",
  amber600: "#d97706",
  amber700: "#b45309",
  amber800: "#92400e",
  amber900: "#78350f",
  amber950: "#451a03",

  // Status colours
  rose100: "#ffe4e6",
  rose300: "#fda4af",
  rose600: "#e11d48",
  rose700: "#be123c",
  rose800: "#9f1239",
  purple50: "#faf5ff",
  purple100: "#f3e8ff",
  purple200: "#e9d5ff",
  purple300: "#d8b4fe",
  purple600: "#9333ea",
  purple700: "#7e22ce",
  purple800: "#6b21a8",
  purple900: "#581c87",
  blue50: "#eff6ff",
  blue100: "#dbeafe",
  blue200: "#bfdbfe",
  blue600: "#2563eb",
  blue700: "#1d4ed8",
  blue800: "#1e40af",
  blue900: "#1e3a8a",
  blue950: "#172554",
  emerald100: "#d1fae5",
  emerald900: "#064e3b",

  // Neutrals
  white: "#ffffff",
  ink: "#2c2219",
  stone400: "#a8a29e",
  stone500: "#78716c",
  stone600: "#57534e",
  stone700: "#44403c",
  stone800: "#292524",
  stone900: "#1c1917",

  canvas: "#fcf9f2",
} as const;

/**
 * Font family names as registered with expo-font in the root layout.
 * Each weight is its own family, so never combine these with `fontWeight`.
 */
export const fonts = {
  display: "Cinzel_700Bold",
  displaySemi: "Cinzel_600SemiBold",
  displayHeavy: "Cinzel_800ExtraBold",
  serif: "Lora_400Regular",
  serifItalic: "Lora_400Regular_Italic",
  serifSemi: "Lora_600SemiBold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const shadow = {
  card: {
    shadowColor: "#5a3f27",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#1c1917",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;
