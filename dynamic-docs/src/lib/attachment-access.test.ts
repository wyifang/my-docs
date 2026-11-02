import assert from "node:assert/strict";
import test from "node:test";
import { getAttachmentAccess } from "@/lib/attachment-access";
import type { CurrentUser } from "@/lib/auth";

const publicRevision = {
  accessPolicy: "PUBLIC",
  allowedOrganizationIds: "[]",
  product: "MaaS",
  apiVersion: "v1",
  language: "zh-CN",
  bodyJson: JSON.stringify({ nested: [{ file: "attachment-1" }] }),
};

const customerRevision = {
  ...publicRevision,
  accessPolicy: "AUTHENTICATED",
  allowedOrganizationIds: JSON.stringify(["sample-customer"]),
};

const customer: CurrentUser = {
  id: "customer-1",
  email: "customer@example.test",
  name: "Customer",
  role: "VIEWER",
  organizationId: "sample-customer",
};

const author: CurrentUser = {
  id: "author-1",
  email: "author@example.test",
  name: "Author",
  role: "AUTHOR",
  organizationId: null,
};

const filters = { product: "MaaS", apiVersion: "v1", language: "zh-CN" };
const baseInput = {
  attachmentId: "attachment-1",
  uploadedById: "someone-else",
  revisions: [],
  user: null,
  filters: {},
};

test("an anonymously accessible published attachment must be referenced by the published body", () => {
  const access = getAttachmentAccess({
    ...baseInput,
    publishedRevision: publicRevision,
  });
  assert.deepEqual(access, { allowed: true, publishedAccess: true, isPublic: true });

  const unreferenced = getAttachmentAccess({
    ...baseInput,
    publishedRevision: { ...publicRevision, bodyJson: JSON.stringify({ other: "attachment-2" }) },
  });
  assert.deepEqual(unreferenced, { allowed: false, publishedAccess: false, isPublic: false });
});

test("customer attachments require a matching organization and applicability filters", () => {
  assert.equal(getAttachmentAccess({
    ...baseInput,
    publishedRevision: customerRevision,
  }).allowed, false);

  const access = getAttachmentAccess({
    ...baseInput,
    publishedRevision: customerRevision,
    user: customer,
    filters,
  });
  assert.deepEqual(access, { allowed: true, publishedAccess: true, isPublic: false });

  assert.equal(getAttachmentAccess({
    ...baseInput,
    publishedRevision: customerRevision,
    user: customer,
    filters: { ...filters, apiVersion: "v2" },
  }).allowed, false);
});

test("the uploader can read an unpublished attachment privately", () => {
  const access = getAttachmentAccess({
    ...baseInput,
    uploadedById: author.id,
    publishedRevision: null,
    user: author,
  });
  assert.deepEqual(access, { allowed: true, publishedAccess: false, isPublic: false });
});

test("assigned reviewers and eligible publishers can read review attachments privately", () => {
  const inReview = {
    reviewerId: "reviewer-1",
    reviewStatus: "IN_REVIEW",
    ...customerRevision,
  };
  const reviewer: CurrentUser = {
    id: "reviewer-1",
    email: "reviewer@example.test",
    name: "Reviewer",
    role: "REVIEWER",
    organizationId: null,
  };
  assert.equal(getAttachmentAccess({
    ...baseInput,
    publishedRevision: null,
    revisions: [inReview],
    user: reviewer,
  }).allowed, true);

  assert.equal(getAttachmentAccess({
    ...baseInput,
    publishedRevision: null,
    revisions: [{ ...publicRevision, reviewerId: null, reviewStatus: "APPROVED" }],
    user: { ...author, role: "PUBLISHER" },
  }).allowed, true);
});
