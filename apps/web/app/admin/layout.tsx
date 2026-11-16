import { requireAdmin } from "@/lib/auth-server";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin("/admin");
  return (
    <AppShell mode="admin" me={me}>
      {children}
    </AppShell>
  );
}
