import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

export type StoredArtifactRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  provider: "local" | "blob" | "supabase";
  storageKey: string;
  createdAt: string;
};

type SaveArtifactInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

type ArtifactStorageProvider = {
  id: "local" | "blob" | "supabase";
  saveArtifact(input: SaveArtifactInput): Promise<StoredArtifactRecord>;
};

const localStorageDirectory = path.join(process.cwd(), process.env.LOCAL_ARTIFACT_STORAGE_DIR ?? ".data/artifacts");

const localArtifactStorageProvider: ArtifactStorageProvider = {
  id: "local",
  async saveArtifact(input) {
    const id = randomUUID();
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const storageKey = `${id}-${safeName}`;
    const absolutePath = path.join(localStorageDirectory, storageKey);

    await mkdir(localStorageDirectory, { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      provider: "local",
      storageKey,
      createdAt: new Date().toISOString()
    };
  }
};

const blobArtifactStorageProvider: ArtifactStorageProvider = {
  id: "blob",
  async saveArtifact() {
    // Future production insertion point:
    // Replace this with Vercel Blob or your object storage provider when credentials are available.
    throw new Error("Blob artifact storage is not configured yet.");
  }
};

const supabaseArtifactStorageProvider: ArtifactStorageProvider = {
  id: "supabase",
  async saveArtifact(input) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET;

    if (!url || !serviceRoleKey || !bucket) {
      throw new Error("Supabase storage is not configured.");
    }

    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false }
    });
    const id = randomUUID();
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const storageKey = `artifacts/${id}/${safeName}`;
    const { error } = await client.storage.from(bucket).upload(storageKey, input.buffer, {
      contentType: input.mimeType,
      upsert: false
    });

    if (error) {
      throw error;
    }

    return {
      id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
      provider: "supabase",
      storageKey,
      createdAt: new Date().toISOString()
    };
  }
};

export function getConfiguredArtifactStorageProvider(): "local" | "blob" | "supabase" {
  const configured = process.env.ARTIFACT_STORAGE_PROVIDER;
  if (configured === "supabase") return "supabase";
  return configured === "blob" ? "blob" : "local";
}

export function getArtifactStorageProvider(): ArtifactStorageProvider {
  const provider = getConfiguredArtifactStorageProvider();
  if (provider === "blob") return blobArtifactStorageProvider;
  if (provider === "supabase") return supabaseArtifactStorageProvider;
  return localArtifactStorageProvider;
}
