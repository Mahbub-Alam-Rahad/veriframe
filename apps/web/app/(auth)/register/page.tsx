import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a VeriFrame account and start analyzing video.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
