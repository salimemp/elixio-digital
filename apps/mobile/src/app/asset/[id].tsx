import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/Text";

export default function AssetDetailScreen(): JSX.Element {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!id) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <Text>Asset not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Stack.Screen options={{ title: "Asset Details" }} />
      <Text variant="heading">Asset Details</Text>
      <Text>{id}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF" },
});
