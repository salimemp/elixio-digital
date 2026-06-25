import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { Text } from "../../components/Text";

const GUM_CREAM = "#fffdf5";
const GUM_BLACK = "#111111";
const GUM_YELLOW = "#f1e05a";
const GUM_MINT = "#96f7d6";

export default function ProfileScreen(): JSX.Element {
  // TODO: replace with real auth state
  const isAuthenticated = false;
  const isCreator = false;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text variant="heading">Profile</Text>

      {!isAuthenticated ? (
        <View style={styles.section}>
          <View style={[styles.badge, { backgroundColor: GUM_YELLOW }]}>
            <Text variant="label">Guest</Text>
          </View>
          <Text>Sign in to view your profile, purchases, and creator tools.</Text>
          <Button title="Sign In" onPress={() => {}} variant="primary" />
          <Button title="Create Account" onPress={() => {}} variant="secondary" />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <View style={[styles.badge, { backgroundColor: GUM_MINT }]}>
              <Text variant="label">Buyer Space</Text>
            </View>
            <Button title="My Library" onPress={() => {}} variant="secondary" />
            <Button title="Wishlist" onPress={() => {}} variant="secondary" />
          </View>

          <View style={styles.section}>
            <View style={[styles.badge, { backgroundColor: GUM_YELLOW }]}>
              <Text variant="label">Creator Space</Text>
            </View>
            {isCreator ? (
              <>
                <Button title="Creator Dashboard" onPress={() => {}} variant="primary" />
                <Button title="New Asset" onPress={() => {}} variant="yellow" />
              </>
            ) : (
              <Button title="Become a Creator" onPress={() => {}} variant="primary" />
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: GUM_CREAM,
    flex: 1,
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    borderColor: GUM_BLACK,
    borderRadius: 20,
    borderWidth: 2,
    gap: 12,
    padding: 16,
  },
  badge: {
    alignSelf: "flex-start",
    borderColor: GUM_BLACK,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
