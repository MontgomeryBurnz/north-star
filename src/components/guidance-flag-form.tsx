"use client";

import { Button } from "@/components/ui/button";

type GuidanceFlagFormProps = {
  reason: string;
  context: string;
  isSubmitting: boolean;
  reasonPlaceholder: string;
  contextPlaceholder: string;
  submitLabel?: string;
  onReasonChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onCancel: () => void;
};

export function GuidanceFlagForm({
  reason,
  context,
  isSubmitting,
  reasonPlaceholder,
  contextPlaceholder,
  submitLabel = "Submit flag",
  onReasonChange,
  onContextChange,
  onSubmit,
  onCancel
}: GuidanceFlagFormProps) {
  return (
    <div className="grid gap-3 rounded-md border border-amber-300/20 bg-amber-300/[0.055] p-3">
      <input
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        aria-label="Guidance flag reason"
        placeholder={reasonPlaceholder}
        className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/50"
      />
      <textarea
        value={context}
        onChange={(event) => onContextChange(event.target.value)}
        aria-label="Guidance flag context"
        rows={4}
        placeholder={contextPlaceholder}
        className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-300/50"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => void onSubmit()} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
