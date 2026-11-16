import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex gap-3 rounded-lg border p-4 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-muted/40 text-foreground",
      info: "border-sky-500/20 bg-sky-500/5 text-sky-900 dark:text-sky-100",
      success: "border-success/25 bg-success/5 text-emerald-900 dark:text-emerald-100",
      warning: "border-warning/30 bg-warning/10 text-amber-900 dark:text-amber-100",
      destructive: "border-destructive/25 bg-destructive/5 text-rose-900 dark:text-rose-100",
    },
  },
  defaultVariants: { variant: "default" },
});

const icons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: boolean;
}

export function Alert({ className, variant, title, icon = true, children, ...props }: AlertProps) {
  const Icon = icons[variant ?? "default"];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon ? <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-1", "text-current/80 leading-relaxed")}>{children}</div> : null}
      </div>
    </div>
  );
}
