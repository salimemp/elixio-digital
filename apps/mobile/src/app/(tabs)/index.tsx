import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Asset } from "@elixio/shared";
import { AssetCard } from "../../components/AssetCard";
import { Text } from "../../components/Text";

const GUM_CREAM = "#fffdf5";
const GUM_BLACK = "#111111";
const GUM_MINT = "#96f7d6";

const PLACEHOLDER_ASSETS: Asset[] = [
  {
    id: "asset-1",
    creatorId: "creator-1",
    title: "Neon Gradient Pack",
    slug: "neon-gradient-pack",
    description: "A collection of vibrant neon gradients for your next project.",
    categoryId: "cat-1",
    priceCents: 999,
    currency: "USD",
    licenseId: "license-1",
    status: "published",
    avgRating: 4.5,
    reviewCount: 12,
    salesCount: 34,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "asset-2",
    creatorId: "creator-2",
    title: "Pro UI Kit",
    slug: "pro-ui-kit",
    description: "A complete UI kit for mobile and web applications.",
    categoryId: "cat-2",
    priceCents: 2499,
    currency: "USD",
    licenseId: "license-2",
    status: "published",
    avgRating: 4.8,
    reviewCount: 45,
    salesCount: 128,
    createdAt: "2024-02-15T00:00:00Z",
    updatedAt: "2024-02-15T00:00:00Z",
  },
  {
    id: "asset-3",
    creatorId: "creator-1",
    title: "3D Icon Set",
    slug: "3d-icon-set",
    description: "High-quality 3D icons for modern interfaces.",
    categoryId: "cat-3",
    priceCents: 1499,
    currency: "USD",
    licenseId: "license-1",
    status: "published",
    avgRating: null,
    reviewCount: 0,
    salesCount: 8,
    createdAt: "2024-03-10T00:00:00Z",
    updatedAt: "2024-03-10T00:00:00Z",
  },
];

export default function ExploreScreen(): JSX.Element {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.hero}>
        <Text variant="label" style={styles.heroLabel}>
          Marketplace
        </Text>
        <Text variant="heading" style={styles.heroTitle}>
          Discover digital assets
        </Text>
        <Text variant="caption" style={styles.heroCaption}>
          Templates, mockups, code, music, and more from independent creators.
        </Text>
      </View>
      <FlatList
        data={PLACEHOLDER_ASSETS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssetCard asset={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text>No assets found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GUM_CREAM },
  hero: {
    backgroundColor: GUM_MINT,
    borderBottomColor: GUM_BLACK,
    borderBottomWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  heroLabel: { marginBottom: 8 },
  heroTitle: { marginBottom: 8 },
  heroCaption: { color: GUM_BLACK },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 16 },
  separator: { height: 16 },
});
