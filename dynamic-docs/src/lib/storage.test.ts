import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { deleteAttachment, readAttachment, storeAttachment } from "@/lib/storage";

test("local attachment storage writes, reads, and removes bytes", async () => {
  const previousDatabaseProvider = process.env.DATABASE_PROVIDER;
  const previousStorageProvider = process.env.STORAGE_PROVIDER;
  const storageKey = `${randomUUID()}.txt`;
  const expected = new Uint8Array([68, 111, 99, 70, 111, 114, 103, 101]);
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.STORAGE_PROVIDER = "local";

  try {
    await storeAttachment(storageKey, expected, "text/plain");
    const stored = await readAttachment(storageKey);
    assert.ok(stored instanceof Uint8Array);
    assert.deepEqual(stored, expected);
    await deleteAttachment(storageKey);
    assert.equal(await readAttachment(storageKey), null);
  } finally {
    if (previousDatabaseProvider === undefined) delete process.env.DATABASE_PROVIDER;
    else process.env.DATABASE_PROVIDER = previousDatabaseProvider;
    if (previousStorageProvider === undefined) delete process.env.STORAGE_PROVIDER;
    else process.env.STORAGE_PROVIDER = previousStorageProvider;
  }
});
