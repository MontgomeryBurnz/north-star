"use client";

import { FolderUp, Save, Trash2, MessageSquareQuote } from "lucide-react";
import type { ProgramMeetingAttachment, ProgramMeetingInput } from "@/lib/program-intelligence-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MeetingInputDraft = {
  title: string;
  sourceType: ProgramMeetingInput["sourceType"];
  sourceProvider: ProgramMeetingInput["sourceProvider"];
  capturedAt: string;
  summary: string;
  transcriptExcerpt: string;
  attachments: ProgramMeetingAttachment[];
  extractedSignals: string;
  recommendedPlanAdjustments: string;
};

type ActiveProgramMeetingIntelligenceCardProps = {
  meetingInputDraft: MeetingInputDraft;
  meetingSaveState: "idle" | "saving" | "saved" | "error";
  meetingUploadState: "idle" | "uploading" | "uploaded" | "error";
  onDraftChange: (patch: Partial<MeetingInputDraft>) => void;
  onAttachmentsChange: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveAttachment: (id: string) => void;
  onSave: () => void | Promise<void>;
  formatFileSize: (size: number) => string;
};

export function ActiveProgramMeetingIntelligenceCard({
  meetingInputDraft,
  meetingSaveState,
  meetingUploadState,
  onDraftChange,
  onAttachmentsChange,
  onRemoveAttachment,
  onSave,
  formatFileSize
}: ActiveProgramMeetingIntelligenceCardProps) {
  return (
    <Card className="bg-zinc-950/80">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-zinc-50">
          <MessageSquareQuote className="h-4 w-4 text-cyan-200" />
          Meeting intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Meeting title</span>
            <input
              value={meetingInputDraft.title}
              onChange={(event) => onDraftChange({ title: event.target.value })}
              placeholder="SteerCo, sprint review, working session, stakeholder sync"
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
            />
          </label>

          <div className="grid gap-3 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Meeting recording or transcript</span>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300/30 bg-cyan-300/[0.045] px-4 py-6 text-center transition-colors hover:border-cyan-300/60">
              <FolderUp className="mb-3 h-7 w-7 text-cyan-200" />
              <span className="text-sm font-medium text-zinc-100">Upload Teams, Zoom, Meet, transcript, or recap files</span>
              <span className="mt-2 text-xs leading-5 text-zinc-500">
                We store the recording or transcript reference with this meeting input. Text-based uploads can prefill the transcript excerpt.
              </span>
              <input
                className="hidden"
                type="file"
                multiple
                accept="audio/*,video/*,.txt,.md,.csv,.rtf,.doc,.docx,.pdf"
                onChange={(event) => void onAttachmentsChange(event)}
              />
            </label>
            <p className={`text-xs leading-5 ${meetingUploadState === "error" ? "text-amber-200" : "text-zinc-500"}`}>
              {meetingUploadState === "uploading"
                ? "Uploading meeting files..."
                : meetingUploadState === "uploaded"
                  ? "Meeting file uploaded and attached to this input."
                  : "Use this for raw recordings, exported transcripts, or meeting recaps that should stay attached to the program signal."}
            </p>
            {meetingInputDraft.attachments.length ? (
              <div className="grid gap-2">
                {meetingInputDraft.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">{attachment.fileName}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {attachment.mimeType || "unknown"} / {formatFileSize(attachment.sizeBytes)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(attachment.id)}
                      className="rounded-md border border-white/10 bg-black/20 p-2 text-zinc-400 transition-colors hover:border-red-300/30 hover:text-red-200"
                      aria-label={`Remove ${attachment.fileName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Input type</span>
            <select
              value={meetingInputDraft.sourceType}
              onChange={(event) => onDraftChange({ sourceType: event.target.value as ProgramMeetingInput["sourceType"] })}
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
            >
              <option value="meeting-notes">Meeting notes</option>
              <option value="transcript">Transcript summary</option>
              <option value="recording">Recording recap</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Capture source</span>
            <select
              value={meetingInputDraft.sourceProvider}
              onChange={(event) =>
                onDraftChange({ sourceProvider: event.target.value as ProgramMeetingInput["sourceProvider"] })
              }
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
            >
              <option value="manual">Manual summary</option>
              <option value="upload">Uploaded recording / transcript</option>
              <option value="linked-series">Linked meeting series</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Captured at</span>
            <input
              type="datetime-local"
              value={meetingInputDraft.capturedAt}
              onChange={(event) => onDraftChange({ capturedAt: event.target.value })}
              className="min-h-11 rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Meeting summary</span>
            <textarea
              value={meetingInputDraft.summary}
              onChange={(event) => onDraftChange({ summary: event.target.value })}
              rows={4}
              placeholder="Summarize the material program signal from this meeting."
              className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Transcript excerpt</span>
            <textarea
              value={meetingInputDraft.transcriptExcerpt}
              onChange={(event) => onDraftChange({ transcriptExcerpt: event.target.value })}
              rows={3}
              placeholder="Paste the most useful excerpt if a transcript or recording summary exists."
              className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Signals detected</span>
            <textarea
              value={meetingInputDraft.extractedSignals}
              onChange={(event) => onDraftChange({ extractedSignals: event.target.value })}
              rows={4}
              placeholder="One per line: sponsor concern, dependency risk, decision gap, scope pressure"
              className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-300">Recommended plan adjustments</span>
            <textarea
              value={meetingInputDraft.recommendedPlanAdjustments}
              onChange={(event) => onDraftChange({ recommendedPlanAdjustments: event.target.value })}
              rows={4}
              placeholder="One per line: tighten decision gate, escalate API dependency, change checkpoint cadence"
              className="resize-none rounded-md border border-white/10 bg-zinc-950 px-3 py-3 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-cyan-300/50"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void onSave()} disabled={meetingSaveState === "saving"}>
            <Save className="h-4 w-4" />
            {meetingSaveState === "saving" ? "Saving meeting input..." : "Save meeting input"}
          </Button>
          <p className={`text-sm ${meetingSaveState === "error" ? "text-amber-200" : "text-zinc-400"}`}>
            {meetingSaveState === "saved"
              ? "Saved to server and refreshed guided plan."
              : "Saving meeting inputs here should refresh the guided plan when the context justifies a change."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
