import { useFocusEffect, useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { useCallback } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eyebrow, Notice, OutlineButton, SolidButton } from "../components/Buttons";
import type { Stage } from "../lib/types";
import { useClaimCard } from "../lib/useClaimCard";
import { useSession } from "../state/SessionContext";
import { useShelf } from "../state/ShelfContext";
import { cardShadow, palette, radius } from "../theme";

const SECTIONS: Array<{ key: Stage; label: string; next?: Stage; nextLabel?: string }> = [
  { key: "reading", label: "Reading now", next: "finished", nextLabel: "Mark finished" },
  { key: "to-read", label: "To read", next: "reading", nextLabel: "Start reading" },
  { key: "finished", label: "Finished" }
];

export function ShelfScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { patron } = useSession();
  const { shelf, loading, reload, keep, drop, unpin } = useShelf();
  const { claim, pendingId, feedback } = useClaimCard();

  // Refresh whenever the tab is shown so changes made on the web appear here.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const openWork = (workId: number) => navigation.navigate("Catalogue", { screen: "BookDetail", params: { workId } });

  if (!patron) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.pad}>
          <Eyebrow>My shelf</Eyebrow>
          <Text style={styles.h1}>Your shelf follows you</Text>
          <Text style={styles.muted}>Sign in to keep titles and bookmarks that stay in sync with the web app.</Text>
          <SolidButton label="Go to Account" onPress={() => navigation.navigate("Account")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: 120 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={palette.emerald} />}
      >
        <Eyebrow>My shelf</Eyebrow>
        <Text style={styles.h1}>{shelf.entries.length ? "What you are keeping" : "Your shelf is empty"}</Text>
        <Text style={styles.muted}>Pull down to sync with the web app.</Text>

        {SECTIONS.map((section) => {
          const rows = shelf.entries.filter((e) => e.stage === section.key);
          return (
            <View key={section.key} style={styles.section}>
              <Text style={styles.sectionHead}>
                {section.label.toUpperCase()} · {rows.length}
              </Text>
              {rows.length === 0 && <Text style={styles.muted}>Nothing here.</Text>}
              {rows.map((entry) => (
                <View key={entry.workId} style={styles.item}>
                  <Pressable onPress={() => openWork(entry.workId)}>
                    <Text style={styles.itemTitle}>{entry.work.title}</Text>
                  </Pressable>
                  <Text style={styles.muted}>
                    {entry.work.author}, {entry.work.yearLabel}
                  </Text>
                  <View style={styles.row}>
                    {section.next && (
                      <SolidButton small label={section.nextLabel!} onPress={() => void keep(entry.workId, section.next!)} />
                    )}
                    <OutlineButton small label="Card" disabled={pendingId === entry.workId} onPress={() => void claim(entry.workId)} />
                    <OutlineButton small label="Remove" onPress={() => void drop(entry.workId)} />
                  </View>
                  {feedback?.workId === entry.workId && (
                    <Notice kind={feedback.kind === "ok" ? "ok" : "error"} text={feedback.text} />
                  )}
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.section}>
          <Text style={styles.sectionHead}>BOOKMARKS · {shelf.pins.length}</Text>
          {shelf.pins.length === 0 && <Text style={styles.muted}>No bookmarks yet. Open a record and pin a place.</Text>}
          {shelf.pins.map((p) => (
            <View key={p.id} style={[styles.item, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
              <Pressable style={{ flex: 1 }} onPress={() => openWork(p.workId)}>
                <Text style={styles.itemTitle}>{p.work.title}</Text>
                <Text style={styles.muted}>{p.locator || "Bookmarked"}</Text>
              </Pressable>
              <OutlineButton small label="Remove" onPress={() => void unpin(p.id)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  pad: { padding: 16, gap: 10 },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: palette.text },
  muted: { fontSize: 13.5, color: palette.muted },
  section: { gap: 8, marginTop: 14 },
  sectionHead: { fontSize: 11.5, fontWeight: "700", letterSpacing: 1.4, color: palette.emeraldText },
  item: {
    gap: 6,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  itemTitle: { fontWeight: "700", fontSize: 17, color: palette.text },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
});
