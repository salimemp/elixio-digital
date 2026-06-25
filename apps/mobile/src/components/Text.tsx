import { Text as RNText, type TextProps, type TextStyle } from "react-native";

interface ElixioTextProps extends TextProps {
  variant?: "body" | "heading" | "caption" | "label";
}

const GUM_BLACK = "#111111";
const GUM_GRAY = "#6B7280";

const variants: Record<NonNullable<ElixioTextProps["variant"]>, TextStyle> = {
  body: { fontSize: 16, lineHeight: 24, color: GUM_BLACK, fontWeight: "500" },
  heading: { fontSize: 28, fontWeight: "800", color: GUM_BLACK },
  caption: { fontSize: 13, lineHeight: 18, color: GUM_GRAY, fontWeight: "500" },
  label: { fontSize: 12, fontWeight: "800", color: GUM_BLACK, textTransform: "uppercase", letterSpacing: 0.5 },
};

export function Text({ variant = "body", style, ...rest }: ElixioTextProps): JSX.Element {
  return <RNText style={[variants[variant], style]} {...rest} />;
}
