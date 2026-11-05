import { useNavigation, useRoute, type NavigationProp, type ParamListBase, type RouteProp } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eyebrow, Notice, OutlineButton, SolidButton } from "../components/Buttons";
import { call } from "../lib/api";
import type { Stage, Work } from "../lib/types";
import { useClaimCard } from "../lib/useClaimCard";
import { useSession } from "../state/SessionContext";
import { useShelf } from "../state/ShelfContext";
import { cardShadow, palette, radius } from "../theme";

const STAGES: Array<{ key: Stage; label: string }> = [
  { key: "to-read", label: "To read" },
  { key: "reading", label: "Reading" },
  { key: "finished", label: "Finished" }
];

export function BookDetailScreen() {
  const route = useRoute<RouteProp<{ BookDetail: { workId: number } }, "BookDetail">>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { patron } = useSession();
  const { stageOf, keep, drop, pin, unpin, shelf } = useShelf();
  const { claim, pendingId, feedback } = useClaimCard();

  const workId = route.params.workId;
  const [work, setWork] = useState<Work | null>(null);
  const [related, setRelated] = useState<Work[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locator, setLocator] = useState("");

  useEffect(() => {
    setWork(null);
    call<{ work: Work; related: Work[] }>(`/catalog/${workId}`)
      .then((r) => {
        setWork(r.work);
        setRelated(r.related);
      })
      .catch((e: Error) => setError(e.message));
  }, [workId]);

  if (error) return <SafeAreaView style={styles.screen}><View style={{ padding: 16 }}><Notice kind="error" text={error} /></View></SafeAreaView>;
  if (!work) return <SafeAreaView style={styles.screen}><Text style={{ padding: 16, color: palette.muted }}>Opening the record...</Text></SafeAreaView>;

  const stage = stageOf(work.id);
  const myPins = shelf.pins.filter((p) => p.workId === work.id);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sheet}>
          <Eyebrow>{work.room.label}</Eyebrow>
          <Text style={styles.title}>{work.title}</Text>
          <Text style={styles.author}>
            {work.author}
            {work.authorLife ? `  (${work.authorLife})` : ""}
          </Text>
          <Text style={styles.body}>{work.summary}</Text>
          <View style={styles.facts}>
            <Fact label="Catalogue no." value={`ERR-${String(work.id).padStart(4, "0")}`} />
            <Fact label="First published" value={work.yearLabel} />
            <Fact label="Rights" value="Public domain in the United States" />
          </View>
          <Pressable onPress={() => void Linking.openURL(work.gutenberg.url)}>
            <Text style={styles.link}>
              {work.gutenberg.available ? `Project Gutenberg e-book #${work.gutenberg.id}` : "Search Project Gutenberg for this title"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.box}>
          <Eyebrow>Bibliographic card</Eyebrow>
          <Text style={styles.small}>A one-page card with this record and the Gutenberg link. It never contains the book text.</Text>
          <SolidButton label={pendingId === work.id ? "Claiming..." : "Claim card (PDF)"} disabled={pendingId === work.id} onPress={() => void claim(work.id)} />
          {feedback?.workId === work.id && <Notice kind={feedback.kind === "ok" ? "ok" : "error"} text={feedback.text} />}
        </View>

        <View style={styles.box}>
          <Eyebrow>My shelf</Eyebrow>
          {patron ? (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {STAGES.map((s) =>
                  stage === s.key ? (
                    <SolidButton key={s.key} small label={s.label} style={{ flex: 1 }} onPress={() => void keep(work.id, s.key)} />
                  ) : (
                    <OutlineButton key={s.key} small label={s.label} style={{ flex: 1 }} onPress={() => void keep(work.id, s.key)} />
                  )
                )}
              </View>
              {stage && <OutlineButton small label="Remove from shelf" onPress={() => void drop(work.id)} />}
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={styles.input}
                  value={locator}
                  onChangeText={setLocator}
                  placeholder="Bookmark, e.g. Book II, ch. 4"
                  placeholderTextColor={palette.muted}
                />
                <OutlineButton
                  small
                  label="Pin"
                  onPress={async () => {
                    await pin(work.id, locator);
                    setLocator("");
                  }}
                />
              </View>
              {myPins.map((p) => (
                <View key={p.id} style={styles.pinRow}>
                  <Text style={{ flex: 1, color: palette.text }}>{p.locator || "Bookmarked"}</Text>
                  <OutlineButton small label="Remove" onPress={() => void unpin(p.id)} />
                </View>
              ))}
            </>
          ) : (
            <OutlineButton label="Sign in to keep a shelf" onPress={() => navigation.navigate("Account")} />
          )}
        </View>

        {related.length > 0 && (
          <View style={styles.box}>
            <Eyebrow>Nearby on the shelves</Eyebrow>
            {related.map((r) => (
              <Pressable key={r.id} onPress={() => navigation.navigate("BookDetail", { workId: r.id })}>
                <Text style={styles.relatedTitle}>{r.title}</Text>
                <Text style={styles.small}>
                  {r.author}, {r.yearLabel}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
      <Text style={{ flex: 1, color: palette.text }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: 16, gap: 14, paddingBottom: 120 },
  sheet: {
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  title: { fontWeight: "700", fontSize: 28, lineHeight: 33, color: palette.text },
  author: { fontSize: 16, color: palette.text },
  body: { fontSize: 15, lineHeight: 22, color: palette.text },
  facts: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: palette.border },
  factLabel: { width: 112, fontSize: 10.5, fontWeight: "700", letterSpacing: 1, color: palette.emeraldText, paddingTop: 2 },
  link: { color: palette.emeraldText, fontWeight: "700", textDecorationLine: "underline" },
  box: {
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  small: { fontSize: 13, color: palette.muted },
  input: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.white,
    color: palette.text
  },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  relatedTitle: { fontWeight: "700", fontSize: 16, color: palette.text }
});
