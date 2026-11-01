import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const localStorageDirectory = path.join(process.cwd(), ".data", "uploads");

function usesVercelBlob() {
  if (
    process.env.DATABASE_PROVIDER === "postgresql" &&
    process.env.STORAGE_PROVIDER !== "vercel-blob"
  ) {
    throw new Error("STORAGE_PROVIDER=vercel-blob is required for PostgreSQL deployments.");
  }
  return process.env.STORAGE_PROVIDER === "vercel-blob";
}

export async function storeAttachment(
  storageKey: string,
  bytes: Uint8Array,
  contentType: string,
) {
  if (usesVercelBlob()) {
    await put(storageKey, Buffer.from(bytes), {
      access: "private",
      addRandomSuffix: false,
      contentType,
    });
    return;
  }

  await mkdir(localStorageDirectory, { recursive: true });
  await writeFile(path.join(localStorageDirectory, storageKey), bytes, { flag: "wx" });
}

export async function readAttachment(storageKey: string) {
  if (usesVercelBlob()) {
    const blob = await get(storageKey, { access: "private", useCache: false });
    return blob?.statusCode === 200 ? blob.stream : null;
  }

  try {
    return new Uint8Array(await readFile(path.join(localStorageDirectory, storageKey)));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteAttachment(storageKey: string) {
  if (usesVercelBlob()) {
    await del(storageKey);
    return;
  }
  await unlink(path.join(localStorageDirectory, storageKey));
}
