import "server-only";
import type { ProgramRepository } from "@/lib/program-repository-types";
import {
  buildRoleArtifactRecord,
  ensurePostgresSchema,
  getPool,
  mapRoleArtifactRow,
  nextRoleArtifactVersion,
  readFileStore,
  sortRoleArtifactsDesc,
  writeFileStore
} from "@/lib/program-repository-shared";

type ArtifactPersistenceDependencies = Pick<ProgramRepository, "getProgram" | "listRoleArtifacts">;

export function createFileArtifactPersistence(): Pick<ProgramRepository, "listRoleArtifacts" | "createRoleArtifact"> {
  return {
    async listRoleArtifacts(programId, artifactType) {
      const store = await readFileStore();
      const records = store.roleArtifacts.filter(
        (artifact) => artifact.programId === programId && (!artifactType || artifact.artifactType === artifactType)
      );
      return sortRoleArtifactsDesc(records);
    },
    async createRoleArtifact(programId, artifact) {
      const store = await readFileStore();
      const now = new Date().toISOString();
      const program = store.programs.find((item) => item.id === programId);
      const programName = program?.intake.programName || artifact.programName || "Untitled program";
      const existing = store.roleArtifacts.filter(
        (record) => record.programId === programId && record.artifactType === artifact.artifactType
      );
      const record = buildRoleArtifactRecord({
        artifact: {
          ...artifact,
          generatedAt: artifact.generatedAt || now
        },
        programId,
        programName,
        version: nextRoleArtifactVersion(existing)
      });

      store.roleArtifacts = [record, ...store.roleArtifacts];
      store.programs = store.programs.map((item) => (item.id === programId ? { ...item, updatedAt: now } : item));
      await writeFileStore(store);
      return record;
    }
  };
}

export function createPostgresArtifactPersistence(
  repository: ArtifactPersistenceDependencies
): ReturnType<typeof createFileArtifactPersistence> {
  return {
    async listRoleArtifacts(programId, artifactType) {
      await ensurePostgresSchema();
      const result = await getPool().query(
        `
          SELECT record
          FROM role_artifacts
          WHERE program_id = $1
            AND ($2::text IS NULL OR artifact_type = $2)
          ORDER BY created_at DESC
        `,
        [programId, artifactType ?? null]
      );
      return result.rows.map(mapRoleArtifactRow);
    },
    async createRoleArtifact(programId, artifact) {
      await ensurePostgresSchema();
      const now = new Date();
      const program = await repository.getProgram(programId);
      const programName = program?.intake.programName || artifact.programName || "Untitled program";
      const existing = await repository.listRoleArtifacts(programId, artifact.artifactType);
      const record = buildRoleArtifactRecord({
        artifact: {
          ...artifact,
          generatedAt: artifact.generatedAt || now.toISOString()
        },
        programId,
        programName,
        version: nextRoleArtifactVersion(existing)
      });

      await getPool().query(
        `
          INSERT INTO role_artifacts (id, program_id, program_name, artifact_type, version, record, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $7)
        `,
        [record.id, programId, record.programName, record.artifactType, record.version, JSON.stringify(record), now]
      );
      await getPool().query("UPDATE programs SET updated_at = $2 WHERE id = $1", [programId, now]);
      return record;
    }
  };
}
