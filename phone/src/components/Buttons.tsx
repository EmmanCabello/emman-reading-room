import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { PRESS_SCALE, palette, radius } from "../theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

type PressState = { pressed: boolean; hovered?: boolean };

/** Filled emerald primary action with white text and a pressed-in scale. */
export function SolidButton({ label, onPress, disabled, small, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={(s: PressState) => [
        styles.base,
        small && styles.small,
        styles.solid,
        s.hovered && !s.pressed && { backgroundColor: palette.emeraldDark, borderColor: palette.emeraldDark },
        s.pressed && styles.solidPressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <Text style={[styles.label, small && styles.labelSmall, { color: palette.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Bordered secondary action. */
export function OutlineButton({ label, onPress, disabled, small, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={(s: PressState) => [
        styles.base,
        small && styles.small,
        styles.outline,
        s.hovered && !s.pressed && { borderColor: palette.emerald },
        s.pressed && styles.outlinePressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <Text style={[styles.label, small && styles.labelSmall, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ kind = "info", text }: { kind?: "info" | "ok" | "error"; text: string }) {
  const color = kind === "error" ? palette.danger : kind === "ok" ? palette.emeraldText : palette.text;
  const background = kind === "error" ? palette.dangerWash : kind === "ok" ? palette.emeraldWash : palette.card;
  const borderColor = kind === "error" ? "#FECACA" : kind === "ok" ? "#A7F3D0" : palette.border;
  return (
    <View style={[styles.notice, { borderColor, backgroundColor: background }]}>
      <Text style={{ color, fontSize: 13.5, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: palette.borderStrong
  },
  small: { minHeight: 38, paddingHorizontal: 14 },
  solid: {
    backgroundColor: palette.emerald,
    borderColor: palette.emerald,
    shadowColor: palette.emerald,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  solidPressed: {
    backgroundColor: palette.emeraldPress,
    borderColor: palette.emeraldPress,
    transform: [{ scale: PRESS_SCALE }],
    shadowOpacity: 0.1
  },
  outline: { backgroundColor: palette.card },
  outlinePressed: {
    backgroundColor: palette.emeraldWash,
    borderColor: palette.emerald,
    transform: [{ scale: PRESS_SCALE }]
  },
  disabled: { opacity: 0.5 },
  label: { fontWeight: "700", fontSize: 14.5 },
  labelSmall: { fontSize: 13.5 },
  notice: {
    borderWidth: 1,
    borderRadius: radius.control,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  eyebrow: { fontSize: 11.5, fontWeight: "700", letterSpacing: 1.4, color: palette.emeraldText }
});
