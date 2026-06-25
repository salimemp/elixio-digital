import { Tabs } from "expo-router";

const GUM_PINK = "#ff90e8";
const GUM_PURPLE = "#7b61ff";
const GUM_BLACK = "#111111";
const GUM_CREAM = "#fffdf5";
const GUM_MINT = "#96f7d6";

const TAB_ICONS: Record<string, string> = {
  index: "🏠",
  search: "🔍",
  library: "🛍️",
  profile: "👤",
};

export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: GUM_PURPLE,
        tabBarInactiveTintColor: "#666666",
        tabBarStyle: {
          backgroundColor: GUM_CREAM,
          borderTopWidth: 2,
          borderTopColor: GUM_BLACK,
          height: 76,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: "700",
          fontSize: 11,
          textTransform: "uppercase",
        },
        tabBarItemStyle: {
          backgroundColor: GUM_CREAM,
        },
        tabBarIcon: ({ focused }: { focused: boolean }) => {
          const label = TAB_ICONS[route.name] ?? "●";
          return (
            <Text
              style={{
                fontSize: 22,
                backgroundColor: focused ? GUM_PINK : GUM_MINT,
                borderWidth: 2,
                borderColor: GUM_BLACK,
                borderRadius: 16,
                paddingHorizontal: 8,
                paddingVertical: 4,
                overflow: "hidden",
              }}
            >
              {label}
            </Text>
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Explore" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

import { Text } from "react-native";
