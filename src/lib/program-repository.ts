import "server-only";
import { createFileArtifactPersistence, createPostgresArtifactPersistence } from "@/lib/artifact-persistence";
import { createFileAuditPersistence, createPostgresAuditPersistence } from "@/lib/audit-persistence";
import { createFileGuidancePersistence, createPostgresGuidancePersistence } from "@/lib/guidance-persistence";
import { createFileProgramPersistence, createPostgresProgramPersistence } from "@/lib/program-persistence";
import type { ProgramRepository } from "@/lib/program-repository-types";
import { createFileUserPersistence, createPostgresUserPersistence } from "@/lib/user-persistence";

function createFileRepository(): ProgramRepository {
  return {
    provider: "file",
    ...createFileProgramPersistence(),
    ...createFileGuidancePersistence(),
    ...createFileArtifactPersistence(),
    ...createFileAuditPersistence(),
    ...createFileUserPersistence()
  };
}

function createPostgresRepository(): ProgramRepository {
  const repository = { provider: "postgres" } as ProgramRepository;

  Object.assign(
    repository,
    createPostgresProgramPersistence(repository),
    createPostgresGuidancePersistence(repository),
    createPostgresArtifactPersistence(repository),
    createPostgresAuditPersistence(),
    createPostgresUserPersistence(repository)
  );

  return repository;
}

const fileRepository = createFileRepository();
const postgresRepository = createPostgresRepository();

export function getConfiguredPersistenceProvider(): "file" | "postgres" {
  const configured = process.env.PERSISTENCE_PROVIDER;
  if (configured === "postgres" || configured === "file") return configured;
  return process.env.DATABASE_URL ? "postgres" : "file";
}

export function getProgramRepository(): ProgramRepository {
  return getConfiguredPersistenceProvider() === "postgres" ? postgresRepository : fileRepository;
}

export type { ProgramRepository };
