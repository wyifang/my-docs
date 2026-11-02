import assert from "node:assert/strict";
import test from "node:test";
import { canDeactivateOrDemoteAdmin } from "@/lib/admin-management";

test("the last active administrator cannot be disabled or demoted", () => {
  assert.equal(canDeactivateOrDemoteAdmin({
    activeAdminCount: 1,
    targetIsActiveAdmin: true,
    nextRole: "AUTHOR",
    nextActive: true,
  }), false);
  assert.equal(canDeactivateOrDemoteAdmin({
    activeAdminCount: 1,
    targetIsActiveAdmin: true,
    nextRole: "ADMIN",
    nextActive: false,
  }), false);
});

test("an active administrator remains manageable when another active administrator exists", () => {
  assert.equal(canDeactivateOrDemoteAdmin({
    activeAdminCount: 2,
    targetIsActiveAdmin: true,
    nextRole: "AUTHOR",
    nextActive: true,
  }), true);
});

test("non-administrators do not affect the active administrator safety rule", () => {
  assert.equal(canDeactivateOrDemoteAdmin({
    activeAdminCount: 1,
    targetIsActiveAdmin: false,
    nextRole: "VIEWER",
    nextActive: false,
  }), true);
});
