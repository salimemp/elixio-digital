import { SignupForm } from "@/components/auth/SignupForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up as a Buyer — Elixio",
  description: "Create a buyer account on Elixio Digital.",
  alternates: { canonical: "/auth/register/buyer" },
};

export default function RegisterBuyerPage() {
  return <SignupForm signupType="buyer" />;
}
