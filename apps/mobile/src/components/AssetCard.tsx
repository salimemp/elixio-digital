import { Link } from "expo-router";
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import type { Asset } from "@elixio/shared";
import { Text } from "./Text";

interface AssetCardProps {
  asset: Asset;
  style?: StyleProp<ViewStyle>;
}

const GUM_BLACK = "#111111";
const GUM_PINK = "#ff90e8";
const GUM_PURPLE = "#7b61ff";
const GUM_CREAM = "#fffdf5";

export function AssetCard({ asset, style }: AssetCardProps): JSX.Element {
  return (
    <Link href={`/asset/${asset.id}`} asChild>
      <TouchableOpacity style={[styles.card, style]} activeOpacity={0.8}>
        <View style={styles.thumbnail}>
          <Text style={styles.emoji}>🎁</Text>
        </View>
        <Text variant="heading" style={styles.title}>
          {asset.title}
        </Text>
        <Text variant="caption" style={styles.description} numberOfLines={2}>
          {asset.description}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            ${(asset.priceCents / 100).toFixed(2)} {asset.currency}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GUM_CREAM,
    borderColor: GUM_BLACK,
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
    padding: 12,
  },
  thumbnail: {
    alignItems: "center",
    backgroundColor: GUM_PINK,
    borderColor: GUM_BLACK,
    borderRadius: 16,
    borderWidth: 2,
    height: 160,
    justifyContent: "center",
    marginBottom: 12,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 18, marginBottom: 4 },
  description: { marginBottom: 12 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: GUM_PURPLE,
    borderColor: GUM_BLACK,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
});
