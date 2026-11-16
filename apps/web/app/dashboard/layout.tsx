import { requireUser } from "@/lib/auth-server";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser("/dashboard");
  return (
    <AppShell mode="dashboard" me={me}>
      {children}
    </AppShell>
  );
}
