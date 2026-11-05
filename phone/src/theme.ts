import { Platform, type ViewStyle } from "react-native";

/** Slate-emerald system. Mirrors client/src/index.css. */
export const palette = {
  background: "#F4F6F8",
  surfaceMuted: "#EEF2F6",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  emerald: "#10B981",
  emeraldDark: "#059669",
  emeraldPress: "#047857",
  emeraldWash: "#ECFDF5",
  /** Emerald dark enough to read as text on white / slate backgrounds. */
  emeraldText: "#047857",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  danger: "#B91C1C",
  dangerWash: "#FEF2F2",
  white: "#FFFFFF"
};

export const radius = { control: 10, card: 16 };

/** Subtle drop shadow for cards (iOS shadow props + Android elevation). */
export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }
  },
  android: { elevation: 2, shadowColor: "#0F172A" },
  default: { boxShadow: "0px 4px 14px rgba(15, 23, 42, 0.07)" } as ViewStyle
}) as ViewStyle;

/** Slightly stronger shadow for floating chrome (tab bar, headers, FAB). */
export const raisedShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 }
  },
  android: { elevation: 10, shadowColor: "#0F172A" },
  default: { boxShadow: "0px -4px 16px rgba(15, 23, 42, 0.1)" } as ViewStyle
}) as ViewStyle;

/** Tight pressed-state scale used by buttons and cards. */
export const PRESS_SCALE = 0.97;
