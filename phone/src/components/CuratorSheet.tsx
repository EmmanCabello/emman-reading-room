import { useRef, useState, type ComponentRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCuratorChat, type ChatLine } from "../lib/useCuratorChat";
import { cardShadow, palette, radius } from "../theme";
import { Eyebrow, Notice, OutlineButton, SolidButton } from "./Buttons";

const PROMPTS = ["Books about polar exploration", "Compare Mill's On Liberty with Thoreau's Civil Disobedience", "Tell me about Frankenstein"];

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Bottom sheet for the Archival Research Curator. */
export function CuratorSheet({ visible, onClose }: Props) {
  const { status, lines, busy, ask, confirm, dismiss, signedIn } = useCuratorChat();
  const [draft, setDraft] = useState("");
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const insets = useSafeAreaInsets();

  const send = (text: string) => {
    setDraft("");
    void ask(text);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close curator" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.grabber} />
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heading}>Archival Research Curator</Text>
                <Text style={styles.sub}>
                  {status ? (status.mode === "online" ? "Online model" : "Offline planner") : "Connecting..."}
                  {!signedIn ? " · sign in to stage titles" : ""}
                </Text>
              </View>
              <OutlineButton small label="Close" onPress={onClose} />
            </View>

            <ScrollView
              ref={scroller}
              style={styles.log}
              contentContainerStyle={{ gap: 10, padding: 16 }}
              onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
              keyboardShouldPersistTaps="handled"
            >
              {lines.map((line) => (
                <Bubble key={line.id} line={line} onConfirm={confirm} onDismiss={dismiss} />
              ))}
              {busy && <Text style={styles.thinking}>Looking through the shelves...</Text>}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {PROMPTS.map((p) => (
                <Pressable key={p} style={styles.chip} onPress={() => send(p)} disabled={busy}>
                  <Text style={styles.chipText}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask about a subject, author or title"
                placeholderTextColor={palette.muted}
                onSubmitEditing={() => send(draft)}
                returnKeyType="send"
                maxLength={800}
              />
              <SolidButton label="Send" onPress={() => send(draft)} disabled={busy || !draft.trim()} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Bubble({
  line,
  onConfirm,
  onDismiss
}: {
  line: ChatLine;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const mine = line.role === "reader";
  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.bubble, mine && styles.bubbleMine]}>
        <Text style={[styles.bubbleText, mine && { color: palette.white }]}>{line.text}</Text>
        {line.trace && line.trace.length > 0 && (
          <Text style={styles.trace}>Tools: {line.trace.map((t) => t.tool).join(" → ")}</Text>
        )}
      </View>
      {line.proposals?.map((p) => (
        <View key={p.id} style={styles.proposal}>
          <Eyebrow>{`Staged for your shelf (${p.stage.replace("-", " ")})`}</Eyebrow>
          {p.works.map((w) => (
            <Text key={w.id} style={styles.proposalLine}>
              <Text style={{ fontWeight: "700" }}>{w.title}</Text> - {w.author}
            </Text>
          ))}
          {p.state === "pending" && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SolidButton small label="Confirm" onPress={() => onConfirm(p.id)} />
              <OutlineButton small label="Dismiss" onPress={() => onDismiss(p.id)} />
            </View>
          )}
          {p.state === "confirmed" && <Notice kind="ok" text="Added to your shelf." />}
          {p.state === "dismissed" && <Notice text="Dismissed. Nothing was saved." />}
          {p.state === "failed" && <Notice kind="error" text="That proposal could not be applied." />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: {
    maxHeight: "86%",
    minHeight: 420,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.background
  },
  grabber: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, marginTop: 8, backgroundColor: palette.border },
  head: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 10 },
  heading: { fontSize: 16, fontWeight: "700", color: palette.text },
  sub: { fontSize: 12, color: palette.muted },
  log: { flexGrow: 1, borderTopWidth: 1, borderTopColor: palette.border },
  thinking: { color: palette.muted, fontSize: 13 },
  bubble: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    padding: 14,
    borderRadius: radius.card,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card
  },
  bubbleMine: { alignSelf: "flex-end", borderColor: palette.emerald, backgroundColor: palette.emerald, borderBottomRightRadius: 6 },
  bubbleText: { fontSize: 14.5, lineHeight: 21, color: palette.text },
  trace: { marginTop: 6, fontSize: 11.5, color: palette.muted },
  proposal: {
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: radius.card,
    backgroundColor: palette.white,
    ...cardShadow
  },
  proposalLine: { fontSize: 13.5, color: palette.text },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.card },
  chipText: { fontSize: 12.5, color: palette.text },
  form: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 4 },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.white,
    color: palette.text
  }
});
