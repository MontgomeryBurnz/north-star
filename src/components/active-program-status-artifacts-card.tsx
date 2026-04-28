"use client";

import { FileClock, FolderUp, Trash2 } from "lucide-react";
import type { ProgramArtifact } from "@/lib/program-intake-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActiveProgramStatusArtifactsCardProps = {
  artifacts: ProgramArtifact[];
  onArtifactsChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveArtifact: (id: string) => void;
  formatFileSize: (size: number) => string;
};

export function ActiveProgramStatusArtifactsCard({
  artifacts,
  onArtifactsChange,
  onRemoveArtifact,
  formatFileSize
}: ActiveProgramStatusArtifactsCardProps) {
  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <FolderUp className="h-4 w-4 text-emerald-200" />
          Status artifacts
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-emerald-300/30 bg-emerald-300/[0.045] px-4 py-8 text-center transition-colors hover:border-emerald-300/60">
          <FileClock className="mb-3 h-7 w-7 text-emerald-200" />
          <span className="text-sm font-medium text-zinc-100">Add status report, RAID log, meeting notes, or plan update</span>
          <span className="mt-2 text-xs leading-5 text-zinc-500">
            Local metadata only for now. These will later be stored, parsed, and used for grounded guidance.
          </span>
          <input className="hidden" type="file" multiple onChange={onArtifactsChange} />
        </label>

        {artifacts.length ? (
          <div className="grid gap-2">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{artifact.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {artifact.type} / {formatFileSize(artifact.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveArtifact(artifact.id)}
                  className="rounded-md border border-white/10 bg-black/20 p-2 text-zinc-400 transition-colors hover:border-red-300/30 hover:text-red-200"
                  aria-label={`Remove ${artifact.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
