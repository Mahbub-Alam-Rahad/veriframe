"use client";

import * as React from "react";
import { AlertTriangle, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/copy-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiRequest, errorMessage } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ApiKey, ApiKeyCreated } from "@/lib/types";
import { createApiKeySchema } from "@/lib/validation";

export function ApiKeysManager({
  initialKeys,
  maxKeys,
  canCreate,
  blockedReason,
}: {
  initialKeys: ApiKey[];
  maxKeys: number;
  canCreate: boolean;
  blockedReason: string | null;
}) {
  const [keys, setKeys] = React.useState(initialKeys);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [created, setCreated] = React.useState<ApiKeyCreated | null>(null);
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [confirmKey, setConfirmKey] = React.useState<ApiKey | null>(null);

  const activeCount = keys.filter((key) => !key.revokedAt).length;
  const atLimit = activeCount >= maxKeys;

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createApiKeySchema.safeParse({ name });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? "Enter a key name");
      return;
    }
    setNameError(null);
    setCreating(true);
    try {
      const response = await apiRequest<ApiKeyCreated>("/api-keys", {
        method: "POST",
        body: parsed.data,
      });
      setKeys((current) => [
        {
          id: response.id,
          name: response.name,
          prefix: response.prefix,
          createdAt: response.createdAt,
          lastUsedAt: null,
          revokedAt: null,
        },
        ...current,
      ]);
      setCreated(response);
      setCreateOpen(false);
      setName("");
      toast.success("API key created");
    } catch (error) {
      setNameError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function revoke(key: ApiKey) {
    setRevoking(key.id);
    try {
      await apiRequest(`/api-keys/${key.id}`, { method: "DELETE" });
      setKeys((current) =>
        current.map((item) =>
          item.id === key.id ? { ...item, revokedAt: new Date().toISOString() } : item,
        ),
      );
      setConfirmKey(null);
      toast.success("API key revoked");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="space-y-6">
      {blockedReason ? (
        <Alert variant="warning" title="API access is unavailable">
          {blockedReason}
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>API keys</CardTitle>
            <CardDescription>
              Use keys with the public API at <code className="font-mono text-xs">/api/v1/public/v1/videos</code>.
              Keys are stored as hashes and shown once.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={!canCreate || atLimit}
            title={atLimit ? "Revoke a key before creating another" : undefined}
          >
            <Plus className="size-4" />
            New key
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
              <KeyRound className="size-3.5" />
              {activeCount} of {maxKeys} active
            </span>
            <span>·</span>
            <span>Prefix identifies the key; the secret is never recoverable.</span>
          </div>

          {keys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <KeyRound className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">No API keys yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a key to submit videos programmatically from your own tooling.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Prefix</th>
                    <th className="px-4 py-2.5 font-semibold">Created</th>
                    <th className="px-4 py-2.5 font-semibold">Last used</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((key) => (
                    <tr key={key.id} className={key.revokedAt ? "text-muted-foreground" : undefined}>
                      <td className="px-4 py-3 font-medium">{key.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{key.prefix}…</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">{formatDateTime(key.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {key.lastUsedAt ? formatRelative(key.lastUsedAt) : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            key.revokedAt
                              ? "text-xs font-medium text-muted-foreground"
                              : "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {key.revokedAt ? "Revoked" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {key.revokedAt ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmKey(key)}
                            className="text-muted-foreground hover:text-rose-600"
                          >
                            <Trash2 className="size-3.5" />
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => (creating ? undefined : setCreateOpen(false))}
        title="Create an API key"
        description="Give the key a name that identifies the integration or environment using it."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" form="create-api-key" loading={creating}>
              Create key
            </Button>
          </>
        }
      >
        <form id="create-api-key" onSubmit={createKey} className="space-y-2">
          <Label htmlFor="key-name">Key name</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production ingest"
            maxLength={60}
            autoFocus
          />
          <FieldError>{nameError}</FieldError>
        </form>
      </Modal>

      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="Copy your API key now"
        description="This secret is shown once and stored only as a hash."
        footer={
          <Button type="button" onClick={() => setCreated(null)}>
            I have stored the key
          </Button>
        }
      >
        <Alert variant="warning" icon={false} className="mb-4">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>If you lose this key you will need to revoke it and create a new one.</p>
          </div>
        </Alert>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <code className="min-w-0 flex-1 break-all px-1 font-mono text-xs">{created?.key}</code>
          <CopyButton value={created?.key ?? ""} label="Copy API key" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Send it as the <code className="font-mono">x-api-key</code> header. Never expose it in
          browser code.
        </p>
      </Modal>

      <Modal
        open={Boolean(confirmKey)}
        onClose={() => (revoking ? undefined : setConfirmKey(null))}
        title="Revoke this API key?"
        description="Requests using the key will fail immediately. This cannot be undone."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmKey(null)}
              disabled={Boolean(revoking)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={Boolean(revoking)}
              onClick={() => (confirmKey ? revoke(confirmKey) : undefined)}
            >
              Revoke key
            </Button>
          </>
        }
      >
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          {confirmKey?.name} · <span className="font-mono text-xs">{confirmKey?.prefix}…</span>
        </p>
      </Modal>
    </div>
  );
}
