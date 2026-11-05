import { StyleSheet, Text, View } from "react-native";
import { useSession } from "../state/SessionContext";
import { cardShadow, palette, radius } from "../theme";

export function AllowanceStrip() {
  const { allowance, patron } = useSession();
  if (!allowance) return null;
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <Text style={styles.label}>{allowance.audience === "guest" ? "Guest allowance" : "Reader allowance"}</Text>
        <Text style={styles.label}>
          {allowance.used}/{allowance.cap}
        </Text>
      </View>
      <View style={styles.pips}>
        {Array.from({ length: allowance.cap }, (_, i) => (
          <View key={i} style={[styles.pip, i < allowance.used && styles.pipUsed]} />
        ))}
      </View>
      <Text style={styles.hint}>
        {allowance.remaining === 0
          ? "Allowance used. Titles you already claimed stay free."
          : `${allowance.remaining} different title${allowance.remaining === 1 ? "" : "s"} left.`}
        {!patron ? " Sign in on the Account tab for 10." : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 12, fontWeight: "700", color: palette.muted },
  pips: { flexDirection: "row", gap: 4 },
  pip: {
    flex: 1,
    height: 8,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted
  },
  pipUsed: { backgroundColor: palette.emerald, borderColor: palette.emerald },
  hint: { fontSize: 12, color: palette.muted }
});
