import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../../components/Text";

export default function LibraryScreen(): JSX.Element {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text variant="heading">Library</Text>
      <Text>Your purchased assets will appear here.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF" },
});
