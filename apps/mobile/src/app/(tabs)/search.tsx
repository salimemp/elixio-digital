import { useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Asset } from "@elixio/shared";
import { AssetCard } from "../../components/AssetCard";
import { Text } from "../../components/Text";

const PLACEHOLDER_RESULTS: Asset[] = [
  {
    id: "asset-4",
    creatorId: "creator-3",
    title: "Abstract Patterns",
    slug: "abstract-patterns",
    description: "A bundle of abstract seamless patterns.",
    categoryId: "cat-1",
    priceCents: 799,
    currency: "USD",
    licenseId: "license-1",
    status: "published",
    avgRating: 4.2,
    reviewCount: 7,
    salesCount: 21,
    createdAt: "2024-04-01T00:00:00Z",
    updatedAt: "2024-04-01T00:00:00Z",
  },
  {
    id: "asset-5",
    creatorId: "creator-2",
    title: "Social Media Templates",
    slug: "social-media-templates",
    description: "Editable templates for Instagram and Twitter.",
    categoryId: "cat-4",
    priceCents: 1299,
    currency: "USD",
    licenseId: "license-2",
    status: "published",
    avgRating: 4.6,
    reviewCount: 18,
    salesCount: 56,
    createdAt: "2024-05-12T00:00:00Z",
    updatedAt: "2024-05-12T00:00:00Z",
  },
];

export default function SearchScreen(): JSX.Element {
  const [query, setQuery] = useState<string>("");

  const results = query.trim().length > 0
    ? PLACEHOLDER_RESULTS.filter((asset) =>
        asset.title.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text variant="heading">Search</Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search assets..."
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.input}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AssetCard asset={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text>
            {query.trim().length > 0
              ? "No results found."
              : "Start typing to search."}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  input: {
    borderColor: "#E5E7EB",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  separator: { height: 12 },
});
