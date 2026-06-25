import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../../components/Button";
import { Text } from "../../components/Text";

export default function RegisterScreen(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  const handleRegister = (): void => {
    if (email.length > 0 && password.length > 0 && displayName.length > 0) {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text variant="heading">Create account</Text>
      <View style={styles.form}>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          autoCapitalize="words"
          textContentType="name"
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          textContentType="newPassword"
          style={styles.input}
        />
        <Button title="Create account" onPress={handleRegister} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF" },
  form: { gap: 12 },
  input: {
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
