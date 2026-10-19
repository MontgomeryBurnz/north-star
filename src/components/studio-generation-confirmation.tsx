"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Mounted fresh for each request: acknowledgement is never remembered or persisted. */
export function StudioGenerationConfirmation({ externalResearch, refining, sourceCount, outputCount, onCancel, onConfirm }: {
  externalResearch: boolean;
  refining: boolean;
  sourceCount: number;
  outputCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const submittedRef = useRef(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      if (dialog?.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog ref={dialogRef} aria-labelledby="studio-paid-title" aria-describedby="studio-paid-description" onCancel={(event) => { event.preventDefault(); onCancel(); }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-xl border border-white/15 bg-zinc-950 p-5 text-zinc-100 shadow-2xl backdrop:bg-black/75 sm:p-6" data-studio-paid-confirmation>
    <form className="grid gap-4" onSubmit={(event) => {
      event.preventDefault();
      if (!acknowledged || submittedRef.current) return;
      submittedRef.current = true;
      onConfirm();
    }}>
      <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-200">Paid OpenAI generation</p><h2 id="studio-paid-title" className="mt-2 text-xl font-semibold">{refining ? "Create a paid revision?" : "Run a paid analysis?"}</h2></div>
      <p id="studio-paid-description" className="text-sm leading-6 text-zinc-300">This sends your discovery evidence and any refinement context to the configured OpenAI model. It uses NorthStar’s API credits, not your ChatGPT subscription.</p>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm"><dt className="text-zinc-400">Discovery sources</dt><dd className="text-right">{sourceCount}</dd><dt className="text-zinc-400">Selected deliverables</dt><dd className="text-right">{outputCount}</dd><dt className="text-zinc-400">External references</dt><dd className="text-right">{externalResearch ? "On · additional cost" : "Off"}</dd></dl>
      <p className="text-sm leading-6 text-zinc-300">One analysis can make up to {externalResearch ? "5" : "4"} model requests: evidence review, product generation, and up to one quality correction per stage{externalResearch ? ", plus public research with up to 8 web-search tool calls" : ""}. There are no automatic transport retries.</p>
      {externalResearch ? <p className="text-sm leading-6 text-cyan-100">Only your public reference topic is used for web research. Keep names, private details, and document excerpts out of it. Public guidance supplements evidence; it does not approve business rules.</p> : null}
      <p className="text-sm leading-6 text-amber-100">Cost varies with the model, package size, and corrections. A dollar estimate and hard spending cap are not available here. Provider charges may apply even if generation fails.</p>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200/20 p-3 text-sm leading-6"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-300" />I understand this uses API credits and authorize this one analysis.</label>
      <p className="text-xs leading-5 text-zinc-400">Opening saved outputs, downloading files, and commenting do not trigger paid generation. Cancel keeps your current package unchanged.</p>
      <div className="flex flex-wrap justify-end gap-3"><Button ref={cancelRef} type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={!acknowledged}>Authorize paid analysis</Button></div>
    </form>
  </dialog>;
}
