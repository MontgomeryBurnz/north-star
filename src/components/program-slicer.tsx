"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getProgramSlicerButtonLabel, type ProgramSlicerOption } from "@/lib/program-slicer";
import { cn } from "@/lib/utils";

type ProgramSlicerTone = "cyan" | "emerald";

type ProgramSlicerProps = {
  ariaLabel?: string;
  className?: string;
  emptyLabel?: string;
  helperText?: string;
  label: string;
  onSelectProgram: (programId: string) => void;
  options: ProgramSlicerOption[];
  placeholder?: string;
  selectedProgramId: string;
  tone?: ProgramSlicerTone;
};

const toneClasses: Record<ProgramSlicerTone, { focus: string; label: string; selected: string }> = {
  cyan: {
    focus: "hover:border-cyan-300/30 focus:border-cyan-300/50 focus:ring-cyan-300/15",
    label: "text-cyan-200",
    selected: "border border-cyan-300/25 bg-cyan-300/10"
  },
  emerald: {
    focus: "hover:border-emerald-300/30 focus:border-emerald-300/50 focus:ring-emerald-300/15",
    label: "text-zinc-300",
    selected: "border border-emerald-300/25 bg-emerald-300/10"
  }
};

export function ProgramSlicer({
  ariaLabel,
  className,
  emptyLabel = "No saved programs yet",
  helperText,
  label,
  onSelectProgram,
  options,
  placeholder = "Select a program...",
  selectedProgramId,
  tone = "emerald"
}: ProgramSlicerProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const listboxLabel = ariaLabel ?? label;
  const toneClassName = toneClasses[tone];
  const selectedLabel = useMemo(
    () => getProgramSlicerButtonLabel({ emptyLabel, options, placeholder, selectedProgramId }),
    [emptyLabel, options, placeholder, selectedProgramId]
  );

  useEffect(() => {
    setOpen(false);
  }, [selectedProgramId]);

  return (
    <div
      className={cn("relative grid gap-2", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }}
      data-program-slicer
    >
      <span id={labelId} className={cn("text-xs font-medium uppercase tracking-[0.18em]", toneClassName.label)}>
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        disabled={!options.length}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-zinc-950 px-4 py-3 text-left text-sm leading-6 text-zinc-100 outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:text-zinc-500",
          toneClassName.focus
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={listboxLabel}
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-md border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black/40"
        >
          {options.map((option) => {
            const selected = option.id === selectedProgramId;

            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelectProgram(option.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full rounded-md px-3 py-3 text-left transition-colors",
                  selected ? toneClassName.selected : "border border-transparent hover:bg-white/[0.055]"
                )}
              >
                <span className="block truncate text-sm font-medium leading-6 text-zinc-100">{option.label}</span>
                {option.detail ? <span className="mt-1 block truncate text-xs leading-5 text-zinc-500">{option.detail}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {helperText ? <span className="text-xs leading-5 text-zinc-500">{helperText}</span> : null}
    </div>
  );
}
