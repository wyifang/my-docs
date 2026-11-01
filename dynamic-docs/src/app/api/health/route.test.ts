import assert from "node:assert/strict";
import test from "node:test";
import { loadProjectEnv } from "../../../../scripts/load-env";

test("health endpoint confirms database readiness without caching", async () => {
  loadProjectEnv();
  const { GET } = await import("./route");
  const response = await GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok" });
});
