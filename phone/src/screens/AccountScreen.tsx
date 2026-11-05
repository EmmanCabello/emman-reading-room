import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AllowanceStrip } from "../components/AllowanceStrip";
import { Eyebrow, Notice, OutlineButton, SolidButton } from "../components/Buttons";
import { useSession } from "../state/SessionContext";
import { cardShadow, palette, radius } from "../theme";

const READER = { email: "emman@emman.local", password: "Emman123!" };
const CURATOR = { email: "emman.admin@emman.local", password: "EmmanAdmin123!" };

export function AccountScreen() {
  const { patron, signIn, register, signOut, apiBase, setApiBase } = useSession();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regBusy, setRegBusy] = useState(false);
  const [email, setEmail] = useState(READER.email);
  const [password, setPassword] = useState(READER.password);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [base, setBase] = useState(apiBase);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function enroll() {
    const name = newName.trim();
    const mail = newEmail.trim();
    if (!name || !mail || newPassword.length < 8) {
      setRegError("Enter a display name, an email, and a password of at least 8 characters.");
      return;
    }
    setRegBusy(true);
    setRegError(null);
    try {
      await register(name, mail, newPassword);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Could not create the account.");
    } finally {
      setRegBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Eyebrow>Account</Eyebrow>
          <Text style={styles.h1}>{patron ? patron.displayName : "Reader entrance"}</Text>

          {patron ? (
            <View style={styles.panel}>
              <Text style={styles.value}>{patron.email}</Text>
              <Text style={styles.muted}>{patron.role === "admin" ? "Curator account" : "Reader account"}</Text>
              <OutlineButton label="Sign out" onPress={() => void signOut()} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {mode === "signin" ? (
                <SolidButton small label="Sign in" style={{ flex: 1 }} onPress={() => setMode("signin")} />
              ) : (
                <OutlineButton small label="Sign in" style={{ flex: 1 }} onPress={() => setMode("signin")} />
              )}
              {mode === "register" ? (
                <SolidButton small label="New Reader" style={{ flex: 1 }} onPress={() => setMode("register")} />
              ) : (
                <OutlineButton small label="New Reader" style={{ flex: 1 }} onPress={() => setMode("register")} />
              )}
            </View>
          )}

          {!patron && mode === "register" && (
            <View style={styles.panel}>
              <Text style={styles.muted}>Create a reader account to claim up to 10 cards and keep a shelf that syncs with the web app.</Text>
              <Text style={styles.label}>Display name</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} maxLength={60} autoComplete="name" />
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Text style={styles.label}>Password (8+ characters)</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
              />
              {regError && <Notice kind="error" text={regError} />}
              <SolidButton label={regBusy ? "Creating..." : "Create account"} disabled={regBusy} onPress={() => void enroll()} />
            </View>
          )}

          {!patron && mode === "signin" && (
            <View style={styles.panel}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Text style={styles.label}>Password</Text>
              <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
              {error && <Notice kind="error" text={error} />}
              <SolidButton label={busy ? "Signing in..." : "Sign in"} disabled={busy} onPress={() => void submit()} />

              <View style={styles.cred}>
                <Text style={styles.credTitle}>Emman test accounts</Text>
                <Text style={styles.credLine}>Reader: emman@emman.local / Emman123!</Text>
                <Text style={styles.credLine}>Admin: emman.admin@emman.local / EmmanAdmin123!</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <OutlineButton small label="Fill reader" onPress={() => { setEmail(READER.email); setPassword(READER.password); }} />
                  <OutlineButton small label="Fill admin" onPress={() => { setEmail(CURATOR.email); setPassword(CURATOR.password); }} />
                </View>
              </View>
            </View>
          )}

          <AllowanceStrip />

          <View style={styles.panel}>
            <Eyebrow>Server address</Eyebrow>
            <Text style={styles.muted}>
              The app talks to the Express API over HTTP. Android emulators reach your computer at 10.0.2.2; on a real phone use your computer's LAN address, e.g. http://192.168.1.20:4100.
            </Text>
            <TextInput style={styles.input} value={base} onChangeText={(t) => { setBase(t); setSaved(false); }} autoCapitalize="none" autoCorrect={false} />
            <OutlineButton
              small
              label={saved ? "Saved" : "Save address"}
              onPress={async () => {
                await setApiBase(base);
                setSaved(true);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  pad: { padding: 16, gap: 12, paddingBottom: 120 },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: palette.text },
  muted: { fontSize: 13.5, color: palette.muted },
  value: { fontSize: 16, color: palette.text },
  label: { fontSize: 13, fontWeight: "700", color: palette.muted },
  panel: {
    gap: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.card,
    backgroundColor: palette.card,
    ...cardShadow
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.white,
    color: palette.text
  },
  cred: {
    gap: 3,
    padding: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: palette.emerald,
    borderRadius: radius.control,
    backgroundColor: palette.white
  },
  credTitle: { fontWeight: "700", color: palette.text },
  credLine: { fontSize: 13, color: palette.text }
});
