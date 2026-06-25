import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "yellow" | "mint";
  style?: StyleProp<ViewStyle>;
}

const GUM_PINK = "#ff90e8";
const GUM_BLACK = "#111111";
const GUM_YELLOW = "#f1e05a";
const GUM_MINT = "#96f7d6";
const GUM_WHITE = "#ffffff";

export function Button({
  title,
  onPress,
  disabled = false,
  variant = "primary",
  style,
}: ButtonProps): JSX.Element {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderColor: GUM_BLACK,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  disabled: { opacity: 0.5 },
  primary: { backgroundColor: GUM_PINK },
  secondary: { backgroundColor: GUM_WHITE },
  yellow: { backgroundColor: GUM_YELLOW },
  mint: { backgroundColor: GUM_MINT },
  text: { color: GUM_BLACK, fontSize: 16, fontWeight: "700" },
});
