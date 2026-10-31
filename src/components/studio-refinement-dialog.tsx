"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Saves feedback when a durable workspace is present; never calls a model. */
export function StudioRefinementDialog({ storyId, title, revisionNumber, reasons, disabled, onClose, onPrepare, initialFeedback = "", onSave }: {
  storyId: string;
  title: string;
  revisionNumber: number;
  reasons: string[];
  disabled: boolean;
  onClose: () => void;
  onPrepare: (feedback: string) => void;
  initialFeedback?: string;
  onSave?: (feedback: string) => Promise<boolean>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);
  const submittedRef = useRef(false);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const activeRef = useRef(true);

  async function saveFeedback() {
    if (disabled || saving || !feedback.trim() || submittedRef.current) return false;
    if (!onSave) return true;
    submittedRef.current = true; setSaving(true); setSaveStatus("");
    try {
      const saved = await onSave(feedback.trim());
      if (activeRef.current) setSaveStatus(saved ? "Refinement saved. It will be available when you reopen this package." : "Not saved. Your text is still here; review the error and retry.");
      return saved;
    } catch {
      if (activeRef.current) setSaveStatus("Not saved. Your text is still here; please retry.");
      return false;
    } finally { submittedRef.current = false; if (activeRef.current) setSaving(false); }
  }

  useEffect(() => {
    activeRef.current = true;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    feedbackRef.current?.focus();
    return () => {
      activeRef.current = false;
      if (dialog?.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialogRef} aria-labelledby="studio-refinement-title" aria-describedby="studio-refinement-description" onCancel={(event) => { event.preventDefault(); onClose(); }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-zinc-950 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/75 sm:p-6" data-studio-refinement-dialog>
    <form className="grid min-w-0 gap-4" onSubmit={async (event) => {
      event.preventDefault();
      if (!(await saveFeedback()) || !activeRef.current) return;
      onPrepare(feedback.trim());
    }}>
      <div><p className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-100">Delivery handoff · Revision {revisionNumber}</p><h2 id="studio-refinement-title" className="mt-2 text-xl font-semibold">Refine {storyId}</h2><p className="mt-2 break-words text-sm leading-6 text-zinc-300">{title}</p></div>
      <p id="studio-refinement-description" className="text-sm leading-6 text-zinc-300">Add the missing decision, evidence, or correction. Continue to the full package with this story and your feedback already selected.</p>
      {reasons.length ? <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.035] p-4"><p className="text-xs font-medium text-amber-100">Current refinement reasons</p><ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-5 text-zinc-300">{reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div> : null}
      <label className="grid min-w-0 gap-2"><span className="text-sm font-medium">What needs to change, and why?</span><textarea ref={feedbackRef} value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} required maxLength={8000} disabled={disabled} placeholder="Describe the confirmed decision or correction and cite the supporting evidence. Do not invent a missing business rule." className="w-full min-w-0 resize-y rounded-md border border-white/15 bg-zinc-950 p-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15" data-studio-lane-refinement-feedback /></label>
      <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.035] p-3 text-xs leading-6 text-emerald-100">{onSave ? "Save feedback to this revision without changing outputs, lanes, or approvals. Preparing also saves it before opening Studio." : "Preparing feedback is local only; this preview has no durable package."} Creating revised outputs is a separate paid action that requires confirmation. No AI call is made here.</p>
      <p role="status" aria-live="polite" className="text-xs text-cyan-100">{saveStatus}</p>
      <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>{onSave ? <Button type="button" variant="outline" disabled={disabled || saving || !feedback.trim()} onClick={() => void saveFeedback()}>Save refinement</Button> : null}<Button type="submit" disabled={disabled || saving || !feedback.trim()}>Prepare refinement in Studio</Button></div>
    </form>
  </dialog>;
}
