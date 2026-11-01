import assert from "node:assert/strict";
import test from "node:test";
import {
  canRestoreRevision,
  compareRevisionValues,
  getReviewerVisibleRevisions,
} from "@/lib/revision-diff";

test("revision comparison reports nested and array changes", () => {
  assert.deepEqual(
    compareRevisionValues(
      { title: "Before", body: { summary: "Old", tags: ["a"] } },
      { title: "After", body: { summary: "New", tags: ["a", "b"] } },
    ),
    [
      { path: "body.summary", before: "Old", after: "New" },
      { path: "body.tags", before: ["a"], after: ["a", "b"] },
      { path: "title", before: "Before", after: "After" },
    ],
  );
});

test("revision comparison includes added, removed, and empty values", () => {
  assert.deepEqual(
    compareRevisionValues({ body: { obsolete: "value", empty: {} } }, { body: { empty: null, added: true } }),
    [
      { path: "body.added", before: undefined, after: true },
      { path: "body.empty", before: {}, after: null },
      { path: "body.obsolete", before: "value", after: undefined },
    ],
  );
});

test("restore is limited to the owning author or administrator and safe workflow states", () => {
  assert.equal(canRestoreRevision({
    role: "AUTHOR",
    ownsChunk: true,
    latestStatus: "APPROVED",
    latestIsPublished: true,
  }), true);
  assert.equal(canRestoreRevision({
    role: "AUTHOR",
    ownsChunk: false,
    latestStatus: "APPROVED",
    latestIsPublished: true,
  }), false);
  assert.equal(canRestoreRevision({
    role: "REVIEWER",
    ownsChunk: true,
    latestStatus: "DRAFT",
    latestIsPublished: false,
  }), false);
  assert.equal(canRestoreRevision({
    role: "AUTHOR",
    ownsChunk: true,
    latestStatus: "IN_REVIEW",
    latestIsPublished: false,
  }), false);
  assert.equal(canRestoreRevision({
    role: "AUTHOR",
    ownsChunk: true,
    latestStatus: "APPROVED",
    latestIsPublished: false,
  }), false);
});

test("reviewers can compare assigned work with the current publication only", () => {
  const revisions = [
    { id: "draft", reviewerId: "reviewer", reviewStatus: "IN_REVIEW" },
    { id: "published", reviewerId: null, reviewStatus: "APPROVED" },
    { id: "other-private", reviewerId: "another-reviewer", reviewStatus: "CHANGES_REQUESTED" },
  ];
  assert.deepEqual(
    getReviewerVisibleRevisions(revisions, "reviewer", "published").map(({ id }) => id),
    ["draft", "published"],
  );
  assert.deepEqual(getReviewerVisibleRevisions(revisions, "someone-else", "published"), []);
});
