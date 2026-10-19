import { randomUUID } from "node:crypto";
import { brotliCompressSync, brotliDecompressSync } from "node:zlib";
import { createDemoProgramStore } from "../data/demo-program-store.ts";
import { demoProgramId, demoStateCookieCount, demoStateCookiePrefix } from "./demo-mode.ts";
import { generateLocalGuidedPlan } from "./guided-plan-generator.ts";
import type { ProgramRepository, ProgramStoreFile } from "./program-repository-types.ts";

type DemoOverrides = Partial<Omit<ProgramStoreFile, "managedUsers" | "auditEvents" | "openAIUsageRecords">>;
const chunkSize = 2800;
const editableKeys = ["programs", "updates", "guidedPlans", "leadershipFeedbacks", "meetingInputs", "roleArtifacts", "clientDecisionRequests", "clientPortalUpdates", "guidanceJustifications", "guidanceFeedbackFlags"] as const;
type Patch = [0, unknown] | [1, Record<string, Patch>] | [2];
type PackedState = { version: 2; tables: Partial<Record<typeof editableKeys[number], Array<[number, Patch]>>> };

function difference(original: unknown, next: unknown): Patch | undefined {
  if (JSON.stringify(original) === JSON.stringify(next)) return undefined;
  if (next === undefined) return [2];
  if (original && next && typeof original === "object" && typeof next === "object" && !Array.isArray(original) && !Array.isArray(next)) {
    const fields: Record<string, Patch> = {};
    for (const key of new Set([...Object.keys(original), ...Object.keys(next)])) {
      const patch = difference((original as Record<string, unknown>)[key], (next as Record<string, unknown>)[key]);
      if (patch) fields[key] = patch;
    }
    return [1, fields];
  }
  return [0, next];
}

function applyDifference(original: unknown, patch: Patch): unknown {
  if (patch[0] === 0) return patch[1];
  if (patch[0] === 2) return undefined;
  const result: Record<string, unknown> = original && typeof original === "object" ? { ...original } : {};
  for (const [key, change] of Object.entries(patch[1])) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    const value = applyDifference(result[key], change);
    if (value === undefined) delete result[key];
    else result[key] = value;
  }
  return result;
}

export type DemoCookieStore = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: { httpOnly: boolean; sameSite: "lax"; secure: boolean; path: string }): unknown;
};

export function createDemoProgramRepository(cookieStore: DemoCookieStore): ProgramRepository {
  const base = createDemoProgramStore();
  let overrides: DemoOverrides = {};
  try {
    const encoded = Array.from({ length: demoStateCookieCount }, (_, index) => cookieStore.get(`${demoStateCookiePrefix}${index}`)?.value ?? "").join("");
    if (encoded && encoded.length <= chunkSize * demoStateCookieCount) {
      const packed = JSON.parse(brotliDecompressSync(Buffer.from(encoded, "base64url"), { maxOutputLength: 200_000 }).toString("utf8")) as PackedState;
      if (packed.version === 2 && packed.tables) {
        for (const key of editableKeys) {
          const rows = packed.tables[key];
          if (!Array.isArray(rows)) continue;
          (overrides[key] as unknown[]) = rows.map(([index, patch]) => applyDifference(base[key][index], patch));
        }
      }
    }
  } catch {
    // A stale or incomplete browser session starts from the original example.
  }
  const store = structuredClone(base);
  for (const key of editableKeys) {
    if (Array.isArray(overrides[key])) {
      // Only the fictional program can be addressed by this repository.
      const records = overrides[key] as Array<{ id: string; programId?: string }>;
      const valid = records.filter((record) => record && (key === "programs" ? record.id === demoProgramId : record.programId === demoProgramId));
      (store[key] as typeof records) = valid;
    }
  }
  function persist() {
    const packed: PackedState = { version: 2, tables: {} };
    for (const key of editableKeys) {
      if (JSON.stringify(store[key]) !== JSON.stringify(base[key])) {
        packed.tables[key] = store[key].map((record) => {
          const matchingIndex = base[key].findIndex((original) => original.id === record.id);
          const templateIndex = matchingIndex >= 0 ? matchingIndex : base[key].length ? 0 : -1;
          return [templateIndex, difference(base[key][templateIndex], record) ?? [1, {}]];
        });
      }
    }
    const encoded = brotliCompressSync(Buffer.from(JSON.stringify(packed))).toString("base64url");
    if (encoded.length > chunkSize * demoStateCookieCount) {
      throw new Error("This sample session is full. Reset the sample data to continue exploring.");
    }
    for (let index = 0; index < demoStateCookieCount; index += 1) {
      cookieStore.set(`${demoStateCookiePrefix}${index}`, encoded.slice(index * chunkSize, (index + 1) * chunkSize), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/"
      });
    }
  }
  function metadata(programId: string) {
    if (programId !== demoProgramId) throw new Error("Only the fictional program is available while sample data is active.");
    return { id: randomUUID(), programId, programName: store.programs[0]?.intake.programName ?? "Regional Service Request Modernization", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  function append<K extends typeof editableKeys[number]>(key: K, record: ProgramStoreFile[K][number]) {
    (store[key] as Array<typeof record>).unshift(record);
    persist();
    return record;
  }
  const repository: ProgramRepository = {
    provider: "file",
    async listPrograms() { return store.programs; },
    async getProgram(id) { return store.programs.find((program) => program.id === id) ?? null; },
    async upsertProgram(intake) {
      const program = { ...store.programs[0], id: demoProgramId, intake, updatedAt: new Date().toISOString() };
      store.programs = [program];
      persist();
      return program;
    },
    async listProgramUpdates(id) { return store.updates.filter((record) => record.programId === id); },
    async listAllProgramUpdates() { return store.updates; },
    async createProgramUpdate(id, review) { return append("updates", { ...metadata(id), review }); },
    async deleteProgramUpdatesByTag(id, tag) {
      const before = store.updates.length;
      store.updates = store.updates.filter((record) => record.programId !== id || !JSON.stringify(record.review).includes(tag));
      persist();
      return before - store.updates.length;
    },
    async getLatestGuidedPlan(id) { return store.guidedPlans.find((record) => record.programId === id) ?? null; },
    async createGuidedPlan(id) {
      const program = await repository.getProgram(id);
      if (!program) return null;
      const plan = generateLocalGuidedPlan(program, await repository.listProgramUpdates(id), await repository.listLeadershipFeedback(id), await repository.listMeetingInputs(id));
      store.guidedPlans = [plan];
      persist();
      return plan;
    },
    async listLeadershipFeedback(id) { return store.leadershipFeedbacks.filter((record) => record.programId === id); },
    async listAllLeadershipFeedback() { return store.leadershipFeedbacks; },
    async createLeadershipFeedback(id, feedback) { return append("leadershipFeedbacks", { ...metadata(id), feedback }); },
    async listMeetingInputs(id) { return store.meetingInputs.filter((record) => record.programId === id); },
    async createMeetingInput(id, input) { return append("meetingInputs", { ...metadata(id), ...input }); },
    async listRoleArtifacts(id, artifactType) { return store.roleArtifacts.filter((record) => record.programId === id && (!artifactType || record.artifactType === artifactType)); },
    async createRoleArtifact(id, artifact) { return append("roleArtifacts", { ...artifact, ...metadata(id) }); },
    async listClientDecisionRequests(id) { return store.clientDecisionRequests.filter((record) => record.programId === id); },
    async createClientDecisionRequest(id, input) { return append("clientDecisionRequests", { ...metadata(id), ...input, status: "open" }); },
    async listClientPortalUpdates(id) { return store.clientPortalUpdates.filter((record) => record.programId === id); },
    async createClientPortalUpdate(id, input) { return append("clientPortalUpdates", { ...metadata(id), ...input, status: "published" }); },
    async deleteClientPortalUpdatesByTag(id, tag) {
      const before = store.clientPortalUpdates.length;
      store.clientPortalUpdates = store.clientPortalUpdates.filter((record) => record.programId !== id || !JSON.stringify(record).includes(tag));
      persist();
      return before - store.clientPortalUpdates.length;
    },
    async listGuidanceJustifications(id) { return store.guidanceJustifications.filter((record) => record.programId === id); },
    async createGuidanceJustification(record) { return append("guidanceJustifications", { ...record, ...metadata(record.programId) }); },
    async listGuidanceFeedbackFlags(id) { return store.guidanceFeedbackFlags.filter((record) => record.programId === id); },
    async createGuidanceFeedbackFlag(id, flag) { return append("guidanceFeedbackFlags", { ...metadata(id), ...flag, status: "pending" }); },
    async reviewGuidanceFeedbackFlag(id, flagId, review) {
      const flag = store.guidanceFeedbackFlags.find((record) => record.programId === id && record.id === flagId);
      if (!flag) return null;
      Object.assign(flag, review, { updatedAt: new Date().toISOString() });
      persist();
      return flag;
    },
    async listOpenAIUsageRecords() { return []; },
    async listAllOpenAIUsageRecords() { return []; },
    async createOpenAIUsageRecord(id, usage) { return { ...metadata(id), ...usage }; },
    async listAuditEvents() { return []; },
    async createAuditEvent(input) { return { ...input, id: randomUUID(), createdAt: new Date().toISOString() }; },
    async listManagedUsers() { return []; },
    async upsertManagedUser() { throw new Error("User administration is unavailable while sample data is active."); },
    async deleteManagedUser() { throw new Error("User administration is unavailable while sample data is active."); }
  };
  return repository;
}
