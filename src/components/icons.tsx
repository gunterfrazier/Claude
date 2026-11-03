import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

function makeIcon(d: string | string[], defaultStroke = 2) {
  const paths = Array.isArray(d) ? d : [d];
  return function Icon({ size = 18, color = "currentColor", strokeWidth = defaultStroke }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {paths.map((p) => (
          <Path key={p} d={p} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
    );
  };
}

// Paths taken from the BibliaTree web prototype (Heroicons outline style).
export const LogoIcon = makeIcon(
  "M12 3v18m0-18c-3.3 0-6 2.7-6 6 0 2.2 1.2 4.1 3 5.2M12 3c3.3 0 6 2.7 6 6 0 2.2-1.2 4.1-3 5.2M6 21h12M9 14.2c-2.5.8-4.5 2.8-5 5.8m11-5.8c2.5.8 4.5 2.8 5 5.8",
  1.8,
);
export const TreeTabIcon = makeIcon(
  "M7 11v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1h2a1 1 0 011 1zm7-7v15a1 1 0 01-1 1h-2a1 1 0 01-1-1V4a1 1 0 011-1h2a1 1 0 011 1zm7 11v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1z",
);
export const PathIcon = makeIcon("M13 7h8m0 0v8m0-8l-8 8-4-4-6 6");
export const BookIcon = makeIcon(
  "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
);
export const SearchIcon = makeIcon("M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z");
export const PrintIcon = makeIcon(
  "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
);
export const DownloadIcon = makeIcon("M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4");
export const ShareIcon = makeIcon(["M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7", "M16 6l-4-4-4 4", "M12 2v13"]);
export const FocusIcon = makeIcon(["M12 8a4 4 0 100 8 4 4 0 000-8z", "M12 2v3M12 19v3M2 12h3M19 12h3"]);
export const SwapIcon = makeIcon(["M7 16V4m0 0L3 8m4-4l4 4", "M17 8v12m0 0l4-4m-4 4l-4-4"]);
export const CloseIcon = makeIcon("M6 18L18 6M6 6l12 12");
export const ChevronRightIcon = makeIcon("M9 5l7 7-7 7");
export const ChevronDownIcon = makeIcon("M19 9l-7 7-7-7");
export const SparkleIcon = makeIcon("M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z");
export const CopyIcon = makeIcon([
  "M8 8h11a1 1 0 011 1v11a1 1 0 01-1 1H8a1 1 0 01-1-1V9a1 1 0 011-1z",
  "M16 8V5a1 1 0 00-1-1H4a1 1 0 00-1 1v11a1 1 0 001 1h3",
]);
