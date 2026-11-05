import { useNavigation, type NavigationProp, type ParamListBase } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AllowanceStrip } from "../components/AllowanceStrip";
import { BookTile } from "../components/BookTile";
import { Notice } from "../components/Buttons";
import { call } from "../lib/api";
import type { Room, SearchResult, Work } from "../lib/types";
import { useClaimCard } from "../lib/useClaimCard";
import { useSession } from "../state/SessionContext";
import { useShelf } from "../state/ShelfContext";
import { PRESS_SCALE, palette, radius } from "../theme";

export function CatalogScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { patron, apiBase } = useSession();
  const { stageOf, keep } = useShelf();
  const { claim, pendingId, feedback } = useClaimCard();

  const [term, setTerm] = useState("");
  const [room, setRoom] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Work[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    call<{ rooms: Room[] }>("/catalog/rooms")
      .then((r) => setRooms(r.rooms))
      .catch(() => setRooms([]));
  }, [apiBase]);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const res = await call<SearchResult>("/catalog", {
          query: { q: term.trim(), room, page: nextPage, pageSize: 20 }
        });
        if (id !== requestId.current) return;
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPage(nextPage);
        setError(null);
      } catch (e) {
        if (id === requestId.current) setError(e instanceof Error ? e.message : "Could not load the catalogue.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [term, room]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(1, true), 250);
    return () => clearTimeout(t);
  }, [load, apiBase]);

  const open = (workId: number) => navigation.navigate("BookDetail", { workId });

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <FlatList
        data={items}
        keyExtractor={(w) => String(w.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View>
              <Text style={styles.brand}>Emman Reading Room</Text>
              <Text style={styles.tag}>Classic science, history &amp; ideas</Text>
            </View>
            <TextInput
              style={styles.search}
              value={term}
              onChangeText={setTerm}
              placeholder="Search titles, authors, subjects"
              placeholderTextColor={palette.muted}
              autoCapitalize="none"
              returnKeyType="search"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <RoomChip label={`All (${rooms.reduce((n, r) => n + r.count, 0)})`} active={!room} onPress={() => setRoom("")} />
              {rooms.map((r) => (
                <RoomChip key={r.key} label={`${r.label} (${r.count})`} active={room === r.key} onPress={() => setRoom(r.key)} />
              ))}
            </ScrollView>
            <AllowanceStrip />
            {error && <Notice kind="error" text={error} />}
            <Text style={styles.count}>{total} title{total === 1 ? "" : "s"}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookTile
            work={item}
            shelfStage={stageOf(item.id)}
            claiming={pendingId === item.id}
            feedback={feedback}
            onOpen={() => open(item.id)}
            onClaim={() => void claim(item.id)}
            onShelve={
              patron
                ? () => void keep(item.id, "to-read")
                : () => navigation.navigate("Account")
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && items.length < total) void load(page + 1, false);
        }}
        ListFooterComponent={loading ? <ActivityIndicator color={palette.emerald} style={{ margin: 20 }} /> : undefined}
        ListEmptyComponent={!loading ? <Notice text="Nothing matched. Try an author surname or a broader subject." /> : undefined}
      />
    </SafeAreaView>
  );
}

function RoomChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { transform: [{ scale: PRESS_SCALE }] }]}
    >
      <Text style={[styles.chipText, active && { color: palette.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  list: { padding: 16, paddingBottom: 120 },
  brand: { fontWeight: "800", fontSize: 28, letterSpacing: -0.6, color: palette.text },
  tag: { fontSize: 13, fontWeight: "500", color: palette.muted },
  search: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.white,
    color: palette.text
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card
  },
  chipActive: { backgroundColor: palette.emerald, borderColor: palette.emerald, shadowColor: palette.emerald, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  chipText: { fontSize: 13, fontWeight: "600", color: palette.text },
  count: { fontSize: 12.5, color: palette.muted }
});
