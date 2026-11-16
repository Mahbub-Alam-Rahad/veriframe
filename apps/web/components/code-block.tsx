import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language = "bash",
  filename,
  className,
}: {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5">
        <span className="font-mono text-[11px] text-slate-400">{filename ?? language}</span>
        <CopyButton
          value={code}
          label="Copy code"
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
        />
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-4 text-[12px] leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}
