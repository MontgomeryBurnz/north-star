import { Globe2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  STUDIO_EXPORT_FORMATS,
  STUDIO_OUTPUT_OPTIONS,
  type StudioExportFormat,
  type StudioOutputId
} from "@/lib/studio-export-types";

export function DiscoveryStudioPreferences({
  selectedOutputs,
  onSelectedOutputsChange,
  exportFormat,
  onExportFormatChange,
  externalResearch,
  onExternalResearchChange,
  researchTopic,
  onResearchTopicChange,
  disabled
}: {
  selectedOutputs: StudioOutputId[];
  onSelectedOutputsChange: (outputs: StudioOutputId[]) => void;
  exportFormat: StudioExportFormat;
  onExportFormatChange: (format: StudioExportFormat) => void;
  externalResearch: boolean;
  onExternalResearchChange: (enabled: boolean) => void;
  researchTopic: string;
  onResearchTopicChange: (topic: string) => void;
  disabled: boolean;
}) {
  function toggleOutput(id: StudioOutputId) {
    onSelectedOutputsChange(selectedOutputs.includes(id)
      ? selectedOutputs.filter((output) => output !== id)
      : [...selectedOutputs, id]);
  }

  return (
    <Card className="bg-zinc-950/75" data-studio-output-preferences>
      <CardHeader className="border-b border-white/10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">2 · Desired outputs</p>
        <CardTitle className="mt-2 text-zinc-50">Choose what you need to take forward</CardTitle>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Set the deliverables and file format before analysis. You can adjust the selection when you download.</p>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 sm:p-5">
        <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <legend className="sr-only">Deliverables to generate and export</legend>
          {STUDIO_OUTPUT_OPTIONS.map((option) => (
            <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${selectedOutputs.includes(option.id) ? "border-emerald-300/30 bg-emerald-300/[0.045]" : "border-white/10 bg-white/[0.025]"}`}>
              <input type="checkbox" checked={selectedOutputs.includes(option.id)} onChange={() => toggleOutput(option.id)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-300" data-studio-output={option.id} />
              <span><span className="block text-sm font-medium text-zinc-100">{option.label}</span><span className="mt-1 block text-xs leading-5 text-zinc-400">{option.description}</span></span>
            </label>
          ))}
        </fieldset>
        {!selectedOutputs.length ? <p className="text-sm text-amber-100" role="alert">Select at least one deliverable to analyze or download.</p> : null}
        <div className="grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <label className="grid content-start gap-2">
            <span className="text-xs font-medium text-zinc-200">Download format</span>
            <select value={exportFormat} onChange={(event) => onExportFormatChange(event.target.value as StudioExportFormat)} disabled={disabled} className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-300/50 focus:ring-2 focus:ring-emerald-300/15" data-studio-export-format>
              {STUDIO_EXPORT_FORMATS.map((format) => <option key={format.id} value={format.id}>{format.label} ({format.extension})</option>)}
            </select>
            <span className="text-xs leading-5 text-zinc-500">Office downloads are editable native files.</span>
          </label>
          <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.025] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={externalResearch} onChange={(event) => onExternalResearchChange(event.target.checked)} disabled={disabled} className="mt-1 h-4 w-4 shrink-0 accent-cyan-300" data-studio-external-research />
              <span><span className="flex items-center gap-2 text-sm font-medium text-zinc-100"><Globe2 className="h-4 w-4 text-cyan-200" />Include public best-practice research</span><span className="mt-1 block text-xs leading-5 text-zinc-400">Add cited public context to the evidence review. Only the public topic you enter below is used for web research; uploaded content stays in the synthesis workflow.</span></span>
            </label>
            {externalResearch ? (
              <label className="grid gap-2">
                <span className="text-xs font-medium text-zinc-200">Public research topic</span>
                <input value={researchTopic} onChange={(event) => onResearchTopicChange(event.target.value)} maxLength={500} disabled={disabled} required placeholder="Example: public-sector service request intake and triage best practices" className="rounded-md border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15" data-studio-research-topic />
                <span className="text-xs leading-5 text-zinc-500">Use a generic topic without customer names, private details, or uploaded excerpts.</span>
              </label>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
