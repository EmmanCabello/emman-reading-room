import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eyebrow, Notice, OutlineButton } from "../components/Buttons";
import { call } from "../lib/api";
import type { AdminOverview } from "../lib/types";
import { useSession } from "../state/SessionContext";
import { cardShadow, palette, radius } from "../theme";

const TILES: Array<[string, string]> = [
  ["works", "Titles"],
  ["patrons", "Accounts"],
  ["retrievals", "Reader claims"],
  ["guestRetrievals", "Guest claims"],
  ["shelfItems", "Shelved"],
  ["pendingProposals", "Staged"]
];

/** Curation office: visible only to admin accounts. All data comes from /api/admin. */
export function AdminScreen() {
  const { patron } = useSession();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await call<AdminOverview>("/admin/overview"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the curation office.");
    }
  }, []);

  useEffect(() => {
    if (patron?.role === "admin") void load();
  }, [patron, load]);

  async function resetGuest(ip: string) {
    const r = await call<{ cleared: number }>(`/admin/guests/${encodeURIComponent(ip)}/claims`, { method: "DELETE" });
    setMessage(`Cleared ${r.cleared} claim(s) for ${ip}.`);
    await load();
  }

  if (patron?.role !== "admin") {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.pad}>
          <Eyebrow>Curation office</Eyebrow>
          <Text style={styles.h1}>Curators only</Text>
          <Text style={styles.muted}>Sign in as emman.admin@emman.local on the Account tab.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 120 }]}>
        <Eyebrow>Curation office</Eyebrow>
        <Text style={styles.h1}>Reading room at a glance</Text>
        {error && <Notice kind="error" text={error} />}
        {message && <Notice kind="ok" text={message} />}

        {overview && (
          <>
            <View style={styles.tiles}>
              {TILES.map(([key, label]) => (
                <View key={key} style={styles.tile}>
                  <Text style={styles.tileValue}>{overview.totals[key] ?? 0}</Text>
                  <Text style={styles.tileLabel}>{label.toUpperCase()}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionHead}>MOST CLAIMED CARDS</Text>
            {overview.popular.length === 0 && <Text style={styles.muted}>No reader claims yet.</Text>}
            {overview.popular.map((p) => (
              <View key={p.work.id} style={styles.row}>
                <Text style={styles.rowTitle}>{p.work.title}</Text>
                <Text style={styles.muted}>{p.claims}</Text>
              </View>
            ))}

            <Text style={styles.sectionHead}>GUEST IPS</Text>
            {overview.guests.length === 0 && <Text style={styles.muted}>No guest claims yet.</Text>}
            {overview.guests.map((g) => (
              <View key={g.ip} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text }}>{g.ip}</Text>
                  <Text style={styles.muted}>{g.claims} claim(s)</Text>
                </View>
                <OutlineButton small label="Reset" onPress={() => void resetGuest(g.ip)} />
              </View>
            ))}

            <Text style={styles.sectionHead}>RECENT CLAIMS</Text>
            {overview.recent.length === 0 && <Text style={styles.muted}>Nothing claimed yet.</Text>}
            {overview.recent.map((r, i) => (
              <View key={i} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.work.title}</Text>
                  <Text style={styles.muted}>
                    {r.patron} · {new Date(r.claimedAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  pad: { padding: 16, gap: 10 },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: palette.text },
  muted: { fontSize: 13.5, color: palette.muted },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  tile: {
    flexGrow: 1,
    minWidth: "30%",
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  tileValue: { fontSize: 26, fontWeight: "700", color: palette.emeraldText },
  tileLabel: { fontSize: 10.5, fontWeight: "700", letterSpacing: 1, color: palette.muted },
  sectionHead: { marginTop: 14, fontSize: 11.5, fontWeight: "700", letterSpacing: 1.4, color: palette.emeraldText },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  rowTitle: { flex: 1, fontWeight: "700", fontSize: 16, color: palette.text }
});
