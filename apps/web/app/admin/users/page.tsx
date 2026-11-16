import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Mail, Search, ShieldBan, Users } from "lucide-react";
import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, serverApiRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-server";
import { formatBytes, formatDate, formatRelative } from "@/lib/format";
import { PLAN_ORDER } from "@/lib/plans";
import type { AdminUserListResponse, PlanId, Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Users",
  description: "Search users, change plans and manage roles.",
};

const ROLES: Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireAdmin("/admin/users");
  const params = await searchParams;
  const page = Math.max(1, Number(single(params.page) ?? "1") || 1);
  const search = single(params.search)?.trim() ?? "";
  const roleParam = single(params.role);
  const planParam = single(params.plan);
  const role = ROLES.includes(roleParam as Role) ? (roleParam as Role) : undefined;
  const plan = PLAN_ORDER.includes(planParam as PlanId) ? (planParam as PlanId) : undefined;

  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) query.set("search", search);
  if (role) query.set("role", role);
  if (plan) query.set("plan", plan);

  let data: AdminUserListResponse | null = null;
  let loadError: string | null = null;
  try {
    data = await serverApiRequest<AdminUserListResponse>(`/admin/users?${query.toString()}`);
  } catch (error) {
    loadError = errorMessage(error);
  }

  const filtered = Boolean(search || role || plan);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Search accounts, review usage and manage plans, roles and suspensions. Every change is audited."
        actions={
          <Link href="/admin/messages" className={buttonVariants({ variant: "outline" })}>
            <Mail className="size-4" />
            Contact inbox
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            action="/admin/users"
            method="get"
            className="flex flex-col gap-3 lg:flex-row lg:items-center"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={search}
                placeholder="Search by email or name…"
                className="pl-9"
                aria-label="Search users"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Select name="role" defaultValue={role ?? ""} aria-label="Filter by role" className="sm:w-40">
                <option value="">All roles</option>
                {ROLES.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </Select>
              <Select name="plan" defaultValue={plan ?? ""} aria-label="Filter by plan" className="sm:w-36">
                <option value="">All plans</option>
                {PLAN_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Button type="submit">Filter</Button>
              {filtered ? (
                <Link
                  href="/admin/users"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-center")}
                >
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {loadError ? (
        <Alert variant="destructive" title="Could not load users">
          {loadError}. Refresh the page to try again.
        </Alert>
      ) : null}

      {data && data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users match those filters"
          description="Try a different search or clear the role and plan filters."
          action={
            <Link href="/admin/users" className={buttonVariants({ variant: "outline" })}>
              Clear filters
            </Link>
          }
        />
      ) : null}

      {data && data.items.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="max-w-[240px]">
                      <p className="truncate font-medium">{user.name ?? user.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "USER" ? "outline" : "default"}>
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.plan === "FREE" ? "muted" : "info"}>{user.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      <p>{user.usage.analyses} analyses</p>
                      <p className="mt-0.5">{formatBytes(user.usage.bytes)}</p>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      <p>{user.counts.videos} videos</p>
                      <p className="mt-0.5">{user.counts.apiKeys} keys</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <p>{formatDate(user.createdAt)}</p>
                      <p className="mt-0.5">{formatRelative(user.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      {user.bannedAt ? (
                        <Badge variant="danger">
                          <ShieldBan className="size-3" />
                          Suspended
                        </Badge>
                      ) : user.emailVerifiedAt ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <BadgeCheck className="size-3.5" />
                          Verified
                        </span>
                      ) : (
                        <Badge variant="warning">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <AdminUserActions user={user} actorId={me.user.id} actorRole={me.user.role} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border xl:hidden">
            {data.items.map((user) => (
              <li key={user.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name ?? user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={user.role === "USER" ? "outline" : "default"}>
                      {user.role.replace("_", " ")}
                    </Badge>
                    <Badge variant={user.plan === "FREE" ? "muted" : "info"}>{user.plan}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>{user.usage.analyses} analyses this month</span>
                  <span>{formatBytes(user.usage.bytes)}</span>
                  <span>{user.counts.videos} videos</span>
                  <span>{user.counts.apiKeys} API keys</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Joined {formatDate(user.createdAt)}
                  </span>
                  <AdminUserActions user={user} actorId={me.user.id} actorRole={me.user.role} />
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-4">
            <Pagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              basePath="/admin/users"
              params={{ search, role, plan }}
            />
          </div>
        </Card>
      ) : null}

      <Alert variant="info" title="Role and suspension rules">
        Only a super admin can change roles or suspend an administrator. The API prevents super
        admins from demoting themselves and always keeps at least one super admin.
      </Alert>
    </div>
  );
}
