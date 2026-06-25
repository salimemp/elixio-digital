import { useState } from "react";
import { StyleSheet, TextInput, View, ScrollView, Pressable, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api, Auth, API_URL } from "../../lib/api";
import { Button } from "../../components/Button";
import { Text } from "../../components/Text";
import { GoogleIcon } from "../../components/GoogleIcon";
import { GitHubIcon } from "../../components/GitHubIcon";

const GUM_PURPLE = "#7b61ff";
const GUM_CREAM = "#fffdf5";
const GUM_BLACK = "#111111";

export default function LoginScreen(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleLogin(): Promise<void> {
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ user: { id: string; email: string; displayName: string }; tokens: { accessToken: string; refreshToken: string; expiresIn: number }; mfaRequired: boolean }>(
        "/v1/auth/login",
        { method: "POST", body: { email, password } }
      );
      if (res.mfaRequired) {
        // mfaToken is internal — server returns userId+access via refresh.
        // For MVP: just ask user to re-auth and provide a TOTP code.
        router.push("/auth/mfa-verify");
        return;
      }
      await Auth.store(res.tokens);
      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(): Promise<void> {
    setError(null);
    try {
      await api("/v1/auth/magic-link/request", { method: "POST", body: { email } });
      setMagicLinkSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handlePasskey(): Promise<void> {
    setError(null);
    try {
      // Tell the server to mint a challenge. The client then triggers
      // the platform's native passkey sheet (iOS/Android).
      await api<unknown>("/v1/auth/passkey/login/begin", { method: "POST" });
      // For now, signal the user to use the web client until a fully-native
      // implementation is added. (expo-passkeys or react-native-passkey).
      Alert.alert(
        "Passkey sign-in",
        "Passkey sign-in currently opens the web client. Tap Continue to open Elixio in your browser.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => Linking.openURL(`${API_URL}/auth/login?passkey=1`),
          },
        ]
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    const res = await api<{ authorizationUrl: string }>("/v1/auth/oauth/begin", {
      method: "POST",
      body: { provider, redirectUri: "elixio://auth/callback" },
    });
    await Linking.openURL(res.authorizationUrl);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="heading">Sign in</Text>
        <Text variant="caption" style={styles.subtitle}>
          Welcome back. Sign in to your Elixio Digital account.
        </Text>

        <View style={styles.oauthRow}>
          <Pressable style={[styles.oauthButton, { backgroundColor: "#fff" }]} onPress={() => handleOAuth("google")}>
            <GoogleIcon size={18} />
            <Text style={styles.oauthLabel}>Google</Text>
          </Pressable>
          <Pressable style={[styles.oauthButton, { backgroundColor: GUM_BLACK }]} onPress={() => handleOAuth("github")}>
            <GitHubIcon size={18} />
            <Text style={[styles.oauthLabel, { color: "#fff" }]}>GitHub</Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text variant="label" style={styles.dividerText}>or with email</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            style={styles.input}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          {magicLinkSent && <Text style={styles.success}>Magic link sent. Check your email.</Text>}
          <Button title={loading ? "Signing in…" : "Sign in"} onPress={handleLogin} disabled={loading} />
          <Button title="Email me a sign-in link" variant="secondary" onPress={handleMagicLink} disabled={!email} />
          <Button title="Use a passkey" variant="mint" onPress={handlePasskey} />
          <Button title="Forgot password?" variant="yellow" onPress={() => router.push("/auth/forgot")} />
        </View>

        <Text variant="caption" style={styles.foot}>
          New here? <Text style={styles.link} onPress={() => router.push("/auth/register")}>Create account</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GUM_CREAM },
  scroll: { padding: 20, paddingBottom: 40 },
  subtitle: { marginTop: 4, marginBottom: 16 },
  oauthRow: { flexDirection: "row", gap: 12, marginVertical: 12 },
  oauthButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GUM_BLACK,
    gap: 8,
  },
  oauthLabel: { fontWeight: "700", fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ccc" },
  dividerText: { color: "#666" },
  form: { gap: 12, marginTop: 8 },
  input: {
    borderColor: GUM_BLACK,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  error: { color: "#b91c1c", fontSize: 14 },
  success: { color: "#15803d", fontSize: 14 },
  foot: { marginTop: 24, textAlign: "center" },
  link: { color: GUM_PURPLE, fontWeight: "700" },
});
