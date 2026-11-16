"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Cpu, Plus, Trash2, Zap } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiRequest, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ModelVersion } from "@/lib/types";
import { adminModelSchema, type AdminModelValues } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function AdminModelsManager({
  initialModels,
  canManage,
}: {
  initialModels: ModelVersion[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [models, setModels] = React.useState(initialModels);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<ModelVersion | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdminModelValues>({
    resolver: zodResolver(adminModelSchema),
    defaultValues: {
      name: "",
      version: "1.0.0",
      backend: "HF",
      modelId: "",
      calibrationTemperature: 1,
      notes: "",
      activate: false,
    },
  });

  async function createModel(values: AdminModelValues) {
    setServerError(null);
    try {
      const response = await apiRequest<{ model: ModelVersion }>("/admin/models", {
        method: "POST",
        body: {
          ...values,
          notes: values.notes?.trim() || undefined,
        },
      });
      setModels((current) => {
        const next = values.activate
          ? current.map((model) => ({ ...model, isActive: false }))
          : [...current];
        return [response.model, ...next];
      });
      toast.success("Model version registered");
      setCreateOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  }

  async function activate(model: ModelVersion) {
    setPending(model.id);
    try {
      await apiRequest(`/admin/models/${model.id}/activate`, { method: "POST" });
      setModels((current) =>
        current.map((item) => ({ ...item, isActive: item.id === model.id })),
      );
      toast.success(`${model.name} ${model.version} activated`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  async function remove(model: ModelVersion) {
    setPending(model.id);
    try {
      await apiRequest(`/admin/models/${model.id}`, { method: "DELETE" });
      setModels((current) => current.filter((item) => item.id !== model.id));
      setDeleting(null);
      toast.success("Model version deleted");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Registered model versions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The active version is recorded with every analysis. Changing it affects new jobs only.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setServerError(null);
            setCreateOpen(true);
          }}
          disabled={!canManage}
          title={canManage ? undefined : "Only a super admin can register models"}
        >
          <Plus className="size-4" />
          Register model
        </Button>
      </div>

      {!canManage ? (
        <Alert variant="info" title="Read-only for administrators">
          Registering, activating and deleting model versions requires the super admin role.
        </Alert>
      ) : null}

      {models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Cpu className="size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No model versions registered</p>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              The worker falls back to the ML service environment configuration. Register a version
              here to pin the model used for new analyses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {models.map((model) => (
            <Card
              key={model.id}
              className={cn(model.isActive && "border-primary/40 shadow-lg shadow-primary/5")}
            >
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <span className="truncate">{model.name}</span>
                    {model.isActive ? <CheckCircle2 className="size-4 shrink-0 text-emerald-500" /> : null}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Version {model.version} · registered {formatDateTime(model.createdAt)}
                  </CardDescription>
                </div>
                <Badge variant={model.backend === "MOCK" ? "warning" : "info"}>{model.backend}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-muted-foreground">Model ID</dt>
                    <dd className="min-w-0 break-all text-right font-mono text-xs">{model.modelId}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Calibration temperature</dt>
                    <dd className="font-medium tabular-nums">{model.calibrationTemperature}</dd>
                  </div>
                  {model.metrics && Object.keys(model.metrics).length > 0 ? (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-muted-foreground">Metrics</dt>
                      <dd className="max-w-[60%] break-words text-right text-xs">
                        {Object.entries(model.metrics)
                          .slice(0, 6)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" · ")}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {model.backend === "MOCK" ? (
                  <Alert variant="warning" icon={false}>
                    Mock models are deterministic placeholders for demos and tests. They do not detect
                    manipulation.
                  </Alert>
                ) : null}

                {model.notes ? (
                  <p className="rounded-lg border border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                    {model.notes}
                  </p>
                ) : null}

                <div className="flex items-center justify-between gap-2">
                  <Badge variant={model.isActive ? "success" : "outline"}>
                    {model.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {!model.isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => activate(model)}
                        loading={pending === model.id}
                        disabled={!canManage}
                      >
                        <Zap className="size-3.5" />
                        Activate
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(model)}
                      disabled={!canManage || model.isActive}
                      className="text-muted-foreground hover:text-rose-600"
                      title={model.isActive ? "Activate another model before deleting this one" : undefined}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => (isSubmitting ? undefined : setCreateOpen(false))}
        title="Register a model version"
        description="A registered version overrides the ML service default for new analyses."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="model-form" loading={isSubmitting}>
              Register model
            </Button>
          </>
        }
      >
        <form id="model-form" onSubmit={handleSubmit(createModel)} className="space-y-4" noValidate>
          {serverError ? <Alert variant="destructive">{serverError}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="model-name">Display name</Label>
              <Input id="model-name" placeholder="FaceForensics++ detector" {...register("name")} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model-version">Version</Label>
              <Input id="model-version" placeholder="1.0.0" {...register("version")} />
              <FieldError>{errors.version?.message}</FieldError>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="model-backend">Backend</Label>
              <Select id="model-backend" {...register("backend")}>
                <option value="HF">HF (real inference)</option>
                <option value="MOCK">MOCK (demo only)</option>
              </Select>
              <FieldError>{errors.backend?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model-temperature">Calibration temperature</Label>
              <Input
                id="model-temperature"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                {...register("calibrationTemperature")}
              />
              <FieldError>{errors.calibrationTemperature?.message}</FieldError>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model-id">Model ID</Label>
            <Input
              id="model-id"
              placeholder="prithivMLmods/Deep-Fake-Detector-v2-Model"
              {...register("modelId")}
            />
            <FieldError>{errors.modelId?.message}</FieldError>
            <FieldHint>
              For HF this is the repository id passed to the ML service. Leave unchanged unless you
              have verified the model.
            </FieldHint>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model-notes">Notes</Label>
            <Textarea
              id="model-notes"
              placeholder="Training data, known limitations, calibration source…"
              rows={3}
              {...register("notes")}
            />
            <FieldError>{errors.notes?.message}</FieldError>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
            <input type="checkbox" className="mt-0.5 size-4 rounded border-input" {...register("activate")} />
            <span>
              <span className="block text-sm font-medium">Activate immediately</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Deactivates the current model version for new analyses.
              </span>
            </span>
          </label>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => (pending ? undefined : setDeleting(null))}
        title="Delete model version?"
        description="Analyses that already used this version keep their recorded metadata."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={Boolean(pending)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={pending === deleting?.id}
              onClick={() => (deleting ? remove(deleting) : undefined)}
            >
              Delete version
            </Button>
          </>
        }
      >
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          {deleting?.name} · {deleting?.version}
        </p>
      </Modal>
    </div>
  );
}
