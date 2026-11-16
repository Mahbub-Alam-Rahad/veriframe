"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiRequest, errorMessage } from "@/lib/api";
import type { AdminUser, PlanId, Role } from "@/lib/types";
import { PLAN_ORDER } from "@/lib/plans";

const ROLES: Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

export function AdminUserActions({
  user,
  actorId,
  actorRole,
}: {
  user: AdminUser;
  actorId: string;
  actorRole: Role;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [plan, setPlan] = React.useState<PlanId>(user.plan);
  const [role, setRole] = React.useState<Role>(user.role);
  const [banned, setBanned] = React.useState(Boolean(user.bannedAt));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isSelf = user.id === actorId;
  const isSuper = actorRole === "SUPER_ADMIN";
  const canEditRole = isSuper && !isSelf;
  const canEditBan = (isSuper || user.role === "USER") && !isSelf;

  function openDialog() {
    setPlan(user.plan);
    setRole(user.role);
    setBanned(Boolean(user.bannedAt));
    setError(null);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
      if (plan !== user.plan) body.plan = plan;
      if (canEditRole && role !== user.role) body.role = role;
      if (canEditBan && banned !== Boolean(user.bannedAt)) body.banned = banned;
      if (Object.keys(body).length === 0) {
        setOpen(false);
        return;
      }
      await apiRequest(`/admin/users/${user.id}`, { method: "PATCH", body });
      toast.success("User updated");
      setOpen(false);
      router.refresh();
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openDialog}>
        <Settings2 className="size-3.5" />
        Manage
      </Button>

      <Modal
        open={open}
        onClose={() => (saving ? undefined : setOpen(false))}
        title="Manage user"
        description={user.email}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={save} loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          {isSelf ? (
            <Alert variant="info" icon={false}>
              You cannot change your own role or ban status. Plan changes to your own account are
              also restricted by the API.
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="admin-plan">Plan</Label>
            <Select
              id="admin-plan"
              value={plan}
              onChange={(event) => setPlan(event.target.value as PlanId)}
            >
              {PLAN_ORDER.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-role">Role</Label>
            <Select
              id="admin-role"
              value={role}
              disabled={!canEditRole}
              onChange={(event) => setRole(event.target.value as Role)}
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ")}
                </option>
              ))}
            </Select>
            {!canEditRole ? (
              <p className="text-xs text-muted-foreground">
                Only a super admin can change roles, and never their own.
              </p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-input"
                checked={banned}
                disabled={!canEditBan}
                onChange={(event) => setBanned(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Suspend this account</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Suspension revokes active refresh sessions. Uploads and sign-in are blocked.
                </span>
              </span>
            </label>
            {!canEditBan ? (
              <p className="text-xs text-muted-foreground">
                Only a super admin can suspend another administrator.
              </p>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
