import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ClaimFeedback } from "../lib/useClaimCard";
import type { Stage, Work } from "../lib/types";
import { PRESS_SCALE, cardShadow, palette, radius } from "../theme";
import { Notice, OutlineButton, SolidButton } from "./Buttons";

interface Props {
  work: Work;
  shelfStage: Stage | null;
  claiming: boolean;
  feedback: ClaimFeedback | null;
  onOpen: () => void;
  onClaim: () => void;
  onShelve?: () => void;
}

/** White 16px-radius card with a soft shadow, roomy padding and compact actions. */
export function BookTile({ work, shelfStage, claiming, feedback, onOpen, onClaim, onShelve }: Props) {
  const note = feedback && feedback.workId === work.id ? feedback : null;
  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <Text style={styles.room}>{work.room.label.toUpperCase()}</Text>
        <Text style={styles.meta}>{work.yearLabel}</Text>
      </View>
      <Pressable
        onPress={onOpen}
        accessibilityRole="link"
        style={({ pressed }) => [{ gap: 4 }, pressed && { opacity: 0.7, transform: [{ scale: PRESS_SCALE }] }]}
      >
        <Text style={styles.title}>{work.title}</Text>
        <Text style={styles.author}>{work.author}</Text>
      </Pressable>
      <Text style={styles.summary} numberOfLines={3}>
        {work.summary}
      </Text>
      {shelfStage && <Text style={styles.badge}>On your shelf: {shelfStage.replace("-", " ")}</Text>}
      <View style={styles.actions}>
        <SolidButton small label={claiming ? "Claiming..." : "Claim card"} disabled={claiming} onPress={onClaim} />
        {onShelve && !shelfStage && <OutlineButton small label="Add to shelf" onPress={onShelve} />}
        <OutlineButton small label="Record" onPress={onOpen} />
      </View>
      {note && <Notice kind={note.kind === "ok" ? "ok" : "error"} text={note.text} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  room: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: palette.emeraldText },
  meta: { fontSize: 11.5, fontWeight: "600", color: palette.muted },
  title: { fontWeight: "700", fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: palette.text },
  author: { fontSize: 13.5, fontWeight: "500", color: palette.muted },
  summary: { fontSize: 14, color: palette.text, opacity: 0.82, lineHeight: 20 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: palette.emeraldWash,
    color: palette.emeraldText,
    fontSize: 11.5,
    fontWeight: "700"
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }
});
