import { SignupForm } from "@/components/auth/SignupForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up as a Creator — Elixio",
  description: "Create a creator account on Elixio Digital and start selling.",
  alternates: { canonical: "/auth/register/creator" },
};

export default function RegisterCreatorPage() {
  return <SignupForm signupType="creator" />;
}
